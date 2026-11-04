/* DAYLINE — low-poly vehicle models, accessories, pixel-livery texturing and the shop catalogue */
'use strict';
(function (DL) {

  // ---------- catalogue (prices in coins) ----------
  DL.CARS = {
    pebble:  { name: 'Pebble', cls: 'Hatch', price: 0, blurb: 'The car everyone starts in. Chunky, honest, quick.',
      W: 1.9, lower: [[-2.0, .32], [2.0, .32], [2.1, .6], [2.0, .86], [1.0, 1.02], [-1.95, 1.05], [-2.08, .72]],
      cabin: [[1.05, 1.0], [.2, 1.72], [-1.55, 1.72], [-1.95, 1.02]], cw: .84, wz: [1.3, -1.3], wr: .38, wx: .86 },
    comet:   { name: 'Comet', cls: 'Sports', price: 650, blurb: 'Long nose, low roof, all attitude.',
      W: 2.0, lower: [[-2.2, .28], [2.2, .28], [2.35, .45], [2.2, .68], [.6, .88], [-1.6, .95], [-2.25, .85]],
      cabin: [[.7, .86], [-.2, 1.3], [-1.0, 1.32], [-1.75, .93]], cw: .8, wz: [1.45, -1.45], wr: .37, wx: .9 },
    rallye:  { name: 'Rallye', cls: 'Rally', price: 800, blurb: 'Boxy stage-car stance with a raised ride.',
      W: 1.9, lower: [[-1.95, .42], [1.95, .42], [2.05, .66], [1.95, .95], [1.0, 1.08], [-1.95, 1.1], [-2.05, .78]],
      cabin: [[1.0, 1.06], [.35, 1.78], [-1.6, 1.8], [-1.92, 1.08]], cw: .86, wz: [1.3, -1.3], wr: .41, wx: .88 },
    mule:    { name: 'Mule', cls: 'Van', price: 700, blurb: 'A delivery van that refuses to deliver slowly.', paintCabin: true,
      W: 1.95, lower: [[-2.3, .4], [2.3, .4], [2.4, .66], [2.3, 1.0], [1.6, 1.15], [-2.3, 1.15], [-2.38, .75]],
      cabin: [[1.6, 1.12], [.95, 2.25], [-2.3, 2.3], [-2.3, 1.12]], cw: .96, wz: [1.5, -1.5], wr: .4, wx: .88, windows: true },
    ridge:   { name: 'Ridge', cls: 'Off-road', price: 950, blurb: 'Pickup on big tyres. Looks like it climbs walls.',
      W: 2.05, lower: [[-2.2, .62], [2.2, .62], [2.3, .88], [2.2, 1.18], [1.2, 1.28], [-2.2, 1.28], [-2.3, .98]],
      cabin: [[1.2, 1.25], [.6, 1.98], [-.6, 1.98], [-.85, 1.25]], cw: .9, wz: [1.4, -1.4], wr: .53, wx: .92, bed: true },
    vintage: { name: 'Vintage', cls: 'Classic', price: 1100, blurb: 'Sixties coupe lines in angular low-poly.',
      W: 1.85, lower: [[-2.2, .35], [2.2, .35], [2.3, .55], [2.1, .8], [1.0, .92], [-1.4, .95], [-2.0, .85], [-2.3, .6]],
      cabin: [[.8, .9], [.2, 1.45], [-.9, 1.45], [-1.5, .92]], cw: .82, wz: [1.4, -1.45], wr: .36, wx: .82 },
    bubble:  { name: 'Bubble', cls: 'Micro', price: 1250, blurb: 'Mostly windscreen. Entirely joyful.',
      W: 1.6, lower: [[-1.4, .3], [1.4, .3], [1.55, .55], [1.4, .8], [.9, .95], [-1.3, .98], [-1.5, .7]],
      cabin: [[.9, .92], [.5, 1.6], [-.6, 1.75], [-1.25, 1.5], [-1.35, .95]], cw: .88, wz: [.95, -.95], wr: .3, wx: .72 },
    loaf:    { name: 'Loaf', cls: 'Oddball', price: 1500, blurb: 'A breadbin on wheels. Same pace as everything else.', paintCabin: true,
      W: 1.85, lower: [[-1.8, .35], [1.8, .35], [1.86, 1.3], [-1.86, 1.3]],
      cabin: [[1.62, 1.28], [1.5, 2.05], [-1.7, 2.08], [-1.82, 1.28]], cw: .95, wz: [1.25, -1.25], wr: .34, wx: .84, windows: true }
  };
  DL.CAR_ORDER = ['pebble', 'comet', 'rallye', 'mule', 'ridge', 'vintage', 'bubble', 'loaf'];

  DL.PARTS = {
    spoiler: [
      { id: 'none', name: 'No spoiler', price: 0 }, { id: 'lip', name: 'Lip spoiler', price: 80 },
      { id: 'ducktail', name: 'Ducktail', price: 140 }, { id: 'wing', name: 'Big wing', price: 220 }, { id: 'rack', name: 'Roof rack', price: 160 }],
    wheels: [
      { id: 'std', name: 'Steelies', price: 0 }, { id: 'spoke', name: 'Five-spoke', price: 90 },
      { id: 'dish', name: 'Cream dish', price: 130 }, { id: 'knobby', name: 'Knobblies', price: 170 }, { id: 'gold', name: 'Gold rims', price: 280 }],
    bumper: [
      { id: 'std', name: 'Stock bumper', price: 0 }, { id: 'pods', name: 'Rally light pods', price: 140 }, { id: 'bullbar', name: 'Bull bar', price: 180 }],
    exhaust: [
      { id: 'none', name: 'Clean exhaust', price: 0 }, { id: 'smoke', name: 'White smoke', price: 70 },
      { id: 'coral', name: 'Coral smoke', price: 130 }, { id: 'flame', name: 'Backfire flames', price: 320 }],
    trail: [
      { id: 'none', name: 'No trail', price: 0 }, { id: 'cream', name: 'Cream ribbon', price: 150 },
      { id: 'coral', name: 'Coral ribbon', price: 200 }, { id: 'navy', name: 'Navy ribbon', price: 150 }, { id: 'sunset', name: 'Sunset ribbon', price: 360 }],
    finish: [
      { id: 'matte', name: 'Matte', price: 0 }, { id: 'gloss', name: 'Gloss', price: 100 },
      { id: 'metal', name: 'Metallic', price: 220 }, { id: 'pearl', name: 'Pearl', price: 320 }],
    stickers: [
      { id: 'basic', name: 'Basic stamps', price: 0 }, { id: 'speed', name: 'Speed stamps', price: 110 }, { id: 'icons', name: 'Icon stamps', price: 150 }]
  };
  DL.PART_LABELS = { spoiler: 'Spoilers', wheels: 'Wheels', bumper: 'Bumpers', exhaust: 'Exhaust', trail: 'Trails', finish: 'Paint finish', stickers: 'Sticker packs' };
  DL.TRAIL_COLORS = { cream: [0xf4ecdc, 0xf4ecdc], coral: [0xf05a35, 0xf7a072], navy: [0x1f2a3d, 0x4b5b74], sunset: [0xf05a35, 0xf2c14e] };

  // ---------- livery helpers ----------
  DL.defaultLivery = function () {
    const W = DL.ATLAS_W, a = new Uint8Array(W * DL.ATLAS_H);
    const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < DL.ATLAS_H) a[y * W + x] = c; };
    const P = DL.PANELS;
    for (const side of ['left', 'right']) {
      const p = P[side];
      for (let x = 0; x < p.w; x++) { set(p.x + x, p.y + 6, 13); set(p.x + x, p.y + 7, 13); }
      // navy roundel with a cream "1"
      const st = DL.STAMPS.roundel, ox = p.x + 12, oy = p.y + 1;
      for (let j = 0; j < st.h; j++) for (let i = 0; i < st.w; i++) if (st.rows[j][i] === '1') set(ox + i, oy + j, 2);
      const d = DL.DIGITS[1];
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (d[j * 3 + i] === '1') set(ox + 2 + i, oy + 1 + j, 8);
    }
    const t = P.top;
    for (let x = 0; x < t.w; x++) { set(t.x + x, t.y + 4, 13); set(t.x + x, t.y + 7, 13); }
    for (let x = 0; x < P.front.w; x++) set(P.front.x + x, P.front.y + 7, 13);
    for (let x = 0; x < P.rear.w; x++) set(P.rear.x + x, P.rear.y + 7, 2);
    return a;
  };
  DL.DEFAULT_BASE = 8;

  DL.drawLiveryCanvas = function (canvas, livery, baseIdx) {
    const W = DL.ATLAS_W, H = DL.ATLAS_H;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = DL.PALETTE[baseIdx] || DL.PALETTE[DL.DEFAULT_BASE]; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < livery.length; i++) if (livery[i]) { ctx.fillStyle = DL.PALETTE[livery[i]]; ctx.fillRect(i % W, (i / W) | 0, 1, 1); }
  };

  const FINISH = {
    matte: { roughness: 0.85, metalness: 0.0 }, gloss: { roughness: 0.32, metalness: 0.05 },
    metal: { roughness: 0.28, metalness: 0.6 }, pearl: { roughness: 0.18, metalness: 0.32 }
  };

  // ---------- geometry builders ----------
  const PERM = new THREE.Matrix4();
  function extrudeProfile(points, width) {
    const sh = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 1 });
    // shape x -> car z, shape y -> car y, extrude z -> car x (centered)
    PERM.set(0, 0, -1, width / 2, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
    g.applyMatrix4(PERM);
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); g.dispose();
    return ng;
  }

  // Project UVs into the livery atlas from each face's dominant direction.
  function projectUVs(geo, bb) {
    const pos = geo.attributes.position.array, n = pos.length / 9;
    const uv = new Float32Array(n * 6);
    const W = DL.ATLAS_W, H = DL.ATLAS_H, P = DL.PANELS;
    const L = bb.maxZ - bb.minZ, Wd = bb.maxX - bb.minX, Hh = bb.maxY - bb.minY;
    const cl = v => DL.clamp(v, 0.001, 0.999);
    const put = (k, panel, u, v) => { uv[k * 2] = (panel.x + cl(u) * panel.w) / W; uv[k * 2 + 1] = 1 - (panel.y + (1 - cl(v)) * panel.h) / H; };
    const spare = { x: 28, y: 36, w: 1, h: 1 };
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      const ax = pos[o], ay = pos[o + 1], az = pos[o + 2], bx = pos[o + 3], by = pos[o + 4], bz = pos[o + 5], cx = pos[o + 6], cy = pos[o + 7], cz = pos[o + 8];
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const anx = Math.abs(nx), any = Math.abs(ny), anz = Math.abs(nz);
      for (let q = 0; q < 3; q++) {
        const x = pos[o + q * 3], y = pos[o + q * 3 + 1], z = pos[o + q * 3 + 2], k = t * 3 + q;
        if (anx >= any && anx >= anz) {
          if (nx > 0) put(k, P.left, (bb.maxZ - z) / L, (y - bb.minY) / Hh);
          else put(k, P.right, (z - bb.minZ) / L, (y - bb.minY) / Hh);
        } else if (any >= anz) {
          if (ny > 0) put(k, P.top, (z - bb.minZ) / L, (x - bb.minX) / Wd);
          else put(k, spare, 0.5, 0.5);
        } else {
          if (nz > 0) put(k, P.front, (x - bb.minX) / Wd, (y - bb.minY) / Hh);
          else put(k, P.rear, (bb.maxX - x) / Wd, (y - bb.minY) / Hh);
        }
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }

  // split cabin triangles into roof (painted) and glass
  function splitCabin(geo, paintSides) {
    const pos = geo.attributes.position.array, n = pos.length / 9;
    const roof = [], glass = [];
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      const ux = pos[o + 3] - pos[o], uy = pos[o + 4] - pos[o + 1], uz = pos[o + 5] - pos[o + 2];
      const vx = pos[o + 6] - pos[o], vy = pos[o + 7] - pos[o + 1], vz = pos[o + 8] - pos[o + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
      const tri = Array.prototype.slice.call(pos, o, o + 9);
      const isRoof = ny / l > 0.8 || (paintSides && Math.abs(nx / l) > 0.7) || (paintSides && nz / l < -0.5);
      (isRoof ? roof : glass).push(...tri);
    }
    const mk = arr => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
    return { roof: mk(roof), glass: mk(glass) };
  }

  function mergeGeos(list) {
    let total = 0; list.forEach(g => total += g.attributes.position.count);
    const pos = new Float32Array(total * 3); let o = 0;
    list.forEach(g => { pos.set(g.attributes.position.array, o * 3); o += g.attributes.position.count; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.computeVertexNormals();
    return out;
  }

  const shared = {};
  function sharedMat(key, make) { return shared[key] || (shared[key] = make()); }

  function buildWheel(spec, style) {
    const g = new THREE.Group();
    const r = spec.wr * (style === 'knobby' ? 1.1 : 1);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, style === 'knobby' ? 8 : 10), sharedMat('tire', () => new THREE.MeshLambertMaterial({ color: 0x1b1e24, flatShading: true })));
    tire.rotation.z = Math.PI / 2; g.add(tire);
    const rimCol = style === 'gold' ? 0xd9a441 : style === 'dish' ? 0xf4ecdc : style === 'spoke' ? 0xb5bfcb : 0x7c8a9e;
    const rimMat = sharedMat('rim' + style, () => new THREE.MeshStandardMaterial({ color: rimCol, roughness: style === 'gold' ? 0.3 : 0.6, metalness: style === 'gold' ? 0.7 : 0.2, flatShading: true }));
    const rr = r * (style === 'dish' ? 0.78 : 0.62);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.36, style === 'dish' ? 12 : 8), rimMat);
    rim.rotation.z = Math.PI / 2; g.add(rim);
    if (style === 'spoke' || style === 'gold') {
      for (let k = 0; k < 5; k++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, rr * 1.7), rimMat);
        s.rotation.x = k / 5 * Math.PI; g.add(s);
      }
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, 0.4, 6), sharedMat('hub', () => new THREE.MeshLambertMaterial({ color: 0x2f3e57 })));
    hub.rotation.z = Math.PI / 2; g.add(hub);
    return g;
  }

  // Build a full vehicle. opts: {car, livery(Uint8Array), base, equip:{spoiler,wheels,bumper,finish}, ghost:bool}
  DL.buildCar = function (opts) {
    const spec = DL.CARS[opts.car] || DL.CARS.pebble;
    const equip = Object.assign({ spoiler: 'none', wheels: 'std', bumper: 'std', finish: 'matte' }, opts.equip || {});
    const root = new THREE.Group();          // follows physics position/yaw
    const body = new THREE.Group();          // pitch/roll
    root.add(body);

    const lower = extrudeProfile(spec.lower, spec.W);
    const cab = extrudeProfile(spec.cabin, spec.W * spec.cw);
    const split = splitCabin(cab, spec.paintCabin);
    // bounding box for projection
    let minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
    spec.lower.forEach(p => { minZ = Math.min(minZ, p[0]); maxZ = Math.max(maxZ, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    if (spec.paintCabin) spec.cabin.forEach(p => { maxY = Math.max(maxY, p[1]); });
    const bb = { minX: -spec.W / 2 - 0.05, maxX: spec.W / 2 + 0.05, minY, maxY, minZ: minZ - 0.05, maxZ: maxZ + 0.05 };
    const bodyGeo = mergeGeos([lower, split.roof]);
    projectUVs(bodyGeo, bb);

    const canvas = document.createElement('canvas');
    const livery = opts.livery || DL.defaultLivery();
    DL.drawLiveryCanvas(canvas, livery, opts.base == null ? DL.DEFAULT_BASE : opts.base);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    const fin = FINISH[equip.finish] || FINISH.matte;
    const bodyMat = new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: fin.roughness, metalness: fin.metalness });
    if (opts.ghost) { bodyMat.transparent = true; bodyMat.opacity = 0.42; bodyMat.depthWrite = false; }
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = !opts.ghost; bodyMesh.receiveShadow = !opts.ghost;
    body.add(bodyMesh);
    const glassMat = opts.ghost ? new THREE.MeshBasicMaterial({ color: 0x1f2a3d, transparent: true, opacity: 0.3, depthWrite: false })
      : sharedMat('glass', () => new THREE.MeshStandardMaterial({ color: 0x232c3b, roughness: 0.15, metalness: 0.4, flatShading: true }));
    const glass = new THREE.Mesh(split.glass, glassMat); glass.castShadow = !opts.ghost; body.add(glass);
    const extraMat = opts.ghost ? glassMat : sharedMat('trim', () => new THREE.MeshLambertMaterial({ color: 0x1f2a3d, flatShading: true }));

    // side windows for panel-sided bodies
    if (spec.windows) {
      const zs = spec.cabin.map(p => p[0]), ys = spec.cabin.map(p => p[1]);
      const z1 = Math.max(...zs) - 0.5, z0 = Math.min(...zs) + 0.3, y0 = Math.min(...ys) + 0.25, y1 = Math.max(...ys) - 0.18;
      [-1, 1].forEach(s => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.04, y1 - y0, (z1 - z0) * 0.5), glassMat);
        w.position.set(s * (spec.W * spec.cw / 2 + 0.06), (y0 + y1) / 2, z1 - (z1 - z0) * 0.25); body.add(w);
      });
    }
    if (spec.bed) {
      [-1, 1].forEach(s => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 1.3), bodyMat); r.position.set(s * (spec.W / 2 - 0.02), 1.45, -1.55); body.add(r); });
      const tg = new THREE.Mesh(new THREE.BoxGeometry(spec.W, 0.35, 0.1), bodyMat); tg.position.set(0, 1.45, -2.2); body.add(tg);
    }

    // lights
    const frontZ = Math.max(...spec.lower.map(p => p[0])), rearZ = Math.min(...spec.lower.map(p => p[0]));
    const headMat = opts.ghost ? glassMat : sharedMat('head', () => new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff1cc, emissiveIntensity: 0.6 }));
    const tailMat = opts.ghost ? glassMat : new THREE.MeshStandardMaterial({ color: 0xc73a2e, emissive: 0xf05a35, emissiveIntensity: 0.15 });
    const lightY = (spec.lower[2][1] + spec.lower[3][1]) / 2;
    [-1, 1].forEach(s => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), headMat); h.position.set(s * spec.W * 0.32, lightY, frontZ + 0.09); body.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), tailMat); t.position.set(s * spec.W * 0.33, lightY + 0.05, rearZ - 0.08); body.add(t);
    });

    // accessories
    const topRear = spec.cabin.reduce((a, p) => p[0] < a[0] ? p : a, [9, 0]);
    const roofY = Math.max(...spec.cabin.map(p => p[1]));
    const deckY = spec.lower.reduce((m, p) => p[0] < rearZ + 0.6 ? Math.max(m, p[1]) : m, 0);
    if (equip.spoiler === 'lip') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 0.9, 0.08, 0.35), bodyMat); m.position.set(0, deckY + 0.08, rearZ + 0.2); m.rotation.x = -0.25; body.add(m);
    } else if (equip.spoiler === 'ducktail') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 0.95, 0.18, 0.5), bodyMat); m.position.set(0, deckY + 0.1, rearZ + 0.25); m.rotation.x = -0.45; body.add(m);
    } else if (equip.spoiler === 'wing') {
      [-1, 1].forEach(s => { const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.2), extraMat); st.position.set(s * spec.W * 0.3, deckY + 0.25, rearZ + 0.3); body.add(st); });
      const w = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 1.02, 0.07, 0.55), bodyMat); w.position.set(0, deckY + 0.5, rearZ + 0.25); w.rotation.x = 0.12; body.add(w);
      [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.6), extraMat); e.position.set(s * spec.W * 0.51, deckY + 0.5, rearZ + 0.25); body.add(e); });
    } else if (equip.spoiler === 'rack') {
      const zc = spec.cabin.reduce((a, p) => a + p[0], 0) / spec.cabin.length;
      [-1, 1].forEach(s => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.4), extraMat); r.position.set(s * spec.W * spec.cw * 0.42, roofY + 0.12, zc); body.add(r); });
      const box = new THREE.Mesh(new THREE.BoxGeometry(spec.W * spec.cw * 0.7, 0.32, 0.9), sharedMat('cargo', () => new THREE.MeshLambertMaterial({ color: 0xc9ad7f, flatShading: true })));
      box.position.set(0, roofY + 0.32, zc); body.add(box);
    }
    if (equip.bumper === 'bullbar') {
      const bm = extraMat;
      [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), bm); p.position.set(s * spec.W * 0.3, spec.lower[0][1] + 0.35, frontZ + 0.3); body.add(p); });
      const t = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 0.8, 0.1, 0.1), bm); t.position.set(0, spec.lower[0][1] + 0.65, frontZ + 0.3); body.add(t);
      const b = t.clone(); b.position.y -= 0.35; body.add(b);
    } else if (equip.bumper === 'pods') {
      for (let k = 0; k < 4; k++) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 8), headMat);
        p.rotation.x = Math.PI / 2; p.position.set((k - 1.5) * spec.W * 0.2, lightY + 0.06, frontZ + 0.2); body.add(p);
      }
    }

    // wheels
    const wheels = [];
    for (const z of spec.wz) for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * (spec.W / 2 - 0.05) * spec.wx / 0.9, spec.wr * (equip.wheels === 'knobby' ? 1.1 : 1), z);
      const w = buildWheel(spec, equip.wheels);
      if (opts.ghost) w.traverse(o => { if (o.material) { o.material = glassMat; } });
      else w.traverse(o => { if (o.isMesh) o.castShadow = true; });
      pivot.add(w); body.add(pivot);
      wheels.push({ pivot, wheel: w, front: z > 0 });
    }
    const lift = equip.wheels === 'knobby' ? spec.wr * 0.1 : 0;
    body.position.y = lift;

    root.userData = {
      spec, equip, body, bodyMesh, wheels, tailMat, canvas, tex, bodyMat,
      exhaust: new THREE.Vector3(spec.W * 0.28, spec.lower[0][1] + 0.12, rearZ - 0.1),
      rearZ, frontZ, roofY,
      setLivery(liv, base) { DL.drawLiveryCanvas(canvas, liv, base); tex.needsUpdate = true; },
      dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); tex.dispose(); bodyMat.dispose(); }
    };
    return root;
  };

  // apply physics state to a car model
  DL.poseCar = function (model, x, y, z, yaw, pitch, roll, steer, spin, brake) {
    model.position.set(x, y, z);
    model.rotation.set(0, yaw, 0);
    const u = model.userData;
    u.body.rotation.order = 'YXZ';
    u.body.rotation.x = pitch; u.body.rotation.z = roll;
    for (const w of u.wheels) {
      if (w.front) w.pivot.rotation.y = -steer * 0.45;
      w.wheel.rotation.x = spin || 0;
    }
    if (u.tailMat && u.tailMat.emissiveIntensity !== undefined) u.tailMat.emissiveIntensity = brake ? 1.4 : 0.15;
  };

})(window.DL);
