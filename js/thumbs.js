/* DAYLINE — item catalogue, rarities and item thumbnails (small 3D renders of the real car parts, drawn icons for effects) */
'use strict';
(function (DL) {
  // ---------------- catalogue ----------------
  DL.CAT_ORDER = ['cars', 'spoiler', 'wheels', 'bumper', 'finish', 'tint', 'plate', 'exhaust', 'trail', 'stickers'];
  DL.CAT_NAMES = { cars: 'Cars', spoiler: 'Spoilers', wheels: 'Wheels', bumper: 'Bumpers', finish: 'Finishes', tint: 'Window tints', plate: 'Plates', exhaust: 'Exhaust', trail: 'Trails', stickers: 'Sticker packs' };
  DL.CAT_ONE = { cars: 'Car', spoiler: 'Spoiler', wheels: 'Wheels', bumper: 'Bumper', finish: 'Finish', tint: 'Tint', plate: 'Plates', exhaust: 'Exhaust', trail: 'Trail', stickers: 'Stickers', paint: 'Paint' };
  DL.RARITIES = {
    common: { n: 'Common', c: '#7d8796', a: '#a9b2bf' },
    uncommon: { n: 'Uncommon', c: '#3f8d4e', a: '#7ccf6a' },
    rare: { n: 'Rare', c: '#2766b7', a: '#4fb3ff' },
    epic: { n: 'Epic', c: '#7a3bc4', a: '#c26bff' },
    legendary: { n: 'Legendary', c: '#c4631c', a: '#ffb547' },
    champion: { n: 'Champion', c: '#0f7d8c', a: '#5ff0e0' }
  };
  DL.rarityOf = function (cat, id, price) {
    if (cat === 'cars' && id === 'ufo') return 'champion';
    if (price < 100) return 'common';
    if (price < 160) return 'uncommon';
    if (price < 260) return 'rare';
    if (price <= 800) return 'epic';
    return 'legendary';
  };
  DL.itemInfo = function (cat, id) {
    let it;
    if (cat === 'cars') { const c = DL.CARS[id]; if (!c) return null; it = { name: c.name, price: c.price, sub: c.cls, blurb: c.blurb }; }
    else { const p = (DL.PARTS[cat] || []).find(x => x.id === id); if (!p) return null; it = { name: p.name, price: p.price, sub: DL.CAT_ONE[cat] }; }
    it.cat = cat; it.id = id; it.key = cat + ':' + id; it.rarity = DL.rarityOf(cat, id, it.price);
    if (!it.blurb) it.blurb = BLURB[cat] || '';
    return it;
  };
  const BLURB = {
    spoiler: 'Bolts onto the back of any car.', wheels: 'Fits every car in your garage.', bumper: 'A new front end for every car.',
    finish: 'Changes how your paint catches the light.', tint: 'Darkens or colours the windows.', plate: 'Number plates front and back. Type your own text in the locker.',
    exhaust: 'Shows behind your car while you race.', trail: 'A ribbon that follows your car while you race.', stickers: 'Extra stamps for the paint editor.'
  };
  DL.allItems = function () {
    const out = [];
    for (const cat of DL.CAT_ORDER) {
      if (cat === 'cars') DL.CAR_ORDER.forEach(id => out.push(DL.itemInfo('cars', id)));
      else DL.PARTS[cat].forEach(p => out.push(DL.itemInfo(cat, p.id)));
    }
    return out;
  };

  // ---------------- thumbnails ----------------
  const SZ = 256, cache = new Map(), queue = [], waiting = new Map();
  let R = null, S = null, cam = null, busy = false;
  function init() {
    if (R) return true;
    try {
      const cv = document.createElement('canvas'); cv.width = SZ; cv.height = SZ;
      R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
      R.setPixelRatio(1); R.setSize(SZ, SZ, false); R.setClearColor(0x000000, 0);
      if ('outputColorSpace' in R) R.outputColorSpace = THREE.SRGBColorSpace;
    } catch (e) { R = null; return false; }
    S = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8070, 1.7), sun = new THREE.DirectionalLight(0xfff3dd, 2.4);
    sun.position.set(5, 9, 6); S.add(hemi, sun);
    const rim = new THREE.DirectionalLight(0xbcd6ff, 1.1); rim.position.set(-6, 4, -6); S.add(rim);
    cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    return true;
  }
  // camera framings for each kind of item
  const VIEWS = {
    hero: { p: [5.6, 2.6, 6.4], t: [0, 0.75, 0.1], fov: 30 },
    rear: { p: [-4.4, 3.4, -5.4], t: [0, 1.0, -0.6], fov: 30 },
    front: { p: [3.6, 1.4, 5.6], t: [0, 0.6, 1.1], fov: 30 },
    wheel: { p: [5.0, 1.2, 3.6], t: [0.6, 0.5, 0.9], fov: 28 },
    side: { p: [9.6, 1.8, 0.4], t: [0, 0.8, 0], fov: 30 }
  };
  function myLook(car) {
    const sv = DL.Net.save, pt = sv.paint[car || sv.car];
    return { livery: pt && pt.l ? DL.decodeLivery(pt.l) : DL.defaultLivery(), base: pt && pt.b != null ? pt.b : DL.DEFAULT_BASE };
  }
  function spec(cat, id) {
    const sv = DL.Net.save;
    if (cat === 'cars') { const lk = myLook(id); return { opts: { car: id, livery: lk.livery, base: lk.base, equip: {} }, view: 'hero' }; }
    const lk = myLook(sv.car), equip = Object.assign({}, sv.equip); equip[cat] = id;
    if (cat === 'spoiler') { equip.spoiler = id; return { opts: { car: sv.car, livery: lk.livery, base: lk.base, equip: { spoiler: id, wheels: sv.equip.wheels } }, view: 'rear' }; }
    if (cat === 'wheels') return { opts: { car: sv.car, livery: lk.livery, base: lk.base, equip: { wheels: id } }, view: 'wheel' };
    if (cat === 'bumper') return { opts: { car: sv.car, livery: lk.livery, base: lk.base, equip: { bumper: id } }, view: 'front' };
    if (cat === 'finish') return { opts: { car: sv.car, livery: lk.livery, base: lk.base, equip: { finish: id } }, view: 'hero' };
    if (cat === 'tint') return { opts: { car: sv.car, livery: lk.livery, base: lk.base, equip: { tint: id } }, view: 'side' };
    return null;
  }
  function render3d(sp) {
    if (!init()) return null;
    const m = DL.buildCar(sp.opts);
    S.add(m);
    DL.poseCar(m, 0, 0, 0, 0, 0, 0, 0, 0, false);
    const v = VIEWS[sp.view] || VIEWS.hero;
    cam.fov = v.fov; cam.updateProjectionMatrix(); cam.position.set(v.p[0], v.p[1], v.p[2]); cam.lookAt(v.t[0], v.t[1], v.t[2]);
    R.render(S, cam);
    const url = R.domElement.toDataURL('image/png');
    S.remove(m); if (m.userData.dispose) m.userData.dispose();
    return url;
  }
  // 2D icons for things you only see while driving
  function icon2d(cat, id) {
    const c = document.createElement('canvas'); c.width = c.height = SZ; const g = c.getContext('2d');
    const hex = n => '#' + n.toString(16).padStart(6, '0');
    if (cat === 'trail') {
      const col = DL.TRAIL_COLORS[id];
      if (!col) { noneMark(g); return c.toDataURL(); }
      const gr = g.createLinearGradient(30, 200, 230, 60); gr.addColorStop(0, hex(col[0])); gr.addColorStop(1, hex(col[1]));
      g.lineCap = 'round'; g.lineWidth = 44; g.strokeStyle = 'rgba(28,37,54,.35)';
      const path = () => { g.beginPath(); g.moveTo(30, 210); g.bezierCurveTo(90, 210, 110, 120, 150, 110); g.bezierCurveTo(190, 100, 200, 60, 232, 46); };
      path(); g.translate(4, 6); g.stroke(); g.translate(-4, -6); g.strokeStyle = gr; g.lineWidth = 40; path(); g.stroke();
      g.globalAlpha = .5; g.strokeStyle = '#fff'; g.lineWidth = 6; path(); g.stroke(); g.globalAlpha = 1;
      return c.toDataURL();
    }
    if (cat === 'exhaust') {
      if (id === 'none') { noneMark(g); return c.toDataURL(); }
      // tailpipe + puffs
      g.fillStyle = '#2b3446'; g.beginPath(); g.ellipse(196, 170, 26, 18, 0, 0, 7); g.fill();
      g.fillStyle = '#11151d'; g.beginPath(); g.ellipse(196, 170, 15, 10, 0, 0, 7); g.fill();
      const puffs = [[150, 156, 30], [104, 136, 38], [60, 110, 44]];
      if (id === 'flame') {
        const fl = (x, y, r, a, b) => { const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.5, r, -0.35, 0, 7); g.fill(); };
        fl(132, 150, 46, '#fff4b8', 'rgba(240,90,53,0)'); fl(150, 158, 30, '#ffe066', 'rgba(242,193,78,0)'); fl(110, 140, 26, '#ffd84d', 'rgba(240,90,53,0)');
      } else {
        const col = id === 'coral' ? ['#f05a35', '#f7a072'] : ['#ffffff', '#d9dde3'];
        puffs.forEach(([x, y, r], i) => { g.fillStyle = col[i % 2]; g.globalAlpha = 0.95 - i * 0.18; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.beginPath(); g.arc(x + r * 0.6, y - r * 0.4, r * 0.7, 0, 7); g.fill(); });
        g.globalAlpha = 1;
      }
      return c.toDataURL();
    }
    if (cat === 'plate') {
      const st = DL.PLATE_STYLES[id];
      if (!st) { noneMark(g); return c.toDataURL(); }
      g.save(); g.translate(128, 132); g.rotate(-0.08);
      g.fillStyle = 'rgba(17,21,29,.35)'; rr(g, -104, -36, 216, 82, 10); g.fill();
      g.fillStyle = st[0]; rr(g, -108, -42, 216, 82, 10); g.fill(); g.lineWidth = 6; g.strokeStyle = st[2]; rr(g, -100, -34, 200, 66, 6); g.stroke();
      g.fillStyle = st[1]; g.font = '900 50px "Barlow Condensed", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(DL.plateText(DL.Net.save.equip && DL.Net.save.equip.plateText), 0, 2); g.restore();
      return c.toDataURL();
    }
    if (cat === 'stickers') {
      const keys = Object.keys(DL.STAMPS).filter(k => DL.STAMPS[k].pack === id).slice(0, 3), cols = ['#f05a35', '#f2c14e', '#f3ead7'];
      keys.forEach((k, i) => {
        const st = DL.STAMPS[k], px = 13, ox = [70, 170, 120][i] - st.w * px / 2, oy = [86, 92, 170][i] - st.h * px / 2;
        g.fillStyle = 'rgba(17,21,29,.4)'; st.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '1') g.fillRect(ox + x * px + 4, oy + y * px + 5, px, px); }));
        g.fillStyle = cols[i]; st.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '1') g.fillRect(ox + x * px, oy + y * px, px, px); }));
      });
      return c.toDataURL();
    }
    return null;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function noneMark(g) {
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath(); g.arc(128, 128, 58, 0, 7); g.stroke(); g.beginPath(); g.moveTo(88, 168); g.lineTo(168, 88); g.stroke();
  }
  // key includes the look it was drawn with, so a repaint or car change draws fresh thumbnails
  function lookKey(cat, id) {
    const sv = DL.Net.save;
    if (cat === 'exhaust' || cat === 'trail' || cat === 'stickers') return cat + ':' + id;
    if (cat === 'plate') return cat + ':' + id + ':' + ((sv.equip && sv.equip.plateText) || '');
    const car = cat === 'cars' ? id : sv.car, pt = sv.paint[car] || {};
    return cat + ':' + id + ':' + car + ':' + (pt.l || '').length + ':' + (pt.l || '').slice(-24) + ':' + pt.b + (cat === 'spoiler' ? ':' + sv.equip.wheels : '');
  }
  function pump() {
    if (busy) return; busy = true;
    requestAnimationFrame(function step() {
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < 12) {
        const j = queue.shift(); if (cache.has(j.k)) { deliver(j.k); continue; }
        let url = null;
        try { url = icon2d(j.cat, j.id); if (!url) { const sp = spec(j.cat, j.id); url = sp ? render3d(sp) : null; } } catch (e) { url = null; }
        cache.set(j.k, url || ''); deliver(j.k);
      }
      if (queue.length) requestAnimationFrame(step); else busy = false;
    });
  }
  function deliver(k) {
    const url = cache.get(k), list = waiting.get(k); waiting.delete(k);
    (list || []).forEach(img => { if (img.dataset.tk === k && url) { img.src = url; img.classList.add('in'); } });
  }
  // <img> that fills itself in when the thumbnail is ready
  DL.thumbImg = function (cat, id, cls) {
    const img = document.createElement('img'); img.alt = ''; img.className = 'thumb ' + (cls || ''); img.decoding = 'async'; img.draggable = false;
    const k = lookKey(cat, id); img.dataset.tk = k;
    if (cache.has(k)) { const u = cache.get(k); if (u) { img.src = u; img.classList.add('in'); } return img; }
    if (!waiting.has(k)) { waiting.set(k, []); queue.push({ k, cat, id }); }
    waiting.get(k).push(img); pump();
    return img;
  };
})(window.DL);
