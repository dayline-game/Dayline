/* DAYLINE — renderer, scenes, race loop, cameras, ghosts, effects and input */
'use strict';
(function (DL) {
  const Game = DL.Game = {};
  const DT = 1 / 120, REC_EVERY = 120 / DL.GHOST_HZ;
  let renderer, scene, camera, sun, hemi, envTex, skyDome;
  let track = null, world = null, playerModel = null;
  let gScene, gCam, gModel, gSun;
  const orbit = { theta: 2.4, phi: 0.3, dist: 9, auto: true, drag: null };
  let mode = 'loading';
  let race = null, menuT = 0;
  const settings = Game.settings = Object.assign({ vol: 0.6, shadows: true, hq: true, cam: 0, units: 'kmh', touch: 'auto', pbGhost: true }, DL.store.get('settings', {}));
  const keys = {};
  const touch = { left: 0, right: 0, gas: 0, brake: 0, drift: 0 };
  const input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  let steerSmooth = 0, padState = null;

  // ---------------- init ----------------
  Game.init = function () {
    const canvas = document.getElementById('gl');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 1, 0.3, 5000);
    hemi = new THREE.HemisphereLight(0xdfe6ea, 0x8a8070, 1.5);
    sun = new THREE.DirectionalLight(0xfff3dd, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    scene.add(hemi, sun, sun.target);
    skyDome = new THREE.Mesh(new THREE.SphereGeometry(3000, 20, 12), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    skyDome.renderOrder = -10; skyDome.frustumCulled = false; skyDome.onBeforeRender = (r, s, cam) => skyDome.position.copy(cam.position);
    { const p = skyDome.geometry.attributes.position, n = p.count; skyDome.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); }
    scene.add(skyDome);
    buildEnv();
    buildGarage();
    initParticles();
    initTrail();
    Game.applySettings();
    window.addEventListener('resize', resize); resize();
    bindInput(canvas);
    let last = performance.now(), dtS = 0;
    const loop = (now) => {
      requestAnimationFrame(loop);
      const raw = Math.min(0.05, (now - last) / 1000); last = now;
      dtS = dtS ? dtS + (raw - dtS) * 0.25 : raw;   // light smoothing removes timer jitter
      frame(Math.abs(raw - dtS) > 0.02 ? raw : dtS);
    };
    requestAnimationFrame(loop);
  };

  Game.applySettings = function () {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.hq ? 2 : 1));
    renderer.shadowMap.enabled = !!settings.shadows;
    sun.castShadow = !!settings.shadows;
    scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    DL.Audio.setVolume(settings.vol);
    DL.store.set('settings', settings);
    resize();
  };

  function buildEnv() {
    const s = new THREE.Scene();
    const g = new THREE.SphereGeometry(50, 24, 12);
    const c = [], p = g.attributes.position;
    const top = new THREE.Color(0xcfdbe6), mid = new THREE.Color(0xf6efe0), bot = new THREE.Color(0x6b6a66);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 50, col = y > 0 ? mid.clone().lerp(top, y) : mid.clone().lerp(bot, -y * 1.5);
      c.push(col.r, col.g, col.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    s.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const pm = new THREE.PMREMGenerator(renderer);
    envTex = pm.fromScene(s, 0.02).texture;
    scene.environment = envTex;
  }

  function buildGarage() {
    gScene = new THREE.Scene();
    gScene.background = new THREE.Color(0xe4dac4);
    gScene.fog = new THREE.Fog(0xe4dac4, 26, 70);
    gScene.environment = envTex;
    gCam = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
    gScene.add(new THREE.HemisphereLight(0xf6efe2, 0x9b8c70, 1.6));
    gSun = new THREE.DirectionalLight(0xfff4e2, 2.6); gSun.position.set(8, 14, 6); gSun.castShadow = true;
    gSun.shadow.mapSize.set(1024, 1024); const c = gSun.shadow.camera; c.left = -8; c.right = 8; c.top = 8; c.bottom = -8;
    gScene.add(gSun);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 40), new THREE.MeshLambertMaterial({ color: 0xd8cbad }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; gScene.add(floor);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.6, 0.24, 28), new THREE.MeshLambertMaterial({ color: 0xc8b48c, flatShading: true }));
    table.position.y = 0.12; table.receiveShadow = true; gScene.add(table);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.45, 0.06, 4, 48), new THREE.MeshLambertMaterial({ color: 0xf05a35 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.25; gScene.add(ring);
    // low-poly backdrop panels
    const panelMat = new THREE.MeshLambertMaterial({ color: 0xe9dfc9, flatShading: true });
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2, w = new THREE.Mesh(new THREE.BoxGeometry(9, 14 + (i % 3) * 3, 0.6), panelMat);
      w.position.set(Math.sin(a) * 26, 6, Math.cos(a) * 26); w.lookAt(0, 6, 0); gScene.add(w);
    }
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(25.5, 25.5, 0.7, 36, 1, true), new THREE.MeshLambertMaterial({ color: 0x1c2536, side: THREE.BackSide }));
    stripe.position.y = 2.2; gScene.add(stripe);
    gScene.userData.table = table;
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    gCam.aspect = w / h; gCam.updateProjectionMatrix();
  }

  function setOffset(cam, kind) {
    const w = window.innerWidth, h = window.innerHeight, narrow = w <= 760;
    if (kind === 'menu') { if (narrow) cam.setViewOffset(w, h, 0, h * 0.34, w, h); else cam.setViewOffset(w, h, -w * 0.2, 0, w, h); }
    else if (kind === 'side') { if (narrow) cam.setViewOffset(w, h, 0, h * 0.25, w, h); else cam.setViewOffset(w, h, w * 0.17, 0, w, h); }
    else cam.clearViewOffset();
  }

  // ---------------- world & player car ----------------
  function disposeGroup(g) {
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && m.map !== envTex) m.map.dispose(); m.dispose(); });
    });
  }

  // player-made tracks are registered here by id (day key 'c_xxxxxxxx') before they are raced
  DL.customTracks = DL.customTracks || {};
  Game.loadDay = function (day, custom) {
    custom = custom || DL.customTracks[day] || null;
    const key = custom ? day + '|' + custom.biome + '|' + JSON.stringify(custom.pts) + '|' + JSON.stringify(custom.ext || null) : day;
    if (track && track._key === key) return track;
    if (world) { scene.remove(world.group); disposeGroup(world.group); }
    track = new DL.Track(day, custom); track._key = key;
    world = DL.buildTrackScene(track, scene, { lowQuality: !settings.hq });
    const B = track.B;
    scene.background = new THREE.Color(B.sky);
    scene.fog = new THREE.Fog(B.fog, 260, 1700);
    { const top = new THREE.Color(B.sky), hor = new THREE.Color(B.fog), c = new THREE.Color(), p = skyDome.geometry.attributes.position, col = skyDome.geometry.attributes.color;
      for (let i = 0; i < p.count; i++) { const h = Math.max(0, p.getY(i) / 3000); c.copy(hor).lerp(top, Math.pow(h, 0.55)); col.setXYZ(i, c.r, c.g, c.b); }
      col.needsUpdate = true; }
    hemi.color.set(B.hemiSky); hemi.groundColor.set(B.hemiGround);
    sun.color.set(B.sun);
    if (playerModel) { scene.add(playerModel); parkPlayer(); }
    return track;
  };
  Game.track = () => track;

  function parkPlayer() {
    if (!playerModel || !track) return;
    const s = track.start;
    const g = track.groundAt(s.x, s.z, {});
    DL.poseCar(playerModel, s.x, g.y, s.z, s.yaw, 0, 0, 0, 0, false);
  }

  Game.refreshPlayerCar = function () {
    const sv = DL.Net.save, paint = sv.paint[sv.car] || {};
    const opts = { car: sv.car, livery: paint.l ? DL.decodeLivery(paint.l) : DL.defaultLivery(), base: paint.b == null ? DL.DEFAULT_BASE : paint.b, equip: sv.equip };
    if (playerModel) { scene.remove(playerModel); playerModel.userData.dispose(); }
    playerModel = DL.buildCar(opts);
    scene.add(playerModel);
    if (race) race.model = playerModel;
    parkPlayer();
    if (!Game._preview) Game.showcase(null);
  };

  // garage / shop display car; opts=null shows the player's own setup
  Game.showcase = function (opts) {
    Game._preview = opts;
    const sv = DL.Net.save;
    if (!opts) {
      const paint = sv.paint[sv.car] || {};
      opts = { car: sv.car, livery: paint.l ? DL.decodeLivery(paint.l) : DL.defaultLivery(), base: paint.b == null ? DL.DEFAULT_BASE : paint.b, equip: sv.equip };
    }
    if (gModel) { gScene.remove(gModel); gModel.userData.dispose(); }
    gModel = DL.buildCar(opts);
    gModel.position.y = 0.24;
    gModel.traverse(o => { if (o.isMesh) o.castShadow = true; });
    gScene.add(gModel);
    return gModel;
  };
  Game.setGarageLivery = function (liv, base) { if (gModel) gModel.userData.setLivery(liv, base); };

  Game.pickBodyUV = function (cx, cy) {
    if (!gModel) return null;
    const r = new THREE.Raycaster(), v = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    r.setFromCamera(v, gCam);
    const hit = r.intersectObject(gModel.userData.bodyMesh, false)[0];
    return hit && hit.uv ? hit.uv : null;
  };

  // ---------------- modes ----------------
  Game.setMode = function (m) {
    mode = m;
    if (race && m !== 'race' && m !== 'replay') endRace();
    if (m === 'garage' || m === 'shop') { orbit.auto = true; }
    if (m === 'menu' || m === 'board' || m === 'archive' || m === 'community' || m === 'editor') { parkPlayer(); }
  };
  Game.mode = () => mode;
  const edv = Game.edView = { th: 0.8, ph: 0.8, dist: 700, tx: 0, ty: 0, tz: 0 };
  Game.edCamera = () => camera;

  // ---------------- race ----------------
  Game.startRace = async function (day, ghostSpecs, custom, opts) {
    DL.Audio.init();
    Game.loadDay(day, custom);
    if (race) endRace();
    mode = 'race';
    const car = new DL.Car(track);
    race = {
      track, car, prog: new DL.Progress(track), model: playerModel, steps: 0, acc: 0, countdown: 3.2, lastBeep: 4,
      running: false, finished: false, paused: false, frames: [], recoveries: 0, airMax: 0,
      ghosts: [], ghostsOn: true, ghostSpecs: ghostSpecs || [], pbCp: null, farT: 0, waterT: 0,
      camYaw: track.start.yaw, shake: 0, camMode: settings.cam, trailT: 0
    };
    race.test = !!(opts && opts.test); race.noPB = race.test;
    trail.points.length = 0; clearSkids();
    resetCarToStart();
    DL.UI.raceStarted(race);
    DL.Audio.startEngine();
    warmUp();
    loadGhosts(race);
  };

  // compile every shader that can appear during a run (trail, skid marks, particles, ghosts) before GO, so nothing hitches on the first frame
  function warmUp() {
    try {
      if (!skid) initSkids();
      const tv = trail.mesh.visible, pc = partMesh.count, sc = skid.mesh.count;
      trail.mesh.visible = true; partMesh.count = 1; skid.mesh.count = 1;
      renderer.compile(scene, camera);
      trail.mesh.visible = tv; partMesh.count = pc; skid.mesh.count = sc;
    } catch (e) { /* warm-up is best effort */ }
  }

  async function loadGhosts(r) {
    const specs = r.ghostSpecs.slice();
    const myUid = DL.Net.uid || 'me';
    const wantPB = settings.pbGhost && !r.noPB && DL.Net.save.best[r.track.day];
    if (wantPB && !specs.some(s => s.uid === myUid || s.uid === 'me')) specs.unshift(mineSpec());
    for (const s of specs) await loadOneGhost(r, s);
  }
  function mineSpec() {
    const p = DL.Net.save.paint[DL.Net.save.car] || {};
    return { uid: 'me', label: 'Your best', car: DL.Net.save.car, l: p.l, b: p.b, equip: DL.Net.save.equip, mine: true };
  }
  async function loadOneGhost(r, s) {
    const myUid = DL.Net.uid || 'me';
    if (r.ghosts.some(g => g.spec.uid === s.uid)) return true;
    try {
      const enc = await DL.Net.ghost(s.uid === myUid ? 'me' : s.uid, r.track.day);
      if (race !== r) return false;
      const gh = enc && DL.decodeGhost(enc);
      if (!gh) { DL.emit('toast', 'No ghost saved for ' + (s.label || 'that driver')); return false; }
      const t = (gh.n - 1) / gh.hz;
      if (!DL.validateRun(r.track, gh, t)) { DL.emit('toast', 'Skipped a ghost that failed validation'); return false; }
      if (r.ghosts.some(g => g.spec.uid === s.uid)) return true;
      const model = DL.buildCar({ car: s.car, livery: s.l ? DL.decodeLivery(s.l) : DL.defaultLivery(), base: s.b, equip: s.equip, ghost: true });
      const label = makeLabel(s.label || 'Ghost', s.mine);
      model.add(label);
      scene.add(model);
      try { renderer.compile(scene, camera); } catch (e) {}
      // checkpoint split times for live deltas
      const pg = new DL.Progress(r.track);
      for (let i = 1; i < gh.n; i++) pg.update(gh.f[(i - 1) * 8], gh.f[(i - 1) * 8 + 2], gh.f[i * 8], gh.f[i * 8 + 2], i / gh.hz);
      const g = { spec: s, gh, model, time: t, cp: pg.cpTimes, buf: [], label };
      r.ghosts.push(g);
      if (s.mine || s.uid === myUid) r.pbCp = pg.cpTimes;
      model.visible = r.ghostsOn;
      DL.UI.ghostsChanged(r);
      return true;
    } catch (e) { console.warn('ghost', e); return false; }
  }
  // pick ghosts while racing: add or drop one driver without restarting
  Game.addGhost = async function (spec) {
    const r = race; if (!r || r.replay) return false;
    if (!r.ghostSpecs.some(x => x.uid === spec.uid)) r.ghostSpecs.push(spec);
    if (spec.mine || spec.uid === 'me') r.noPB = false;
    r.ghostsOn = true;
    const ok = await loadOneGhost(r, spec);
    if (!ok) r.ghostSpecs = r.ghostSpecs.filter(x => x.uid !== spec.uid);
    DL.UI.ghostsChanged(r);
    return ok;
  };
  Game.removeGhost = function (uid) {
    const r = race; if (!r || r.replay) return;
    const myUid = DL.Net.uid || 'me';
    r.ghostSpecs = r.ghostSpecs.filter(x => x.uid !== uid);
    if (uid === 'me' || uid === myUid) r.noPB = true;
    r.ghosts = r.ghosts.filter(g => {
      const hit = g.spec.uid === uid || ((uid === 'me' || uid === myUid) && g.spec.mine);
      if (hit) { scene.remove(g.model); g.model.userData.dispose(); if (r.pbCp === g.cp) r.pbCp = null; }
      return !hit;
    });
    DL.UI.ghostsChanged(r);
  };
  Game.activeGhosts = () => race && !race.replay ? race.ghosts.map(g => g.spec) : [];
  Game.setPaused = on => { if (race && !race.finished) race.paused = !!on; };

  function makeLabel(text, mine) {
    const c = document.createElement('canvas'), ctx = c.getContext('2d');
    c.width = 256; c.height = 64;
    ctx.font = '700 34px "Barlow Condensed", sans-serif';
    const w = Math.min(240, ctx.measureText(text.toUpperCase()).width + 28);
    ctx.fillStyle = mine ? '#f05a35' : '#1c2536'; ctx.fillRect((256 - w) / 2, 8, w, 46);
    ctx.fillStyle = '#f3ead7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase().slice(0, 18), 128, 33);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 }));
    sp.scale.set(4.8, 1.2, 1); sp.position.set(0, 3.3, 0);
    return sp;
  }

  // every attempt on a daily (finished or abandoned) is logged at 5 Hz for the community recap reels
  function logAttempt(r, finished, t) {
    if (!r || r.replay || r.test || r.track.custom || r.attemptLogged) return;
    const secs = t != null ? t : r.steps * DT;
    if (secs < 1.0 || !r.frames || r.frames.length < 4) return;
    r.attemptLogged = true;
    const fr = r.frames.filter((f, i) => i % 3 === 0);
    const enc = DL.encodeGhost(fr); if (!enc) return;
    enc.hz = 5;
    DL.Net.logAttempt && DL.Net.logAttempt(r.track.day, Math.round(secs * 1000) / 1000, !!finished, enc, r.prog ? r.prog.next : 0);
  }
  Game._logAttempt = () => race && logAttempt(race, false);
  window.addEventListener('pagehide', () => { if (race && race.running && !race.finished) logAttempt(race, false); });

  function resetCarToStart() {
    const r = race, s = r.track.start;
    if (r.steps > 0 && !r.finished) logAttempt(r, false);
    r.attemptLogged = false;
    r.car.reset(s.x, r.track.groundAt(s.x, s.z, {}).y, s.z, s.yaw);
    r.prog = new DL.Progress(r.track);
    r.steps = 0; r.acc = 0; r.frames = []; r.recoveries = 0; r.airMax = 0; r.finished = false; r.running = false;
    r.countdown = 3.2; r.lastBeep = 4; startLamps(4); r.camYaw = s.yaw; r.farT = 0; r.waterT = 0;
    r.track.checkpoints.forEach((c, k) => { const gt = world.gates[k]; if (gt) gt.userData.stripe.material.color.set(0xf05a35); });
    trail.points.length = 0; clearSkids();
    record();
    placeCamera(true);
  }

  Game.restart = function () {
    if (!race) return;
    race.paused = false; DL.UI.paused(false);
    // reload ghosts so a personal best set on the previous attempt becomes the new target
    race.ghosts.forEach(g => { scene.remove(g.model); g.model.userData.dispose(); });
    race.ghosts = []; race.pbCp = null;
    resetCarToStart(); DL.UI.raceStarted(race);
    loadGhosts(race);
  };
  Game.recover = function () {
    const r = race; if (!r || !r.running || r.finished) return;
    const cp = r.prog.next > 0 ? r.track.checkpoints[r.prog.next - 1] : null;
    const x = cp ? cp.x : r.track.start.x, z = cp ? cp.z : r.track.start.z;
    const yaw = cp ? Math.atan2(cp.tx, cp.tz) : r.track.start.yaw;
    r.car.reset(x, r.track.groundAt(x, z, {}).y, z, yaw);
    r.recoveries++; r.farT = 0; r.waterT = 0; r.camYaw = yaw;
    trail.points.length = 0; clearSkids();
    placeCamera(true);
    DL.UI.banner('Recovered', 900);
  };
  Game.pause = function (on) { if (!race || race.finished) return; race.paused = on; DL.UI.paused(on); if (on) DL.Audio.updateEngine(0, 0, 0, false); };
  Game.togglePause = () => Game.pause(!(race && race.paused));
  Game.toggleGhosts = function () { if (!race) return; race.ghostsOn = !race.ghostsOn; race.ghosts.forEach(g => g.model.visible = race.ghostsOn); DL.UI.ghostsChanged(race); };
  Game.cycleCamera = function () {
    if (!race) return;
    if (race.replay) { race.snap = true; race.camMode = (race.camMode + 1) % (CAM_COUNT + 1); settings.rcam = race.camMode; }
    else { race.camMode = (race.camMode + 1) % CAM_COUNT; settings.cam = race.camMode; }
    DL.store.set('settings', settings); placeCamera(true);
  };
  Game.race = () => race;

  // ---------------- replay of a recorded run ----------------
  Game.startReplay = function (day, enc, spec) {
    const gh = DL.decodeGhost(enc); if (!gh) return false;
    DL.Audio.init(); Game.loadDay(day);
    if (race) endRace();
    mode = 'replay';
    const model = DL.buildCar({ car: spec.car, livery: spec.l ? DL.decodeLivery(spec.l) : DL.defaultLivery(), base: spec.b, equip: spec.equip });
    scene.add(model);
    if (playerModel) playerModel.visible = false;
    const c = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, steerVis: 0, wheelSpin: 0, speed: 0, vx: 0, vz: 0, vF: 0, slip: 0, yawRate: 0, grounded: true };
    race = {
      replay: true, track, car: c, model, gh, ghosts: [{ model, gh, spec }], ghostsOn: true, steps: 0,
      rt: 0, dur: (gh.n - 1) / gh.hz, rate: 1, paused: false, hold: 0, spin: 0, snap: true,
      camYaw: 0, shake: 0, camMode: settings.rcam == null ? CAM_COUNT : settings.rcam % (CAM_COUNT + 1), trailT: 0, prev: null, keys: { gas: false, brake: false, left: false, right: false, st: 0 }
    };
    trail.points.length = 0; clearSkids(); trail.mesh.visible = false;
    return true;
  };
  const rs0 = new Float32Array(8), rs1 = new Float32Array(8), rk0 = new Float32Array(8), rk1 = new Float32Array(8), rgT = {};
  function updateReplay(dt) {
    const r = race, c = r.car;
    if (!r.paused) {
      if (r.rt >= r.dur) { r.hold += dt; if (r.hold > 1.6) { r.rt = 0; r.hold = 0; r.snap = true; } }
      else { r.rt = Math.min(r.dur, r.rt + dt * r.rate); r.hold = 0; }
    }
    const t = DL.clamp(r.rt, 0, r.dur);
    DL.sampleGhost(r.gh, t, rs1);
    const t0 = Math.max(0, t - 0.08), t1 = Math.max(t, t0 + 0.08);
    DL.sampleGhost(r.gh, t0, rs0); DL.sampleGhost(r.gh, Math.min(r.dur, t1), rs1);
    const span = Math.max(0.02, Math.min(r.dur, t1) - t0);
    DL.sampleGhost(r.gh, t, rs1);
    const x = rs1[0], y = rs1[1], z = rs1[2];
    const vx = (x - rs0[0]) / span, vz = (z - rs0[2]) / span;
    c.x = x; c.y = y; c.z = z; c.yaw = rs1[3]; c.pitch = rs1[4]; c.roll = rs1[5]; c.steerVis = rs1[6];
    c.vx = vx; c.vz = vz; c.speed = Math.hypot(vx, vz); c.vF = vx * Math.sin(c.yaw) + vz * Math.cos(c.yaw);
    c.yawRate = wrapA(c.yaw - rs0[3]) / span;
    c.slip = DL.clamp(Math.abs(wrapA(Math.atan2(vx, vz) - c.yaw)) * 2, 0, 1);
    c.grounded = y - r.track.groundAt(x, z, rgT, true).y < 0.5;
    if (!r.paused) r.spin += c.vF * dt * r.rate / 0.34;
    c.wheelSpin = r.spin;
    // keys on screen: steering and brake are recorded, the gas pedal is inferred from the speed trend
    const spdAt = tt => { const a = Math.max(0, tt - 0.1), b = Math.min(r.dur, tt + 0.1); DL.sampleGhost(r.gh, a, rk0); DL.sampleGhost(r.gh, b, rk1); return Math.hypot(rk1[0] - rk0[0], rk1[2] - rk0[2]) / Math.max(0.02, b - a); };
    const vN = spdAt(t), acc = (spdAt(Math.min(r.dur, t + 0.25)) - spdAt(Math.max(0, t - 0.25))) / 0.5;
    DL.sampleGhost(r.gh, t, rs1);
    const brk = rs1[7] > 0.5 || acc < -9, stv = DL.clamp(rs1[6] / 0.82, -1, 1), live = t < r.dur - 0.2;
    r.keys = { gas: live && !brk && (acc > -1.2 || vN > 48), brake: live && brk, left: stv < -0.2, right: stv > 0.2, st: stv, v: vN };
    DL.poseCar(r.model, x, y, z, c.yaw, c.pitch, c.roll, c.steerVis, r.spin, rs1[7] > 0.5);
    r.model.updateMatrixWorld();
    const snap = r.snap; r.snap = false;
    placeCamera(snap, r.paused ? 0 : dt);
    DL.UI.replayHud(r, t);
  }

  function endRace() {
    if (!race) return;
    if (!race.finished && race.running !== undefined) logAttempt(race, false);
    race.ghosts.forEach(g => { scene.remove(g.model); g.model.userData.dispose(); });
    race = null;
    DL.Audio.stopEngine();
    trail.points.length = 0; clearSkids(); trail.mesh.visible = false;
    camera.fov = 60; camera.updateProjectionMatrix();
  }

  function record() {
    const c = race.car;
    race.frames.push([c.x, c.y, c.z, c.yaw, c.pitch, c.roll, c.steerVis, input.brake > 0 ? 1 : 0]);
  }

  function physicsStep(r) {
    const c = r.car, ev = {};
    const px = c.x, pz = c.z;
    c.step(DT, input, ev);
    r.steps++;
    const t = r.steps * DT;
    if (r.steps % REC_EVERY === 0) record();
    if (ev.land) { DL.Audio.thump(ev.land / 25); r.shake = Math.min(1, ev.land / 20); burst(c.x, c.y, c.z, 6, dustColor(), 3); }
    if (ev.hit) { DL.Audio.thump(ev.hit / 15); r.shake = Math.min(1, ev.hit / 15); }
    if (ev.air) r.airMax = Math.max(r.airMax, ev.air);
    const res = r.prog.update(px, pz, c.x, c.z, t);
    if (res === 'cp') onCheckpoint(r, t);
    else if (res === 'finish') { onFinish(r, t); return; }
    // automatic recovery
    r.waterT = c.inWater ? r.waterT + DT : 0;
    const road = r.track.nearestRoad(c.x, c.z, {});
    r.farT = road.dist > 55 ? r.farT + DT : 0;
    if (r.waterT > 0.8 || r.farT > 2.5) Game.recover();
  }

  function onCheckpoint(r, t) {
    const k = r.prog.next - 1;
    DL.Audio.beep(880, 0.12, 'triangle', 0.15);
    const gt = world.gates[k]; if (gt) gt.userData.stripe.material = new THREE.MeshLambertMaterial({ color: 0x3f7d5a, flatShading: true });
    let delta = null;
    if (r.pbCp && r.pbCp[k] != null) delta = t - r.pbCp[k];
    DL.UI.checkpoint(k + 1, r.track.checkpoints.length, delta);
  }

  function onFinish(r, t) {
    r.finished = true; r.splits = r.prog.cpTimes.slice();
    record();
    logAttempt(r, true, t);
    DL.Audio.chime();
    const enc = DL.encodeGhost(r.frames);
    const gh = DL.decodeGhost(enc);
    const valid = DL.validateRun(r.track, gh, t);
    const beatGhost = r.ghosts.some(g => !g.spec.mine && g.time > t) || r.ghosts.some(g => g.spec.mine && g.time > t + 0.001);
    if (r.track.custom) {
      if (r.test) { DL.UI.testFinished(r, t, valid, enc); return; }
      const cres = valid ? DL.Net.submitRun(r.track, t, enc, {}) : null;
      DL.UI.finishedCustom(r, t, cres, valid); return;
    }
    let res = null;
    if (valid) res = DL.Net.submitRun(r.track, t, enc, { recoveries: r.recoveries, airMax: r.airMax, beatGhost });
    DL.UI.finished(r, t, res, valid);
  }

  // ---------------- input ----------------
  function bindInput(canvas) {
    const typing = e => /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '');
    window.addEventListener('keydown', e => {
      if (typing(e)) return;
      keys[e.code] = true;
      DL.Audio.init();
      if (mode === 'race' && race) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Backspace'].includes(e.code)) e.preventDefault();
        if (e.repeat) return;
        if (e.code === 'KeyR') Game.recover();
        else if (e.code === 'Backspace' || e.code === 'KeyT') Game.restart();
        else if (e.code === 'KeyC') Game.cycleCamera();
        else if (e.code === 'KeyG') Game.toggleGhosts();
        else if (e.code === 'Escape' || e.code === 'KeyP') { if (race.finished) return; Game.togglePause(); }
        else if (e.code === 'Enter' && race.finished) Game.restart();
      } else if (e.code === 'Escape') DL.UI.back();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    // touch buttons
    const tb = { tLeft: 'left', tRight: 'right', tGas: 'gas', tBrake: 'brake', tDrift: 'drift' };
    for (const id in tb) {
      const el = document.getElementById(id); if (!el) continue;
      const down = e => { e.preventDefault(); touch[tb[id]] = 1; el.classList.add('down'); DL.Audio.init(); };
      const up = e => { e.preventDefault(); touch[tb[id]] = 0; el.classList.remove('down'); };
      el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    }
    // garage orbit & body painting
    canvas.addEventListener('pointerdown', e => {
      if (mode !== 'garage' && mode !== 'shop') return;
      if (mode === 'garage' && DL.UI.paintActive && DL.UI.paintActive()) {
        const uv = Game.pickBodyUV(e.clientX, e.clientY);
        if (uv) { orbit.paint = true; DL.UI.paintUV(uv, true); canvas.setPointerCapture(e.pointerId); return; }
      }
      orbit.drag = { x: e.clientX, y: e.clientY, th: orbit.theta, ph: orbit.phi }; orbit.auto = false;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (orbit.paint) { const uv = Game.pickBodyUV(e.clientX, e.clientY); if (uv) DL.UI.paintUV(uv, false); return; }
      if (!orbit.drag) return;
      orbit.theta = orbit.drag.th - (e.clientX - orbit.drag.x) * 0.008;
      orbit.phi = DL.clamp(orbit.drag.ph + (e.clientY - orbit.drag.y) * 0.005, 0.05, 1.2);
    });
    const end = () => { if (orbit.paint) DL.UI.paintEnd(); orbit.drag = null; orbit.paint = false; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', e => { if (mode === 'garage' || mode === 'shop') { orbit.dist = DL.clamp(orbit.dist + e.deltaY * 0.01, 5.5, 16); e.preventDefault(); } }, { passive: false });
  }

  function readInput(dt) {
    let thr = (keys.KeyW || keys.ArrowUp || touch.gas) ? 1 : 0;
    let brk = (keys.KeyS || keys.ArrowDown || touch.brake) ? 1 : 0;
    let target = ((keys.KeyD || keys.ArrowRight || touch.right) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft || touch.left) ? 1 : 0);
    let hb = !!(keys.Space || touch.drift);
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && Array.from(pads).find(x => x && x.connected);
    if (p) {
      const ax = p.axes[0] || 0; if (Math.abs(ax) > 0.12) target = ax;
      const rt = p.buttons[7] ? p.buttons[7].value : 0, lt = p.buttons[6] ? p.buttons[6].value : 0;
      thr = Math.max(thr, rt, p.buttons[0] && p.buttons[0].pressed ? 1 : 0); brk = Math.max(brk, lt);
      hb = hb || !!(p.buttons[2] && p.buttons[2].pressed) || !!(p.buttons[5] && p.buttons[5].pressed);
      const now = p.buttons.map(b => b.pressed);
      if (padState && race) {
        if (now[3] && !padState[3]) Game.recover();
        if (now[9] && !padState[9]) Game.togglePause();
        if (now[8] && !padState[8]) Game.restart();
        if (now[4] && !padState[4]) Game.cycleCamera();
      }
      padState = now;
    }
    const analog = Math.abs(target) > 0 && Math.abs(target) < 1;
    if (analog) steerSmooth = target;
    else {
      const rate = target === 0 ? 7 : (Math.sign(target) !== Math.sign(steerSmooth) && steerSmooth !== 0 ? 9 : 4.2);
      steerSmooth += DL.clamp(target - steerSmooth, -rate * dt, rate * dt);
    }
    input.throttle = thr; input.brake = brk; input.steer = steerSmooth; input.handbrake = hb;
  }

  // ---------------- cameras ----------------
  const CAMS = [
    { d: 6.8, h: 2.7, look: 2.1, ahead: 15, fov: 64, lag: 9, yawLag: 5.5 },                 // chase
    { d: 10.5, h: 4.6, look: 2.3, ahead: 19, fov: 62, lag: 7, yawLag: 4.5 },                // far chase
    null,                                                                                   // bonnet
    { d: 5.8, h: 1.75, look: 1.5, ahead: 13, side: 0.18, fov: 72, lag: 10, yawLag: 6 },     // low rally
    { d: 15, h: 9.5, look: 1.6, ahead: 24, fov: 56, lag: 4.5, yawLag: 2.6 }                 // drone
  ];
  const CAM_COUNT = CAMS.length;
  const tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3(), gTmp = {};
  const wrapA = d => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  function setFov(f, dt) {
    if (Math.abs(camera.fov - f) > 0.05) { camera.fov += (f - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
  }
  // replay-only orbiting shots: a new angle every few seconds, always circling the car
  const ORBIT_SHOTS = [[-0.5, 0.55, 12, 3.2], [1.4, -0.6, 15, 6], [Math.PI, 0.5, 11, 2.2], [0.9, 0.7, 20, 11], [-1.5, -0.55, 13, 2.6], [2.3, 0.6, 16, 8], [0.2, -0.5, 10, 2.0], [-2.4, 0.65, 18, 9]];
  const ok0 = new Float32Array(8);
  function orbitCam(r) {
    const SEG = 4.5, t = DL.clamp(r.rt, 0, r.dur), si = Math.floor(t / SEG), lt = t - si * SEG, [a0, w, R, up] = ORBIT_SHOTS[si % ORBIT_SHOTS.length];
    let sx = 0, sz = 0, px = 0, py = 0, pz = 0;
    for (let k = 0; k <= 6; k++) { DL.sampleGhost(r.gh, Math.max(0, t - 0.9 * k / 6), ok0); sx += Math.sin(ok0[3]); sz += Math.cos(ok0[3]); if (k <= 4) { px += ok0[0]; py += ok0[1]; pz += ok0[2]; } }
    const yaw = Math.atan2(sx, sz), a = yaw + a0 + w * lt, c = r.car;
    px /= 5; py /= 5; pz /= 5;
    tmpV.set(px + Math.sin(a) * R, py + up + Math.sin(lt * 1.2) * 0.4, pz + Math.cos(a) * R);
    const gmax = r.track.groundAt(tmpV.x, tmpV.z, gTmp, true).y + 1.3;
    if (tmpV.y < gmax) tmpV.y = gmax;
    camera.position.copy(tmpV);
    camera.lookAt(c.x + Math.sin(c.yaw) * 1.5, c.y + 1, c.z + Math.cos(c.yaw) * 1.5);
    r.model.visible = true; setFov(60, 1);
  }
  function placeCamera(snap, dt) {
    const r = race; if (!r) return;
    if (r.replay && r.camMode >= CAM_COUNT) { orbitCam(r); return; }
    const c = r.view || r.car, m = CAMS[r.camMode];
    dt = dt || 1 / 60;
    if (!m) { // bonnet
      r.model.updateMatrixWorld(true);
      const b = r.model.userData.body;
      b.updateMatrixWorld(true);
      tmpV.set(0, r.model.userData.roofY - 0.2, 0.3).applyMatrix4(b.matrixWorld);
      tmpL.set(0, r.model.userData.roofY - 0.35, 12).applyMatrix4(b.matrixWorld);
      camera.position.copy(tmpV); camera.lookAt(tmpL);
            if (r.shake > 0.01) { camera.position.y += (Math.random() - 0.5) * r.shake * 0.3; r.shake *= Math.exp(-6 * dt); }
      r.model.visible = false;
      setFov(74, dt);
      return;
    }
    r.model.visible = true;
    const sp = c.speed;
    // heading locked to the car: no swing, no lag
    r.camYaw = c.yaw;
    const yawC = r.camYaw + (m.side || 0);
    // filtered car height so bumps and crests don't jolt the view
    if (snap || r.cy == null) r.cy = c.y;
    r.cy = c.y;
    // fixed rig: the camera keeps the same distance and height at every speed, so it never stretches back or up
    const dist = m.d;
    const rise = m.h;
    tmpV.set(c.x - Math.sin(yawC) * dist, r.cy + rise, c.z - Math.cos(yawC) * dist);
    // keep the lens above the terrain, including the stretch between car and camera
    let gmax = r.track.groundAt(tmpV.x, tmpV.z, gTmp, true).y;
    gmax = Math.max(gmax, r.track.groundAt((tmpV.x + c.x) / 2, (tmpV.z + c.z) / 2, gTmp, true).y - 0.2);
    const minY = gmax + (r.camMode === 4 ? 2.6 : 1.4);
    if (tmpV.y < minY) tmpV.y = minY;
    if (snap) camera.position.copy(tmpV);
    else {
      const kh = 1, kv = 1;
      camera.position.x += (tmpV.x - camera.position.x) * kh;
      camera.position.z += (tmpV.z - camera.position.z) * kh;
      camera.position.y += (tmpV.y - camera.position.y) * kv;
      if (camera.position.y < minY) camera.position.y = minY;
    }
    // look ahead along the direction of travel, tilting with the slope of the road ahead
    let lx = Math.sin(c.yaw), lz = Math.cos(c.yaw);
    const ahead = m.ahead;
    const gx = c.x + lx * ahead, gz = c.z + lz * ahead;
    const gAhead = r.track.groundAt(gx, gz, gTmp, true).y;
    const ly = r.cy + m.look;
    tmpL.set(gx, ly, gz);
    if (!r.camLook) r.camLook = new THREE.Vector3();
    r.camLook.copy(tmpL);
    if (r.shake > 0.01) { camera.position.x += (Math.random() - 0.5) * r.shake * 0.5; camera.position.y += (Math.random() - 0.5) * r.shake * 0.5; r.shake *= Math.exp(-6 * dt); }
    camera.lookAt(r.camLook);
    // lean into corners
    const roll = DL.clamp(-c.yawRate * 0.018, -0.07, 0.07) * (r.camMode === 4 ? 0.3 : 1);
    r.camRoll = (r.camRoll || 0) + (roll - (r.camRoll || 0)) * Math.min(1, dt * 5);
    camera.rotateZ(r.camRoll);
    // field of view widens with speed and kicks on landings
    r.fovKick = (r.fovKick || 0) * Math.exp(-4 * dt);
    setFov(m.fov, 1);   // constant lens: the car never shrinks or pulls away
  }

  // ---------------- particles (low-poly puffs) ----------------
  let parts, partMesh;
  const PMAX = 220;
  function initParticles() {
    parts = [];
    partMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshLambertMaterial({ flatShading: true, transparent: true, opacity: 0.85, depthWrite: false }), PMAX);
    partMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    partMesh.setColorAt(0, new THREE.Color(1, 1, 1));
    partMesh.count = 0; partMesh.frustumCulled = false;
    scene.add(partMesh);
  }
  function spawn(x, y, z, vx, vy, vz, life, size, color, grow) {
    if (parts.length >= PMAX) parts.shift();
    parts.push({ x, y, z, vx, vy, vz, life, max: life, size, color: new THREE.Color(color), grow: grow == null ? 1 : grow, rot: Math.random() * 6 });
  }
  function burst(x, y, z, n, color, spd) {
    for (let i = 0; i < n; i++) spawn(x + (Math.random() - .5) * 2, y + 0.3, z + (Math.random() - .5) * 2, (Math.random() - .5) * spd, Math.random() * spd * 0.6, (Math.random() - .5) * spd, 0.9, 0.9, color, 1.6);
  }
  function dustColor(surf) {
    if (!track) return 0xd8cbb0;
    if (surf === DL.SURF.MUD) return Math.random() < 0.5 ? 0x5e4430 : 0x7a5c3e;
    if (surf === DL.SURF.SNOW) return 0xf4f7fa;
    if (surf === DL.SURF.SAND) return 0xd8c296;
    return { desert: 0xd7c29a, snow: 0xf2f5f8, coast: 0xd9caa5, mountain: 0xb9b3a6, forest: 0xa59c86, country: 0xb8ad8f }[track.biomeKey];
  }
  const pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), pe = new THREE.Euler(), ps = new THREE.Vector3(), pp = new THREE.Vector3();
  function updateParticles(dt) {
    let n = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 0.97; p.vz *= 0.97; p.vy = p.vy * 0.97 + 0.4 * dt; p.rot += dt;
      const a = 1 - p.life / p.max, s = p.size * (0.35 + a * p.grow) * (p.life < 0.25 ? p.life / 0.25 : 1);
      pe.set(p.rot, p.rot * 0.7, 0); pq.setFromEuler(pe); ps.set(s, s, s); pp.set(p.x, p.y, p.z);
      pm.compose(pp, pq, ps); partMesh.setMatrixAt(n, pm); partMesh.setColorAt(n, p.color); n++;
    }
    partMesh.count = n;
    partMesh.instanceMatrix.needsUpdate = true; if (partMesh.instanceColor) partMesh.instanceColor.needsUpdate = true;
  }
  // ---------------- skid marks ----------------
  let skid = null;
  const SKMAX = 520;
  function initSkids() {
    const g = new THREE.PlaneGeometry(0.26, 0.9); g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ color: 0x11151d, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.InstancedMesh(g, m, SKMAX); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 1;
    scene.add(mesh); skid = { mesh, n: 0, head: 0, t: 0, q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ'), m4: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1) };
  }
  function clearSkids() { if (skid) { skid.n = 0; skid.head = 0; skid.mesh.count = 0; } }
  function skidMarks(c, dt) {
    if (!skid) initSkids();
    if (!(c.grounded && c.surf === DL.SURF.ROAD && c.slip > 0.62 && c.speed > 7 && !c.inWater)) return;
    skid.t += dt; if (skid.t < 0.035) return; skid.t = 0;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx;
    skid.e.set(c.pitch, c.yaw, c.roll, 'YXZ'); skid.q.setFromEuler(skid.e);
    for (let side = -1; side <= 1; side += 2) {
      skid.p.set(c.x - fx * 1.15 + rx * 0.82 * side, c.y + 0.09, c.z - fz * 1.15 + rz * 0.82 * side);
      skid.m4.compose(skid.p, skid.q, skid.s);
      skid.mesh.setMatrixAt(skid.head, skid.m4); skid.head = (skid.head + 1) % SKMAX; skid.n = Math.min(SKMAX, skid.n + 1);
    }
    skid.mesh.count = skid.n; skid.mesh.instanceMatrix.needsUpdate = true;
  }

  function carEffects(r, dt) {
    const c = r.view || r.car, eq = DL.Net.save.equip, m = r.model;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    skidMarks(r.view || r.car, dt);
    if (!r.view && c.surf !== r._lastSurf) {
      if (c.surf >= DL.SURF.MUD && !(r._lastSurf >= DL.SURF.MUD)) DL.UI.banner({ [DL.SURF.MUD]: 'Mud!', [DL.SURF.SNOW]: 'Snow!', [DL.SURF.SAND]: 'Sand!' }[c.surf], 800);
      r._lastSurf = c.surf;
    }
    // dust & tyre smoke
    if (c.grounded && (c.slip > 0.45 || (c.surf >= DL.SURF.GRAVEL && c.speed > 8))) {
      if (Math.random() < 0.7) {
        const side = Math.random() < 0.5 ? -1 : 1;
        spawn(c.x - fx * 1.4 - fz * side * 0.8, c.y + 0.3, c.z - fz * 1.4 + fx * side * 0.8, -c.vx * 0.15 + (Math.random() - .5), 0.6 + Math.random(), -c.vz * 0.15 + (Math.random() - .5), 0.9, 0.9, c.surf >= DL.SURF.GRAVEL ? dustColor(c.surf) : 0xe9e4da, 2.0);
      }
    }
    // exhaust
    if (eq.exhaust !== 'none' && r.running && !r.finished) {
      const ex = m.userData.exhaust;
      tmpV.copy(ex).applyMatrix4(m.matrixWorld);
      if (eq.exhaust === 'flame') {
        if (input.throttle && Math.random() < 0.08) for (let k = 0; k < 4; k++) spawn(tmpV.x, tmpV.y, tmpV.z, -fx * 6 + (Math.random() - .5), Math.random(), -fz * 6 + (Math.random() - .5), 0.18, 0.5, k % 2 ? 0xf2c14e : 0xf05a35, 0.6);
      } else if (Math.random() < (input.throttle ? 0.6 : 0.15)) {
        spawn(tmpV.x, tmpV.y, tmpV.z, -fx * 2 + (Math.random() - .5) * .5, 0.5, -fz * 2 + (Math.random() - .5) * .5, 0.8, 0.45, eq.exhaust === 'coral' ? 0xf7a072 : 0xf2efe8, 2.2);
      }
    }
    // trail ribbon
    if (eq.trail !== 'none' && r.running) {
      r.trailT += dt;
      if (r.trailT > 0.03) { r.trailT = 0; trail.points.push([c.x - fx * 2.1, c.y + 0.55, c.z - fz * 2.1]); if (trail.points.length > 50) trail.points.shift(); }
      updateTrail(DL.TRAIL_COLORS[eq.trail] || DL.TRAIL_COLORS.cream);
    } else trail.mesh.visible = false;
  }

  // ---------------- trail ribbon ----------------
  const trail = { points: [] };
  function initTrail() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(100 * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(100 * 4), 4));
    const idx = []; for (let i = 0; i < 49; i++) { const v = i * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    g.setIndex(idx);
    trail.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    trail.mesh.frustumCulled = false; trail.mesh.visible = false;
    scene.add(trail.mesh);
  }
  const ca = new THREE.Color(), cb = new THREE.Color();
  function updateTrail(cols) {
    const P = trail.points, n = P.length; if (n < 2) { trail.mesh.visible = false; return; }
    trail.mesh.visible = true;
    const pos = trail.mesh.geometry.attributes.position.array, col = trail.mesh.geometry.attributes.color.array;
    ca.set(cols[0]); cb.set(cols[1]);
    for (let i = 0; i < 50; i++) {
      const k = Math.min(i, n - 1), p = P[k], q = P[Math.max(0, k - 1)], r2 = P[Math.min(n - 1, k + 1)];
      let dx = r2[0] - q[0], dz = r2[2] - q[2]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const w = 0.32 * (k / n);
      pos[i * 6] = p[0] - dz * w; pos[i * 6 + 1] = p[1]; pos[i * 6 + 2] = p[2] + dx * w;
      pos[i * 6 + 3] = p[0] + dz * w; pos[i * 6 + 4] = p[1]; pos[i * 6 + 5] = p[2] - dx * w;
      const t = k / n, c = ca.clone().lerp(cb, t), a = t * 0.85;
      col.set([c.r, c.g, c.b, a, c.r, c.g, c.b, a], i * 8);
    }
    trail.mesh.geometry.attributes.position.needsUpdate = true; trail.mesh.geometry.attributes.color.needsUpdate = true;
  }

  // ---------------- per-frame ----------------
  const gs = new Float32Array(8);
  function frame(dt) {
    menuT += dt;
    readInput(dt);
    if (world && world.group.userData.clouds) world.group.userData.clouds.children.forEach((c, i) => { c.position.x += dt * (1.5 + (i % 3)); });
    if (mode === 'race' && race) {
      updateRace(dt);
      setOffset(camera, 'none');
      sun.position.set(race.car.x + 60, race.car.y + 110, race.car.z + 40); sun.target.position.set(race.car.x, race.car.y, race.car.z);
      updateParticles(dt);
      renderer.render(scene, camera);
    } else if (mode === 'replay' && race) {
      updateReplay(dt);
      setOffset(camera, 'none');
      sun.position.set(race.car.x + 60, race.car.y + 110, race.car.z + 40); sun.target.position.set(race.car.x, race.car.y, race.car.z);
      renderer.render(scene, camera);
    } else if (mode === 'garage' || mode === 'shop') {
      if (orbit.auto) orbit.theta += dt * 0.18;
      const cy = 0.9;
      const od = orbit.dist * (window.innerWidth <= 760 ? 1.45 : 1);
      gCam.position.set(Math.sin(orbit.theta) * od * Math.cos(orbit.phi), cy + Math.sin(orbit.phi) * od, Math.cos(orbit.theta) * od * Math.cos(orbit.phi));
      gCam.lookAt(0, cy, 0);
      setOffset(gCam, 'side');
      if (gModel) gModel.userData.wheels.forEach(w => { w.pivot.rotation.y = 0; });
      renderer.render(gScene, gCam);
    } else if (mode === 'editor' && track) {
      const v = edv, cp = Math.cos(v.ph), w = window.innerWidth, h = window.innerHeight;
      camera.position.set(v.tx + Math.sin(v.th) * v.dist * cp, v.ty + Math.sin(v.ph) * v.dist, v.tz + Math.cos(v.th) * v.dist * cp);
      const gy = track.groundAt(camera.position.x, camera.position.z, {}, true).y + 5; if (camera.position.y < gy) camera.position.y = gy;
      camera.lookAt(v.tx, v.ty, v.tz);
      if (camera.fov !== 55) { camera.fov = 55; camera.updateProjectionMatrix(); }
      if (w > 760) camera.setViewOffset(w, h, -150, 0, w, h); else camera.clearViewOffset();
      camera.updateMatrixWorld();
      if (playerModel) playerModel.visible = false;
      sun.position.set(v.tx + 60, v.ty + 110, v.tz + 40); sun.target.position.set(v.tx, v.ty, v.tz);
      renderer.render(scene, camera);
      if (Game.onEdFrame) Game.onEdFrame();
    } else if (track && playerModel) {
      // menu & overlay screens: cinematic idle shot of the player's car on today's track
      const s = track.start, a = s.yaw + 0.75 + Math.sin(menuT * 0.12) * 0.3;
      const gy = track.groundAt(s.x, s.z, {}).y;
      const md = window.innerWidth <= 760 ? 11 : 8.5;
      camera.position.set(s.x + Math.sin(a) * md, gy + 2.2 + Math.sin(menuT * 0.2) * 0.25, s.z + Math.cos(a) * md);
      camera.lookAt(s.x, gy + 0.9, s.z);
      if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
      setOffset(camera, mode === 'menu' ? 'menu' : 'none');
      playerModel.visible = true;
      sun.position.set(s.x + 60, gy + 110, s.z + 40); sun.target.position.set(s.x, gy, s.z);
      updateParticles(dt);
      renderer.render(scene, camera);
    }
  }

  // live gap to the first ghost you are racing: how far ahead or behind it is along the road
  const gnr = {}, mnr = {};
  function ghostGap(r, tg) {
    const g = r.ghosts.find(x => !x.spec.mine) || r.ghosts[0];
    if (!g || !r.ghostsOn || !r.running) { DL.UI.ghostGap(null); return; }
    DL.sampleGhost(g.gh, tg, gs);
    const tr = r.track;
    tr.nearestRoad(gs[0], gs[2], gnr); const gi = gnr.i;
    tr.nearestRoad(r.car.x, r.car.z, mnr); const mi = mnr.i;
    if (gi == null || mi == null) return;
    const d = tr.s[gi] - tr.s[mi];
    DL.UI.ghostGap(g.spec.label || 'Ghost', d, g.gh && tg >= g.time);
  }

  // start-gate lamps follow the countdown: one red per number, all green on GO
  function startLamps(n) {
    const L = world && world.group.userData.lamps; if (!L) return;
    L.forEach((m, k) => m.color.set(n === 0 ? 0x4cd17a : (n >= 1 && n <= 3 && k <= 3 - n) ? 0xf0452f : 0x2a2f3a));
  }
  function updateRace(dt) {
    const r = race;
    if (r.paused) { placeCamera(false, 0); return; }
    if (!r.running && !r.finished) {
      r.countdown -= dt;
      const n = Math.ceil(r.countdown);
      if (n < r.lastBeep && n >= 1 && n <= 3) { r.lastBeep = n; DL.Audio.beep([0, 440, 523, 659][n], 0.16, 'triangle', 0.18); DL.UI.count(n); startLamps(n); }
      if (r.countdown <= 0) { r.running = true; DL.Audio.beep(880, 0.4, 'triangle', 0.22); DL.Audio.beep(1320, 0.35, 'sine', 0.12); DL.UI.count(0); startLamps(0); }
      DL.Audio.updateEngine(0, input.throttle, 0, true);
    } else {
      if (r.finished) { input.throttle = 0; input.brake = 0.4; input.steer *= 0.9; }
      r.acc += dt; let n = 0;
      while (r.acc >= DT && n < 12) {
        const c0 = r.car, pv = r.prev || (r.prev = {});
        pv.x = c0.x; pv.y = c0.y; pv.z = c0.z; pv.yaw = c0.yaw; pv.pitch = c0.pitch; pv.roll = c0.roll; pv.sv = c0.steerVis; pv.ws = c0.wheelSpin; pv.t = r.steps * DT;
        if (!r.finished) physicsStep(r);
        else r.car.step(DT, input, null);
        r.acc -= DT; n++;
      }
      DL.Audio.updateEngine(r.car.vF, input.throttle, r.car.slip, r.car.grounded);
    }
    // render between the last two physics steps so motion stays smooth whatever the frame rate
    const c = r.car, pv = r.prev, run = r.running && pv && pv.t != null;
    const al = run ? DL.clamp(r.acc / DT, 0, 1) : 1, vw = r.view || (r.view = Object.create(c));
    if (run) {
      const L = (a, b) => a + (b - a) * al, wr = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * al; };
      vw.x = L(pv.x, c.x); vw.y = L(pv.y, c.y); vw.z = L(pv.z, c.z); vw.yaw = wr(pv.yaw, c.yaw);
      vw.pitch = L(pv.pitch, c.pitch); vw.roll = L(pv.roll, c.roll); vw.steerVis = L(pv.sv, c.steerVis); vw.wheelSpin = L(pv.ws, c.wheelSpin);
    } else { vw.x = c.x; vw.y = c.y; vw.z = c.z; vw.yaw = c.yaw; vw.pitch = c.pitch; vw.roll = c.roll; vw.steerVis = c.steerVis; vw.wheelSpin = c.wheelSpin; }
    DL.poseCar(r.model, vw.x, vw.y, vw.z, vw.yaw, vw.pitch, vw.roll, vw.steerVis, vw.wheelSpin, input.brake > 0);
    r.model.updateMatrixWorld();
    const t = r.steps * DT, tg = t + (run && !r.finished ? al * DT : 0);
    for (const g of r.ghosts) {
      DL.sampleGhost(g.gh, tg, gs);
      DL.poseCar(g.model, gs[0], gs[1], gs[2], gs[3], gs[4], gs[5], gs[6], tg * 20, gs[7] > 0.5);
      if (g.model.visible !== r.ghostsOn) g.model.visible = r.ghostsOn;
      // name tag fades out when the ghost is right next to the lens so it never blocks the view
      if (g.label) { const dd = Math.hypot(gs[0] - camera.position.x, gs[1] + 1.5 - camera.position.y, gs[2] - camera.position.z); g.label.material.opacity = DL.clamp((dd - 6) / 8, 0, 0.9); }
    }
    r.gapT = (r.gapT || 0) - dt;
    if (r.gapT <= 0) { r.gapT = 0.12; ghostGap(r, tg); }
    placeCamera(false, dt);
    carEffects(r, dt);
    DL.UI.hud(r, t);
  }

  Game.input = input;
})(window.DL);
