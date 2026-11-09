/* DAYLINE — low-poly vehicle models, accessories, pixel-livery texturing and the shop catalogue */
'use strict';
(function (DL) {

  // ---------- catalogue (prices in coins) ----------
  DL.CARS = {
    ufo:     { name: 'UFO', cls: 'Weekly champion', price: 0, kind: 'ufo', unique: true, blurb: 'Hovers, no wheels. Awarded to the winner of last week’s Weekly cup, for one week only.',
      W: 2.4, lower: [[-1.9, .5], [-1.2, .25], [1.2, .25], [1.9, .5], [1.2, .85], [-1.2, .85]], cabin: [[.8, .85], [.4, 1.25], [-.4, 1.25], [-.8, .85]], cw: .7, wz: [], wr: .3, wx: .9 },
    pebble:  { name: 'Pebble', cls: 'Hatch', price: 0, blurb: 'The car everyone starts in. Chunky, honest, quick.',
      W: 1.9, lower: [[-2.0, .32], [2.0, .32], [2.1, .6], [2.0, .86], [1.0, 1.02], [-1.95, 1.05], [-2.08, .72]],
      cabin: [[1.05, 1.0], [.2, 1.72], [-1.55, 1.72], [-1.95, 1.02]], cw: .84, wz: [1.3, -1.3], wr: .38, wx: .86 },
    comet:   { name: 'Comet', cls: 'Sports', price: 650, blurb: 'Long nose, low roof, all attitude.', feat: 'comet',
      W: 2.12, lower: [[-2.2, .24], [2.2, .24], [2.4, .4], [2.25, .6], [.5, .8], [-1.6, .9], [-2.25, .82]],
      cabin: [[.55, .8], [-.25, 1.2], [-1.0, 1.22], [-1.75, .9]], cw: .74, wz: [1.5, -1.45], wr: .36, wx: .92 },
    rallye:  { name: 'Rallye', cls: 'Rally', price: 800, blurb: 'Boxy stage-car stance with a raised ride.', feat: 'rallye',
      W: 1.98, lower: [[-1.9, .5], [1.95, .5], [2.05, .72], [1.95, 1.0], [1.0, 1.12], [-1.9, 1.14], [-2.0, .8]],
      cabin: [[1.0, 1.1], [.4, 1.84], [-1.7, 1.86], [-1.9, 1.12]], cw: .84, wz: [1.3, -1.3], wr: .45, wx: .9 },
    mule:    { name: 'Mule', cls: 'Van', price: 700, blurb: 'A delivery van that refuses to deliver slowly.', paintCabin: true, feat: 'mule',
      W: 1.95, lower: [[-2.3, .4], [2.3, .4], [2.4, .66], [2.3, 1.0], [1.6, 1.15], [-2.3, 1.15], [-2.38, .75]],
      cabin: [[1.6, 1.12], [.95, 2.25], [-2.3, 2.3], [-2.3, 1.12]], cw: .96, wz: [1.5, -1.5], wr: .4, wx: .88, windows: true },
    ridge:   { name: 'Ridge', cls: 'Off-road', price: 950, blurb: 'Pickup on big tyres. Looks like it climbs walls.', feat: 'ridge',
      W: 2.05, lower: [[-2.2, .62], [2.2, .62], [2.3, .88], [2.2, 1.18], [1.2, 1.28], [-2.2, 1.28], [-2.3, .98]],
      cabin: [[1.2, 1.25], [.6, 1.98], [-.6, 1.98], [-.85, 1.25]], cw: .9, wz: [1.4, -1.4], wr: .53, wx: .92, bed: true },
    vintage: { name: 'Vintage', cls: 'Classic', price: 1100, blurb: 'Sixties coupe lines in angular low-poly.', feat: 'vintage',
      W: 1.85, lower: [[-2.2, .35], [2.2, .35], [2.3, .55], [2.1, .8], [1.0, .92], [-1.4, .95], [-2.0, .85], [-2.3, .6]],
      cabin: [[.6, .92], [.0, 1.42], [-.8, 1.42], [-1.4, .95]], cw: .8, wz: [1.45, -1.45], wr: .34, wx: .82 },
    bubble:  { name: 'Bubble', cls: 'Micro', price: 1250, blurb: 'Mostly windscreen. Entirely joyful.', feat: 'bubble',
      W: 1.6, lower: [[-1.4, .3], [1.4, .3], [1.55, .55], [1.4, .8], [.9, .95], [-1.3, .98], [-1.5, .7]],
      cabin: [[.9, .92], [.6, 1.1], [-.6, 1.18], [-1.25, 1.05], [-1.35, .95]], cw: .7, wz: [.95, -.95], wr: .3, wx: .72 },
    loaf:    { name: 'Loaf', cls: 'Oddball', price: 1500, blurb: 'A breadbin on wheels. Same pace as everything else.', paintCabin: true, feat: 'loaf',
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
    plate: [
      { id: 'none', name: 'No plates', price: 0 }, { id: 'cream', name: 'Cream plates', price: 60 },
      { id: 'yellow', name: 'Yellow plates', price: 90 }, { id: 'navy', name: 'Navy plates', price: 90 }, { id: 'coral', name: 'Coral plates', price: 120 }],
    tint: [
      { id: 'clear', name: 'Clear glass', price: 0 }, { id: 'smoke', name: 'Smoke tint', price: 70 },
      { id: 'blue', name: 'Blue tint', price: 90 }, { id: 'amber', name: 'Amber tint', price: 90 }, { id: 'rose', name: 'Rose tint', price: 110 }],
    stickers: [
      { id: 'basic', name: 'Basic stamps', price: 0 }, { id: 'speed', name: 'Speed stamps', price: 110 }, { id: 'icons', name: 'Icon stamps', price: 150 }]
  };
  DL.PART_LABELS = { spoiler: 'Spoilers', wheels: 'Wheels', bumper: 'Bumpers', exhaust: 'Exhaust', trail: 'Trails', finish: 'Paint finish', plate: 'Number plates', tint: 'Window tint', stickers: 'Sticker packs' };
  DL.PLATE_STYLES = { cream: ['#f3ead7', '#1c2536', '#1c2536'], yellow: ['#f2c14e', '#1c2536', '#1c2536'], navy: ['#1c2536', '#f3ead7', '#f05a35'], coral: ['#f05a35', '#f3ead7', '#1c2536'] };
  DL.TINTS = { smoke: [0x0b0d12, 0.8], blue: [0x24489a, 0.62], amber: [0xb8701c, 0.58], rose: [0xb04a6b, 0.58] };
  DL.plateText = t => String(t || 'DAYLINE').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 7).trim() || 'DAYLINE';
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

  DL.drawGridCanvas = function (canvas, livery, baseIdx) {
    const S = 8, W = DL.ATLAS_W, H = DL.ATLAS_H;
    if (canvas.width !== W * S) { canvas.width = W * S; canvas.height = H * S; }
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = DL.PALETTE[baseIdx] || DL.PALETTE[DL.DEFAULT_BASE]; ctx.fillRect(0, 0, W * S, H * S);
    for (let i = 0; i < livery.length; i++) if (livery[i]) { ctx.fillStyle = DL.PALETTE[livery[i]]; ctx.fillRect((i % W) * S, ((i / W) | 0) * S, S, S); }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(20,28,40,.42)'; ctx.beginPath();
    for (let x = 0; x <= W; x++) { ctx.moveTo(x * S + .5, 0); ctx.lineTo(x * S + .5, H * S); }
    for (let y = 0; y <= H; y++) { ctx.moveTo(0, y * S + .5); ctx.lineTo(W * S, y * S + .5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath();
    for (let x = 0; x <= W; x++) { ctx.moveTo(x * S + 1.5, 0); ctx.lineTo(x * S + 1.5, H * S); }
    for (let y = 0; y <= H; y++) { ctx.moveTo(0, y * S + 1.5); ctx.lineTo(W * S, y * S + 1.5); }
    ctx.stroke();
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


  // ---------- v1.8: wheel arches, glass and interior ----------
  const PROF = {};
  // Lower-body outline with proper wheel arches cut into the bottom edge and a fender bump wherever
  // the body line would otherwise sit below the tyre top (that is what made wheels poke through).
  function carProfile(spec, knobby) {
    const key = spec.name + (knobby ? 'K' : '');
    if (PROF[key]) return PROF[key];
    const P = spec.lower.map(p => p.slice());
    const k = knobby ? 1.1 : 1, wr = spec.wr * k, cy = wr, R = wr + 0.07, need = cy + R + 0.07, ramp = 0.4, pad = R + 0.04;
    let chain = P.slice(2);
    const spans = spec.wz.map(z0 => [z0 - pad, z0 + pad]);
    const bump = z => { let m = 0; for (const [lo, hi] of spans) { const d = z < lo ? lo - z : z > hi ? z - hi : 0; m = Math.max(m, need * (1 - Math.min(1, d / ramp))); } return m; };
    const H = z => { for (let i = 0; i < chain.length - 1; i++) { const a = chain[i], b = chain[i + 1]; if (z <= a[0] + 1e-6 && z >= b[0] - 1e-6) { const dz = a[0] - b[0], t = dz < 1e-6 ? 0 : (a[0] - z) / dz; return a[1] + (b[1] - a[1]) * t; } } return 0; };
    const extra = []; spans.forEach(([lo, hi]) => extra.push(hi + ramp, hi + ramp / 2, hi, lo, lo - ramp / 2, lo - ramp));
    const out = [];
    for (let i = 0; i < chain.length; i++) {
      const a = chain[i]; out.push([a[0], Math.max(a[1], bump(a[0]))]);
      const b = chain[i + 1]; if (!b) break;
      extra.filter(z => z < a[0] - 0.02 && z > b[0] + 0.02).sort((x, y) => y - x).forEach(z => out.push([z, Math.max(H(z), bump(z))]));
    }
    const yb = P[0][1], notches = [];
    spec.wz.slice().sort((a, b) => a - b).forEach(z0 => {
      const dy = yb - cy, aR = Math.asin(DL.clamp(dy / R, -1, 1)), aL = Math.PI - aR, N = 8;
      for (let i = 0; i <= N; i++) { const a = aL + (aR - aL) * i / N; notches.push([z0 + R * Math.cos(a), cy + R * Math.sin(a)]); }
    });
    PROF[key] = [P[0], ...notches, P[1], ...out];
    PROF[key].arch = { cy, R };
    return PROF[key];
  }
  function tint(geo, color) {
    const c = new THREE.Color(color), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
  }
  function boxG(w, h, d, x, y, z, rx, color) {
    let g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z);
    const n = g.toNonIndexed(); g.dispose(); return tint(n, color);
  }
  function mergeColored(list) {
    let total = 0; list.forEach(g => total += g.attributes.position.count);
    const pos = new Float32Array(total * 3), col = new Float32Array(total * 3); let o = 0;
    list.forEach(g => { pos.set(g.attributes.position.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.computeVertexNormals();
    return out;
  }
  // seats, dash, wheel, floor + wheel-well liners, merged into one vertex-coloured mesh
  function interiorGeo(spec, roofGeo, prof, knobby) {
    const c = spec.cabin, halfW = spec.W * spec.cw / 2, parts = [];
    const SEAT = 0x25324a, DASH = 0x2d3a52, FLOOR = 0x171c26, TRIM = 0xf3ead7, LINER = 0x0f1218;
    const floorY = Math.min(...c.map(p => p[1])), roofY = Math.max(...c.map(p => p[1]));
    const z0 = c[0][0], zr = c[c.length - 1][0], Lc = z0 - zr, sc = DL.clamp((roofY - floorY) / 0.72, 0.42, 1);
    const wy = floorY + 0.28 * sc, w0 = c[0], w1 = c[1];
    const zFront = w0[0] + (wy - w0[1]) * (w1[0] - w0[0]) / ((w1[1] - w0[1]) || 1) - 0.05;
    parts.push(boxG(halfW * 2 - 0.12, 0.04, Lc - 0.25, 0, floorY + 0.03, (z0 + zr) / 2, 0, FLOOR));
    parts.push(boxG(halfW * 2 - 0.12, 0.3 * sc, 0.5, 0, floorY + 0.03 + 0.15 * sc, zFront - 0.25, 0, DASH));
    parts.push(boxG(halfW * 2 - 0.12, 0.06, 0.12, 0, floorY + 0.03 + 0.3 * sc, zFront - 0.04, 0, 0x1a2130));
    const seatZ = zFront - 1.0;
    // low bucket seats only (no headrests), so the cabin never reads as passengers
    [-1, 1].forEach(s => {
      const x = s * halfW * 0.48, sw = halfW * 0.7;
      parts.push(boxG(sw, 0.14 * sc, 0.55, x, floorY + 0.09 * sc, seatZ, 0, SEAT));
      parts.push(boxG(sw, 0.3 * sc, 0.1, x, floorY + 0.22 * sc, seatZ - 0.3, -0.25, SEAT));
    });
    const rz = zr + 0.6;
    if (seatZ - 0.7 - rz > 0.55) {
      [-1, 1].forEach(s => { const x = s * halfW * 0.48, sw = halfW * 0.7; parts.push(boxG(sw, 0.14 * sc, 0.5, x, floorY + 0.09 * sc, rz + 0.1, 0, SEAT)); parts.push(boxG(sw, 0.28 * sc, 0.1, x, floorY + 0.2 * sc, rz - 0.18, -0.25, SEAT)); });
    }
    const swz = zFront - 0.4, swx = halfW * 0.48;
    const ring = new THREE.TorusGeometry(0.15 * Math.min(1, sc + 0.3), 0.032, 5, 10); ring.rotateX(Math.PI / 2 - 0.9); ring.translate(swx, floorY + 0.03 + 0.34 * sc, swz);
    const rn = ring.toNonIndexed(); ring.dispose(); parts.push(tint(rn, 0x0b0d12));
    parts.push(boxG(0.05, 0.22 * sc, 0.05, swx, floorY + 0.03 + 0.2 * sc, swz + 0.1, 0.5, 0x0b0d12));
    // headliner: roof sheet seen from underneath
    if (roofGeo) {
      const p = roofGeo.attributes.position.array, n = p.length / 9, out = new Float32Array(p.length);
      for (let t = 0; t < n; t++) { const o = t * 9; for (let q = 0; q < 3; q++) { const src = q === 1 ? 2 : q === 2 ? 1 : q; out[o + q * 3] = p[o + src * 3]; out[o + q * 3 + 1] = p[o + src * 3 + 1] - 0.07; out[o + q * 3 + 2] = p[o + src * 3 + 2]; } }
      const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(out, 3)); parts.push(tint(hg, 0xcdbf9f));
    }
    // wheel-well liners: close off the arches so you never see through the car
    const { cy, R } = prof.arch, k = knobby ? 1.1 : 1, wxc = (spec.W / 2 - 0.05) * spec.wx / 0.9, lw = Math.max(0.2, wxc - 0.18 * k - 0.02);
    spec.wz.forEach(z => parts.push(boxG(lw * 2, cy + R - spec.lower[0][1] - 0.01, R * 1.9, 0, spec.lower[0][1] + (cy + R - spec.lower[0][1]) / 2, z, 0, LINER)));
    return mergeColored(parts);
  }
  // window frame: pillars and rails following the cabin outline, in body colour
  function frameGeo(spec) {
    const c = spec.cabin, halfW = spec.W * spec.cw / 2, parts = [], col = 0xffffff;
    const bar = (a, b, th, dw, x) => {
      const dz = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dz, dy); if (L < 0.05) return;
      parts.push(boxG(dw, th, L + 0.04, x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2, -Math.atan2(dy, dz), col));
    };
    for (const s of [-1, 1]) {
      for (let i = 0; i < c.length - 1; i++) bar(c[i], c[i + 1], 0.1, 0.1, s * (halfW - 0.01));
      bar(c[c.length - 1], c[0], 0.08, 0.1, s * (halfW - 0.01));
      if (c.length === 4 && c[0][0] - c[3][0] > 2.4) { const zb = c[1][0] - (c[1][0] - c[2][0]) * 0.55 + (c[2][0] - c[3][0]) * 0.0; bar([zb, c[0][1] + 0.02], [zb, c[1][1]], 0.1, 0.1, s * (halfW - 0.01)); }
    }
    bar([c[1][0], c[1][1]], [c[1][0], c[1][1] - 0.001], 0.1, 0.1, 0);
    parts.push(boxG(halfW * 2, 0.1, 0.12, 0, c[1][1] - 0.01, c[1][0], 0, col));
    parts.push(boxG(halfW * 2, 0.1, 0.12, 0, c[c.length - 2][1] - 0.01, c[c.length - 2][0], 0, col));
    return mergeColored(parts);
  }

  const shared = {};
  // number plate material: tiny canvas texture per style and text, shared between cars
  function plateMat(style, text, ghost) {
    return sharedMat('plate_' + style + '_' + text + (ghost ? '_g' : ''), () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'), st = DL.PLATE_STYLES[style];
      g.fillStyle = st[0]; g.fillRect(0, 0, 256, 64); g.strokeStyle = st[2]; g.lineWidth = 4; g.strokeRect(3, 3, 250, 58);
      g.fillStyle = st[1]; g.font = '800 44px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 35);
      const tex = new THREE.CanvasTexture(c); if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, transparent: !!ghost, opacity: ghost ? 0.75 : 1, depthWrite: !ghost });
    });
  }
  function sharedMat(key, make) { return shared[key] || (shared[key] = make()); }

  function buildWheel(spec, style, col) {
    const g = new THREE.Group();
    const r = spec.wr * (style === 'knobby' ? 1.1 : 1);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, style === 'knobby' ? 12 : 16), sharedMat('tire', () => new THREE.MeshLambertMaterial({ color: 0x1b1e24, flatShading: true })));
    tire.rotation.z = Math.PI / 2; tire.frustumCulled = false; tire.geometry = tire.geometry.clone(); g.add(tire);
    g.userData.tire = tire; g.userData.orig = Float32Array.from(tire.geometry.attributes.position.array); g.userData.r = r;
    const cc = col && DL.ITEM_COLORS[col], metal = style === 'gold' || (cc && DL.isMetalColor(col));
    const rimCol = cc ? cc[1] : style === 'gold' ? 0xd9a441 : style === 'dish' ? 0xf4ecdc : style === 'spoke' ? 0xb5bfcb : 0x7c8a9e;
    const rimMat = sharedMat('rim' + style + (cc ? '_' + col : ''), () => new THREE.MeshStandardMaterial({ color: rimCol, roughness: metal ? 0.3 : 0.6, metalness: metal ? 0.7 : 0.2, flatShading: true }));
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


  // Tyre deformation: the tyre keeps its shape in the car's frame while it spins, so the flat contact patch and the sidewall bulge
  // are applied in that frame and mapped back into the spinning tyre mesh. c = compression 0..0.3 of the tyre radius.
  function deformTire(w, c, spin) {
    const g = w.wheel.userData, pos = g.tire.geometry.attributes.position, o = g.orig, r = g.r, flat = r * (1 - c), cs = Math.cos(spin), sn = Math.sin(spin), a = pos.array;
    for (let i = 0; i < o.length; i += 3) {
      const X0 = -o[i + 1], Y0 = o[i], Z0 = o[i + 2];
      let Y = Y0 * cs - Z0 * sn, Z = Y0 * sn + Z0 * cs, X = X0;
      if (c > 0.002) {
        if (Y < -flat) { Y = -flat; Z *= 1 + c * 1.6; }                                   // flat contact patch, a little longer
        const wb = Math.min(1, Math.max(0, (-Y / r - 0.25) / 0.75));
        X *= 1 + c * 1.1 * wb * wb;                                                      // sidewall bulges out near the ground
        Z *= 1 + c * 0.35 * wb;
      }
      const Yb = Y * cs + Z * sn, Zb = -Y * sn + Z * cs;
      a[i] = Yb; a[i + 1] = -X; a[i + 2] = Zb;
    }
    pos.needsUpdate = true;
    w.pivot.position.y = w.baseY - r * c * 0.95;                                         // keep the tread on the ground as it squashes
  }

  // Signature parts so each car reads as a different machine, not just a different outline.
  function addFeatures(F) {
    const { body, spec, bodyMat, extraMat, headMat, tailMat, glassMat, glassSolid, frontZ, rearZ, roofY, lightY, deckY, ghost } = F;
    const M = (k, mk) => ghost ? glassMat : sharedMat(k, mk);
    const chrome = M('chrome', () => new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.25, metalness: 0.8, flatShading: true }));
    const dark = M('dark2', () => new THREE.MeshLambertMaterial({ color: 0x14181f, flatShading: true }));
    const coral = M('coral2', () => new THREE.MeshLambertMaterial({ color: 0xf05a35, flatShading: true }));
    const cream = M('cream2', () => new THREE.MeshLambertMaterial({ color: 0xf3ead7, flatShading: true }));
    const bx = (w, h, d, x, y, z, mat, rx, rz, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || dark); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz; if (ry) m.rotation.y = ry; m.castShadow = !ghost; body.add(m); return m; };
    const cy = (r, h, x, y, z, mat, ax, seg) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 10), mat); m.position.set(x, y, z); if (ax === 'x') m.rotation.z = Math.PI / 2; else if (ax === 'z') m.rotation.x = Math.PI / 2; m.castShadow = !ghost; body.add(m); return m; };
    const W = spec.W, both = f => [-1, 1].forEach(f);
    const wheelFlares = (thick, up) => both(s => spec.wz.forEach(z => bx(thick, 0.16, spec.wr * 2.5, s * (W / 2 + thick / 2 - 0.02), spec.wr * 2 + up, z)));
    const f = spec.feat;
    // real tailpipes on every paid car (the free starter keeps a plain rear). Pipe x matches the smoke emitter in userData.exhaust
    if (spec.price > 0) {
      const EX = { comet: { n: 2, r: 0.058 }, vintage: { n: 2, r: 0.05 }, rallye: { n: 1, r: 0.07 }, ridge: { n: 1, r: 0.075 }, mule: { n: 1, r: 0.068 }, bubble: { n: 1, r: 0.04 }, loaf: { n: 1, r: 0.06 } }[f] || { n: 1, r: 0.055 };
      const r = EX.r, py = spec.lower[0][1] + r * 0.9, xs = EX.n === 2 ? [-1, 1] : [1];
      xs.forEach(sx => {
        const px = sx * W * 0.28;
        cy(r, 0.4, px, py, rearZ + 0.0, chrome, 'z', 12);                              // pipe, tucked up under the rear valance
        cy(r * 1.18, 0.035, px, py, rearZ - 0.18, chrome, 'z', 12);                    // thin rolled lip
        cy(r * 0.8, 0.04, px, py, rearZ - 0.19, dark, 'z', 12);                        // dark bore
      });
    }
    if (f === 'comet') {
      wheelFlares(0.2, 0.0);
      both(s => bx(0.07, 0.2, 0.8, s * (W / 2 + 0.02), 0.58, -0.7, dark));                      // side intakes
      bx(W * 0.9, 0.07, 0.4, 0, 0.3, frontZ + 0.05, dark);                                         // front splitter
      bx(W * 0.5, 0.05, 0.7, 0, 0.9, 1.0, dark);                                                   // bonnet vent
      bx(W * 0.9, 0.09, 0.1, 0, lightY - 0.1, frontZ + 0.08, coral);                               // nose stripe
    } else if (f === 'rallye') {
      wheelFlares(0.16, 0.05);
      bx(0.8, 0.2, 0.9, 0, 1.2, 1.0, dark, 0.12);                                                  // bonnet scoop
      for (let k = 0; k < 4; k++) cy(0.15, 0.14, (k - 1.5) * 0.4, roofY - 0.02, 0.95, headMat, 'z');   // roof light pods
      bx(W * 0.72, 0.06, 0.1, 0, roofY - 0.1, 0.78, dark);
      both(s => spec.wz.forEach(z => bx(0.05, 0.3, 0.3, s * (W / 2 + 0.1), 0.35, z - Math.sign(z) * (spec.wr + 0.15), dark)));  // mud flaps
      cy(0.1, 0.1, 0.0, 0.62, frontZ + 0.04, coral, 'z', 8);
      cy(0.3, 0.14, 0, roofY + 0.28, -1.0, M('spare', () => new THREE.MeshLambertMaterial({ color: 0x1b1e24, flatShading: true })), 'y', 9);   // spare on roof
    } else if (f === 'mule') {
      bx(W * 0.5, 0.14, 0.5, 0, roofY + 0.08, -0.4, dark); bx(0.45, 0.12, 0.45, 0, roofY + 0.08, 0.4, dark);   // roof vents
      both(s => bx(0.06, 0.07, 3.6, s * W * 0.42, roofY + 0.07, -0.2, dark));                       // roof rails
      for (let k = 0; k < 5; k++) bx(W * 0.84, 0.05, 0.06, 0, roofY + 0.14, -1.7 + k * 0.85, dark);
      bx(0.05, 1.05, 0.04, 0, 1.6, rearZ - 0.03, dark); bx(W * 0.3, 0.12, 0.04, W * 0.2, 1.5, rearZ - 0.04, dark); // barn doors
      both(s => { bx(0.12, 0.26, 0.1, s * (W / 2 + 0.16), 1.9, 1.1, dark); bx(0.05, 0.9, 0.04, s * (W / 2 + 0.03), 1.5, -0.4, dark); }); // mirrors + door seam
      bx(W * 0.8, 0.28, 0.08, 0, 0.72, frontZ + 0.1, dark);                                         // grille
      bx(W * 1.02, 0.14, 0.2, 0, 0.45, frontZ + 0.1, chrome); bx(W * 1.02, 0.14, 0.2, 0, 0.45, rearZ - 0.1, chrome);
    } else if (f === 'ridge') {
      wheelFlares(0.24, 0.1);
      for (let k = 0; k < 5; k++) cy(0.12, 0.12, (k - 2) * 0.34, roofY + 0.2, 0.45, headMat, 'z', 8);   // roof light bar
      bx(W * 0.82, 0.1, 0.14, 0, roofY + 0.1, 0.45, dark);
      both(s => { bx(0.1, 0.8, 0.1, s * (W / 2 - 0.1), 1.8, -2.0, dark); bx(0.12, 0.08, 1.2, s * (W / 2 - 0.1), 1.45, -1.6, dark); }); // sports bar
      bx(W * 0.9, 0.1, 0.1, 0, 2.15, -2.0, dark);
      bx(0.14, 0.9, 0.14, W * 0.42, 1.6, 0.85, dark); bx(0.14, 0.14, 0.4, W * 0.42, 2.05, 0.7, dark);    // snorkel
      both(s => bx(0.16, 0.08, 1.6, s * (W / 2 + 0.1), 0.62, 0.0, dark));                           // side steps
      cy(0.5, 0.2, 0, 1.78, -1.55, M('spare2', () => new THREE.MeshLambertMaterial({ color: 0x1b1e24, flatShading: true })), 'x', 10);  // spare
      bx(W * 0.9, 0.18, 0.2, 0, 0.7, frontZ + 0.08, dark);                                           // skid plate
      bx(0.5, 0.1, 0.5, 0, 1.31, 1.1, dark);
    } else if (f === 'vintage') {
      bx(W + 0.12, 0.12, 0.14, 0, 0.5, frontZ + 0.05, chrome); bx(W + 0.12, 0.12, 0.14, 0, 0.5, rearZ - 0.05, chrome);
      bx(0.14, 0.16, 0.2, W * 0.46, 0.5, frontZ + 0.02, chrome); bx(0.14, 0.16, 0.2, -W * 0.46, 0.5, frontZ + 0.02, chrome);
      both(s => { cy(0.22, 0.12, s * W * 0.3, lightY + 0.05, frontZ + 0.1, chrome, 'z', 12); cy(0.17, 0.14, s * W * 0.3, lightY + 0.05, frontZ + 0.13, headMat, 'z', 12); });
      bx(W * 0.4, 0.3, 0.06, 0, lightY - 0.1, frontZ + 0.1, chrome);                                // grille
      both(s => { bx(0.07, 0.5, 0.9, s * (W / 2 - 0.1), deckY + 0.3, rearZ + 0.5, coral, 0.25); bx(0.05, 0.05, 3.3, s * (W / 2 + 0.01), 0.76, -0.1, chrome); }); // tail fins + side trim
      both(s => bx(0.08, 0.08, 0.35, s * W * 0.33, deckY + 0.5, rearZ + 0.35, tailMat));
      both(s => spec.wz.forEach(z => cy(spec.wr * 0.95, 0.04, s * (W / 2 + 0.0), spec.wr, z, cream, 'x', 12)));   // whitewall rings
      cy(0.07, 0.1, 0, 0.95, frontZ - 0.35, chrome, 'y', 8);                                         // bonnet ornament
    } else if (f === 'bubble') {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), glassMat); dome.scale.set(W * 0.5, 0.66, 1.05); dome.position.set(0, 1.12, -0.05); dome.castShadow = !ghost; body.add(dome);
      both(s => cy(0.24, 0.12, s * W * 0.3, lightY + 0.1, frontZ + 0.02, headMat, 'z', 10));       // big round eyes
      both(s => cy(0.27, 0.06, s * W * 0.3, lightY + 0.1, frontZ - 0.02, chrome, 'z', 10));
      bx(W * 0.7, 0.12, 0.08, 0, 0.45, frontZ + 0.04, chrome); bx(W * 0.7, 0.12, 0.08, 0, 0.45, rearZ - 0.04, chrome);
      cy(0.05, 0.9, -W * 0.22, 1.9, -0.9, dark, 'y', 6); bx(0.14, 0.14, 0.14, -W * 0.22, 2.38, -0.9, coral);   // aerial with flag
      bx(W * 0.6, 0.5, 0.5, 0, 0.9, rearZ + 0.3, cream);                                          // engine hump
    } else if (f === 'loaf') {
      const crust = M('crust', () => new THREE.MeshLambertMaterial({ color: 0xc88a4a, flatShading: true }));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.49, W * 0.49, 3.5, 10, 1, false, Math.PI / 2, Math.PI), crust);
      top.scale.set(1, 1, 0.45); top.rotation.x = Math.PI / 2; top.position.set(0, 2.06, -0.1); top.castShadow = !ghost; body.add(top);
      bx(W * 0.82, 0.07, 3.3, 0, 2.06, -0.1, crust, 0, 0);
      both(s => { cy(0.27, 0.06, s * (W * 0.95 / 2 + 0.03), 1.8, -1.3, glassSolid, 'x', 12); cy(0.31, 0.04, s * (W * 0.95 / 2 + 0.02), 1.8, -1.3, chrome, 'x', 12); cy(0.27, 0.06, s * (W * 0.95 / 2 + 0.03), 1.8, -0.85, glassSolid, 'x', 12); cy(0.31, 0.04, s * (W * 0.95 / 2 + 0.02), 1.8, -0.85, chrome, 'x', 12); });
      cy(0.09, 0.8, W * 0.3, 2.45, -1.5, dark, 'y', 8); cy(0.14, 0.06, W * 0.3, 2.88, -1.5, dark, 'y', 8);   // chimney
      bx(W * 0.7, 0.35, 0.08, 0, 0.8, frontZ + 0.04, dark); bx(W * 1.0, 0.1, 0.1, 0, 0.45, frontZ + 0.05, cream);
      both(s => bx(0.06, 0.06, 0.4, s * (W / 2 + 0.02), 1.05, 1.0, chrome));                        // door handles
    }
  }

  // The Weekly cup champion's saucer: floats, no wheels, same physics as everything else
  function buildUfo(opts, spec) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const base = opts.base == null ? DL.DEFAULT_BASE : opts.base, ghost = !!opts.ghost;
    const canvas = document.createElement('canvas');
    DL.drawLiveryCanvas(canvas, opts.livery || DL.defaultLivery(), base);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    const bodyMat = new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: 0.35, metalness: 0.55 });
    if (ghost) { bodyMat.transparent = true; bodyMat.opacity = 0.72; bodyMat.depthWrite = false; }
    const R = 1.95, hull = [[0.001, 0.0], [0.7, 0.04], [1.5, 0.2], [R, 0.42], [R * 0.97, 0.52], [1.3, 0.72], [0.8, 0.8], [0.001, 0.84]].map(p => new THREE.Vector2(p[0], p[1]));
    let geo = new THREE.LatheGeometry(hull, 20); geo = geo.toNonIndexed(); geo.computeVertexNormals();
    projectUVs(geo, { minX: -R, maxX: R, minY: 0, maxY: 0.84, minZ: -R, maxZ: R });
    const hullMesh = new THREE.Mesh(geo, bodyMat); hullMesh.castShadow = !ghost; hullMesh.receiveShadow = !ghost; body.add(hullMesh);
    const glass = new THREE.MeshStandardMaterial({ color: 0x5fd0ff, roughness: 0.05, metalness: 0.3, flatShading: true, transparent: true, opacity: ghost ? 0.3 : 0.62, depthWrite: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass); dome.position.y = 0.78; dome.scale.set(1, 0.85, 1.15); dome.renderOrder = 3; body.add(dome);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x9ff0ff, emissive: 0x39d6ff, emissiveIntensity: 1.6, flatShading: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.07, 6, 24), lightMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.04; body.add(ring);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), lightMat); l.position.set(Math.sin(a) * 1.75, 0.46, Math.cos(a) * 1.75); body.add(l); }
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xc73a2e, emissive: 0xf05a35, emissiveIntensity: 0.15 });
    [-1, 1].forEach(s => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.08), tailMat); t.position.set(s * 0.6, 0.5, -1.82); t.rotation.y = 0; body.add(t); });
    // underside: glowing core, tractor-beam cone to the ground and a pool of light on the road
    const H = 0.95;
    const add = (o, op) => new THREE.MeshBasicMaterial({ color: o, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), add(0xbff6ff, ghost ? 0.2 : 0.85)); core.rotation.x = Math.PI / 2; core.position.y = -0.02; body.add(core);
    const spin = new THREE.Group(); spin.position.y = 0.0; body.add(spin);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, n = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), lightMat); n.position.set(Math.sin(a) * 1.05, -0.02, Math.cos(a) * 1.05); spin.add(n); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, H, 20, 1, true), add(0x39d6ff, ghost ? 0.06 : 0.2)); beam.position.y = -H / 2; beam.renderOrder = 2; body.add(beam);
    const beam2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.95, H, 16, 1, true), add(0xbff6ff, ghost ? 0.05 : 0.22)); beam2.position.y = -H / 2; beam2.renderOrder = 2; body.add(beam2);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.7, 28), add(0x39d6ff, ghost ? 0.1 : 0.4)); pool.rotation.x = -Math.PI / 2; pool.position.y = -H + 0.02; pool.renderOrder = 2; body.add(pool);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), lightMat); top.position.y = 1.62; body.add(top);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), new THREE.MeshLambertMaterial({ color: 0xdfe4ea })); ant.position.y = 1.5; body.add(ant);
    root.userData = {
      spec, equip: {}, body, bodyMesh: hullMesh, wheels: [], tailMat, canvas, tex, bodyMat, ufo: true, ufoRing: lightMat, ufoSpin: spin, ufoPool: pool, ufoBeam: [beam, beam2],
      exhaust: new THREE.Vector3(0, 0.2, -1.9), paintMat: bodyMat, deform: false, rearZ: -R, frontZ: R, roofY: 1.5,
      setLivery(liv, b) { DL.drawLiveryCanvas(canvas, liv, b); tex.needsUpdate = true; },
      dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); tex.dispose(); bodyMat.dispose(); glass.dispose(); lightMat.dispose(); }
    };
    body.position.y = 0.95;      // hover height
    return root;
  }

  // Build a full vehicle. opts: {car, livery(Uint8Array), base, equip:{spoiler,wheels,bumper,finish}, ghost:bool}
  DL.buildCar = function (opts) {
    const spec = DL.CARS[opts.car] || DL.CARS.pebble;
    if (spec.kind === 'ufo') return buildUfo(opts, spec);
    const equip = Object.assign({ spoiler: 'none', wheels: 'std', bumper: 'std', finish: 'matte', plate: 'none', tint: 'clear' }, opts.equip || {});
    const root = new THREE.Group();          // follows physics position/yaw
    const body = new THREE.Group();          // pitch/roll
    root.add(body);

    const [spB, spC] = DL.partBase(equip.spoiler), [whB, whC] = DL.partBase(equip.wheels), [buB, buC] = DL.partBase(equip.bumper);
    const knob = whB === 'knobby';
    const prof = carProfile(spec, knob);
    const lower = extrudeProfile(prof, spec.W);
    const cab = extrudeProfile(spec.cabin, spec.W * spec.cw);
    const split = splitCabin(cab, spec.paintCabin);
    // bounding box for projection
    let minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
    prof.forEach(p => { minZ = Math.min(minZ, p[0]); maxZ = Math.max(maxZ, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
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
    const fx = DL.FINISH_EXTRA && DL.FINISH_EXTRA[equip.finish], fin = FINISH[equip.finish] || (fx ? { roughness: fx[1], metalness: fx[2] } : FINISH.matte);
    const bodyMat = new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: fin.roughness, metalness: fin.metalness });
    if (opts.ghost) { bodyMat.transparent = true; bodyMat.opacity = 0.72; bodyMat.depthWrite = false; }
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = !opts.ghost; bodyMesh.receiveShadow = !opts.ghost;
    body.add(bodyMesh);
    const glassSolid = opts.ghost ? new THREE.MeshBasicMaterial({ color: 0x1f2a3d, transparent: true, opacity: 0.3, depthWrite: false })
      : sharedMat('glassSolid', () => new THREE.MeshStandardMaterial({ color: 0x232c3b, roughness: 0.15, metalness: 0.4, flatShading: true }));
    const glassMat = opts.ghost ? glassSolid
      : sharedMat('glass18', () => new THREE.MeshStandardMaterial({ color: 0x2b3d58, roughness: 0.08, metalness: 0.45, flatShading: true, transparent: true, opacity: 0.4, depthWrite: false }));
    const tintDef = DL.TINTS[equip.tint];
    const glassUse = tintDef && opts.ghost ? sharedMat('gtint_' + equip.tint, () => new THREE.MeshBasicMaterial({ color: tintDef[0], transparent: true, opacity: 0.5, depthWrite: false })) : tintDef ? sharedMat('tint_' + equip.tint, () => new THREE.MeshStandardMaterial({ color: tintDef[0], roughness: 0.08, metalness: 0.45, flatShading: true, transparent: true, opacity: tintDef[1], depthWrite: false })) : glassMat;
    const glass = new THREE.Mesh(split.glass, glassUse); glass.castShadow = false; glass.renderOrder = 3; body.add(glass);
    const extraMat = opts.ghost ? glassMat : sharedMat('trim', () => new THREE.MeshLambertMaterial({ color: 0x1f2a3d, flatShading: true }));
    // solid paint for add-on bodywork (wings, bed rails): box UVs would smear the livery texture across them
    const paintMat = opts.ghost ? glassMat : new THREE.MeshStandardMaterial({ color: new THREE.Color(DL.PALETTE[opts.base == null ? DL.DEFAULT_BASE : opts.base]), flatShading: true, roughness: fin.roughness, metalness: fin.metalness });
    let frameMat = null;
    if (!opts.ghost) {
      const intMesh = new THREE.Mesh(interiorGeo(spec, spec.paintCabin ? null : split.roof, prof, knob), sharedMat('interior', () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
      body.add(intMesh);
      if (!spec.paintCabin) {
        frameMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(DL.PALETTE[opts.base == null ? DL.DEFAULT_BASE : opts.base]), flatShading: true, roughness: fin.roughness, metalness: fin.metalness });
        const fr = new THREE.Mesh(frameGeo(spec), frameMat); fr.castShadow = true; body.add(fr);
      }
    }

    // side windows for panel-sided bodies
    if (spec.windows) {
      // cab door windows only, kept forward of the race-number roundel (livery columns 12-20 of 32) so nothing covers the number
      const Lb = bb.maxZ - bb.minZ, zStart = bb.minZ + Lb * 0.66, zc = zStart + 0.28, zl = 0.5;
      const topAt = z => { let t = -1e9; const c = spec.cabin; for (let k = 0; k < c.length; k++) { const a = c[k], b2 = c[(k + 1) % c.length]; if ((a[0] - z) * (b2[0] - z) <= 0 && a[0] !== b2[0]) t = Math.max(t, a[1] + (b2[1] - a[1]) * (z - a[0]) / (b2[0] - a[0])); } return t; };
      const y1 = topAt(zc + zl / 2) - 0.12, y0 = Math.min(...spec.cabin.map(p => p[1])) + 0.2;
      if (y1 - y0 > 0.15) [-1, 1].forEach(s => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.04, y1 - y0, zl), glassSolid);
        w.position.set(s * (spec.W * spec.cw / 2 + 0.06), (y0 + y1) / 2, zc); body.add(w);
      });
    }
    if (spec.bed) {
      [-1, 1].forEach(s => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 1.3), paintMat); r.position.set(s * (spec.W / 2 - 0.02), 1.45, -1.55); body.add(r); });
      const tg = new THREE.Mesh(new THREE.BoxGeometry(spec.W, 0.35, 0.1), paintMat); tg.position.set(0, 1.45, -2.2); body.add(tg);
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

    // top of the hull (body + cabin + roof gear) at a given z, so add-ons sit on it instead of cutting through it
    const hullTop = z => {
      let top = -1e9;
      for (const poly of [prof, spec.cabin]) for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; if ((a[0] - z) * (b[0] - z) <= 0 && a[0] !== b[0]) top = Math.max(top, a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0])); }
      if (spec.bed && z > -2.3 && z < -0.85) top = Math.max(top, 1.64);
      if (spec.feat === 'mule' && z > -2.2 && z < 1.8) top = Math.max(top, roofYc + 0.22);
      if (spec.feat === 'loaf' && z > -1.9 && z < 1.7) top = Math.max(top, roofYc + 0.1);
      if (spec.feat === 'vintage' && z > rearZ + 0.1 && z < rearZ + 0.6) top = Math.max(top, deckY + 0.58);        // tail-light bars
      if (spec.feat === 'ridge' && z > -2.12 && z < -1.88) top = Math.max(top, 2.28);                           // roll bar
      if (spec.feat === 'ridge' && z > -2.06 && z < -1.04) top = Math.max(top, 2.3);                            // spare wheel
      if (spec.feat === 'bubble' && z > rearZ + 0.02 && z < rearZ + 0.58) top = Math.max(top, 1.17);            // engine hump
      return top;
    };
    const roofYc = Math.max(...spec.cabin.map(p => p[1]));
    const hullTopCabin = z => { let t = -1e9; const c = spec.cabin; for (let k = 0; k < c.length; k++) { const a = c[k], b = c[(k + 1) % c.length]; if ((a[0] - z) * (b[0] - z) <= 0 && a[0] !== b[0]) t = Math.max(t, a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0])); } return t; };
    // accessories (a colour variant paints the part instead of using the body colour)
    const partMat = c => opts.ghost ? glassMat : c && DL.ITEM_COLORS[c] ? sharedMat('pc_' + c, () => new THREE.MeshStandardMaterial({ color: DL.ITEM_COLORS[c][1], flatShading: true, roughness: DL.isMetalColor(c) ? 0.28 : 0.5, metalness: DL.isMetalColor(c) ? 0.75 : 0.05 })) : paintMat;
    const spMat = partMat(spC);
    const topRear = spec.cabin.reduce((a, p) => p[0] < a[0] ? p : a, [9, 0]);
    const roofY = Math.max(...spec.cabin.map(p => p[1]));
    const deckY = spec.lower.reduce((m, p) => p[0] < rearZ + 0.6 ? Math.max(m, p[1]) : m, 0);
    if (spB === 'lip') {
      const zc = rearZ + 0.2, top = Math.max(hullTop(zc - 0.15), hullTop(zc + 0.15), hullTop(zc));
      const m = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 0.9, 0.08, 0.35), spMat); m.position.set(0, top + 0.05, zc); m.rotation.x = -0.22; m.castShadow = !opts.ghost; body.add(m);
    } else if (spB === 'ducktail') {
      const zc = rearZ + 0.26, top = Math.max(hullTop(zc - 0.22), hullTop(zc + 0.22), hullTop(zc));
      const m = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 0.95, 0.14, 0.5), spMat); m.position.set(0, top + 0.1, zc); m.rotation.x = -0.4; m.castShadow = !opts.ghost; body.add(m);
    } else if (spB === 'wing') {
      const zc = rearZ + 0.2, sx = spec.feat === 'loaf' ? 0.42 : spec.feat === 'vintage' ? 0.26 : 0.33, ww = spec.feat === 'vintage' ? 0.7 : 0.96;
      let top = -1e9; for (let k = -2; k <= 2; k++) top = Math.max(top, hullTop(zc + k * 0.13));
      const baseUnder = hullTop(zc) - 0.05, wingY = top + 0.34;
      [-1, 1].forEach(sd => { const h = wingY - baseUnder; const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.2), extraMat); st.position.set(sd * spec.W * sx, baseUnder + h / 2, zc); st.castShadow = !opts.ghost; body.add(st); });
      const w = new THREE.Mesh(new THREE.BoxGeometry(spec.W * ww, 0.06, 0.52), spMat); w.position.set(0, wingY, zc - 0.02); w.rotation.x = 0.1; w.castShadow = !opts.ghost; body.add(w);
      [-1, 1].forEach(sd => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.6), extraMat); e.position.set(sd * spec.W * ww / 2, wingY + 0.06, zc - 0.02); e.castShadow = !opts.ghost; body.add(e); });
    } else if (spB === 'rack') {
      // flat part of the roof: where the cabin is within a few cm of its highest point
      let z0 = 1e9, z1 = -1e9; for (let z = -3; z <= 3; z += 0.05) if (hullTopCabin(z) >= roofY - 0.06) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const span = Math.max(0.6, z1 - z0 - 0.3), len = Math.min(1.5, span), zc = (z0 + z1) / 2;
      [-1, 1].forEach(sd => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, len), extraMat); r.position.set(sd * spec.W * spec.cw * 0.4, roofY + 0.08, zc); r.castShadow = !opts.ghost; body.add(r); });
      const box = new THREE.Mesh(new THREE.BoxGeometry(spec.W * spec.cw * 0.66, 0.3, len * 0.8), spC ? spMat : sharedMat('cargo', () => new THREE.MeshLambertMaterial({ color: 0xc9ad7f, flatShading: true })));
      box.position.set(0, roofY + 0.28, zc); box.castShadow = !opts.ghost; body.add(box);
    }
    if (buB === 'bullbar') {
      const bm = buC ? partMat(buC) : extraMat;
      [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), bm); p.position.set(s * spec.W * 0.3, spec.lower[0][1] + 0.35, frontZ + 0.3); body.add(p); });
      const t = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 0.8, 0.1, 0.1), bm); t.position.set(0, spec.lower[0][1] + 0.65, frontZ + 0.3); body.add(t);
      const b = t.clone(); b.position.y -= 0.35; body.add(b);
    } else if (buB === 'pods') {
      for (let k = 0; k < 4; k++) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 8), buC && !opts.ghost ? sharedMat('pod_' + buC, () => new THREE.MeshStandardMaterial({ color: DL.ITEM_COLORS[buC][1], emissive: DL.ITEM_COLORS[buC][1], emissiveIntensity: 0.7 })) : headMat);
        p.rotation.x = Math.PI / 2; p.position.set((k - 1.5) * spec.W * 0.2, lightY + 0.06, frontZ + 0.2); body.add(p);
      }
    }

    if (DL.PLATE_STYLES[equip.plate]) {
      const txt = DL.plateText(equip.plateText), pm = plateMat(equip.plate, txt, !!opts.ghost);
      const pw = 0.62, ph = 0.16, py = spec.lower[0][1] + 0.44;
      // where the hull outline sits at plate height (the ends are sloped on most cars)
      const edgeZ = (y, rearSide) => { let best = rearSide ? 1e9 : -1e9; const L = spec.lower; for (let k = 0; k < L.length; k++) { const a = L[k], b = L[(k + 1) % L.length]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) { const z = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); best = rearSide ? Math.min(best, z) : Math.max(best, z); } } return best; };
      const rz = edgeZ(py, true), fz = edgeZ(py, false);
      if (rz < 1e8) { const rear = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), pm); rear.position.set(0, py, rz - 0.06); rear.rotation.y = Math.PI; body.add(rear); }
      if (fz > -1e8) { const front = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), pm); front.position.set(0, py, fz + 0.06); body.add(front); }
    }

    addFeatures({ body, spec, bodyMat, extraMat, headMat, tailMat, glassMat, glassSolid, frontZ, rearZ, roofY, lightY, deckY, ghost: !!opts.ghost });

    // wheels
    const wheels = [];
    for (const z of spec.wz) for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * (spec.W / 2 - 0.05) * spec.wx / 0.9, spec.wr * (knob ? 1.1 : 1), z);
      const w = buildWheel(spec, whB, whC);
      if (opts.ghost) w.traverse(o => { if (o.material) { o.material = glassMat; } });
      else w.traverse(o => { if (o.isMesh) o.castShadow = true; });
      pivot.add(w); body.add(pivot);
      wheels.push({ pivot, wheel: w, front: z > 0, side: s, baseY: pivot.position.y, c: 0.07, v: 0 });
    }
    if (!opts.ghost) wheels.forEach(w => deformTire(w, w.c, 0));
    const lift = knob ? spec.wr * 0.1 : 0;
    body.position.y = lift;

    root.userData = {
      spec, equip, body, bodyMesh, wheels, tailMat, canvas, tex, bodyMat,
      exhaust: new THREE.Vector3(spec.W * 0.28, spec.lower[0][1] + 0.08, rearZ - 0.2), paintMat, deform: !opts.ghost,
      rearZ, frontZ, roofY,
      // paint mode: swap in an 8x texture with a visible pixel grid so every paintable cell shows on the car
      setGrid(on, liv, base) {
        if (!on) { if (bodyMat.map !== tex) { bodyMat.map = tex; bodyMat.needsUpdate = true; } this.gridOn = false; return; }
        if (!this.gridTex) { this.gridCv = document.createElement('canvas'); this.gridTex = new THREE.CanvasTexture(this.gridCv); this.gridTex.anisotropy = 4; if ('colorSpace' in this.gridTex) this.gridTex.colorSpace = THREE.SRGBColorSpace; }
        this.gridOn = true; DL.drawGridCanvas(this.gridCv, liv, base); this.gridTex.needsUpdate = true;
        if (bodyMat.map !== this.gridTex) { bodyMat.map = this.gridTex; bodyMat.needsUpdate = true; }
      },
      setLivery(liv, base) { DL.drawLiveryCanvas(canvas, liv, base); if (this.gridOn) this.setGrid(true, liv, base); if (paintMat.color) paintMat.color.set(DL.PALETTE[base == null ? DL.DEFAULT_BASE : base]); tex.needsUpdate = true; if (frameMat) frameMat.color.set(DL.PALETTE[base == null ? DL.DEFAULT_BASE : base]); },
      dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); tex.dispose(); if (this.gridTex) this.gridTex.dispose(); bodyMat.dispose(); }
    };
    return root;
  };

  // apply physics state to a car model
  DL.poseCar = function (model, x, y, z, yaw, pitch, roll, steer, spin, brake) {
    model.position.set(x, y, z);
    model.rotation.set(0, yaw, 0);
    const u = model.userData;
    if (u.ufo) {
      const t = DL.vehTime != null ? DL.vehTime : performance.now() / 1000, hv = 0.95 + Math.sin(t * 2.2) * 0.06;
      u.body.position.y = hv; u.ufoRing.emissiveIntensity = 1.5 + Math.sin(t * 5) * 0.5; u.ufoSpin.rotation.y = t * 1.6;
      // keep the light pool on the road: it follows the hover height, and the cone stretches to meet it
      u.ufoPool.position.y = -hv + 0.04; u.ufoPool.scale.setScalar(0.95 + Math.sin(t * 3) * 0.05);
      u.ufoBeam.forEach(b => { b.scale.y = hv / 0.95; b.position.y = -hv / 2; });
    }
    u.body.rotation.order = 'YXZ';
    u.body.rotation.x = pitch; u.body.rotation.z = roll;
    // tyre load: braking/accel pitch, cornering roll, and landings/bumps (sudden change of vertical speed)
    const dy = u.py == null ? 0 : y - u.py, pd = u.pdy || 0;
    // only a real landing squashes the tyres: falling fast on the previous frame and suddenly not any more (bumps and slopes do not count)
    const impact = pd < -0.035 && dy > pd ? DL.clamp((dy - pd) * 0.8, 0, 0.35) : 0; u.py = y; u.pdy = dy;
    for (const w of u.wheels) {
      if (w.front) w.pivot.rotation.y = -steer * 0.45;
      w.wheel.rotation.x = spin || 0;
      if (u.deform) {
        const T = DL.clamp(0.07 + (w.front ? 1 : -1) * pitch * 1.4 + (w.side < 0 ? 1 : -1) * roll * 1.4, 0.02, 0.17);
        w.v += (T - w.c) * 0.4 + impact * 0.8; w.v *= 0.72; w.c = DL.clamp(w.c + w.v, 0, 0.22);
        deformTire(w, w.c, spin || 0);
      }
    }
    if (u.tailMat && u.tailMat.emissiveIntensity !== undefined) u.tailMat.emissiveIntensity = brake ? 1.4 : 0.15;
  };

})(window.DL);
