// Dayline props authored in Blender (low-poly, flat-shaded, vertex colours) and ported 1:1 as parametric geometry.
(function (DL) {
  'use strict';
  const C = { orange: 0xf05a35, cream: 0xf4ecdc, navy: 0x1f2a3d, dark: 0x2b3140, yellow: 0xf2c14e };
  const _col = new THREE.Color();
  function build(tris) {   // tris: [[ax,ay,az,bx,by,bz,cx,cy,cz], hex]  (Blender Z-up -> three Y-up applied here)
    const pos = new Float32Array(tris.length * 9), colr = new Float32Array(tris.length * 9);
    tris.forEach((t, i) => {
      const p = t[0], c = _col.setHex(t[1]);
      for (let k = 0; k < 3; k++) {
        pos[i * 9 + k * 3] = p[k * 3]; pos[i * 9 + k * 3 + 1] = p[k * 3 + 2]; pos[i * 9 + k * 3 + 2] = -p[k * 3 + 1];
        colr[i * 9 + k * 3] = c.r; colr[i * 9 + k * 3 + 1] = c.g; colr[i * 9 + k * 3 + 2] = c.b;
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    g.computeVertexNormals(); return g;
  }
  function quad(out, a, b, c, d, hex) { out.push([[...a, ...b, ...c], hex], [[...a, ...c, ...d], hex]); }
  function lathe(prof, segs, matfn) {
    const out = [], ring = prof.map(([r, y]) => Array.from({ length: segs }, (_, k) => [r * Math.cos(2 * Math.PI * k / segs), r * Math.sin(2 * Math.PI * k / segs), y]));
    for (let i = 0; i < prof.length - 1; i++) for (let k = 0; k < segs; k++) { const k2 = (k + 1) % segs; quad(out, ring[i][k], ring[i][k2], ring[i + 1][k2], ring[i + 1][k], matfn(i)); }
    for (let k = 1; k < segs - 1; k++) { out.push([[...ring[0][0], ...ring[0][k + 1], ...ring[0][k]], C.dark]); out.push([[...ring[prof.length - 1][0], ...ring[prof.length - 1][k], ...ring[prof.length - 1][k + 1]], matfn(prof.length - 2)]); }
    return out;
  }
  function box(out, cx, cy, cz, sx, sy, sz, hex, tp) {
    tp = tp || 1; const v = (x, y, z) => { const k = z > 0 ? tp : 1; return [x * sx * k + cx, y * sy * k + cy, z * sz + cz]; };
    const h = .5, P = [v(-h, -h, -h), v(h, -h, -h), v(h, h, -h), v(-h, h, -h), v(-h, -h, h), v(h, -h, h), v(h, h, h), v(-h, h, h)];
    for (const f of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) quad(out, P[f[0]], P[f[1]], P[f[2]], P[f[3]], hex);
  }
  const _cache = {};
  function fromData(name) {
    if (_cache[name]) return _cache[name];
    const d = DL.MODEL_DATA && DL.MODEL_DATA[name]; if (!d) return null;
    const n = d.t.length, pos = new Float32Array(n * 3), colr = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const vi = d.t[i] * 3; pos[i * 3] = d.v[vi] / 1000; pos[i * 3 + 1] = d.v[vi + 1] / 1000; pos[i * 3 + 2] = d.v[vi + 2] / 1000; }
    for (let f = 0; f < d.c.length; f++) { c.setHex(d.c[f]); for (let k = 0; k < 3; k++) { colr[f * 9 + k * 3] = c.r; colr[f * 9 + k * 3 + 1] = c.g; colr[f * 9 + k * 3 + 2] = c.b; } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colr, 3)); g.computeVertexNormals();
    return (_cache[name] = g);
  }
  // props and hazards modelled in Blender (see models_data.js); null falls back to the old procedural geometry in track.js
  const HAZ_MAP = { cone: 'hcone', jersey: 'jersey', tyres: 'tyres', rock: 'hrock', bales: 'bales' };
  DL.models = {
    barrel: () => fromData('barrel'),
    gatePost: () => fromData('gatepost'),
    prop: (t) => fromData(t),
    tyre: (t) => fromData(t),
    haz: (t) => HAZ_MAP[t] ? fromData(HAZ_MAP[t]) : null
  };
})(window.DL);
