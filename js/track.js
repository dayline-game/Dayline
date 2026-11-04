/* DAYLINE — deterministic daily track generation, ground queries and scene building */
'use strict';
(function (DL) {

  const STEP = 4;          // metres between centreline samples
  const HALF = 6.5;        // road half-width
  const SURF = { ROAD: 0, KERB: 1, GRAVEL: 2, OFF: 3, MUD: 4, SNOW: 5, SAND: 6 };
  DL.SURF = SURF; DL.ROAD_HALF = HALF;
  // dailies from this day on get mud / snow / sand stretches on the road; earlier days stay exactly as they were raced
  DL.PATCH_FROM = '20261105';
  DL.TRACK_VER = 5;   // bump whenever track generation changes, then re-run `npm run digests`

  function Track(day, custom) {
    this.day = day; this.custom = custom || null;
    this.seed = custom ? DL.hashStr('community:' + custom.id) : DL.seedFor(day);
    const rnd = this.rnd = DL.mulberry32(this.seed);
    this.biomeKey = custom ? (DL.BIOMES[custom.biome] ? custom.biome : 'country') : DL.BIOME_KEYS[Math.floor(rnd() * DL.BIOME_KEYS.length)];
    this.B = DL.BIOMES[this.biomeKey];
    this.noise = DL.makeNoise(this.seed ^ 0x9e3779b9);
    this.half = HALF;
    this.water = this.B.water;
    this.seaDir = null;
    this._r = { i: 0, dist: 0, y: 0, lat: 0, t: 0, s: 0 };
    if (custom) this._customCenterline(custom.pts);
    else for (let attempt = 0; attempt < 6; attempt++) {
      this._genRnd = DL.mulberry32(this.seed + attempt * 7919);
      this._generateCenterline();
      if (this.length > 1900) break;
    }
    this._buildGrid();
    this._seaSetup();
    this._computeHeights();
    this._findShortcut();
    this._placeCheckpoints();
    this._placeRamps();
    this._placeObstacles();
    this._placePatches();
    this.minTime = this.length / 58;
  }
  DL.Track = Track;

  // ---------- terrain ----------
  Track.prototype.baseTerrain = function (x, z) {
    const B = this.B, n = this.noise;
    let h = n.fbm(x * B.scale, z * B.scale, 5) * B.amp * 1.6;
    if (this.biomeKey === 'mountain' || this.biomeKey === 'snow') {
      const r = 1 - Math.abs(n.n2(x * B.scale * 0.6 + 40, z * B.scale * 0.6 - 17));
      h += r * r * B.amp * 0.9 - B.amp * 0.3;
    }
    h += n.fbm(x / 45 + 100, z / 45 - 50, 2) * 2.2;
    if (this.seaDir) {
      const p = x * this.seaDir[0] + z * this.seaDir[1];
      if (p > this.seaEdge) h -= (p - this.seaEdge) * 0.22;
      h += 4;
    }
    return h;
  };

  // ---------- centreline ----------
  Track.prototype._generateCenterline = function () {
    const rnd = this._genRnd;
    const xs = [], zs = [];
    const grid = new Map();
    const cell = 20;
    const key = (x, z) => (Math.floor(x / cell) + 4096) * 8192 + (Math.floor(z / cell) + 4096);
    const add = (x, z) => {
      const k = key(x, z); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(xs.length); xs.push(x); zs.push(z);
    };
    const clear = (x, z, minIdx) => {
      const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
        const a = grid.get((cx + i + 4096) * 8192 + (cz + j + 4096)); if (!a) continue;
        for (const id of a) if (id < minIdx) { const dx = xs[id] - x, dz = zs[id] - z; if (dx * dx + dz * dz < 36 * 36) return false; }
      }
      return x * x + z * z < 1400 * 1400;
    };
    let x = 0, z = 0, hd = 0;
    add(x, z);
    const target = 2000 + rnd() * 700;
    let len = 0;
    const tryPath = (cmds) => {
      // cmds: array of [lengthMetres, curvature(1/R signed)]
      let cx = x, cz = z, ch = hd; const pts = [];
      for (const [L, k] of cmds) {
        const n = Math.max(1, Math.round(L / STEP));
        for (let s = 0; s < n; s++) {
          ch += k * STEP; cx += Math.sin(ch) * STEP; cz += Math.cos(ch) * STEP;
          if (!clear(cx, cz, xs.length + pts.length - 14)) return null;
          pts.push([cx, cz, ch]);
        }
      }
      return pts;
    };
    const commit = pts => { for (const p of pts) { add(p[0], p[1]); hd = p[2]; } x = pts[pts.length - 1][0]; z = pts[pts.length - 1][1]; len += pts.length * STEP; };
    // opening straight
    commit(tryPath([[70, 0]]));
    let fails = 0;
    while (len < target && fails < 90) {
      const r = rnd(), dir = rnd() < 0.5 ? -1 : 1;
      let cmds;
      if (r < 0.3) cmds = [[50 + rnd() * 110, 0]];
      else if (r < 0.62) { const R = 70 + rnd() * 80, a = (0.4 + rnd() * 0.8); cmds = [[R * a, dir / R]]; }
      else if (r < 0.84) { const R = 26 + rnd() * 18, a = (1.1 + rnd() * 1.4); cmds = [[R * a, dir / R], [24, 0]]; }
      else { const R = 38 + rnd() * 20; cmds = [[R * 0.6, dir / R], [12, 0], [R * 0.6, -dir / R], [20, 0]]; }
      let pts = tryPath(cmds);
      if (!pts) pts = tryPath(cmds.map(c => [c[0], -c[1]]));
      if (!pts) pts = tryPath(cmds.map(c => [c[0] * 0.5, c[1] * 1.3]));
      if (!pts) { fails++; continue; }
      commit(pts);
    }
    const tail = tryPath([[44, 0]]) || tryPath([[20, 0]]);
    if (tail) commit(tail);
    this._centerlineArrays(xs, zs);
  };

  // shared by generated and player-made tracks: turns sampled points into tangents, curvature and bounds
  Track.prototype._centerlineArrays = function (xs, zs) {
    const N = this.N = xs.length;
    this.px = Float32Array.from(xs); this.pz = Float32Array.from(zs);
    this.py = new Float32Array(N);
    this.tx = new Float32Array(N); this.tz = new Float32Array(N);
    this.s = new Float32Array(N); this.curv = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
      let dx = this.px[b] - this.px[a], dz = this.pz[b] - this.pz[a]; const l = Math.hypot(dx, dz) || 1;
      this.tx[i] = dx / l; this.tz[i] = dz / l;
      if (i > 0) this.s[i] = this.s[i - 1] + Math.hypot(this.px[i] - this.px[i - 1], this.pz[i] - this.pz[i - 1]);
    }
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 2), b = Math.min(N - 1, i + 2);
      const h1 = Math.atan2(this.tx[a], this.tz[a]), h2 = Math.atan2(this.tx[b], this.tz[b]);
      let d = h2 - h1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      this.curv[i] = d / Math.max(1, this.s[b] - this.s[a]);
    }
    this.length = this.s[N - 1];
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i < N; i++) { minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]); minZ = Math.min(minZ, zs[i]); maxZ = Math.max(maxZ, zs[i]); }
    this.bounds = { minX, maxX, minZ, maxZ };
  };

  // ---------- player-made tracks ----------
  // Catmull-Rom spline through the waypoints with a short straight lead-in and run-out, resampled every STEP metres.
  DL.customCenterline = function (pts) {
    const P = pts.map(p => [+p[0], +p[1]]), n = P.length;
    const d0 = [P[1][0] - P[0][0], P[1][1] - P[0][1]], l0 = Math.hypot(d0[0], d0[1]) || 1;
    const d1 = [P[n - 1][0] - P[n - 2][0], P[n - 1][1] - P[n - 2][1]], l1 = Math.hypot(d1[0], d1[1]) || 1;
    const Q = [[P[0][0] - d0[0] / l0 * 28, P[0][1] - d0[1] / l0 * 28]].concat(P, [[P[n - 1][0] + d1[0] / l1 * 28, P[n - 1][1] + d1[1] / l1 * 28]]);
    const m = Q.length, dense = [];
    const at = i => Q[Math.max(0, Math.min(m - 1, i))];
    for (let i = 0; i < m - 1; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(8, Math.ceil(seg / 2));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    dense.push(Q[m - 1]);
    const xs = [dense[0][0]], zs = [dense[0][1]];
    let acc = 0, last = dense[0];
    for (let i = 1; i < dense.length; i++) {
      let cur = dense[i], seg = Math.hypot(cur[0] - last[0], cur[1] - last[1]);
      while (acc + seg >= STEP) {
        const t = (STEP - acc) / seg, x = last[0] + (cur[0] - last[0]) * t, z = last[1] + (cur[1] - last[1]) * t;
        xs.push(x); zs.push(z); last = [x, z]; seg = Math.hypot(cur[0] - last[0], cur[1] - last[1]); acc = 0;
      }
      acc += seg; last = cur;
    }
    return { xs, zs };
  };
  DL.CUSTOM = { MIN_PTS: 3, MAX_PTS: 40, LIM: 1300, MIN_LEN: 500, MAX_LEN: 3800, MIN_R: 16 };
  DL.validateCustomTrack = function (pts) {
    const C = DL.CUSTOM;
    if (!Array.isArray(pts) || pts.length < C.MIN_PTS) return { ok: false, error: 'Add at least ' + C.MIN_PTS + ' points' };
    if (pts.length > C.MAX_PTS) return { ok: false, error: 'Too many points (max ' + C.MAX_PTS + ')' };
    for (const p of pts) if (!Array.isArray(p) || !isFinite(p[0]) || !isFinite(p[1]) || Math.abs(p[0]) > C.LIM || Math.abs(p[1]) > C.LIM) return { ok: false, error: 'A point is outside the map' };
    for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) < 30) return { ok: false, error: 'Points are too close together' };
    const { xs, zs } = DL.customCenterline(pts), N = xs.length, len = (N - 1) * STEP;
    if (len < C.MIN_LEN) return { ok: false, error: 'Track is too short (' + Math.round(len) + ' m, min ' + C.MIN_LEN + ')', length: len };
    if (len > C.MAX_LEN) return { ok: false, error: 'Track is too long (' + Math.round(len) + ' m, max ' + C.MAX_LEN + ')', length: len };
    for (let i = 0; i < N; i++) for (let j = i + 22; j < N; j++) {
      const dx = xs[i] - xs[j], dz = zs[i] - zs[j];
      if (dx * dx + dz * dz < 34 * 34) return { ok: false, error: 'The track crosses or touches itself', length: len, at: [xs[i], zs[i]] };
    }
    for (let i = 0; i + 6 < N; i++) {
      const h1 = Math.atan2(xs[i + 3] - xs[i], zs[i + 3] - zs[i]), h2 = Math.atan2(xs[i + 6] - xs[i + 3], zs[i + 6] - zs[i + 3]);
      let d = h2 - h1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) > 1e-4 && 12 / Math.abs(d) < C.MIN_R) return { ok: false, error: 'A corner is too tight to drive', length: len, at: [xs[i + 3], zs[i + 3]] };
    }
    return { ok: true, length: len };
  };
  Track.prototype._customCenterline = function (pts) {
    const c = DL.customCenterline(pts);
    this._centerlineArrays(c.xs, c.zs);
  };

  Track.prototype._buildGrid = function () {
    this.gcell = 16; this.grid = new Map();
    for (let i = 0; i < this.N; i++) {
      const k = this._gk(Math.floor(this.px[i] / 16), Math.floor(this.pz[i] / 16));
      let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(i);
    }
    this.colGrid = new Map();
  };
  Track.prototype._gk = (cx, cz) => (cx + 4096) * 8192 + (cz + 4096);

  Track.prototype._seaSetup = function () {
    if (!this.B.tilt) return;
    const a = this.rnd() * Math.PI * 2;
    this.seaDir = [Math.cos(a), Math.sin(a)];
    let mx = -1e9;
    for (let i = 0; i < this.N; i++) mx = Math.max(mx, this.px[i] * this.seaDir[0] + this.pz[i] * this.seaDir[1]);
    this.seaEdge = mx - 40;
  };

  Track.prototype._computeHeights = function () {
    const N = this.N, y = new Float32Array(N);
    for (let i = 0; i < N; i++) y[i] = this.baseTerrain(this.px[i], this.pz[i]);
    const smoothPass = (w) => {
      const c = Float32Array.from(y);
      for (let i = 0; i < N; i++) {
        let s = 0, n = 0;
        for (let j = -w; j <= w; j++) { const k = DL.clamp(i + j, 0, N - 1); s += c[k]; n++; }
        y[i] = s / n;
      }
    };
    smoothPass(7); smoothPass(7);
    const limit = (g, its) => {
      const md = g * STEP;
      for (let it = 0; it < its; it++) {
        for (let i = 1; i < N; i++) y[i] = DL.clamp(y[i], y[i - 1] - md, y[i - 1] + md);
        for (let i = N - 2; i >= 0; i--) y[i] = DL.clamp(y[i], y[i + 1] - md, y[i + 1] + md);
      }
    };
    limit(0.1, 4);
    // rolling hills and dips along the road (the surrounding terrain rises with them, see groundAt)
    const A = 6 + Math.min(this.B.amp, 50) * 0.24, n = this.noise;
    const off = this.off = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const s = this.s[i];
      off[i] = A * n.n2(s / 240 + 7, 3.3) + A * 0.35 * n.n2(s / 150 - 11, 9.1);
    }
    for (let i = 0; i < 14; i++) off[i] = off[14];
    for (let i = 0; i < N; i++) y[i] += off[i];
    if (this.water != null) for (let i = 0; i < N; i++) { const m = this.water + 2.2; if (y[i] < m) { off[i] += m - y[i]; y[i] = m; } }
    smoothPass(3);
    limit(0.125, 3);
    // flatten the start grid
    for (let i = 0; i < 14; i++) y[i] = y[14];
    this.py = y;
  };

  // ---------- road queries ----------
  Track.prototype.nearestRoad = function (x, z, out) {
    out = out || this._r;
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    let best = -1, bd = 1e18;
    for (let rad = 2; rad <= 5 && best < 0; rad += 3) {
      for (let i = -rad; i <= rad; i++) for (let j = -rad; j <= rad; j++) {
        const a = this.grid.get(this._gk(cx + i, cz + j)); if (!a) continue;
        for (let q = 0; q < a.length; q++) {
          const id = a[q], dx = this.px[id] - x, dz = this.pz[id] - z, d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = id; }
        }
      }
    }
    if (best < 0) { out.i = -1; out.dist = 999; out.y = 0; out.lat = 0; out.t = 0; out.s = 0; return out; }
    // project onto adjacent segments
    let bi = best, bt = 0, bdist = Math.sqrt(bd), blat = 0;
    for (let k = -1; k <= 0; k++) {
      const a = best + k, b = a + 1; if (a < 0 || b >= this.N) continue;
      const ax = this.px[a], az = this.pz[a], sx = this.px[b] - ax, sz = this.pz[b] - az;
      const L2 = sx * sx + sz * sz; let t = ((x - ax) * sx + (z - az) * sz) / L2; t = DL.clamp(t, 0, 1);
      const qx = ax + sx * t, qz = az + sz * t, d = Math.hypot(x - qx, z - qz);
      if (d <= bdist + 1e-6) { bdist = d; bi = a; bt = t; blat = (sx * (z - az) - sz * (x - ax)) / Math.sqrt(L2); }
    }
    out.i = bi; out.t = bt; out.dist = bdist; out.lat = blat;
    const b2 = Math.min(this.N - 1, bi + 1);
    out.y = this.py[bi] + (this.py[b2] - this.py[bi]) * bt;
    out.s = this.s[bi] + (this.s[b2] - this.s[bi]) * bt;
    return out;
  };

  Track.prototype.rampOffset = function (s) {
    for (const r of this.ramps) if (s >= r.s0 && s < r.s1) return r.h * (s - r.s0) / (r.s1 - r.s0);
    return 0;
  };

  // terrain height including the hills that rise beside the road
  Track.prototype._terrain = function (x, z, r) {
    let h = this.baseTerrain(x, z);
    const dist = r && r.i >= 0 ? r.dist : 999;
    if (this.off && dist < 999) h += this.off[r.i] * (1 - DL.smooth(HALF + 8, HALF + 62, dist));
    const above = this.water == null ? 1 : DL.smooth(this.water + 1, this.water + 7, h);
    if (above > 0) {
      const H = 9 + Math.min(this.B.amp, 60) * 0.3;
      const hl = this.noise.fbm(x / 130 + 300, z / 130 - 200, 3);
      h += (hl * 0.5 + 0.35) * H * DL.smooth(HALF + 16, HALF + 62, dist) * above;
    }
    return h;
  };

  // returns {y, surf}; visual=true gives the terrain-mesh height (sunk under the road)
  Track.prototype.groundAt = function (x, z, out, visual) {
    out = out || {};
    const r = this.nearestRoad(x, z);
    out.road = r;
    let y, surf;
    if (r.dist < HALF && !visual) { y = r.y + this.rampOffset(r.s); const pa = this.patches && this.patches.length ? this.patchAt(r.s) : null; surf = pa ? pa.surf : SURF.ROAD; }
    else if (r.dist < 999) {
      const th = this._terrain(x, z, r);
      const k = DL.smooth(HALF + 1.5, HALF + 30, r.dist);
      // physics: the verge is flush with the road; the visual mesh sinks only under the tarmac
      const base = visual ? (r.dist < HALF + 0.6 ? r.y - 0.32 : r.y - 0.04) : r.y;
      y = DL.lerp(base, th, k);
      surf = r.dist < HALF + 1.3 ? SURF.KERB : SURF.OFF;
    } else { y = this._terrain(x, z, null); surf = SURF.OFF; }
    const sc = this.shortcut;
    if (sc && (r.dist >= HALF || visual)) {
      const sx = sc.bx - sc.ax, sz = sc.bz - sc.az, L2 = sx * sx + sz * sz;
      let t = ((x - sc.ax) * sx + (z - sc.az) * sz) / L2;
      if (t > -0.05 && t < 1.05) {
        t = DL.clamp(t, 0, 1);
        const d = Math.hypot(x - (sc.ax + sx * t), z - (sc.az + sz * t));
        if (d < 18) {
          const ys = DL.lerp(sc.ay, sc.by, t) - (visual ? 0.3 : 0);
          y = DL.lerp(ys, y, DL.smooth(4, 18, d));
          if (d < 4.2 && r.dist >= HALF) surf = SURF.GRAVEL;
        }
      }
    }
    out.y = y; out.surf = surf;
    return out;
  };

  // ---------- features ----------
  Track.prototype._findShortcut = function () {
    this.shortcut = null;
    const N = this.N; let best = null, gain = 45;
    for (let i = 40; i < N - 60; i += 3) {
      for (let j = i + 40; j < Math.min(N - 30, i + 140); j += 3) {
        const d = Math.hypot(this.px[j] - this.px[i], this.pz[j] - this.pz[i]);
        if (d < 28 || d > 90) continue;
        const g = (this.s[j] - this.s[i]) - d * 1.6;
        if (g <= gain) continue;
        if (Math.abs(this.py[j] - this.py[i]) / d > 0.14) continue;
        let ok = true;
        for (let q = 1; q < 12 && ok; q++) {
          const t = q / 12, x = DL.lerp(this.px[i], this.px[j], t), z = DL.lerp(this.pz[i], this.pz[j], t);
          const r = this.nearestRoad(x, z, {});
          if (t > 0.2 && t < 0.8 && r.dist < HALF + 7) ok = false;
          if (r.i > i + 8 && r.i < j - 8 && r.dist < HALF + 7) ok = false;
          if (r.i > j + 4 || r.i < i - 4) { if (r.dist < HALF + 10) ok = false; }
          if (this.water != null && this.baseTerrain(x, z) < this.water - 3) ok = false;
        }
        if (ok) { gain = g; best = [i, j]; }
      }
    }
    if (best) {
      const [i, j] = best;
      this.shortcut = { ia: i, ib: j, ax: this.px[i], az: this.pz[i], ay: this.py[i], bx: this.px[j], bz: this.pz[j], by: this.py[j] };
    }
  };

  Track.prototype._placeCheckpoints = function () {
    const N = this.N, cnt = DL.clamp(Math.round(this.length / 300), 6, 10);
    const cps = [];
    for (let k = 1; k < cnt; k++) {
      let i = Math.round((N - 1) * k / cnt);
      const sc = this.shortcut;
      if (sc && i > sc.ia - 6 && i < sc.ib + 6) i = (i - sc.ia < sc.ib - i) ? sc.ia - 8 : sc.ib + 8;
      cps.push(i);
    }
    cps.push(N - 6);
    const uniq = [...new Set(cps)].sort((a, b) => a - b).filter(i => i > 20);
    this.checkpoints = uniq.map(i => ({ i, x: this.px[i], y: this.py[i], z: this.pz[i], tx: this.tx[i], tz: this.tz[i] }));
    this.start = { i: 4, x: this.px[4], y: this.py[4], z: this.pz[4], yaw: Math.atan2(this.tx[4], this.tz[4]) };
  };

  Track.prototype._straightAt = function (i, span) {
    for (let k = i - span; k <= i + span; k++) { if (k < 0 || k >= this.N) return false; if (Math.abs(this.curv[k]) > 0.006) return false; }
    return true;
  };

  Track.prototype._placeRamps = function () {
    this.ramps = [];
    const rnd = DL.mulberry32(this.seed ^ 0x51ed);
    const want = 1 + Math.floor(rnd() * 2);
    const cand = [];
    for (let i = 30; i < this.N - 40; i += 2) if (this._straightAt(i, 9)) cand.push(i);
    for (let n = 0; n < 30 && this.ramps.length < want && cand.length; n++) {
      const i = cand[Math.floor(rnd() * cand.length)];
      if (this.ramps.some(r => Math.abs(r.i0 - i) < 60)) continue;
      if (this.checkpoints.some(c => Math.abs(c.i - i) < 10)) continue;
      if (this.shortcut && i > this.shortcut.ia - 10 && i < this.shortcut.ib + 10) continue;
      this.ramps.push({ i0: i, i1: i + 4, s0: this.s[i], s1: this.s[i + 4], h: 2.4 });
    }
  };

  // loose-surface stretches across the full road width: mud on most maps, packed snow on snowy maps, sand in the desert
  Track.prototype._placePatches = function () {
    this.patches = [];
    if (this.custom || !(this.day >= DL.PATCH_FROM)) return;
    const rnd = DL.mulberry32(this.seed ^ 0x6d7564);       // own stream: other features are unaffected
    const kind = this.biomeKey === 'snow' ? 'snow' : this.biomeKey === 'desert' ? 'sand' : 'mud';
    const want = (kind === 'snow' ? 3 : 2) + (rnd() < 0.35 ? 1 : 0);
    for (let n = 0; n < 80 && this.patches.length < want; n++) {
      const len = 15 + Math.floor(rnd() * 16);                // 60–120 m
      const i0 = 28 + Math.floor(rnd() * Math.max(1, this.N - 70 - len)), i1 = i0 + len;
      if (this.ramps.some(r => i1 > r.i0 - 12 && i0 < r.i1 + 8)) continue;
      if (this.patches.some(p => i1 > p.i0 - 35 && i0 < p.i1 + 35)) continue;
      this.patches.push({ i0, i1, s0: this.s[i0], s1: this.s[i1], kind, surf: kind === 'snow' ? SURF.SNOW : kind === 'sand' ? SURF.SAND : SURF.MUD });
    }
    this.patches.sort((a, b) => a.i0 - b.i0);
  };
  Track.prototype.patchAt = function (s) {
    const P = this.patches; if (!P || !P.length) return null;
    for (let k = 0; k < P.length; k++) if (s >= P[k].s0 && s < P[k].s1) return P[k];
    return null;
  };

  Track.prototype._addCollider = function (c) {
    const k = this._gk(Math.floor(c.x / 20), Math.floor(c.z / 20));
    let a = this.colGrid.get(k); if (!a) this.colGrid.set(k, a = []); a.push(c);
  };
  Track.prototype.collidersNear = function (x, z, out) {
    out.length = 0;
    const cx = Math.floor(x / 20), cz = Math.floor(z / 20);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = this.colGrid.get(this._gk(cx + i, cz + j)); if (a) for (const c of a) out.push(c);
    }
    return out;
  };

  Track.prototype._placeObstacles = function () {
    this.obstacles = [];
    const rnd = DL.mulberry32(this.seed ^ 0xb0b);
    // barrel slaloms on straights
    const used = this.ramps.map(r => r.i0);
    let placed = 0;
    for (let n = 0; n < 60 && placed < 2; n++) {
      const i = 40 + Math.floor(rnd() * (this.N - 100));
      if (!this._straightAt(i, 12)) continue;
      if (used.some(u => Math.abs(u - i) < 40)) continue;
      if (this.checkpoints.some(c => Math.abs(c.i - i) < 12)) continue;
      used.push(i); placed++;
      for (let k = 0; k < 3; k++) {
        const j = i - 6 + k * 6, side = (k % 2 ? -1 : 1) * 3.0;
        const nx = -this.tz[j], nz = this.tx[j];
        this.obstacles.push({ kind: 'barrel', x: this.px[j] + nx * side, z: this.pz[j] + nz * side, y: this.py[j], r: 0.85 });
        this.obstacles.push({ kind: 'barrel', x: this.px[j] + nx * (side + Math.sign(side) * 1.8), z: this.pz[j] + nz * (side + Math.sign(side) * 1.8), y: this.py[j], r: 0.85 });
      }
    }
    // barrier blocks on the outside of tight corners
    for (let i = 10; i < this.N - 10; i += 2) {
      const c = this.curv[i];
      if (Math.abs(c) < 1 / 48) continue;
      const side = c > 0 ? -1 : 1;           // outside of the bend
      const off = side * (HALF + 3.2);
      const nx = -this.tz[i], nz = this.tx[i];
      const x = this.px[i] + nx * off, z = this.pz[i] + nz * off;
      const r = this.nearestRoad(x, z, {});
      if (r.dist < HALF + 2.5) continue;
      this.obstacles.push({ kind: 'block', x, z, y: this.groundAt(x, z, {}, true).y, r: 1.25, yaw: Math.atan2(this.tx[i], this.tz[i]), alt: (i >> 1) & 1 });
    }
    for (const o of this.obstacles) this._addCollider(o);
  };

  // ======================================================================
  //  Scene building (Three.js)
  // ======================================================================
  const col = (hex) => new THREE.Color(hex);

  DL.mergeColored = function (parts) {
    // parts: [{geo, color, matrix?}]
    let total = 0;
    const geos = parts.map(p => {
      let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
      if (p.matrix) g.applyMatrix4(p.matrix);
      total += g.attributes.position.count; return g;
    });
    const pos = new Float32Array(total * 3), colr = new Float32Array(total * 3);
    let o = 0;
    geos.forEach((g, gi) => {
      const c = col(parts[gi].color), a = g.attributes.position.array;
      pos.set(a, o * 3);
      for (let i = 0; i < g.attributes.position.count; i++) { colr[(o + i) * 3] = c.r; colr[(o + i) * 3 + 1] = c.g; colr[(o + i) * 3 + 2] = c.b; }
      o += g.attributes.position.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    out.computeVertexNormals();
    return out;
  };
  const M4 = (x, y, z, sx, sy, sz, ry) => {
    const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1));
    return m;
  };

  function propGeometry(type) {
    switch (type) {
      case 'pine': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(0.25, 0.35, 2, 5), color: 0x6b5442, matrix: M4(0, 1, 0) },
        { geo: new THREE.ConeGeometry(2.2, 4, 6), color: 0x4f6b55, matrix: M4(0, 3.6, 0) },
        { geo: new THREE.ConeGeometry(1.6, 3.2, 6), color: 0x5a7a5f, matrix: M4(0, 5.6, 0) }]);
      case 'snowpine': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(0.25, 0.35, 2, 5), color: 0x5e4c3f, matrix: M4(0, 1, 0) },
        { geo: new THREE.ConeGeometry(2.2, 4, 6), color: 0x4c6a63, matrix: M4(0, 3.6, 0) },
        { geo: new THREE.ConeGeometry(1.6, 3.2, 6), color: 0xf1f4f7, matrix: M4(0, 5.6, 0) }]);
      case 'round': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(0.25, 0.35, 2.2, 5), color: 0x6b5442, matrix: M4(0, 1.1, 0) },
        { geo: new THREE.IcosahedronGeometry(2, 0), color: 0x7b9467, matrix: M4(0, 3.6, 0, 1, 0.9, 1) }]);
      case 'palm': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(0.2, 0.32, 6, 5), color: 0x8a6e52, matrix: M4(0.3, 3, 0) },
        { geo: new THREE.ConeGeometry(2.6, 1.0, 7), color: 0x6f8f5c, matrix: M4(0.5, 6.1, 0) }]);
      case 'cactus': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(0.4, 0.45, 4, 6), color: 0x6f8a63, matrix: M4(0, 2, 0) },
        { geo: new THREE.CylinderGeometry(0.28, 0.3, 1.6, 6), color: 0x6f8a63, matrix: M4(0.8, 2.6, 0) },
        { geo: new THREE.CylinderGeometry(0.28, 0.3, 1.3, 6), color: 0x6f8a63, matrix: M4(-0.75, 2.2, 0) }]);
      case 'rock': return DL.mergeColored([{ geo: new THREE.DodecahedronGeometry(1.2, 0), color: 0x8c949d, matrix: M4(0, 0.4, 0, 1.2, 0.7, 1) }]);
      case 'boulder': return DL.mergeColored([{ geo: new THREE.DodecahedronGeometry(3, 0), color: 0x858d96, matrix: M4(0, 1, 0, 1.3, 0.8, 1.1) }]);
      case 'bush': return DL.mergeColored([
        { geo: new THREE.IcosahedronGeometry(0.9, 0), color: 0x6f8a5a, matrix: M4(0, 0.6, 0, 1.2, 0.8, 1.1) },
        { geo: new THREE.IcosahedronGeometry(0.65, 0), color: 0x7f9a66, matrix: M4(0.9, 0.45, 0.3) }]);
      case 'shrub': return DL.mergeColored([
        { geo: new THREE.IcosahedronGeometry(0.8, 0), color: 0x9a9a6a, matrix: M4(0, 0.45, 0, 1.3, 0.6, 1.2) },
        { geo: new THREE.IcosahedronGeometry(0.5, 0), color: 0xb0a572, matrix: M4(0.8, 0.3, -0.2) }]);
      case 'house': return DL.mergeColored([
        { geo: new THREE.BoxGeometry(6, 3.6, 5), color: 0xf0e6d2, matrix: M4(0, 1.8, 0) },
        { geo: new THREE.ConeGeometry(4.9, 2.6, 4), color: 0xd9644a, matrix: M4(0, 4.9, 0, 1, 1, 0.85, Math.PI / 4) },
        { geo: new THREE.BoxGeometry(0.9, 1.7, 0.1), color: 0x3a4658, matrix: M4(0, 0.85, 2.52) },
        { geo: new THREE.BoxGeometry(0.9, 0.9, 0.1), color: 0x7e93a6, matrix: M4(-1.9, 2.2, 2.52) },
        { geo: new THREE.BoxGeometry(0.9, 0.9, 0.1), color: 0x7e93a6, matrix: M4(1.9, 2.2, 2.52) }]);
      case 'barn': return DL.mergeColored([
        { geo: new THREE.BoxGeometry(8, 4, 6), color: 0xb5503c, matrix: M4(0, 2, 0) },
        { geo: new THREE.CylinderGeometry(3.6, 3.6, 8.1, 3), color: 0x5b6572, matrix: new THREE.Matrix4().makeRotationZ(Math.PI / 2).premultiply(M4(0, 5.4, 0)) },
        { geo: new THREE.BoxGeometry(2.4, 3, 0.1), color: 0xf4ecdc, matrix: M4(0, 1.5, 3.02) }]);
      case 'windmill': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(1.2, 2.2, 9, 8), color: 0xf1e8d6, matrix: M4(0, 4.5, 0) },
        { geo: new THREE.ConeGeometry(2, 2.4, 8), color: 0xb5503c, matrix: M4(0, 10.1, 0) },
        { geo: new THREE.BoxGeometry(0.4, 8, 0.15), color: 0xf4ecdc, matrix: M4(0, 8.6, 1.4, 1, 1, 1, 0) },
        { geo: new THREE.BoxGeometry(8, 0.4, 0.15), color: 0xf4ecdc, matrix: M4(0, 8.6, 1.4, 1, 1, 1, 0) }]);
      case 'lighthouse': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(1.5, 2.4, 16, 8), color: 0xf4ecdc, matrix: M4(0, 8, 0) },
        { geo: new THREE.CylinderGeometry(1.7, 1.9, 2.2, 8), color: 0xf05a35, matrix: M4(0, 5, 0) },
        { geo: new THREE.CylinderGeometry(1.6, 1.6, 2.2, 8), color: 0xf05a35, matrix: M4(0, 11, 0) },
        { geo: new THREE.CylinderGeometry(2.3, 2.3, 0.4, 8), color: 0x1f2a3d, matrix: M4(0, 16.2, 0) },
        { geo: new THREE.CylinderGeometry(1.1, 1.1, 1.6, 8), color: 0xfff1b0, matrix: M4(0, 17.2, 0) },
        { geo: new THREE.ConeGeometry(1.5, 1.5, 8), color: 0x1f2a3d, matrix: M4(0, 18.7, 0) }]);
      case 'mesa': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(9, 14, 24, 7), color: 0xc08a62, matrix: M4(0, 12, 0) },
        { geo: new THREE.CylinderGeometry(9.4, 9, 3, 7), color: 0xd7a77c, matrix: M4(0, 20, 0) },
        { geo: new THREE.CylinderGeometry(8.6, 9.4, 4, 7), color: 0xa9724f, matrix: M4(0, 24.5, 0) }]);
      case 'sign': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(0.07, 0.07, 2, 5), color: 0x4b5563, matrix: M4(0, 1, 0) },
        { geo: new THREE.BoxGeometry(1.6, 1.1, 0.1), color: 0x1f2a3d, matrix: M4(0, 2.1, 0) },
        { geo: new THREE.ConeGeometry(0.4, 0.8, 3), color: 0xf4ecdc, matrix: M4(0, 2.1, 0.07, 1, 1, 0.2, 0) },
        { geo: new THREE.BoxGeometry(1.6, 0.18, 0.12), color: 0xf05a35, matrix: M4(0, 2.62, 0) }]);
      case 'pole': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(0.12, 0.16, 8, 5), color: 0x6b5442, matrix: M4(0, 4, 0) },
        { geo: new THREE.BoxGeometry(2.4, 0.16, 0.16), color: 0x6b5442, matrix: M4(0, 7.4, 0) },
        { geo: new THREE.BoxGeometry(2.4, 0.16, 0.16), color: 0x6b5442, matrix: M4(0, 6.7, 0) }]);
      case 'stand': return DL.mergeColored([
        { geo: new THREE.BoxGeometry(18, 1.2, 4), color: 0x4b5563, matrix: M4(0, 0.6, 0) },
        { geo: new THREE.BoxGeometry(18, 1.2, 3), color: 0x5a6574, matrix: M4(0, 1.8, 1.0) },
        { geo: new THREE.BoxGeometry(18, 1.2, 2), color: 0x6a7584, matrix: M4(0, 3.0, 2.0) },
        { geo: new THREE.BoxGeometry(18.4, 0.3, 5), color: 0xf05a35, matrix: M4(0, 5.6, 1.4) },
        { geo: new THREE.BoxGeometry(0.3, 5.6, 0.3), color: 0x1f2a3d, matrix: M4(-9, 2.8, -1.6) },
        { geo: new THREE.BoxGeometry(0.3, 5.6, 0.3), color: 0x1f2a3d, matrix: M4(9, 2.8, -1.6) }].concat(
          Array.from({ length: 18 }, (_, k) => ({ geo: new THREE.BoxGeometry(0.6, 0.9, 0.6), color: [0xf05a35, 0xf4ecdc, 0x7e93a6, 0xe6b84f][k % 4], matrix: M4(-8 + k * 0.95, 1.65 + (k % 3) * 1.2, 0.2 + (k % 3) * 1.0) }))));
      case 'flagpole': return DL.mergeColored([
        { geo: new THREE.CylinderGeometry(0.06, 0.08, 6, 5), color: 0xe8e1d2, matrix: M4(0, 3, 0) },
        { geo: new THREE.BoxGeometry(1.4, 0.8, 0.05), color: 0xf05a35, matrix: M4(0.75, 5.5, 0) }]);
      case 'haybale': return DL.mergeColored([{ geo: new THREE.CylinderGeometry(1, 1, 1.6, 8), color: 0xd8bb78, matrix: new THREE.Matrix4().makeRotationZ(Math.PI / 2).premultiply(M4(0, 1, 0)) }]);
    }
  }
  const PROP_RADIUS = { pine: 0.7, snowpine: 0.7, round: 0.7, palm: 0.5, cactus: 0.6, rock: 1.1, boulder: 3.0, haybale: 1.1, bush: 0, shrub: 0, house: 4.2, barn: 5, windmill: 2.4, lighthouse: 2.4, mesa: 0, sign: 0.5, pole: 0.35, stand: 0, flagpole: 0.2 };

  DL.buildTrackScene = function (track, scene, opts) {
    opts = opts || {};
    const B = track.B, group = new THREE.Group();
    const flat = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true }, extra || {}));

    // ---- terrain ----
    const margin = 260, cs = opts.lowQuality ? 9 : 6;
    const { minX, maxX, minZ, maxZ } = track.bounds;
    const x0 = minX - margin, z0 = minZ - margin;
    const nx = Math.ceil((maxX - minX + margin * 2) / cs), nz = Math.ceil((maxZ - minZ + margin * 2) / cs);
    const H = new Float32Array((nx + 1) * (nz + 1)), D = new Float32Array((nx + 1) * (nz + 1)), G = new Uint8Array((nx + 1) * (nz + 1));
    const tmp = {};
    let hmin = 1e9, hmax = -1e9;
    const jr = DL.mulberry32(track.seed ^ 0x77);
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + i * cs, z = z0 + j * cs;
      track.groundAt(x, z, tmp, true);
      const k = j * (nx + 1) + i;
      H[k] = tmp.y; D[k] = tmp.road.dist; G[k] = tmp.surf === SURF.GRAVEL ? 1 : 0;
      if (tmp.y < hmin) hmin = tmp.y; if (tmp.y > hmax) hmax = tmp.y;
    }
    const triCount = nx * nz * 2;
    const pos = new Float32Array(triCount * 9), cl = new Float32Array(triCount * 9);
    const gc = B.ground.map(col), shoulder = col(0xa7967f), gravel = col(0xbfa57d), shore = col(0xd8c8a2);
    let p = 0;
    const vtx = (i, j) => [x0 + i * cs, H[j * (nx + 1) + i], z0 + j * cs];
    const c3 = new THREE.Color();
    const pushTri = (a, b, c, ka, kb, kc) => {
      pos.set(a, p); pos.set(b, p + 3); pos.set(c, p + 6);
      const hy = (a[1] + b[1] + c[1]) / 3, d = Math.min(D[ka], D[kb], D[kc]);
      // slope via normal
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nyv = ux * vz - uz * vx, nl = Math.hypot(uy * vz - uz * vy, nyv, ux * vy - uy * vx) || 1, slope = 1 - Math.abs(nyv) / nl;
      const t = (hy - hmin) / Math.max(1, hmax - hmin);
      let base;
      if (slope > 0.42) base = gc[3];
      else if (t > 0.82 && (track.biomeKey === 'mountain' || track.biomeKey === 'snow')) base = gc[4];
      else if (t > 0.58) base = gc[2];
      else if (t > 0.3) base = gc[1];
      else base = gc[0];
      c3.copy(base);
      if (track.water != null && hy < track.water + 1.6 && hy > track.water - 4) c3.lerp(shore, 0.7);
      if (d < HALF + 9) c3.lerp(shoulder, 0.55 * (1 - DL.smooth(HALF, HALF + 9, d)));
      if (G[ka] + G[kb] + G[kc] >= 2) c3.copy(gravel);
      const jit = 0.95 + jr() * 0.1; c3.multiplyScalar(jit);
      for (let q = 0; q < 3; q++) { cl[p + q * 3] = c3.r; cl[p + q * 3 + 1] = c3.g; cl[p + q * 3 + 2] = c3.b; }
      p += 9;
    };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k00 = j * (nx + 1) + i, k10 = k00 + 1, k01 = k00 + nx + 1, k11 = k01 + 1;
      const a = vtx(i, j), b = vtx(i + 1, j), c = vtx(i, j + 1), d = vtx(i + 1, j + 1);
      if ((i + j) & 1) { pushTri(a, c, b, k00, k01, k10); pushTri(b, c, d, k10, k01, k11); }
      else { pushTri(a, c, d, k00, k01, k11); pushTri(a, d, b, k00, k11, k10); }
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    tg.computeVertexNormals();
    const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    terrain.receiveShadow = true;
    group.add(terrain);

    // ---- road ribbon, kerbs, centre line ----
    const N = track.N;
    const ribbon = (offA, offB, yAdd, colorFn, every) => {
      const P = [], C = [], I = [];
      let v = 0;
      for (let i = 0; i < N; i++) {
        const nxv = -track.tz[i], nzv = track.tx[i];
        const y = track.py[i] + yAdd;
        P.push(track.px[i] + nxv * offA, y, track.pz[i] + nzv * offA, track.px[i] + nxv * offB, y, track.pz[i] + nzv * offB);
        const c = col(colorFn(i)); C.push(c.r, c.g, c.b, c.r, c.g, c.b);
        if (i > 0 && (!every || every(i))) I.push(v - 2, v - 1, v, v - 1, v + 1, v);
        v += 2;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.setIndex(I); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 - yAdd * 10 }));
      m.receiveShadow = true; return m;
    };
    const roadC = track.biomeKey === 'snow' ? 0x56606c : 0x3d4451;
    group.add(ribbon(-HALF, HALF, 0.02, i => roadC + ((i * 7) % 3 === 0 ? 0x020202 : 0)));
    const tight = i => Math.abs(track.curv[i]) > 1 / 60;
    group.add(ribbon(-HALF, -HALF + 0.9, 0.05, i => tight(i) ? (((i >> 1) & 1) ? 0xf05a35 : 0xf4ecdc) : 0xf4ecdc, i => tight(i) || (i % 1 === 0)));
    group.add(ribbon(HALF - 0.9, HALF, 0.05, i => tight(i) ? (((i >> 1) & 1) ? 0xf05a35 : 0xf4ecdc) : 0xf4ecdc));
    group.add(ribbon(-0.18, 0.18, 0.05, () => 0xe8dcc0, i => (i % 4) < 2));

    // mud / snow / sand stretches: ragged-edged overlay with tyre ruts, puddles and a warning sign
    const PATCH_LOOK = {
      mud: { a: 0x5e4430, b: 0x684b33, rut: 0x46321f, puddle: 0x55606a, sign: 'mud' },
      snow: { a: 0xeef2f6, b: 0xe2e9f0, rut: 0xbfcad6, puddle: 0xcfe0ee, sign: 'snow' },
      sand: { a: 0xd8be8f, b: 0xcfb27f, rut: 0xb89a6a, puddle: null, sign: 'sand' }
    };
    for (const pa of (track.patches || [])) {
      const look = PATCH_LOOK[pa.kind], jr = DL.mulberry32(track.seed ^ pa.i0 * 977);
      const P = [], C = [], I = []; let v = 0;
      const i0 = Math.max(0, pa.i0 - 1), i1 = Math.min(N - 1, pa.i1 + 1);
      for (let i = i0; i <= i1; i++) {
        const nxv = -track.tz[i], nzv = track.tx[i], y = track.py[i] + 0.075;
        const end = Math.min(i - i0, i1 - i);
        const taper = end === 0 ? 0.45 : end === 1 ? 0.8 : 1;
        const wl = (HALF + 0.3 + jr() * 0.9) * taper, wr = (HALF + 0.3 + jr() * 0.9) * taper;
        const sh = end === 0 ? (jr() - 0.5) * 3 : 0;
        P.push(track.px[i] + nxv * -wl + track.tx[i] * sh, y, track.pz[i] + nzv * -wl + track.tz[i] * sh,
               track.px[i], y, track.pz[i],
               track.px[i] + nxv * wr - track.tx[i] * sh, y, track.pz[i] + nzv * wr - track.tz[i] * sh);
        for (let k = 0; k < 3; k++) { const c = col(jr() < 0.5 ? look.a : look.b); C.push(c.r, c.g, c.b); }
        if (i > i0) I.push(v - 3, v - 2, v, v - 2, v + 1, v, v - 2, v - 1, v + 1, v - 1, v + 2, v + 1);
        v += 3;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.setIndex(I); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true, polygonOffset: true, polygonOffsetFactor: -3 }));
      m.receiveShadow = true; group.add(m);
      // tyre ruts
      const rutM = new THREE.MeshLambertMaterial({ color: look.rut, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 });
      for (const off of [-2.6, -1.0, 1.0, 2.6]) {
        const Pr = [], Ir = []; let w = 0;
        for (let i = pa.i0 + 1; i <= pa.i1 - 1; i++) {
          const nxv = -track.tz[i], nzv = track.tx[i], y = track.py[i] + 0.09, o = off + Math.sin(i * 0.7 + off) * 0.25;
          Pr.push(track.px[i] + nxv * (o - 0.28), y, track.pz[i] + nzv * (o - 0.28), track.px[i] + nxv * (o + 0.28), y, track.pz[i] + nzv * (o + 0.28));
          if (i > pa.i0 + 1) Ir.push(w - 2, w - 1, w, w - 1, w + 1, w); w += 2;
        }
        const gr = new THREE.BufferGeometry(); gr.setAttribute('position', new THREE.Float32BufferAttribute(Pr, 3)); gr.setIndex(Ir); gr.computeVertexNormals();
        const mr = new THREE.Mesh(gr, rutM); mr.receiveShadow = true; group.add(mr);
      }
      // puddles (mud) / drifts (snow)
      const blobM = look.puddle != null ? new THREE.MeshLambertMaterial({ color: look.puddle, polygonOffset: true, polygonOffsetFactor: -5 }) : null;
      for (let k = 0; blobM && k < 3; k++) {
        const i = pa.i0 + 3 + Math.floor(jr() * Math.max(1, pa.i1 - pa.i0 - 6)), lat = (jr() - 0.5) * HALF * 1.3;
        const b = new THREE.Mesh(new THREE.CircleGeometry(1, 9), blobM);
        b.rotation.x = -Math.PI / 2; b.rotation.z = jr() * 3;
        b.scale.set(1.4 + jr() * 1.6, 0.9 + jr() * 0.8, 1);
        b.position.set(track.px[i] - track.tz[i] * lat, track.py[i] + 0.1, track.pz[i] + track.tx[i] * lat);
        b.receiveShadow = true; group.add(b);
      }
      if (pa.kind === 'snow') {
        const dm = flat(0xf4f7fa);
        for (const sg of [-1, 1]) for (let i = pa.i0 + 1; i < pa.i1; i += 2) {
          const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), dm);
          const lat = sg * (HALF + 0.6 + jr() * 0.8);
          b.scale.set(1.2 + jr(), 0.35 + jr() * 0.3, 1.6 + jr());
          b.position.set(track.px[i] - track.tz[i] * lat, track.py[i] + 0.05, track.pz[i] + track.tx[i] * lat);
          b.castShadow = true; b.receiveShadow = true; group.add(b);
        }
      }
      // warning sign on both sides, ~36 m before
      const si = Math.max(1, pa.i0 - 9);
      const yawS = Math.atan2(track.tx[si], track.tz[si]);
      for (const sg of [-1, 1]) {
        const lat = sg * (HALF + 2.4), x = track.px[si] - track.tz[si] * lat, z = track.pz[si] + track.tx[si] * lat;
        const gy = track.groundAt(x, z, tmp, true).y;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 0.16), flat(0x2a3140)); post.position.set(x, gy + 1.2, z); post.castShadow = true; group.add(post);
        const sgn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.25, 0.08), new THREE.MeshLambertMaterial({ map: patchSignTex(look.sign) }));
        sgn.position.set(x, gy + 2.5, z); sgn.rotation.y = yawS + Math.PI; sgn.castShadow = true; group.add(sgn);
      }
    }

    // shortcut gravel track
    if (track.shortcut) {
      const sc = track.shortcut, n = 24, P = [], I = [];
      const dx = sc.bx - sc.ax, dz = sc.bz - sc.az, l = Math.hypot(dx, dz), px = -dz / l * 3.6, pz = dx / l * 3.6;
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = sc.ax + dx * t, z = sc.az + dz * t;
        const ya = track.groundAt(x + px, z + pz, tmp, true).y, yb = track.groundAt(x - px, z - pz, tmp, true).y;
        P.push(x + px, ya + 0.06, z + pz, x - px, yb + 0.06, z - pz);
        if (k > 0) { const v = k * 2; I.push(v - 2, v - 1, v, v - 1, v + 1, v); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xbca27a, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.receiveShadow = true; group.add(m);
    }

    // ---- ramps ----
    for (const r of track.ramps) {
      buildRampFrame(r);
    }
    // steel structure under and around a ramp (visual only; physics uses rampOffset)
    function buildRampFrame(r) {
      const steel = flat(0x2a3140), steelL = flat(0x4b5b74), coral = flat(0xf05a35), cream = flat(0xf4ecdc);
      const a = r.i0, b = r.i1, L = r.s1 - r.s0, H = r.h;
      const fx = (track.px[b] - track.px[a]) / L, fz = (track.pz[b] - track.pz[a]) / L;
      const nx = -fz, nz = fx, yaw = Math.atan2(fx, fz);
      const roadY = u => { const t = DL.clamp(u / L, 0, 1); return track.py[a] + (track.py[b] - track.py[a]) * t + 0.04; };
      const deck = u => H * DL.clamp(u / L, 0, 1);
      const P = (u, lat, up) => [track.px[a] + fx * u + nx * lat, roadY(u) + up, track.pz[a] + fz * u + nz * lat];
      const frame = new THREE.Group(); group.add(frame);
      const beam = (p, q, w, h, mat) => {   // box from point p to point q
        const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], len = Math.hypot(dx, dy, dz);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), mat);
        m.position.set((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
        m.rotation.order = 'YXZ'; m.rotation.y = Math.atan2(dx, dz); m.rotation.x = -Math.atan2(dy, Math.hypot(dx, dz));
        m.castShadow = true; m.receiveShadow = true; frame.add(m); return m;
      };
      const box = (w, h, d, mat, p) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(p[0], p[1], p[2]); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true; frame.add(m); return m;
      };
      const STEPU = L / 8;
      // deck: hard-edged coral / cream bands with a dark fascia edge so it reads as a solid plate
      {
        const Pp = [], Cc = [], Ii = []; let v = 0;
        const quad = (p0, p1, p2, p3, c) => { Pp.push(...p0, ...p1, ...p2, ...p3); for (let k = 0; k < 4; k++) Cc.push(c.r, c.g, c.b); Ii.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); v += 4; };
        const cc = col(0xf05a35), cw = col(0xf4ecdc), cn = col(0x2a3140);
        const NB = 8;
        for (let k = 0; k < NB; k++) {
          const u0 = k * L / NB, u1 = (k + 1) * L / NB, c = k % 2 ? cw : cc;
          quad(P(u0, -HALF, deck(u0)), P(u0, HALF, deck(u0)), P(u1, -HALF, deck(u1)), P(u1, HALF, deck(u1)), c);
          for (const sg of [-1, 1]) quad(P(u0, sg * HALF, deck(u0)), P(u1, sg * HALF, deck(u1)), P(u0, sg * HALF, deck(u0) - 0.28), P(u1, sg * HALF, deck(u1) - 0.28), cn);
        }
        quad(P(L, -HALF, H), P(L, HALF, H), P(L, -HALF, H - 0.28), P(L, HALF, H - 0.28), cn);
        const gd = new THREE.BufferGeometry();
        gd.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); gd.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
        gd.setIndex(Ii); gd.computeVertexNormals();
        const dm = new THREE.Mesh(gd, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true }));
        dm.castShadow = true; dm.receiveShadow = true; frame.add(dm);
      }
      for (const sg of [-1, 1]) {
        const lat = sg * (HALF - 0.12), latR = sg * (HALF + 0.05);
        beam(P(0, lat, 0.1), P(L, lat, 0.1), 0.24, 0.24, steel);                    // ground rail
        beam(P(0, lat, 0.0), P(L, lat, H - 0.14), 0.26, 0.26, steel);                // top chord under deck edge
        for (let k = 1; k <= 8; k++) {
          const u = k * STEPU, d = deck(u);
          if (d > 0.3) beam(P(u, lat, 0), P(u, lat, d - 0.1), 0.24, 0.24, steel);    // posts
          if (k > 1 && d > 0.6) {                                                      // alternating diagonals
            const u0 = (k - 1) * STEPU;
            if (k % 2) beam(P(u0, lat, 0.12), P(u, lat, d - 0.16), 0.14, 0.14, steelL);
            else beam(P(u0, lat, deck(u0) - 0.16), P(u, lat, 0.12), 0.14, 0.14, steelL);
          }
          if (k % 2 === 0 && d > 0.5) beam(P(u, -HALF + 0.12, d - 0.2), P(u, HALF - 0.12, d - 0.2), 0.2, 0.2, steel);  // cross beams
        }
        // guard rail
        for (const u of [STEPU * 2, STEPU * 4, STEPU * 6, L - 0.15]) beam(P(u, latR, deck(u)), P(u, latR, deck(u) + 0.8), 0.12, 0.12, steel);
        beam(P(STEPU * 2, latR, deck(STEPU * 2) + 0.8), P(L - 0.15, latR, H + 0.8), 0.14, 0.14, cream);
        beam(P(STEPU * 2, latR, deck(STEPU * 2) + 0.45), P(L - 0.15, latR, H + 0.45), 0.08, 0.08, coral);
      }
      // rear: X-bracing across the open back + kicker lip + hazard band
      beam(P(L - 0.05, -HALF + 0.2, 0.1), P(L - 0.05, HALF - 0.2, H - 0.3), 0.16, 0.16, steelL);
      beam(P(L - 0.05, HALF - 0.2, 0.1), P(L - 0.05, -HALF + 0.2, H - 0.3), 0.16, 0.16, steelL);
      box(HALF * 2 + 0.3, 0.22, 0.45, coral, P(L - 0.1, 0, H + 0.02));
      for (let k = 0; k < 6; k++) box((HALF * 2) / 6 - 0.15, 0.32, 0.06, k % 2 ? cream : coral, P(L + 0.03, -HALF + (k + 0.5) * (HALF * 2) / 6, H - 0.4));
      // entry plate
      box(HALF * 2, 0.08, 1.4, steelL, P(-0.5, 0, 0.0));
      // warning signs on the approach
      for (const sg of [-1, 1]) {
        const p = P(-38, sg * (HALF + 2.4), 0);
        p[1] = track.groundAt(p[0], p[2], {}, true).y;
        box(0.16, 2.4, 0.16, steel, [p[0], p[1] + 1.2, p[2]]);
        const s = box(1.6, 1.25, 0.08, new THREE.MeshLambertMaterial({ map: rampSignTex() }), [p[0], p[1] + 2.5, p[2]]);
        s.rotation.y = yaw + Math.PI;
      }
    }

    // ---- gates ----
    const gates = [];
    const makeGate = (cp, finish) => {
      const g = new THREE.Group();
      const post = new THREE.BoxGeometry(0.6, 6.5, 0.6);
      const navy = flat(0x1f2a3d), cream = flat(0xf4ecdc);
      const banner = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 3.4, 1.5, 0.4), finish ? new THREE.MeshLambertMaterial({ map: checkerTex() }) : cream);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 3.5, 0.35, 0.45), flat(0xf05a35));
      const l = new THREE.Mesh(post, navy), r2 = new THREE.Mesh(post, navy);
      l.position.set(-(HALF + 1.4), 3.25, 0); r2.position.set(HALF + 1.4, 3.25, 0);
      banner.position.set(0, 6.4, 0); stripe.position.set(0, 5.55, 0);
      [l, r2, banner, stripe].forEach(m => { m.castShadow = true; g.add(m); });
      g.position.set(cp.x, cp.y, cp.z);
      g.rotation.y = Math.atan2(cp.tx, cp.tz);
      g.userData.stripe = stripe; g.userData.banner = banner;
      group.add(g); return g;
    };
    track.checkpoints.forEach((cp, k) => gates.push(makeGate(cp, k === track.checkpoints.length - 1)));
    makeGate({ x: track.px[8], y: track.py[8], z: track.pz[8], tx: track.tx[8], tz: track.tz[8] }, true);
    // start grid stripe
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 1.2), new THREE.MeshLambertMaterial({ map: checkerTex(), polygonOffset: true, polygonOffsetFactor: -4 }));
    sl.rotation.set(-Math.PI / 2, Math.atan2(track.tx[8], track.tz[8]), 0, 'YXZ');
    sl.position.set(track.px[8], track.py[8] + 0.06, track.pz[8]);
    group.add(sl);

    // ---- obstacles ----
    const barrels = track.obstacles.filter(o => o.kind === 'barrel'), blocks = track.obstacles.filter(o => o.kind === 'block');
    if (barrels.length) {
      const bg = DL.mergeColored([
        { geo: new THREE.CylinderGeometry(0.8, 0.8, 1.4, 8), color: 0xf05a35, matrix: M4(0, 0.7, 0) },
        { geo: new THREE.CylinderGeometry(0.82, 0.82, 0.3, 8), color: 0xf4ecdc, matrix: M4(0, 0.8, 0) }]);
      const im = new THREE.InstancedMesh(bg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), barrels.length);
      barrels.forEach((o, k) => im.setMatrixAt(k, M4(o.x, o.y, o.z)));
      im.castShadow = true; group.add(im);
    }
    if (blocks.length) {
      const bg = DL.mergeColored([{ geo: new THREE.BoxGeometry(1.0, 1.1, 2.6), color: 0xffffff, matrix: M4(0, 0.55, 0) }]);
      const im = new THREE.InstancedMesh(bg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), blocks.length);
      blocks.forEach((o, k) => { im.setMatrixAt(k, M4(o.x, o.y, o.z, 1, 1, 1, o.yaw)); im.setColorAt(k, col(o.alt ? 0xf05a35 : 0xf4ecdc)); });
      im.castShadow = true; group.add(im);
    }

    // ---- props ----
    const pr = DL.mulberry32(track.seed ^ 0x3a3a);
    const qmul = opts.lowQuality ? 0.5 : 1;
    const ext = { x0: x0 + 20, z0: z0 + 20, w: nx * cs - 40, d: nz * cs - 40 };
    const shortcutNear = (x, z, d) => {
      if (!track.shortcut) return false;
      const sc = track.shortcut, sx = sc.bx - sc.ax, sz = sc.bz - sc.az, L2 = sx * sx + sz * sz;
      const t = DL.clamp(((x - sc.ax) * sx + (z - sc.az) * sz) / L2, 0, 1);
      return Math.hypot(x - sc.ax - sx * t, z - sc.az - sz * t) < d;
    };
    const items = {};          // type -> [{x,y,z,s,ry,sy}]
    const push = (type, o) => { (items[type] || (items[type] = [])).push(o); };
    const okSpot = (x, z, minD, noWater) => {
      track.groundAt(x, z, tmp, true);
      if (tmp.road.dist < minD || tmp.surf === SURF.GRAVEL) return false;
      if (track.water != null && tmp.y < track.water + (noWater || 1.2)) return false;
      if (shortcutNear(x, z, 8)) return false;
      return true;
    };
    // wide scatter
    for (const type in B.props) {
      const count = Math.round(B.props[type] * qmul);
      const minD = (type === 'rock' || type === 'haybale') ? HALF + 4 : HALF + 8;
      let n = 0;
      for (let a = 0; a < count * 4 && n < count; a++) {
        const x = ext.x0 + pr() * ext.w, z = ext.z0 + pr() * ext.d;
        if (!okSpot(x, z, minD)) continue;
        const s = 0.7 + pr() * 0.8;
        push(type, { x, y: tmp.y - 0.1, z, s, sy: s * (0.85 + pr() * 0.3), ry: pr() * 6.28, d: tmp.road.dist });
        n++;
      }
    }
    // dense roadside dressing: counts are per kilometre of road
    const NEAR = {
      desert: { cactus: 16, rock: 26, shrub: 40, boulder: 5 },
      mountain: { pine: 55, rock: 22, boulder: 7, bush: 14 },
      forest: { pine: 80, round: 34, bush: 40, rock: 8 },
      snow: { snowpine: 70, rock: 16, boulder: 5 },
      coast: { palm: 18, bush: 26, rock: 18, shrub: 12 },
      country: { round: 36, pine: 14, bush: 36, haybale: 14 }
    }[track.biomeKey] || { pine: 40, rock: 10 };
    const km = track.length / 1000;
    for (const type in NEAR) {
      const count = Math.round(NEAR[type] * km * qmul);
      let n = 0;
      for (let a = 0; a < count * 6 && n < count; a++) {
        const i = 20 + Math.floor(pr() * (track.N - 24)), side = pr() < 0.5 ? -1 : 1;
        const off = side * (HALF + 5 + Math.pow(pr(), 1.6) * 42);
        const x = track.px[i] - track.tz[i] * off, z = track.pz[i] + track.tx[i] * off;
        if (!okSpot(x, z, HALF + (type === 'rock' || type === 'haybale' || type === 'bush' || type === 'shrub' ? 3.5 : 6))) continue;
        const s = 0.7 + pr() * 0.8;
        push(type, { x, y: tmp.y - 0.1, z, s, sy: s * (0.85 + pr() * 0.3), ry: pr() * 6.28, d: tmp.road.dist });
        n++;
      }
    }
    // landmarks: farms, windmills, lighthouse, mesas
    const landmark = (type, count, minD, maxD, scaleMin) => {
      let n = 0;
      for (let a = 0; a < count * 40 && n < count; a++) {
        const i = 30 + Math.floor(pr() * (track.N - 40)), side = pr() < 0.5 ? -1 : 1;
        const off = side * (minD + pr() * (maxD - minD));
        const x = track.px[i] - track.tz[i] * off, z = track.pz[i] + track.tx[i] * off;
        if (!okSpot(x, z, minD - 4, 2.5)) continue;
        // keep landmarks off steep ground
        const g1 = track.groundAt(x + 7, z, {}, true).y, g2 = track.groundAt(x - 7, z, {}, true).y, g3 = track.groundAt(x, z + 7, {}, true).y, g4 = track.groundAt(x, z - 7, {}, true).y;
        if (Math.max(g1, g2, g3, g4) - Math.min(g1, g2, g3, g4) > 3.2) continue;
        if ((items[type] || []).some(o => Math.hypot(o.x - x, o.z - z) < 60)) continue;
        push(type, { x, y: Math.min(tmp.y, g1, g2, g3, g4) - 0.1, z, s: scaleMin + pr() * 0.3, sy: scaleMin + pr() * 0.3, ry: Math.atan2(track.tx[i], track.tz[i]) + (side > 0 ? Math.PI : 0) + (pr() - 0.5) * 0.5, d: tmp.road.dist });
        n++;
      }
    };
    const bk = track.biomeKey, lq = opts.lowQuality ? 0.6 : 1;
    if (bk === 'country') { landmark('house', Math.round(5 * km * lq), 22, 80, 1); landmark('barn', Math.round(2 * km * lq), 26, 90, 1); landmark('windmill', Math.max(1, Math.round(1.2 * km * lq)), 40, 120, 1.1); }
    if (bk === 'forest' || bk === 'mountain') landmark('house', Math.round(1.5 * km * lq), 24, 80, 0.9);
    if (bk === 'coast') { landmark('lighthouse', 1, 40, 150, 1.2); landmark('house', Math.round(3 * km * lq), 22, 80, 1); }
    if (bk === 'desert') landmark('mesa', Math.round(7 * lq), 60, 260, 1.1);
    if (bk === 'mountain' || bk === 'snow') landmark('mesa', 0, 60, 200, 1);
    // telegraph poles, chevron signs, start-line stands and flags
    if (bk !== 'snow') {
      for (let i = 24; i < track.N - 6; i += 13) {
        const side = ((i / 13) & 1) ? 1 : -1, off = side * (HALF + 3.4);
        const x = track.px[i] - track.tz[i] * off, z = track.pz[i] + track.tx[i] * off;
        if (track.checkpoints.some(c => Math.abs(c.i - i) < 3) || track.ramps.some(r => i > r.i0 - 3 && i < r.i1 + 3)) continue;
        if (!okSpot(x, z, HALF + 1.5, 2)) continue;
        push('pole', { x, y: tmp.y - 0.05, z, s: 1, sy: 1, ry: Math.atan2(track.tx[i], track.tz[i]), d: 0 });
      }
    }
    for (let i = 14; i < track.N - 6; i += 4) {
      const c = track.curv[i];
      if (Math.abs(c) < 1 / 50 || (i % 12)) continue;
      const side = c > 0 ? -1 : 1, off = side * (HALF + 5.2);
      const x = track.px[i] - track.tz[i] * off, z = track.pz[i] + track.tx[i] * off;
      if (!okSpot(x, z, HALF + 3, 1.5)) continue;
      push('sign', { x, y: tmp.y - 0.05, z, s: 1.2, sy: 1.2, ry: Math.atan2(track.tx[i], track.tz[i]) + (side > 0 ? 0 : Math.PI) + Math.PI, d: 0 });
    }
    {
      const i0 = 8, nrm = [-track.tz[i0], track.tx[i0]], yaw = Math.atan2(track.tx[i0], track.tz[i0]);
      const sx = track.px[i0] + nrm[0] * (HALF + 13), sz = track.pz[i0] + nrm[1] * (HALF + 13);
      track.groundAt(sx, sz, tmp, true);
      push('stand', { x: sx, y: track.py[i0] - 0.2, z: sz, s: 1, sy: 1, ry: yaw + Math.PI, d: 99 });
      for (let k = 0; k < 7; k++) {
        const j = 2 + k * 3, off = (HALF + 2.6) * (k % 2 ? 1 : -1);
        push('flagpole', { x: track.px[j] - track.tz[j] * off, y: track.py[j] - 0.05, z: track.pz[j] + track.tx[j] * off, s: 1, sy: 1, ry: yaw + (k % 2 ? 0 : Math.PI), d: 0 });
      }
    }
    for (const type in items) {
      const list = items[type];
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(propGeometry(type), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), list.length);
      list.forEach((o, k) => {
        im.setMatrixAt(k, M4(o.x, o.y, o.z, o.s, o.sy, o.s, o.ry));
        const shade = type === 'mesa' || type === 'house' || type === 'barn' ? 0.96 + pr() * 0.08 : 0.88 + pr() * 0.24;
        im.setColorAt(k, new THREE.Color(shade, shade, shade));
        const rad = PROP_RADIUS[type];
        if (rad > 0 && o.d < 70) track._addCollider({ kind: type, x: o.x, z: o.z, r: rad * o.s });
      });
      im.castShadow = type !== 'bush' && type !== 'shrub'; im.receiveShadow = true;
      group.add(im);
    }

    // ---- water ----
    if (track.water != null) {
      const wg = new THREE.PlaneGeometry(nx * cs + 2400, nz * cs + 2400, 40, 40);
      wg.rotateX(-Math.PI / 2);
      const wa = wg.attributes.position.array, wr = DL.mulberry32(track.seed ^ 0x4444);
      for (let i = 1; i < wa.length; i += 3) wa[i] = (wr() - 0.5) * 0.6;
      const wgn = wg.toNonIndexed(); wgn.computeVertexNormals();
      const water = new THREE.Mesh(wgn, new THREE.MeshStandardMaterial({ color: 0x6f95a8, roughness: 0.22, metalness: 0.25, flatShading: true, transparent: true, opacity: 0.88 }));
      water.position.set((minX + maxX) / 2, track.water, (minZ + maxZ) / 2);
      water.receiveShadow = true; group.add(water);
      group.userData.water = water;
    }

    // ---- distant mountains ----
    const mr = DL.mulberry32(track.seed ^ 0x6666);
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const R = Math.max(maxX - minX, maxZ - minZ) / 2 + margin + 380;
    const mparts = [];
    for (let k = 0; k < 34; k++) {
      const a = k / 34 * Math.PI * 2 + mr() * 0.15, rr = R + mr() * 380;
      const h = 140 + mr() * 300 * (track.biomeKey === 'mountain' ? 1.5 : 1), rad = 180 + mr() * 220;
      const g = new THREE.ConeGeometry(rad, h, 5 + Math.floor(mr() * 3), 1);
      mparts.push({ geo: g, color: B.mountain, matrix: M4(cx + Math.cos(a) * rr, h / 2 - 30, cz + Math.sin(a) * rr, 1, 1, 0.7 + mr() * 0.6, mr() * 6) });
      if (track.biomeKey === 'mountain' || track.biomeKey === 'snow' || mr() < 0.3) {
        mparts.push({ geo: new THREE.ConeGeometry(rad * 0.32, h * 0.32, 5, 1), color: 0xf2f4f6, matrix: M4(cx + Math.cos(a) * rr, h - 30 - h * 0.16 + 2, cz + Math.sin(a) * rr, 1, 1, 0.7, mr() * 6) });
      }
    }
    const mtn = new THREE.Mesh(DL.mergeColored(mparts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    group.add(mtn);

    // ---- clouds ----
    const clouds = new THREE.Group();
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x9aa4ad, emissiveIntensity: 0.35 });
    for (let k = 0; k < 16; k++) {
      const c = new THREE.Group();
      for (let q = 0; q < 4; q++) {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(14 + mr() * 14, 0), cm);
        m.position.set(q * 18 - 27 + mr() * 6, mr() * 6, mr() * 10); m.scale.y = 0.55; c.add(m);
      }
      c.position.set(cx + (mr() - 0.5) * R * 1.6, 180 + mr() * 120, cz + (mr() - 0.5) * R * 1.6);
      clouds.add(c);
    }
    group.add(clouds); group.userData.clouds = clouds;

    scene.add(group);
    return { group, gates, terrain };
  };

  let _checker = null;
  const _patchSigns = {};
  function patchSignTex(kind) {
    if (_patchSigns[kind]) return _patchSigns[kind];
    const c = document.createElement('canvas'); c.width = 128; c.height = 100; const x = c.getContext('2d');
    x.fillStyle = '#1f2a3d'; x.fillRect(0, 0, 128, 100);
    x.fillStyle = kind === 'snow' ? '#e9eef3' : '#f2c14e'; x.fillRect(5, 5, 118, 90);
    x.fillStyle = '#1f2a3d'; x.strokeStyle = '#1f2a3d'; x.lineCap = 'round';
    if (kind === 'snow') {
      x.lineWidth = 6; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; x.beginPath(); x.moveTo(64 - Math.cos(a) * 30, 46 - Math.sin(a) * 30); x.lineTo(64 + Math.cos(a) * 30, 46 + Math.sin(a) * 30); x.stroke(); }
    } else {
      // car sliding with wavy tracks
      x.fillRect(40, 26, 46, 18); x.fillRect(48, 16, 28, 12);
      x.lineWidth = 5; for (const o of [-14, 14]) { x.beginPath(); for (let k = 0; k <= 10; k++) { const yy = 50 + k * 3.5, xx = 63 + o + Math.sin(k * 0.9) * 7; k ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); }
    }
    x.font = '900 18px sans-serif'; x.textAlign = 'center'; x.fillText(kind === 'snow' ? 'SNOW' : kind === 'sand' ? 'SAND' : 'MUD', 64, 92);
    const t = new THREE.CanvasTexture(c); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    return (_patchSigns[kind] = t);
  }
  let _rampSign = null;
  function rampSignTex() {
    if (_rampSign) return _rampSign;
    const c = document.createElement('canvas'); c.width = 128; c.height = 100; const x = c.getContext('2d');
    x.fillStyle = '#1f2a3d'; x.fillRect(0, 0, 128, 100);
    x.fillStyle = '#f2c14e'; x.fillRect(5, 5, 118, 90);
    x.fillStyle = '#1f2a3d'; x.beginPath(); x.moveTo(18, 78); x.lineTo(96, 78); x.lineTo(96, 40); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(98, 34); x.lineTo(112, 22); x.lineTo(104, 44); x.closePath(); x.fill();
    x.fillRect(18, 82, 92, 5);
    _rampSign = new THREE.CanvasTexture(c); if ('colorSpace' in _rampSign) _rampSign.colorSpace = THREE.SRGBColorSpace;
    return _rampSign;
  }
  function checkerTex() {
    if (_checker) return _checker;
    const c = document.createElement('canvas'); c.width = 32; c.height = 4;
    const x = c.getContext('2d');
    for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) & 1 ? '#1f2a3d' : '#f4ecdc'; x.fillRect(i, j, 1, 1); }
    _checker = new THREE.CanvasTexture(c); _checker.magFilter = THREE.NearestFilter; _checker.minFilter = THREE.NearestFilter;
    return _checker;
  }

})(window.DL);
