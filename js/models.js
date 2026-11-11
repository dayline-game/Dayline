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
  let _barrel = null, _post = null;
  DL.models = {
    // 1.4 tall, r 0.8, 12-sided ribbed drum with cream band and lid
    barrel() {
      if (_barrel) return _barrel;
      const P = [[.70, 0], [.78, .03], [.79, .10], [.80, .16], [.81, .17], [.81, .40], [.80, .42], [.80, .50], [.82, .52], [.82, .78], [.80, .80], [.80, .88], [.81, .90], [.81, 1.12], [.80, 1.14], [.80, 1.22], [.78, 1.30], [.77, 1.36], [.70, 1.40], [.62, 1.38], [.58, 1.34], [0, 1.34]];
      const ribs = [.16, .40, .50, .78, .88, 1.12];
      const mat = (i) => {
        const y0 = P[i][1], y1 = P[i + 1][1];
        if (i <= 2) return C.dark;
        if (y0 >= .52 && y1 <= .78 && Math.abs(P[i][0] - P[i + 1][0]) < 1e-6) return C.cream;
        if (ribs.includes(y0) && y1 - y0 < .03) return C.dark;
        if (y0 >= 1.14) return y0 < 1.34 ? C.dark : C.cream;
        return C.orange;
      };
      return (_barrel = build(lathe(P, 12, mat)));
    },
    // road-level origin; shaft buried 2.5 below, beacon on top (~7 above)
    gatePost() {
      if (_post) return _post;
      const o = [];
      box(o, 0, 0, -1.2, .5, .5, 2.6, C.navy); box(o, 0, 0, .28, 1.5, 1.5, .56, C.dark, .8); box(o, 0, 0, .62, 1.1, 1.1, .12, C.orange);
      box(o, 0, 0, 3.3, .5, .5, 5.4, C.navy); box(o, 0, 0, 1.4, .56, .56, .5, C.orange); box(o, 0, 0, 2.4, .56, .56, .5, C.cream); box(o, 0, 0, 3.4, .56, .56, .5, C.orange);
      box(o, 0, 0, 6.15, .8, .8, .3, C.dark, .9); box(o, 0, 0, 6.45, .3, .3, .3, C.navy); box(o, 0, 0, 6.82, .38, .38, .34, C.yellow);
      return (_post = build(o));
    }
  };

  // ------------------------------------------------------------------
  // Organic props: jittered low-poly volumes with a vertex-colour height gradient (dark base, light crown)
  // ------------------------------------------------------------------
  const M4 = (x, y, z, sx, sy, sz, ry, rx, rz) => {
    const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz));
    return m;
  };
  const hash3 = (x, y, z, s) => { let h = Math.imul(Math.round(x * 997) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(Math.round(y * 991) + 17, 0xc2b2ae35) ^ Math.imul(Math.round(z * 983) + 31, 0x27d4eb2f) ^ s; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return ((h >>> 0) % 20001) / 10000 - 1; };
  // part: geo, hex, matrix, jit (jitter amplitude in geo units), gd: [bottomShade, topShade] multiplicative
  const part = (geo, hex, m, jit, gd, seed) => ({ geo, hex, m: m || new THREE.Matrix4(), jit: jit || 0, gd: gd || null, seed: seed || 0 });
  function merge(parts) {
    const pg = parts.map(p => {
      let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
      const a = g.attributes.position.array;
      if (p.jit) for (let i = 0; i < a.length; i += 3) { const x = a[i], y = a[i + 1], z = a[i + 2]; a[i] += hash3(x, y, z, p.seed + 1) * p.jit; a[i + 1] += hash3(x, y, z, p.seed + 2) * p.jit; a[i + 2] += hash3(x, y, z, p.seed + 3) * p.jit; }
      g.computeBoundingBox(); const bb = g.boundingBox, span = Math.max(1e-6, bb.max.y - bb.min.y);
      const c = new THREE.Color(p.hex), cols = new Float32Array(a.length), tmp = new THREE.Color();
      for (let i = 0; i < a.length; i += 3) {
        const t = (a[i + 1] - bb.min.y) / span, k = p.gd ? p.gd[0] + (p.gd[1] - p.gd[0]) * t : 1;
        tmp.copy(c).multiplyScalar(k); cols[i] = Math.min(1, tmp.r); cols[i + 1] = Math.min(1, tmp.g); cols[i + 2] = Math.min(1, tmp.b);
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.applyMatrix4(p.m); return g;
    });
    let n = 0; pg.forEach(g => n += g.attributes.position.count);
    const pos = new Float32Array(n * 3), cl = new Float32Array(n * 3); let o = 0;
    pg.forEach(g => { pos.set(g.attributes.position.array, o * 3); cl.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('color', new THREE.BufferAttribute(cl, 3)); out.computeVertexNormals(); return out;
  }
  const CYL = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s || 6), CON = (r, h, s) => new THREE.ConeGeometry(r, h, s || 7), ICO = (r, d) => new THREE.IcosahedronGeometry(r, d == null ? 1 : d), BOX = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const cache = {};
  const PROPS = {
    pine() {   // 4 staggered tiers, root flare, trunk
      const p = [part(CYL(.22, .42, 2.2, 6), 0x6b5442, M4(0, 1.1, 0), .03, [.6, 1]), part(CYL(.5, .55, .25, 6), 0x5a4636, M4(0, .12, 0))];
      const tiers = [[2.3, 2.4, 2.4, 0x2f8a46], [1.9, 2.3, 3.7, 0x3f9a50], [1.45, 2.1, 4.9, 0x4fae5c], [.95, 1.9, 6.0, 0x62c06c]];
      tiers.forEach((t, i) => p.push(part(CON(t[0], t[1], 7), t[3], M4(0, t[2], 0, 1, 1, 1, i * .45), .12, [.62, 1.1], i * 7)));
      return merge(p);
    },
    snowpine() {
      const p = [part(CYL(.22, .42, 2.2, 6), 0x5e4c3f, M4(0, 1.1, 0), .03, [.6, 1]), part(CYL(.5, .55, .25, 6), 0x4a3b30, M4(0, .12, 0))];
      const tiers = [[2.3, 2.4, 2.4], [1.9, 2.3, 3.7], [1.45, 2.1, 4.9], [.95, 1.9, 6.0]];
      tiers.forEach((t, i) => { p.push(part(CON(t[0], t[1], 7), 0x2f7a68, M4(0, t[2], 0, 1, 1, 1, i * .45), .12, [.6, 1.05], i * 7)); p.push(part(CON(t[0] * .78, t[1] * .62, 7), 0xf1f4f7, M4(0, t[2] + t[1] * .22, 0, 1, 1, 1, i * .45), .08, [.9, 1.05], i * 7 + 3)); });
      return merge(p);
    },
    round() {  // oak: forked trunk + clustered blobs, two greens
      return merge([part(CYL(.25, .45, 2.4, 6), 0x6b5442, M4(0, 1.2, 0), .03, [.6, 1]), part(CYL(.12, .2, 1.3, 5), 0x6b5442, M4(.55, 2.6, 0, 1, 1, 1, 0, 0, -.7)),
        part(ICO(1.9, 1), 0x4fa840, M4(0, 3.7, 0, 1, .9, 1), .28, [.7, 1.15], 1), part(ICO(1.3, 1), 0x62bd4c, M4(1.3, 3.2, .4), .2, [.75, 1.15], 2),
        part(ICO(1.2, 1), 0x58b244, M4(-1.2, 3.4, -.5), .2, [.75, 1.15], 3), part(ICO(1.1, 1), 0x72c95a, M4(.1, 4.7, .2), .18, [.8, 1.15], 4)]);
    },
    palm() {
      const p = [];
      for (let i = 0; i < 6; i++) p.push(part(CYL(.2 - i * .012, .27 - i * .012, 1.05, 6), i % 2 ? 0x9a7e60 : 0x8a6e52, M4(.06 * i * i * .35, .5 + i * 1, 0, 1, 1, 1, 0, 0, -.06 * i * .5), .02));
      const cx = .06 * 25 * .35 + .1, cy = 6.4;
      p.push(part(ICO(.28, 0), 0x6b5030, M4(cx, cy, 0)));
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.push(part(BOX(2.5, .08, .55), k % 2 ? 0x4fb04a : 0x3fa040, M4(cx + Math.cos(a) * 1.1, cy + .05 - .0, Math.sin(a) * 1.1, 1, 1, 1, -a, 0, -.45), .05, [.8, 1.1], k)); }
      return merge(p);
    },
    cactus() {
      return merge([part(CYL(.38, .46, 4.2, 7), 0x58aa5a, M4(0, 2.1, 0), .03, [.7, 1.1]), part(ICO(.4, 0), 0x66b866, M4(0, 4.25, 0, 1, 1.1, 1)),
        part(CYL(.26, .3, 1.1, 6), 0x58aa5a, M4(.75, 2.55, 0, 1, 1, 1, 0, 0, Math.PI / 2)), part(CYL(.26, .28, 1.6, 6), 0x58aa5a, M4(1.3, 3.3, 0)), part(ICO(.28, 0), 0x66b866, M4(1.3, 4.1, 0)),
        part(CYL(.24, .28, .9, 6), 0x58aa5a, M4(-.65, 2.0, 0, 1, 1, 1, 0, 0, Math.PI / 2)), part(CYL(.24, .26, 1.2, 6), 0x58aa5a, M4(-1.1, 2.6, 0)), part(ICO(.26, 0), 0x66b866, M4(-1.1, 3.25, 0))]);
    },
    rock() {
      return merge([part(ICO(1.1, 1), 0x9aa7b4, M4(0, .45, 0, 1.25, .7, 1), .22, [.62, 1.12], 5), part(ICO(.55, 0), 0x8c98a5, M4(1.2, .25, .4), .12, [.6, 1.05], 6), part(ICO(.35, 0), 0xa6b2be, M4(-.9, .2, .7), .08, [.65, 1.1], 7)]);
    },
    boulder() {
      return merge([part(ICO(3, 1), 0x93a0ae, M4(0, 1.2, 0, 1.3, .85, 1.1), .6, [.58, 1.12], 8), part(ICO(1.5, 1), 0x8b97a5, M4(3, .8, 1.2), .3, [.6, 1.1], 9), part(ICO(1.0, 0), 0x9fabb8, M4(-2.6, .6, 1.8), .2, [.6, 1.1], 10), part(ICO(1.9, 1), 0x9aa7b4, M4(-1, 2.4, -.6), .35, [.7, 1.15], 11)]);
    },
    bush() {
      return merge([part(ICO(.95, 1), 0x4ea040, M4(0, .6, 0, 1.25, .8, 1.1), .14, [.65, 1.15], 12), part(ICO(.7, 1), 0x62b84e, M4(.95, .5, .3), .1, [.7, 1.15], 13), part(ICO(.55, 1), 0x70c458, M4(-.8, .45, -.3), .1, [.7, 1.15], 14), part(ICO(.42, 0), 0xe8708a, M4(.3, 1.05, .5), .04)]);
    },
    shrub() {
      return merge([part(ICO(.8, 1), 0x9a9a6a, M4(0, .45, 0, 1.3, .6, 1.2), .12, [.65, 1.12], 15), part(ICO(.5, 1), 0xb0a572, M4(.85, .3, -.2), .08, [.7, 1.1], 16), part(ICO(.38, 0), 0x8a8a5a, M4(-.8, .22, .3), .05)]);
    },
    haybale() {
      const g = CYL(1, 1, 1.6, 9);
      return merge([part(g, 0xd8bb78, M4(0, 1, 0, 1, 1, 1, 0, 0, Math.PI / 2), .02, [.8, 1.05]), part(CYL(1.02, 1.02, .12, 9), 0xb89a58, M4(0, 1, 0, 1, 1, 1, 0, 0, Math.PI / 2)), part(CYL(1.02, 1.02, .08, 9), 0xb89a58, M4(.4, 1, 0, 1, 1, 1, 0, 0, Math.PI / 2)), part(CYL(1.02, 1.02, .08, 9), 0xb89a58, M4(-.4, 1, 0, 1, 1, 1, 0, 0, Math.PI / 2))]);
    },
    sign() {
      return merge([part(CYL(.07, .08, 2.1, 6), 0x4b5563, M4(0, 1.05, 0)), part(BOX(1.7, 1.2, .1), 0xe9e3d3, M4(0, 2.15, 0)), part(BOX(1.52, 1.02, .12), 0x1f2a3d, M4(0, 2.15, 0)), part(CON(.4, .8, 3), 0xf4ecdc, M4(0, 2.1, .08, 1, 1, .2)), part(BOX(1.7, .18, .14), 0xf05a35, M4(0, 2.82, 0)), part(BOX(.3, .12, .3), 0x3a4352, M4(0, .06, 0))]);
    },
    flagpole() {
      return merge([part(CYL(.06, .1, 6.2, 6), 0xe8e1d2, M4(0, 3.1, 0)), part(ICO(.12, 0), 0xe6b84f, M4(0, 6.25, 0)), part(BOX(1.5, .85, .05), 0xf05a35, M4(.8, 5.5, 0)), part(BOX(.5, .85, .06), 0xf4ecdc, M4(.3, 5.5, 0)), part(CYL(.25, .3, .2, 6), 0x3a4352, M4(0, .1, 0))]);
    }
  };
  const HAZ = {
    cone() {
      return merge([part(BOX(1, .1, 1), 0x1f2a3d, M4(0, .05, 0), 0, [.8, 1]), part(CON(.4, 1.25, 10), 0xf05a35, M4(0, .75, 0), 0, [.8, 1.05]), part(CYL(.27, .31, .22, 10), 0xf4ecdc, M4(0, .78, 0)), part(CYL(.34, .38, .1, 10), 0xf4ecdc, M4(0, .55, 0, 1, 1, 1)), part(ICO(.07, 0), 0x1f2a3d, M4(0, 1.36, 0))]);
    },
    jersey() {
      const p = [];
      for (let k = 0; k < 4; k++) { const c = k % 2 ? 0xf05a35 : 0xf4ecdc;
        p.push(part(BOX(1.1, .3, .96), c, M4(0, .15, -1.5 + k)), part(BOX(.8, .5, .96), c, M4(0, .55, -1.5 + k, 1, 1, 1), 0, [.85, 1]), part(BOX(.5, .25, .96), c, M4(0, .92, -1.5 + k)));
        p.push(part(BOX(.12, .5, .98), 0x1f2a3d, M4(0, .55, -1.5 + k + .49)));
      }
      p.push(part(BOX(.12, .08, 4.0), 0xdfe3e8, M4(0, 1.06, 0)), part(CYL(.16, .16, .3, 8), 0xffc233, M4(0, 1.3, 1.7)), part(ICO(.12, 0), 0xffe08a, M4(0, 1.5, 1.7)));
      return merge(p);
    },
    tyres() {
      const T = (x, y, z, c) => part(new THREE.TorusGeometry(.55, .3, 6, 12), c, M4(x, y, z, 1, 1, 1, 0, Math.PI / 2, 0), 0, [.7, 1]);
      const p = [];
      for (let k = 0; k < 3; k++) { p.push(T(-.6, .3 + k * .55, 0, k === 1 ? 0xf4ecdc : 0x1f2a3d)); p.push(T(.6, .3 + k * .55, .15, k === 1 ? 0xf05a35 : 0x1f2a3d)); }
      p.push(T(0, .3, 1.0, 0x1f2a3d), T(0, .85, 1.0, 0xf4ecdc), T(0, .3, -1.0, 0x1f2a3d));
      return merge(p);
    },
    rock() { return merge([part(ICO(1, 1), 0x9aa7b4, M4(0, .55, 0, 1, .85, 1), .2, [.62, 1.12], 20), part(ICO(.55, 0), 0x9aa2ab, M4(.95, .25, .3), .1, [.6, 1.05], 21)]); },
    bales() {
      const R = (x, y, z, c) => part(CYL(.95, .95, 1.6, 9), c, M4(x, y, z, 1, 1, 1, 0, 0, Math.PI / 2), .02, [.8, 1.05]);
      return merge([R(-.9, .95, 0, 0xd8bb78), R(.9, .95, .1, 0xcfae68), R(0, 2.55, 0, 0xdfc486), part(BOX(.12, .9, .12), 0xf05a35, M4(0, .5, 1.3))]);
    }
  };
  DL.models.prop = (t) => PROPS[t] ? (cache['p' + t] || (cache['p' + t] = PROPS[t]())) : null;
  DL.models.haz = (t) => HAZ[t] ? (cache['h' + t] || (cache['h' + t] = HAZ[t]())) : null;
})(window.DL);
