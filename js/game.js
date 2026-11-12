/* DAYLINE — renderer, scenes, race loop, cameras, ghosts, effects and input */
'use strict';
(function (DL) {
  const Game = DL.Game = {};
  const DT = 1 / 120, REC_EVERY = 120 / DL.GHOST_HZ;
  let renderer, scene, camera, sun, hemi, envTex, skyDome;
  let track = null, world = null, playerModel = null;
  let gScene, gCam, gModel, gSun;
  let idleAcc = 0, idleN = 0;
  const orbit = { theta: 2.4, phi: 0.3, dist: 9, auto: true, drag: null };
  let mode = 'loading';
  let race = null, menuT = 0;
  const settings = Game.settings = Object.assign({ vol: 0.6, shadows: true, hq: true, cam: 0, units: 'kmh', touch: 'auto', pbGhost: true, shake: 1, cb: false, light: false }, DL.store.get('settings', {}));
  let fill; const SO = [60, 110, 40];
  const keys = {};
  const touch = { left: 0, right: 0, gas: 0, brake: 0, drift: 0 };
  const input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  let steerSmooth = 0, padState = null;

  // ---------------- init ----------------
  Game.init = function () {
    const canvas = document.getElementById('gl');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 1.75, powerPreference: 'high-performance' });   // MSAA costs a lot and shows little on dense screens
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 1, 0.3, 5000);
    hemi = new THREE.HemisphereLight(0xdfe6ea, 0x8a8070, 1.5);
    sun = new THREE.DirectionalLight(0xfff3dd, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    fill = new THREE.DirectionalLight(0xb8d0ff, 0); fill.position.set(-50, 40, -30);
    scene.add(hemi, sun, sun.target, fill);
    skyDome = new THREE.Mesh(new THREE.SphereGeometry(3000, 20, 12), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    skyDome.renderOrder = -10; skyDome.frustumCulled = false; skyDome.onBeforeRender = (r, s, cam) => skyDome.position.copy(cam.position);
    { const p = skyDome.geometry.attributes.position, n = p.count; skyDome.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); }
    scene.add(skyDome);
    buildEnv();
    buildGarage();
    initParticles();
    initTrail();
    // first visit on a weak device (few cores, low memory, software GL): start with the lighter scenery setting
    if (!DL.store.get('settings', null) && Game.weakDevice()) settings.hq = false;
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
    const mob = DL.isTouch && DL.isTouch(), cap = mob ? (settings.hq ? 1.5 : 1) : (settings.hq ? 2 : 1);
    Game.baseRatio = Math.min(window.devicePixelRatio || 1, cap);
    renderer.setPixelRatio(Game.baseRatio * (Game.resScale || 1));
    if (mob && sun.shadow.mapSize.x !== 1024) { sun.shadow.mapSize.set(1024, 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    { const L = !!settings.light;   // improved lighting: filmic tone mapping, lower warmer sun, cool fill, softer shadow edge
      renderer.toneMapping = L ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
      renderer.toneMappingExposure = L ? 1.15 : 1;
      fill.intensity = L ? 0.7 : 0;
      SO[0] = L ? 120 : 60; SO[1] = L ? 48 : 110; SO[2] = L ? 70 : 40;   // low raking sun = long shadows
      document.body.classList.toggle('cine', L); if (Game.lastW && Game._litState !== L) { Game._litState = L; applyWeather(Game.lastW[0], Game.lastW[1]); } else Game.cineLights();
      sun.shadow.radius = L ? 4 : 1; sun.shadow.bias = L ? -0.0004 : -0.0006;
      const sc = sun.shadow.camera, e = L ? 85 : 70; if (sc.right !== e) { sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.updateProjectionMatrix(); } }
    renderer.shadowMap.enabled = !!settings.shadows && !Game.perfNoShadow;
    sun.castShadow = !!settings.shadows && !Game.perfNoShadow;
    scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    DL.Audio.setVolume(settings.vol);
    document.body.classList.toggle('cb', !!settings.cb);
    DL.store.set('settings', settings);
    resize();
  };

  // phones: drop the render resolution a step when frames run long, raise it again when there is headroom
  Game.setResScale = function (k) {
    k = DL.clamp(k, 0.55, 1); if (Math.abs(k - (Game.resScale || 1)) < 0.01) return;
    Game.resScale = k; renderer.setPixelRatio(Game.baseRatio * k); resize();
  };
  // temporary shadow cut-out used by the frame-time governor (never saved to settings)
  Game.setPerfShadows = function (off) {
    if (!!Game.perfNoShadow === !!off || !settings.shadows) return;
    Game.perfNoShadow = !!off;
    renderer.shadowMap.enabled = !off; sun.castShadow = !off;
    scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  };
  Game.weakDevice = function () {
    try {
      const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'), name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      if (/swiftshader|llvmpipe|software|basic render/i.test(name)) return true;
    } catch (e) { }
    const cores = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory || 8;
    return cores <= 4 || mem <= 4;
  };
  Game.renderer = () => renderer;
  Game.scenes = () => ({ scene, gScene });

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
    if (kind === 'menu') { if (narrow) cam.setViewOffset(w, h, 0, h * 0.04, w, h); else cam.setViewOffset(w, h, -w * 0.02, -h * 0.05, w, h); }
    else if (kind === 'side') {
      const insp = Game.sideView === 'inspect';
      if (narrow) cam.setViewOffset(w, h, 0, h * (insp ? 0.2 : 0.26), w, h);
      else cam.setViewOffset(w, h, insp ? Math.min(w * 0.17, 220) : (h < 520 ? 40 : 60), 0, w, h);
    }
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
  // ---------------- daily weather (visual only, same for everyone, no effect on physics) ----------------
  const WEATHER = {
    clear:  { name: 'Clear', hemi: 1.5, sun: 2.6 },
    golden: { name: 'Golden hour', hemi: 1.3, sun: 2.9, tint: 0xffb066, mix: 0.35, sunc: 0xffc27a },
    fog:    { name: 'Fog', hemi: 1.7, sun: 1.2, tint: 0xc9d0d4, mix: 0.7, fogNear: 10, fogFar: 260 },
    rain:   { name: 'Rain', hemi: 1.3, sun: 0.9, tint: 0x7d8a96, mix: 0.6, fogNear: 40, fogFar: 520, rain: true },
    dusk:   { name: 'Dusk', hemi: 0.9, sun: 1.1, tint: 0x3a3f68, mix: 0.6, sunc: 0xff9a7a, fogNear: 80, fogFar: 900 }
  };
  Game.weather = WEATHER.clear;
  let rainPts = null;
  function applyWeather(day, B) {
    let w = WEATHER.clear;
    if (day && /^\d{8}$/.test(day)) {
      const h = DL.hashStr('wx:' + day) % 100;
      w = h < 44 ? WEATHER.clear : h < 60 ? WEATHER.golden : h < 76 ? WEATHER.fog : h < 90 ? WEATHER.rain : WEATHER.dusk;
    }
    Game.weather = w;
    hemi.intensity = w.hemi; sun.intensity = w.sun;
    if (w.tint) {
      const t = new THREE.Color(w.tint), m = w.mix;
      scene.background = new THREE.Color(B.sky).lerp(t, m);
      scene.fog = new THREE.Fog(new THREE.Color(B.fog).lerp(t, m), w.fogNear || 260, w.fogFar || 1700);
      const top = new THREE.Color(B.sky).lerp(t, m), hor = new THREE.Color(B.fog).lerp(t, m), c = new THREE.Color(), p = skyDome.geometry.attributes.position, col = skyDome.geometry.attributes.color;
      for (let i = 0; i < p.count; i++) { const hh = Math.max(0, p.getY(i) / 3000); c.copy(hor).lerp(top, Math.pow(hh, 0.55)); col.setXYZ(i, c.r, c.g, c.b); }
      col.needsUpdate = true;
      hemi.color.lerp(t, m * 0.5);
      if (w.sunc) sun.color.set(w.sunc);
    }
    if (rainPts) { scene.remove(rainPts); rainPts.geometry.dispose(); rainPts.material.dispose(); rainPts = null; }
    if (w.rain) {
      const n = 1400, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 60; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - .5) * 60; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      rainPts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd8e0, size: 0.09, transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
      rainPts.frustumCulled = false; scene.add(rainPts);
    }
    Game.lastW = [day, B]; Game.baseSunCol = sun.color.clone(); Game.cineLights();
    const el = document.getElementById('wxTag'); if (el) el.textContent = w === WEATHER.clear ? '' : w.name;
  }
  // cinematic grade: warm strong key, dimmer sky fill for contrast, cool shadow fill
  const cineWarm = new THREE.Color(0xffd2a0);
  Game.cineLights = function () {
    const w = Game.weather || WEATHER.clear, L = !!settings.light;
    if (!Game.baseSunCol) return;
    hemi.intensity = w.hemi * (L ? 0.55 : 1);
    if (L) { hemi.color.set(0xffb9a4); hemi.groundColor.set(0x6a4660); } sun.intensity = w.sun * (L ? 1.45 : 1);
    sun.color.copy(Game.baseSunCol); if (L) sun.color.lerp(cineWarm, 0.7);
    if (L && !w.rain && w !== WEATHER.fog) sunsetSky(); else if (sunDisc) sunDisc.visible = false;
  };
  // sunset sky: violet zenith -> rose -> amber horizon, glow around the sun, big sun disc, warm haze on distant land
  let sunDisc = null;
  function sunsetSky() {
    const d = new THREE.Vector3(SO[0], SO[1], SO[2]).normalize();
    const top = new THREE.Color(0x2c3a82), mid = new THREE.Color(0xd9628a), hor = new THREE.Color(0xffa45c), glow = new THREE.Color(0xffd08a), c = new THREE.Color(), v = new THREE.Vector3(), haze0 = new THREE.Color(0xd4805c);
    const p = skyDome.geometry.attributes.position, col = skyDome.geometry.attributes.color;
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const h = Math.max(0, v.y);
      if (v.y < 0) { c.copy(hor).lerp(haze0, Math.min(1, -v.y * 4)); col.setXYZ(i, c.r, c.g, c.b); continue; }
      if (h < 0.28) c.copy(hor).lerp(mid, Math.pow(h / 0.28, 0.7)); else c.copy(mid).lerp(top, Math.min(1, Math.pow((h - 0.28) / 0.62, 0.8)));
      const g = Math.max(0, v.dot(d)); c.lerp(glow, Math.pow(g, 6) * 0.75).lerp(hor, Math.pow(g, 24) * 0.5);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    const haze = new THREE.Color(0xf0a070);
    scene.background = new THREE.Color(0xffa45c);
    scene.fog = new THREE.Fog(haze, 140, 1500);
    if (!sunDisc) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, '#fff8e0'); gr.addColorStop(0.18, '#fff0c0'); gr.addColorStop(0.24, 'rgba(255,190,110,.55)'); gr.addColorStop(0.6, 'rgba(255,140,80,.18)'); gr.addColorStop(1, 'rgba(255,120,60,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      sunDisc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      sunDisc.scale.set(900, 900, 1); sunDisc.renderOrder = -9; sunDisc.frustumCulled = false;
      sunDisc.onBeforeRender = (r, sc, cam) => sunDisc.lookAt(cam.position);
      skyDome.add(sunDisc);
    }
    sunDisc.visible = true; sunDisc.position.copy(d).multiplyScalar(2700);
  }

  // ---------------- cinematic post: bloom + sun shafts + warm grade (only with the Cinematic lighting setting) ----------------
  let cpost = null;
  const FS_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  function ppInit(w, h) {
    const mk = (W, H, o) => new THREE.WebGLRenderTarget(Math.max(2, W | 0), Math.max(2, H | 0), Object.assign({ type: THREE.HalfFloatType, depthBuffer: false }, o));
    if (!cpost) {
      cpost = { cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), scn: new THREE.Scene(), q: new THREE.Mesh(new THREE.PlaneGeometry(2, 2)) };
      cpost.scn.add(cpost.q); cpost.q.frustumCulled = false;
      const sm = (fs, u) => new THREE.ShaderMaterial({ vertexShader: FS_VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false, toneMapped: false });
      cpost.bright = sm('uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.8, 1.5, l), 1.); }', { t: { value: null } });
      cpost.blur = sm('uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227; c += (texture2D(t, vUv + d * 1.38).rgb + texture2D(t, vUv - d * 1.38).rgb) * 0.316; c += (texture2D(t, vUv + d * 3.23).rgb + texture2D(t, vUv - d * 3.23).rgb) * 0.070; gl_FragColor = vec4(c, 1.); }', { t: { value: null }, d: { value: new THREE.Vector2() } });
      cpost.comp = new THREE.ShaderMaterial({ vertexShader: FS_VS, depthTest: false, depthWrite: false,
        uniforms: { t: { value: null }, b: { value: null }, sun: { value: new THREE.Vector3(.5, .5, 0) }, tint: { value: new THREE.Color(1.05, 0.98, 0.92) }, str: { value: 0.75 } },
        fragmentShader: `uniform sampler2D t, b; uniform vec3 sun; uniform vec3 tint; uniform float str; varying vec2 vUv;
          void main(){
            vec3 c = texture2D(t, vUv).rgb; vec3 bl = texture2D(b, vUv).rgb;
            vec3 rays = vec3(0.); vec2 dir = (sun.xy - vUv) / 22.; vec2 uv = vUv; float w = 1.;
            for (int i = 0; i < 22; i++) { uv += dir; rays += texture2D(b, uv).rgb * w; w *= 0.93; }
            rays *= sun.z * 0.11;
            c += bl * str + rays * vec3(1., .72, .42);
            c *= tint;
            c = (c - 0.18) * 1.03 + 0.18;
            float l = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(l), c, 0.98);
            gl_FragColor = vec4(max(c, 0.), 1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }` });
    }
    const sz = new THREE.Vector2(); renderer.getDrawingBufferSize(sz);
    if (cpost.w !== sz.x || cpost.h !== sz.y) {
      ['rt', 'a', 'b'].forEach(k => cpost[k] && cpost[k].dispose());
      cpost.rt = mk(sz.x, sz.y, { samples: 4, depthBuffer: true }); cpost.a = mk(sz.x / 4, sz.y / 4); cpost.b = mk(sz.x / 4, sz.y / 4);
      cpost.w = sz.x; cpost.h = sz.y;
    }
  }
  Game.draw = function (sc, cam) {
    if (!settings.light || sc !== scene || Game.noPost) { renderer.render(sc, cam); return; }
    const ts = renderer.getRenderTarget();
    ppInit();
    renderer.setRenderTarget(cpost.rt); renderer.clear(); renderer.render(sc, cam);
    const q = (m, tgt) => { cpost.q.material = m; renderer.setRenderTarget(tgt); renderer.render(cpost.scn, cpost.cam); };
    cpost.bright.uniforms.t.value = cpost.rt.texture; q(cpost.bright, cpost.a);
    for (let i = 0; i < 2; i++) {
      cpost.blur.uniforms.t.value = cpost.a.texture; cpost.blur.uniforms.d.value.set(1.6 / cpost.a.width, 0); q(cpost.blur, cpost.b);
      cpost.blur.uniforms.t.value = cpost.b.texture; cpost.blur.uniforms.d.value.set(0, 1.6 / cpost.a.height); q(cpost.blur, cpost.a);
    }
    // sun position on screen (for the light shafts)
    const sv = new THREE.Vector3(SO[0], SO[1], SO[2]).normalize(), fw = new THREE.Vector3(); cam.getWorldDirection(fw);
    const pr = cam.position.clone().addScaledVector(sv, 1000).project(cam), vis = Math.max(0, fw.dot(sv));
    const u = cpost.comp.uniforms; u.sun.value.set(pr.x * .5 + .5, pr.y * .5 + .5, Math.pow(vis, 1.5)); u.t.value = cpost.rt.texture; u.b.value = cpost.a.texture;
    cpost.q.material = cpost.comp; renderer.setRenderTarget(ts); renderer.render(cpost.scn, cpost.cam);
  };
  Game.tickWeather = function (dt) {
    if (!rainPts) return;
    const a = rainPts.geometry.attributes.position, c = camera.position;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - 28 * dt; if (y < -2) { y += 32; a.setX(i, (Math.random() - .5) * 60); a.setZ(i, (Math.random() - .5) * 60); }
      a.setY(i, y);
    }
    a.needsUpdate = true; rainPts.position.set(c.x, c.y - 4, c.z);
  };

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
    applyWeather(custom ? null : day, B);
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
    gModel = DL.buildCar(opts); idleN = -1;
    gModel.position.y = 0.24;
    gModel.traverse(o => { if (o.isMesh) o.castShadow = true; });
    if (garageGrid && !opts.label && gModel.userData.setGrid) gModel.userData.setGrid(true, opts.livery, opts.base);
    gScene.add(gModel);
    return gModel;
  };
  Game.rearView = function (far) { orbit.theta = far ? 4.55 : 4.0; orbit.phi = 0.22; orbit.dist = far ? 12.5 : 8.5; orbit.auto = false; };
  Game.setGarageLivery = function (liv, base) { if (gModel) gModel.userData.setLivery(liv, base); };
  let garageGrid = null;
  Game.setGarageGrid = function (on, liv, base) { garageGrid = on ? { liv, base } : null; if (gModel && gModel.userData.setGrid) gModel.userData.setGrid(on, liv, base); };

  // paint mode: move in close and stop the slow spin; leaving it restores the normal view
  let paintZoomed = false;
  Game.paintView = on => { if (on && !paintZoomed) { paintZoomed = true; orbit.auto = false; orbit.dist = 6.4; orbit.phi = 0.35; } else if (!on && paintZoomed) { paintZoomed = false; orbit.dist = 9; orbit.auto = true; } };
  Game.pickBodyUV = function (cx, cy) {
    if (!gModel) return null;
    const r = new THREE.Raycaster(), v = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    r.setFromCamera(v, gCam);
    const hit = r.intersectObject(gModel.userData.bodyMesh, false)[0];
    return hit && hit.uv ? hit.uv : null;
  };

  // ---------------- modes ----------------
  Game.setMode = function (m) {
    mode = m; idleN = -1;
    if (m !== 'editor') Game.edStale(false);
    if (race && m !== 'race' && m !== 'replay') endRace();
    if (m === 'garage' || m === 'shop') { orbit.auto = true; }
    if (m === 'menu' || m === 'board' || m === 'archive' || m === 'community' || m === 'editor') { parkPlayer(); }
  };
  Game.mode = () => mode;
  const edv = Game.edView = { th: 0.8, ph: 0.8, dist: 700, tx: 0, ty: 0, tz: 0 };
  Game.edCamera = () => camera;
  Game.edStale = on => { if (renderer) renderer.domElement.style.filter = on ? 'grayscale(.9) brightness(.85)' : ''; };

  // ---------------- race ----------------
  Game.startRace = async function (day, ghostSpecs, custom, opts) {
    DL.Audio.init();
    Game.loadDay(day, custom);
    if (race) endRace();
    mode = 'race';
    const car = new DL.Car(track);
    race = {
      track, car, prog: new DL.Progress(track), model: playerModel, steps: 0, acc: 0, countdown: settings.quick ? 1 : 3.2, lastBeep: 4,
      running: false, finished: false, paused: false, frames: [], recoveries: 0, airMax: 0,
      ghosts: [], ghostsOn: true, ghostSpecs: ghostSpecs || [], pbCp: null, farT: 0, waterT: 0,
      camYaw: track.start.yaw, shake: 0, camMode: settings.cam, trailT: 0
    };
    race.test = !!(opts && opts.test); race.noPB = race.test;
    if (opts && opts.room) { race.room = opts.room; race.noPB = true; race.live = {}; }
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
    r.countdown = settings.quick ? 1 : 3.2; r.lastBeep = 4; startLamps(4); r.camYaw = s.yaw; r.farT = 0; r.waterT = 0;
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
    { const pg = new DL.Progress(track); for (let i = 1; i < gh.n; i++) pg.update(gh.f[(i - 1) * 8], gh.f[(i - 1) * 8 + 2], gh.f[i * 8], gh.f[i * 8 + 2], i / gh.hz); race.cp = pg.cpTimes.slice(); }
    trail.points.length = 0; clearSkids(); trail.mesh.visible = false;
    return true;
  };
  // compare other runs in the replay: they start together (or enter the chosen sector together) so you can see who gains where
  Game.replayAddGhost = function (spec, enc) {
    const r = race; if (!r || !r.replay) return null;
    const gh = DL.decodeGhost(enc); if (!gh || r.ghosts.some(x => x.cmp && x.spec.uid === spec.uid)) return null;
    const model = DL.buildCar({ car: spec.car, livery: spec.l ? DL.decodeLivery(spec.l) : DL.defaultLivery(), base: spec.b, equip: spec.equip, ghost: true });
    const label = makeLabel(spec.label || 'Ghost', spec.mine); model.add(label); scene.add(model);
    try { renderer.compile(scene, camera); } catch (e) {}
    const pg = new DL.Progress(r.track); for (let i = 1; i < gh.n; i++) pg.update(gh.f[(i - 1) * 8], gh.f[(i - 1) * 8 + 2], gh.f[i * 8], gh.f[i * 8 + 2], i / gh.hz);
    const o = { spec, gh, model, label, cmp: true, time: (gh.n - 1) / gh.hz, cp: pg.cpTimes.slice(), gap: null };
    r.ghosts.push(o); return o;
  };
  Game.replayRemoveGhost = function (uid) {
    const r = race; if (!r || !r.replay) return;
    const i = r.ghosts.findIndex(x => x.cmp && x.spec.uid === uid); if (i < 0) return;
    const o = r.ghosts[i]; scene.remove(o.model); o.model.userData.dispose(); r.ghosts.splice(i, 1);
  };
  Game.replaySector = function (k) {
    const r = race; if (!r || !r.replay || !r.cp) return;
    if (k == null || r.cp[k] == null) { r.loop = null; return; }
    r.loop = { k, a: k ? r.cp[k - 1] : 0, b: r.cp[k] }; r.rt = Math.max(0, r.loop.a - 0.6); r.snap = true; r.paused = false;
  };
  const rs0 = new Float32Array(8), rs1 = new Float32Array(8), rk0 = new Float32Array(8), rk1 = new Float32Array(8), rgT = {};
  function updateReplay(dt) {
    const r = race, c = r.car;
    if (!r.paused) {
      if (r.rt >= r.dur) { r.hold += dt; if (r.hold > 1.6) { r.rt = 0; r.hold = 0; r.snap = true; } }
      else { r.rt = Math.min(r.dur, r.rt + dt * r.rate); r.hold = 0; }
    }
    if (r.loop && !r.paused && r.rt >= r.loop.b + 0.5) { r.rt = Math.max(0, r.loop.a - 0.6); r.snap = true; r.hold = 0; }
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
    const flag = Math.round(rs1[7]), hbk = (flag & 2) > 0, brk = (flag & 1) > 0 || acc < -9, stv = DL.clamp(rs1[6] / 0.82, -1, 1), live = t < r.dur - 0.2;
    r.keys = { gas: live && !brk && (acc > -1.2 || vN > 48), brake: live && brk, hb: live && hbk, left: stv < -0.2, right: stv > 0.2, st: stv, v: vN };
    DL.poseCar(r.model, x, y, z, c.yaw, c.pitch, c.roll, c.steerVis, r.spin, rs1[7] > 0.5);
    r.model.updateMatrixWorld();
    // compared runs, lined up at the start of the run or of the looped sector
    const cpm = r.cp || [], k0 = r.loop ? r.loop.k : -1;
    for (const o of r.ghosts) {
      if (!o.cmp) continue;
      const off = k0 > 0 && o.cp[k0 - 1] != null && cpm[k0 - 1] != null ? o.cp[k0 - 1] - cpm[k0 - 1] : 0;
      const tg = DL.clamp(t + off, 0, o.time);
      DL.sampleGhost(o.gh, tg, rs0);
      DL.poseCar(o.model, rs0[0], rs0[1], rs0[2], rs0[3], rs0[4], rs0[5], rs0[6], tg * 20, rs0[7] > 0.5);
      { const dd = Math.hypot(rs0[0] - camera.position.x, rs0[1] + 1.5 - camera.position.y, rs0[2] - camera.position.z); o.label.material.opacity = DL.clamp((dd - 6) / 8, 0, 0.9); }
      // gap at the last checkpoint passed: + means the replayed driver is slower
      let k = -1; for (let i = 0; i < cpm.length; i++) if (cpm[i] <= t + 1e-6) k = i;
      if (r.loop) k = t >= cpm[k0] ? k0 : -1;
      o.gap = k < 0 || o.cp[k] == null ? null : r.loop ? (cpm[k] - (k ? cpm[k - 1] : 0)) - (o.cp[k] - (k ? o.cp[k - 1] : 0)) : cpm[k] - o.cp[k];
      o.gapK = k;
    }
    const snap = r.snap; r.snap = false;
    placeCamera(snap, r.paused ? 0 : dt);
    DL.UI.replayHud(r, t);
  }

  function endRace() {
    if (!race) return;
    if (!race.finished && race.running !== undefined) logAttempt(race, false);
    race.ghosts.forEach(g => { scene.remove(g.model); g.model.userData.dispose(); });
    if (race.live) for (const k in race.live) { scene.remove(race.live[k].model); race.live[k].model.userData.dispose(); }
    race = null;
    DL.Audio.stopEngine();
    trail.points.length = 0; clearSkids(); trail.mesh.visible = false;
    camera.fov = 60; camera.updateProjectionMatrix();
  }

  function record() {
    const c = race.car;
    // last value: 1 = brake, 2 = handbrake (3 = both); older ghosts only ever hold 0 or 1
    race.frames.push([c.x, c.y, c.z, c.yaw, c.pitch, c.roll, c.steerVis, (input.brake > 0 ? 1 : 0) | (input.handbrake ? 2 : 0)]);
  }

  function physicsStep(r) {
    const c = r.car, ev = {};
    const px = c.x, pz = c.z;
    c.step(DT, input, ev);
    r.steps++;
    const t = r.steps * DT;
    if (r.steps % REC_EVERY === 0) record();
    if (ev.land) { DL.Audio.thump(ev.land / 25); r.shake = Math.min(1, ev.land / 20) * settings.shake; burst(c.x, c.y, c.z, 6, dustColor(), 3); }
    if (ev.hit) { DL.Audio.thump(ev.hit / 15); r.shake = Math.min(1, ev.hit / 15) * settings.shake; }
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
    DL.Audio.finish(); setTimeout(() => DL.Audio.chime(), 380);
    const enc = DL.encodeGhost(r.frames); r.enc = enc;
    const gh = DL.decodeGhost(enc);
    const valid = DL.validateRun(r.track, gh, t);
    const beatGhost = r.ghosts.some(g => !g.spec.mine && g.time > t) || r.ghosts.some(g => g.spec.mine && g.time > t + 0.001);
    if (r.room) {
      // room laps feed the normal leaderboard of that map (daily or community), exactly like a solo run
      let res = null;
      if (valid) { try { res = DL.Net.submitRun(r.track, t, enc, r.track.custom ? {} : { recoveries: r.recoveries, airMax: r.airMax, beatGhost: false }); } catch (e) { console.warn(e); } }
      DL.Rooms.finished(r, t, valid); DL.UI.roomFinished(r, t, valid, res); return;
    }
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
      } else if (mode === 'replay' && (e.code === 'KeyH' || e.code === 'KeyF')) {
        if (e.code === 'KeyH') { document.getElementById('replay').classList.toggle('nohud'); }
        else Game.photoReq = true;
      } else if (e.code === 'Escape') { const rp = document.getElementById('replay'); if (rp && rp.classList.contains('nohud')) { rp.classList.remove('nohud'); return; } DL.UI.back(); }
    });
    { const pb = document.getElementById('rpPhoto'); if (pb) pb.onclick = () => { Game.photoReq = true; }; }
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    // garage orbit & body painting: one pointer paints (or turns the car off the body), two pointers turn and zoom, right button always turns
    const ptrs = new Map();
    const hover = e => { if (mode === 'garage' && DL.UI.paintHover) DL.UI.paintHover(DL.UI.paintActive && DL.UI.paintActive() && e.pointerType !== 'touch' ? Game.pickBodyUV(e.clientX, e.clientY) : null); };
    const startOrbit = e => { orbit.drag = { x: e.clientX, y: e.clientY, th: orbit.theta, ph: orbit.phi }; orbit.auto = false; };
    canvas.addEventListener('pointerdown', e => {
      if (mode !== 'garage' && mode !== 'shop') return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (ptrs.size === 2) {          // second finger: stop painting, turn and pinch instead
        if (orbit.paint) { DL.UI.paintEnd(); orbit.paint = false; }
        const [a, b] = [...ptrs.values()]; orbit.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: orbit.dist };
        startOrbit({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }); return;
      }
      if (mode === 'garage' && e.button === 0 && DL.UI.paintActive && DL.UI.paintActive()) {
        const uv = Game.pickBodyUV(e.clientX, e.clientY);
        if (uv) { orbit.paint = true; DL.UI.paintUV(uv, true); return; }
      }
      startOrbit(e);
    });
    canvas.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (p) { p.x = e.clientX; p.y = e.clientY; }
      if (ptrs.size >= 2 && orbit.pinch) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        orbit.dist = DL.clamp(orbit.pinch.dist * orbit.pinch.d / Math.max(20, d), 5, 16);
        if (orbit.drag) { orbit.theta = orbit.drag.th - (mx - orbit.drag.x) * 0.008; orbit.phi = DL.clamp(orbit.drag.ph + (my - orbit.drag.y) * 0.005, 0.05, 1.2); }
        return;
      }
      if (orbit.paint) { const uv = Game.pickBodyUV(e.clientX, e.clientY); if (uv) DL.UI.paintUV(uv, false); return; }
      if (!orbit.drag) { hover(e); return; }
      orbit.theta = orbit.drag.th - (e.clientX - orbit.drag.x) * 0.008;
      orbit.phi = DL.clamp(orbit.drag.ph + (e.clientY - orbit.drag.y) * 0.005, 0.05, 1.2);
    });
    const end = e => {
      ptrs.delete(e.pointerId);
      if (orbit.paint) DL.UI.paintEnd();
      orbit.paint = false; orbit.drag = null; if (ptrs.size < 2) orbit.pinch = null;
      if (ptrs.size === 1) { const r = [...ptrs.values()][0]; orbit.drag = { x: r.x, y: r.y, th: orbit.theta, ph: orbit.phi }; }
    };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', e => { if (mode === 'garage' && DL.UI.paintHover && e.pointerType !== 'touch') DL.UI.paintHover(null); });
    canvas.addEventListener('contextmenu', e => { if (mode === 'garage' || mode === 'shop') e.preventDefault(); });
    canvas.addEventListener('wheel', e => { if (mode === 'garage' || mode === 'shop') { orbit.dist = DL.clamp(orbit.dist + e.deltaY * 0.01, 5.5, 16); e.preventDefault(); } }, { passive: false });
  }

  function readInput(dt) {
    let thr = (keys.KeyW || keys.ArrowUp || touch.gas) ? 1 : 0;
    let brk = (keys.KeyS || keys.ArrowDown || touch.brake) ? 1 : 0;
    let target = ((keys.KeyD || keys.ArrowRight || touch.right) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft || touch.left) ? 1 : 0);
    let hb = !!(keys.Space || touch.drift);
    const M = DL.Mobile && DL.Mobile.state;
    if (M && M.on) {
      if (M.gas) thr = 1; if (M.brake) brk = 1; if (M.drift) hb = true;
      if (M.analog != null) target = M.analog; else if (M.steer) target = M.steer;
      if (settings.autoGas && !brk && !M.brake) thr = 1;
    }
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
    // portrait screens: keep roughly the same sideways view instead of a narrow letterbox
    if (camera.aspect < 0.95) f = Math.min(92, 2 * Math.atan(Math.tan(f * Math.PI / 360) * 0.95 / camera.aspect) * 180 / Math.PI);
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
  let parts, partMesh, raceFx, garFx;
  const PMAX = 220;
  function initParticles() {
    parts = []; raceFx = makeFx(scene);
    partMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshLambertMaterial({ flatShading: true, transparent: true, opacity: 0.85, depthWrite: false, emissive: 0x3a3a3a }), PMAX);
    partMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    partMesh.setColorAt(0, new THREE.Color(1, 1, 1));
    partMesh.count = 0; partMesh.frustumCulled = false;
    scene.add(partMesh);
  }
  // exhaust smoke / flames: unlit so the item colours show true (the dust puffs above are lit)
  const FXMAX = 160, fxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false });
  function makeFx(sc) {
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), fxMat, FXMAX);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.frustumCulled = false; m.renderOrder = 2; sc.add(m);
    return { a: [], m };
  }
  function fxSpawn(S, x, y, z, vx, vy, vz, life, size, color, grow) {
    if (S.a.length >= FXMAX) S.a.shift();
    S.a.push({ x, y, z, vx, vy, vz, life, max: life, size, color: new THREE.Color(color), grow, rot: Math.random() * 6 });
  }
  function fxStep(S, dt) {
    let n = 0; const A = S.a;
    for (let i = A.length - 1; i >= 0; i--) {
      const p = A[i]; p.life -= dt; if (p.life <= 0) { A.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 0.96; p.vz *= 0.96; p.vy = p.vy * 0.96 + 0.5 * dt; p.rot += dt;
      const a = 1 - p.life / p.max, s = p.size * (0.4 + a * p.grow) * (p.life < 0.2 ? p.life / 0.2 : 1);
      pe.set(p.rot, p.rot * 0.7, 0); pq.setFromEuler(pe); ps.set(s, s, s); pp.set(p.x, p.y, p.z);
      pm.compose(pp, pq, ps); S.m.setMatrixAt(n, pm); S.m.setColorAt(n, p.color); n++;
    }
    S.m.count = n; S.m.instanceMatrix.needsUpdate = true; if (S.m.instanceColor) S.m.instanceColor.needsUpdate = true;
  }
  // one puff / flame burst from a pipe, travelling back along (bx, bz); shared by the race and the showroom
  function exhaustFx(S, xd, p, bx, bz, throttle, speedK) {
    if (xd.k === 'flame') {
      if (throttle && Math.random() < 0.5) fxSpawn(S, p.x, p.y, p.z, bx * (2 + speedK) + (Math.random() - .5) * .6, 0.3 + Math.random() * .4, bz * (2 + speedK) + (Math.random() - .5) * .6, 0.22 + Math.random() * 0.14, 0.45, xd.c[Math.random() < 0.6 ? 0 : 1], 1.2);
    } else if (Math.random() < (throttle ? 0.7 : 0.2)) {
      fxSpawn(S, p.x, p.y, p.z, bx * (1.2 + speedK) + (Math.random() - .5) * .5, 0.5, bz * (1.2 + speedK) + (Math.random() - .5) * .5, 0.9, 0.38, xd.c[Math.random() < 0.55 ? 0 : 1], 2.4);
    }
  }
  function exhaustPop(S, xd, p, bx, bz) {        // backfire when you lift off
    if (xd.k !== 'flame') return;
    for (let k = 0; k < 9; k++) fxSpawn(S, p.x, p.y, p.z, bx * (4 + Math.random() * 4) + (Math.random() - .5) * 1.2, Math.random() * 1.2, bz * (4 + Math.random() * 4) + (Math.random() - .5) * 1.2, 0.22 + Math.random() * 0.15, 0.4, xd.c[k % 2], 1.4);
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
    fxStep(raceFx, dt);
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
    if (!(c.grounded && c.surf === DL.SURF.ROAD && (c.slip > 0.62 || c.slideK > 0.2) && c.speed > 7 && !c.inWater)) return;
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
    // handbrake slide: thick smoke pouring off both rear tyres, and the lever click on the pull
    if (!r.view) {
      const hb = !!input.handbrake && c.speed > 8;
      if (hb && !r._hb) DL.Audio.ratchet();
      r._hb = hb;
    }
    if (c.grounded && c.slideK > 0.15 && c.speed > 7 && c.surf === DL.SURF.ROAD && !c.inWater) {
      const k = DL.clamp(c.slideK, 0, 1), rx = -fz, rz = fx;
      for (let side = -1; side <= 1; side += 2) if (Math.random() < 0.55 + 0.4 * k)
        spawn(c.x - fx * 1.2 + rx * 0.82 * side, c.y + 0.2, c.z - fz * 1.2 + rz * 0.82 * side, -c.vx * 0.12 + rx * side * (0.6 + Math.random()), 0.5 + Math.random() * 0.8, -c.vz * 0.12 + rz * side * (0.6 + Math.random()), 0.8 + 0.5 * k, 0.8 + 0.5 * k, 0xf1eee8, 2.6);
    }
    // exhaust
    if (eq.exhaust !== 'none' && r.running && !r.finished) {
      const ud = m.userData, xd = DL.EXHAUST[eq.exhaust] || DL.EXHAUST.smoke, side = ud.exhaust2 && Math.random() < 0.5 ? ud.exhaust2 : ud.exhaust;
      tmpV.copy(side).applyMatrix4(m.matrixWorld);
      const sp = Math.min(1, (c.speed || 0) / 40);
      exhaustFx(raceFx, xd, tmpV, -fx, -fz, input.throttle, sp * 3);
      if (r.lastThr && !input.throttle && (c.speed || 0) > 8) exhaustPop(raceFx, xd, tmpV, -fx, -fz);
      r.lastThr = input.throttle;
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
  function makeTrailMesh(sc) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(100 * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(100 * 4), 4));
    const idx = []; for (let i = 0; i < 49; i++) { const v = i * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.frustumCulled = false; m.visible = false; m.renderOrder = 3; sc.add(m); return m;
  }
  function initTrail() { trail.mesh = makeTrailMesh(scene); }
  const ca = new THREE.Color(), cb = new THREE.Color(), cc = new THREE.Color();
  // a flat ribbon that fades from the colour pair's first tone at the tail to the second at the car, a little wider and brighter than before
  function updateTrail(cols, T) {
    T = T || trail;
    const P = T.points, n = P.length; if (n < 2) { T.mesh.visible = false; return; }
    T.mesh.visible = true;
    const pos = T.mesh.geometry.attributes.position.array, col = T.mesh.geometry.attributes.color.array;
    ca.set(cols[0]); cb.set(cols[1]);
    for (let i = 0; i < 50; i++) {
      const k = Math.min(i, n - 1), p = P[k], q = P[Math.max(0, k - 1)], r2 = P[Math.min(n - 1, k + 1)];
      let dx = r2[0] - q[0], dz = r2[2] - q[2]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const t = k / n, w = 0.2 + 0.28 * t;
      pos[i * 6] = p[0] - dz * w; pos[i * 6 + 1] = p[1]; pos[i * 6 + 2] = p[2] + dx * w;
      pos[i * 6 + 3] = p[0] + dz * w; pos[i * 6 + 4] = p[1]; pos[i * 6 + 5] = p[2] - dx * w;
      cc.copy(ca).lerp(cb, t); const a = Math.min(1, Math.pow(t, 0.7) * 1.05);
      col.set([cc.r, cc.g, cc.b, a, cc.r, cc.g, cc.b, a], i * 8);
    }
    T.mesh.geometry.attributes.position.needsUpdate = true; T.mesh.geometry.attributes.color.needsUpdate = true;
  }
  // showroom: puffs and a ribbon behind the displayed car so exhaust and trail items can be seen before buying
  const garTrail = { points: [] };
  let garClock = 0;
  function garageFx(dt) {
    if (!garFx) { garFx = makeFx(gScene); garTrail.mesh = makeTrailMesh(gScene); }
    garClock += dt;
    const eq = (gModel && gModel.userData.equip) || {}, show = gModel && !paintZoomed;
    if (show && eq.exhaust && eq.exhaust !== 'none') {
      const ud = gModel.userData, xd = DL.EXHAUST[eq.exhaust] || DL.EXHAUST.smoke, side = ud.exhaust2 && Math.random() < 0.5 ? ud.exhaust2 : ud.exhaust;
      tmpV.copy(side).applyMatrix4(gModel.matrixWorld);
      const bk = new THREE.Vector3(0, 0, -1).transformDirection(gModel.matrixWorld);
      exhaustFx(garFx, xd, tmpV, bk.x, bk.z, 1, 0.5);
      if (xd.k === 'flame' && Math.floor(garClock * 0.8) !== Math.floor((garClock - dt) * 0.8)) exhaustPop(garFx, xd, tmpV, bk.x, bk.z);   // a backfire every ~1.2 s
    }
    fxStep(garFx, dt);
    if (show && eq.trail && eq.trail !== 'none') {
      const P = garTrail.points; P.length = 0;
      for (let i = 0; i < 50; i++) { const d = (49 - i) * 0.17, wv = Math.sin(d * 0.9 - garClock * 2.4) * 0.28 * Math.min(1, d / 3); P.push(gModel.localToWorld(new THREE.Vector3(wv, 0.5, -2.2 - d)).toArray()); }
      updateTrail(DL.TRAIL_COLORS[eq.trail] || DL.TRAIL_COLORS.cream, garTrail);
    } else garTrail.mesh.visible = false;
  }

  // ---------------- per-frame ----------------
  const gs = new Float32Array(8);
  // menus and the locker barely change: refresh the shadow map a few times a second instead of every frame
  const shadowLive = on => { if (!renderer.shadowMap.enabled) return; if (on) renderer.shadowMap.autoUpdate = true; else { renderer.shadowMap.autoUpdate = false; if (idleN % 8 === 0) renderer.shadowMap.needsUpdate = true; } };
  function frame(dt) {
    if (mode !== 'race' && mode !== 'replay' && mode !== 'editor') {
      // idle scenes (menu, locker, shop, boards) only need 30 fps; the slow camera drift looks the same and the GPU gets half the work
      idleAcc += dt; if (idleAcc < 0.028 && !(DL.Game._forceFrame)) return; dt = Math.min(idleAcc, 0.05); idleAcc = 0; idleN++;
    } else idleAcc = 0;
    Game.tickWeather(dt);
    menuT += dt;
    readInput(dt);
    if (world && world.group.userData.clouds) world.group.userData.clouds.children.forEach((c, i) => { c.position.x += dt * (1.5 + (i % 3)); });
    if (mode === 'race' && race) {
      updateRace(dt);
      setOffset(camera, 'none');
      sun.position.set(race.car.x + SO[0], race.car.y + SO[1], race.car.z + SO[2]); sun.target.position.set(race.car.x, race.car.y, race.car.z);
      updateParticles(dt);
      shadowLive(true);
      Game.draw(scene, camera);
    } else if (mode === 'replay' && race) {
      updateReplay(dt);
      setOffset(camera, 'none');
      sun.position.set(race.car.x + SO[0], race.car.y + SO[1], race.car.z + SO[2]); sun.target.position.set(race.car.x, race.car.y, race.car.z);
      if (Game.camHook) Game.camHook(camera, race, scene);
      shadowLive(true);
      Game.draw(scene, camera);
      if (Game.onReplayFrame) Game.onReplayFrame(renderer.domElement);
      if (Game.photoReq) { Game.photoReq = false; renderer.domElement.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'dayline-photo.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); DL.UI.toast && DL.UI.toast('Photo saved'); }, 'image/png'); }
    } else if (mode === 'garage' || mode === 'shop') {
      if (orbit.auto) orbit.theta += dt * 0.18;
      const cy = 0.9;
      const od = orbit.dist * (window.innerWidth <= 760 ? 1.45 : 1);
      gCam.position.set(Math.sin(orbit.theta) * od * Math.cos(orbit.phi), cy + Math.sin(orbit.phi) * od, Math.cos(orbit.theta) * od * Math.cos(orbit.phi));
      gCam.lookAt(0, cy, 0);
      setOffset(gCam, 'side');
      if (gModel) gModel.userData.wheels.forEach(w => { w.pivot.rotation.y = 0; });
      shadowLive(false);
      garageFx(dt);
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
      sun.position.set(v.tx + SO[0], v.ty + SO[1], v.tz + SO[2]); sun.target.position.set(v.tx, v.ty, v.tz);
      shadowLive(true);
      Game.draw(scene, camera);
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
      sun.position.set(s.x + SO[0], gy + SO[1], s.z + SO[2]); sun.target.position.set(s.x, gy, s.z);
      updateParticles(dt);
      shadowLive(false);
      Game.draw(scene, camera);
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
      if (r.room) r.countdown = 0; else r.countdown -= dt;
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
      DL.Audio.updateEngine(r.car.vF, input.throttle, r.car.slip, r.car.grounded, r.car.slideK, r.car.surf);
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
    if (r.room) sampleRoom(r, vw);
    const t = r.steps * DT, tg = t + (run && !r.finished ? al * DT : 0);
    if (r.live) poseLive(r, dt);
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


  // ---------------- live room opponents ----------------
  // Each driver samples their own car 20x/s with a timestamp and ships the recent samples in batches; every client plays the others back
  // ~0.3 s behind real time, interpolating between samples, so movement stays smooth whatever the network jitter.
  let LIVE_DELAY = 450;
  Game.setLiveDelay = v => { LIVE_DELAY += (v - LIVE_DELAY) * 0.2; };
  Game.inRoom = () => !!(race && race.room);
  Game.raceNow = () => race;
  function sampleRoom(r, v) {
    const now = performance.now();
    if (now - (r.lastSamp || 0) < 50) return;
    r.lastSamp = now;
    const a = r.samples || (r.samples = []);
    const q = n => Math.round(n * 100) / 100;
    a.push([Math.round(now), q(v.x), q(v.y), q(v.z), q(v.yaw), q(v.pitch), q(v.roll), q(v.steerVis), input.brake > 0 ? 1 : 0]);
    if (a.length > 60) a.splice(0, a.length - 60);
  }
  Game.roomSamples = function (since) { const r = race; return r && r.samples ? r.samples.filter(x => x[0] > since) : []; };
  Game.roomState = function () { const r = race; if (!r || !r.room || !r.samples || !r.samples.length) return null; return r.samples[r.samples.length - 1].slice(1); };
  Game.roomOthers = function (others, specOf, now0) {
    const r = race; if (!r || !r.live) return;
    const now = now0 || performance.now(), seen = {};
    for (const o of others) {
      if (o.uid === DL.Net.uid) continue;
      const list = (o.b && o.b.length ? o.b : (o.s ? [[Math.round(now)].concat(o.s)] : [])); if (!list.length) continue;
      seen[o.uid] = 1;
      let g = r.live[o.uid];
      if (!g) {
        const sp = specOf(o.uid); if (!sp) continue;
        const model = DL.buildCar({ car: sp.car, livery: sp.l ? DL.decodeLivery(sp.l) : DL.defaultLivery(), base: sp.b, equip: sp.equip, ghost: true });
        const label = makeLabel(sp.label || 'Driver', false); model.add(label); scene.add(model);
        try { renderer.compile(scene, camera); } catch (e) {}
        g = r.live[o.uid] = { model, label, buf: [], off: null, last: 0, seen: now, spin: 0 };
      }
      // map the sender's clock onto ours: the newest sample is about (age) old when it reaches us
      const newest = list[list.length - 1][0], cur = now - (o.age || 0) - newest;
      g.off = g.off == null ? cur : (cur < g.off ? cur : g.off + (cur - g.off) * 0.05);
      for (const x of list) { if (x[0] <= g.last) continue; g.last = x[0]; g.buf.push({ ts: x[0] + g.off, p: x.slice(1) }); }
      g.seen = now;
    }
    for (const uid in r.live) if (!seen[uid]) { const g = r.live[uid]; if (now - g.seen > 4000) { scene.remove(g.model); g.model.userData.dispose(); delete r.live[uid]; } }
  };
  function poseLive(r, dt) {
    const now = performance.now(), rt = now - LIVE_DELAY;
    for (const uid in r.live) {
      const g = r.live[uid], B = g.buf; if (!B.length) { g.model.visible = false; continue; }
      while (B.length > 3 && B[1].ts < rt - 600) B.shift();
      let i = 0; while (i < B.length - 1 && B[i + 1].ts <= rt) i++;
      let p;
      const A = B[i], C = B[i + 1];
      if (C && rt >= A.ts) {
        const k = clamp01((rt - A.ts) / Math.max(1, C.ts - A.ts)); p = A.p.slice();
        for (let j = 0; j < 3; j++) p[j] = A.p[j] + (C.p[j] - A.p[j]) * k;
        let dy = C.p[3] - A.p[3]; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; p[3] = A.p[3] + dy * k;
        for (let j = 4; j < 7; j++) p[j] = A.p[j] + (C.p[j] - A.p[j]) * k;
        p[7] = C.p[7];
      } else if (!C && B.length > 1 && rt > A.ts) {
        // past the newest sample: keep gliding on the last velocity for a moment
        const P = B[B.length - 2], dtm = Math.max(1, A.ts - P.ts), e = Math.min(250, rt - A.ts); p = A.p.slice();
        for (let j = 0; j < 3; j++) p[j] = A.p[j] + (A.p[j] - P.p[j]) / dtm * e;
      } else p = A.p.slice();
      const sp = g.prev ? Math.hypot(p[0] - g.prev[0], p[2] - g.prev[2]) : 0; g.prev = p;
      g.spin += sp * 2.6; g.model.visible = true;
      DL.poseCar(g.model, p[0], p[1], p[2], p[3], p[4], p[5], p[6], g.spin, p[7] > 0.5);
      const dd = Math.hypot(p[0] - camera.position.x, p[1] + 1.5 - camera.position.y, p[2] - camera.position.z);
      g.label.material.opacity = DL.clamp((dd - 6) / 8, 0, 0.9);
    }
  }
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  Game.input = input;
})(window.DL);
