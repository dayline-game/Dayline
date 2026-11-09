/* DAYLINE — arcade vehicle physics, race progress, autopilot (medal times), ghost codec & validation.
   Every vehicle shares exactly this model: cosmetics never change performance or hitbox. */
'use strict';
(function (DL) {
  const SURF = DL.SURF;
  const G = 24, ENG = 16, BRAKE = 24, REV_MAX = 12;
  const HIT_R = 1.1, HIT_OFF = 1.2;
  DL.PHYS = { G, ENG };

  function Car(track) {
    this.track = track;
    this.g = {}; this.g2 = {}; this.cols = [];
    this.reset(track.start.x, track.start.y, track.start.z, track.start.yaw);
  }
  DL.Car = Car;

  Car.prototype.reset = function (x, y, z, yaw) {
    this.x = x; this.y = y + 0.05; this.z = z;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = yaw; this.yawRate = 0;
    this.grounded = true; this.airTime = 0; this.lastAir = 0;
    this.aLong = 0; this.aS = 0; this.pitch = 0; this.roll = 0; this.slip = 0; this.speed = 0; this.vF = 0;
    this.surf = SURF.ROAD; this.inWater = false; this.wheelSpin = 0;
    this.steerVis = 0;
    this.slideK = 0; this.slideAng = 0;     // handbrake slide: 0 = full grip, 1 = rear tyres let go; angle between heading and travel
  };

  // grip, top-speed scale and extra rolling drag per surface: tarmac and kerbs are fast, gravel and grass bog the car down
  Car.prototype.surfaceProps = function (surf) {
    const B = this.track.B;
    if (surf === SURF.ROAD) return [1.0 * B.roadGrip, 54, 0];
    if (surf === SURF.KERB) return [0.96 * B.roadGrip, 54, 0.4];
    if (surf === SURF.GRAVEL) return [B.offGrip * 0.85, 34, 2.2];
    if (surf === SURF.MUD) return [0.52, 38, 1.5];         // slippery and draggy
    if (surf === SURF.SNOW) return [0.46, 47, 0.35];       // packed snow: fast but very loose
    if (surf === SURF.SAND) return [0.64, 39, 1.2];
    return [B.offGrip, 31, 3.0];                // grass, sand, snow verge
  };

  // inp: {throttle 0..1, brake 0..1, steer -1..1 (+ = right), handbrake bool}
  Car.prototype.step = function (dt, inp, ev) {
    const t = this.track, g = this.g;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const rx = -fz, rz = fx;               // screen-right of the car
    let vF = this.vx * fx + this.vz * fz, vR = this.vx * rx + this.vz * rz;
    t.groundAt(this.x, this.z, g);
    const groundY0 = g.y;
    this.surf = g.surf;
    const [grip0, vmax, rough] = this.surfaceProps(g.surf);
    const grip = this.inWater ? 0.3 : grip0;
    this.steerVis += (inp.steer - this.steerVis) * Math.min(1, dt * 12);

    if (this.grounded) {
      // longitudinal: torque falls off with speed, aero drag, rolling resistance, gravity on slopes
      const k = ENG * 0.65 / (vmax * vmax);
      let drive = 0, brakeF = 0;
      if (inp.throttle > 0) drive = ENG * inp.throttle * (1 - 0.45 * DL.clamp(vF / vmax, 0, 1.5));
      if (inp.brake > 0) {
        if (vF > 0.6) brakeF = BRAKE * inp.brake * grip;
        else if (vF > -REV_MAX) drive -= 9 * inp.brake;
      }
      // the handbrake locks the rear tyres: it scrubs a little speed, less if you keep the throttle down
      if (inp.handbrake) brakeF += (inp.throttle > 0.3 ? 2.2 : 6) * grip;
      // rear grip: drops fast when the handbrake is pulled, and comes back slowly while you stay on the power in a slide
      { const sp0 = Math.abs(vF), sliding = Math.abs(vR) > 1.2;
        if (inp.handbrake && sp0 > 8) this.slideK = Math.min(1, this.slideK + 7 * dt);
        else this.slideK = Math.max(0, this.slideK - dt * (!sliding || sp0 < 6 ? 6 : inp.throttle > 0.5 ? 0.85 : 2.2)); }
      // tyres can only give so much: drive/brake force is capped by grip (wheelspin / lock-up)
      const mu = 0.95 * G * grip;
      drive = DL.clamp(drive, -mu, mu * 0.8);
      brakeF = Math.min(brakeF, mu);
      let a = drive - Math.sign(vF) * brakeF;
      a -= k * vF * Math.abs(vF);
      a -= Math.sign(vF) * 0.45;
      if (rough) a -= Math.sign(vF) * rough * DL.clamp(Math.abs(vF) / 8, 0, 1.6);   // grass and gravel drag
      const fy = t.groundAt(this.x + fx * 1.6, this.z + fz * 1.6, this.g2).y;
      const by = t.groundAt(this.x - fx * 1.6, this.z - fz * 1.6, this.g2).y;
      a -= G * ((fy - by) / 3.2);
      this.aLong = a;
      let nvF = vF + a * dt;
      if (brakeF > 0 && Math.sign(nvF) !== Math.sign(vF)) nvF = 0;
      vF = (inp.throttle === 0 && inp.brake === 0 && Math.abs(nvF) < 0.4) ? 0 : nvF;
      if (vF < -REV_MAX) vF = -REV_MAX;

      // friction circle: lateral grip left over after accelerating or braking
      const longUse = Math.min(1, Math.abs(drive - Math.sign(vF) * brakeF) / mu) * 0.75;
      let latAvail = mu * Math.sqrt(Math.max(0.05, 1 - longUse * longUse));
      const latFull = latAvail;
      latAvail *= 1 - 0.93 * this.slideK;

      // steering: bicycle model, speed-sensitive lock, limited by available grip (understeer)
      const sp = Math.abs(vF);
      const lock = 0.6 / (1 + sp / 22);
      let target = (vF >= 0 ? 1 : -1) * -inp.steer * sp * Math.tan(lock) / 2.6;
      const yawCap = (this.slideK > 0 ? latFull * (1 - 0.25 * this.slideK) : latAvail) / Math.max(sp, 3) * (1.12 + 1.2 * this.slideK);
      target = DL.clamp(target, -yawCap, yawCap);
      // already sideways enough: stop adding rotation so a drift can be held instead of spinning out
      if (this.slideK > 0 && target * this.slideAng > 0 && Math.abs(this.slideAng) > 0.75) target *= Math.max(0, 1 - (Math.abs(this.slideAng) - 0.75) / 0.45);
      // braking shifts weight forward and helps the nose turn in; throttle pushes it wide
      // (weight transfer) off-throttle / braking loads the nose; hard throttle unloads it
      const wt = DL.clamp(this.aLong / (G * 0.7), -1, 1);
      if (sp > 8) target *= 1 - 0.14 * wt;
      // ... and the opposite for the rear: lifting or braking mid-corner lets it step out
      if (wt < 0 && sp > 14) latAvail *= 1 + 0.12 * wt;
      this.yawRate += (target - this.yawRate) * Math.min(1, (2.6 + 3 * grip) * dt);

      // lateral: tyres pull sideways velocity back toward zero, but only up to the grip limit
      const corr = Math.min(Math.abs(vR), latAvail * dt);
      vR -= Math.sign(vR) * corr;
      vR *= Math.exp(-0.8 * dt);
      this.slip = DL.clamp(Math.abs(vR) / 5 + this.slideK * 0.4, 0, 1.5);
      this.slideAng = Math.atan2(vR, Math.max(Math.abs(vF), 1));
    } else {
      this.yawRate *= Math.exp(-1.2 * dt);
      this.yawRate += -inp.steer * 0.6 * dt;
      this.slip = 0;
    }
    this.yaw += this.yawRate * dt;
    // inertia: while the rear is loose the car turns but its travel direction mostly does not, so the nose points away from where it is going
    if (this.slideK > 0 && this.grounded) {
      const a = this.yawRate * dt * this.slideK, ca = Math.cos(a), sa = Math.sin(a), nF = vF * ca - vR * sa;
      vR = vR * ca + vF * sa; vF = nF;
    }
    const nfx = Math.sin(this.yaw), nfz = Math.cos(this.yaw);
    // rotate a share of velocity with the body (keeps momentum believable)
    const nrx = -nfz, nrz = nfx;
    this.vx = nfx * vF + nrx * vR; this.vz = nfz * vF + nrz * vR;
    this.vF = vF;

    // integrate
    const wasGrounded = this.grounded;
    this.vy -= G * dt;
    if (this.inWater) { this.vx *= 0.97; this.vz *= 0.97; }
    this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;

    // collisions with obstacles & props (two circles along the body)
    const cols = t.collidersNear(this.x, this.z, this.cols);
    for (let ci = 0; ci < cols.length; ci++) {
      const c = cols[ci];
      for (let s = -1; s <= 1; s += 2) {
        const cx = this.x + nfx * HIT_OFF * s, cz = this.z + nfz * HIT_OFF * s;
        const dx = cx - c.x, dz = cz - c.z, d = Math.hypot(dx, dz), md = HIT_R + c.r;
        if (d < md && d > 1e-4) {
          const nx = dx / d, nz = dz / d, pen = md - d;
          this.x += nx * pen; this.z += nz * pen;
          const vn = this.vx * nx + this.vz * nz;
          if (vn < 0) {
            this.vx -= 1.35 * vn * nx; this.vz -= 1.35 * vn * nz;
            this.vx *= 0.8; this.vz *= 0.8;
            this.yawRate += s * (nx * nfz - nz * nfx) * vn * 0.04;
            if (ev && -vn > 2) ev.hit = Math.max(ev.hit || 0, -vn);
          }
        }
      }
    }

    // ground contact
    t.groundAt(this.x, this.z, g);
    const snap = wasGrounded ? 0.22 : 0;
    if (this.y <= g.y + snap) {
      if (!wasGrounded) {
        const impact = -this.vy;
        if (impact > 5) { const f = DL.clamp(1 - (impact - 5) * 0.012, 0.85, 1); this.vx *= f; this.vz *= f; if (ev) ev.land = impact; }
        this.lastAir = this.airTime; if (ev && this.airTime > 0.3) ev.air = this.airTime;
        this.airTime = 0;
      }
      // follow the ground, but never turn a small step into a launch
      const hs = Math.hypot(this.vx, this.vz), cap = hs * 0.32 + 1;
      this.vy = wasGrounded ? DL.clamp((g.y - groundY0) / dt, -cap, cap) : 0;
      this.y = g.y; this.grounded = true;
    } else {
      this.grounded = false; this.airTime += dt;
    }
    if (this.y < g.y) this.y = g.y;

    // water
    this.inWater = t.water != null && this.y < t.water - 0.3;

    // visual attitude
    const lerpK = Math.min(1, dt * 10);
    if (this.grounded) {
      const yf = t.groundAt(this.x + nfx * 1.5, this.z + nfz * 1.5, this.g2).y;
      const yb = t.groundAt(this.x - nfx * 1.5, this.z - nfz * 1.5, this.g2).y;
      const yl = t.groundAt(this.x - nrx * 0.9, this.z - nrz * 0.9, this.g2).y;
      const yr = t.groundAt(this.x + nrx * 0.9, this.z + nrz * 0.9, this.g2).y;
      this.aS += (this.aLong - this.aS) * Math.min(1, dt * 7);
      const p = Math.atan2(yb - yf, 3) - DL.clamp(this.aS * 0.0065, -0.07, 0.07);
      const r = Math.atan2(yl - yr, 1.8) + DL.clamp(this.yawRate * vF * 0.0055, -0.09, 0.09);
      this.pitch += (p - this.pitch) * lerpK; this.roll += (r - this.roll) * lerpK;
    } else {
      const hs = Math.hypot(this.vx, this.vz) + 1;
      const p = DL.clamp(-Math.atan2(this.vy, hs) * 0.6, -0.5, 0.5);
      this.pitch += (p - this.pitch) * Math.min(1, dt * 3); this.roll *= 1 - Math.min(1, dt * 3);
    }
    this.speed = Math.hypot(this.vx, this.vz);
    this.wheelSpin += vF * dt / 0.36;
  };

  // ---------- race progress (checkpoint planes) ----------
  function Progress(track) { this.track = track; this.next = 0; this.cpTimes = []; }
  DL.Progress = Progress;
  Progress.prototype.update = function (px, pz, x, z, time) {
    const cp = this.track.checkpoints[this.next]; if (!cp) return null;
    const a = (px - cp.x) * cp.tx + (pz - cp.z) * cp.tz, b = (x - cp.x) * cp.tx + (z - cp.z) * cp.tz;
    if (a < 0 && b >= 0) {
      const lat = Math.abs((x - cp.x) * -cp.tz + (z - cp.z) * cp.tx);
      if (lat < this.track.half + 14) {
        this.cpTimes.push(time); this.next++;
        return this.next >= this.track.checkpoints.length ? 'finish' : 'cp';
      }
    }
    return null;
  };

  // ---------- autopilot: sets the deterministic medal times ----------
  DL.runBot = function (track, maxT, rec) {
    const car = new Car(track), prog = new Progress(track), dt = 1 / 120;
    const r = {}, vcap = new Float32Array(track.N);
    for (let i = 0; i < track.N; i++) {
      let c = 0; for (let k = -3; k <= 3; k++) c = Math.max(c, Math.abs(track.curv[DL.clamp(i + k, 0, track.N - 1)]));
      const R = c > 1e-4 ? 1 / c : 1e4;
      vcap[i] = Math.min(52, Math.sqrt(21 * track.B.roadGrip * R));
    }
    const inp = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    let steps = 0; const max = (maxT || 400) / dt;
    while (steps < max) {
      track.nearestRoad(car.x, car.z, r);
      const v = car.speed;
      const look = r.i + Math.round((9 + v * 0.45) / 4);
      const li = DL.clamp(look, 0, track.N - 1);
      const tx = track.px[li], tz = track.pz[li];
      const want = Math.atan2(tx - car.x, tz - car.z);
      let d = want - car.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      inp.steer = DL.clamp(-d * 2.8, -1, 1);
      let allow = 60;
      for (let k = 0; k < 30; k++) {
        const j = r.i + k; if (j >= track.N) break;
        const dist = Math.max(0, track.s[j] - r.s);
        allow = Math.min(allow, Math.sqrt(vcap[j] * vcap[j] + 2 * 22 * dist));
      }
      inp.throttle = v < allow - 0.5 ? 1 : 0;
      inp.brake = v > allow + 1.5 ? 1 : 0;
      const px = car.x, pz = car.z;
      car.step(dt, inp, null);
      steps++;
      if (rec && steps % 8 === 1) rec.push([car.x, car.y, car.z, car.yaw, car.pitch, car.roll, car.steerVis, 0]);
      const res = prog.update(px, pz, car.x, car.z, steps * dt);
      if (res === 'finish') { if (rec) rec.push([car.x, car.y, car.z, car.yaw, car.pitch, car.roll, car.steerVis, 0]); return steps * dt; }
      if (car.inWater || r.dist > 40) {
        const cp = prog.next > 0 ? track.checkpoints[prog.next - 1] : null;
        if (cp) car.reset(cp.x, cp.y, cp.z, Math.atan2(cp.tx, cp.tz)); else car.reset(track.start.x, track.start.y, track.start.z, track.start.yaw);
      }
    }
    return null;
  };

  DL.medalTimes = function (track) {
    if (track._medals) return track._medals;
    const bt = DL.runBot(track) || track.length / 30;
    const r1 = x => Math.round(x * 10) / 10;
    track._medals = { author: r1(bt), gold: r1(bt * 1.0), silver: r1(bt * 1.12), bronze: r1(bt * 1.3) };
    return track._medals;
  };
  DL.medalFor = function (track, t) {
    const m = DL.medalTimes(track);
    if (t <= m.gold) return 'gold'; if (t <= m.silver) return 'silver'; if (t <= m.bronze) return 'bronze'; return null;
  };

  // ---------- ghost codec (15 Hz, quantised, delta-coded int16) ----------
  DL.GHOST_HZ = 15;
  const QS = [0.05, 0.05, 0.05, 0.004, 0.004, 0.004, 0.01, 1];
  DL.encodeGhost = function (frames) {
    // frames: array of 8-number arrays
    const n = frames.length; if (!n) return null;
    const q = frames.map(f => f.map((v, c) => Math.round(v / QS[c])));
    const buf = new Int16Array((n - 1) * 8);
    for (let i = 1; i < n; i++) for (let c = 0; c < 8; c++) {
      let v = c < 4 ? q[i][c] - q[i - 1][c] : q[i][c];
      buf[(i - 1) * 8 + c] = DL.clamp(v, -32768, 32767);
    }
    const bytes = new Uint8Array(buf.buffer); let s = '';
    for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return { v: 1, hz: DL.GHOST_HZ, n, f0: q[0], d: btoa(s) };
  };
  DL.decodeGhost = function (g) {
    if (!g || g.v !== 1 || !Array.isArray(g.f0) || typeof g.d !== 'string') return null;
    try {
      const bin = atob(g.d), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const buf = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
      const n = Math.min(g.n, buf.length / 8 + 1);
      const out = new Float32Array(n * 8), cur = g.f0.slice();
      for (let c = 0; c < 8; c++) out[c] = cur[c] * QS[c];
      for (let i = 1; i < n; i++) for (let c = 0; c < 8; c++) {
        const v = buf[(i - 1) * 8 + c];
        cur[c] = c < 4 ? cur[c] + v : v;
        out[i * 8 + c] = cur[c] * QS[c];
      }
      return { n, hz: g.hz || 15, f: out };
    } catch (e) { return null; }
  };
  DL.sampleGhost = function (gh, t, out) {
    const fi = t * gh.hz, i = Math.floor(fi), a = DL.clamp(i, 0, gh.n - 1), b = DL.clamp(i + 1, 0, gh.n - 1), k = DL.clamp(fi - i, 0, 1);
    for (let c = 0; c < 8; c++) out[c] = gh.f[a * 8 + c] + (gh.f[b * 8 + c] - gh.f[a * 8 + c]) * k;
    out.done = i >= gh.n - 1;
    return out;
  };

  // A run is accepted only if its recorded path is physically plausible and crosses every checkpoint in order.
  DL.validateRun = function (track, gh, time) {
    if (!gh || !isFinite(time)) return false;
    if (time < track.minTime || time > 1800) return false;
    const expect = time * gh.hz;
    if (gh.n < expect - 3 || gh.n > expect + 4) return false;
    const maxStep = 75 / gh.hz;
    const prog = new Progress(track);
    for (let i = 1; i < gh.n; i++) {
      const x0 = gh.f[(i - 1) * 8], z0 = gh.f[(i - 1) * 8 + 2], x1 = gh.f[i * 8], z1 = gh.f[i * 8 + 2];
      const d = Math.hypot(x1 - x0, z1 - z0);
      if (d > maxStep) {
        // only allowed as a recovery: the car reappears on the last checkpoint (or the start)
        const cp = prog.next > 0 ? track.checkpoints[prog.next - 1] : { x: track.start.x, z: track.start.z };
        if (Math.hypot(x1 - cp.x, z1 - cp.z) > 6) return false;
        continue;
      }
      prog.update(x0, z0, x1, z1, i / gh.hz);
    }
    return prog.next >= track.checkpoints.length;
  };

})(window.DL);
