/* DAYLINE — the item pool: colour variants of parts, tints, plates, smoke, flames, ribbons and finishes.
   About 200 items are in the shop at launch; every Monday (12am Gulf time) a fresh drop from the rest of the pool is released.
   The pool order is fixed: only ever APPEND colours / bases at the end of the lists, or released items would change. */
'use strict';
(function (DL) {
  // ---------- colours (append only) ----------
  const C = DL.ITEM_COLORS = {
    navy: ['Navy', 0x1f2a3d], coral: ['Coral', 0xf05a35], cream: ['Cream', 0xf3ead7], onyx: ['Onyx', 0x15181e],
    snow: ['Snow', 0xf7f7f4], cherry: ['Cherry', 0xc8243a], tangerine: ['Tangerine', 0xf28a1e], lemon: ['Lemon', 0xf2d14e],
    lime: ['Lime', 0x9bd13b], forest: ['Forest', 0x2f6b3c], mint: ['Mint', 0x7fdcb6], teal: ['Teal', 0x1f9a9a],
    sky: ['Sky', 0x7cc3f2], cobalt: ['Cobalt', 0x2a5bd7], grape: ['Grape', 0x6b3fb5], lilac: ['Lilac', 0xb79ce8],
    bubblegum: ['Bubblegum', 0xf27fb7], magenta: ['Magenta', 0xd12f8f], chocolate: ['Chocolate', 0x5a3a26], sand: ['Sand', 0xd8c08f],
    slate: ['Slate', 0x5d6b7d], gold: ['Gold', 0xd9a441, 1], chrome: ['Chrome', 0xc9d1da, 1], bronze: ['Bronze', 0xb07040, 1]
  };
  const KEYS = Object.keys(C), PLAIN = KEYS.filter(k => !C[k][2]), METAL = KEYS.filter(k => C[k][2]);
  const LIGHT = ['snow', 'lemon', 'tangerine', 'sky', 'mint', 'lilac', 'bubblegum', 'coral', 'lime', 'cherry', 'cobalt', 'magenta'];
  DL.isMetalColor = k => !!(C[k] && C[k][2]);
  // "wing-navy" -> ['wing', 'navy']; plain ids have no colour
  DL.partBase = id => { id = String(id || ''); const i = id.indexOf('-'); return i < 0 ? [id, null] : [id.slice(0, i), id.slice(i + 1)]; };
  const r10 = n => Math.round(n / 10) * 10;
  const lum = k => { const v = C[k][1]; return ((v >> 16) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11) / 255; };

  // effects that the shop sells: smoke and flame colours (the original three keep their ids)
  DL.EXHAUST = { smoke: { k: 'smoke', c: [0xffffff, 0xd9dde3] }, coral: { k: 'smoke', c: [0xf05a35, 0xf7a072] }, flame: { k: 'flame', c: [0xf2c14e, 0xf05a35] } };
  DL.FINISH_EXTRA = {
    satin: ['Satin', 0.55, 0.1, 120], ceramic: ['Ceramic', 0.12, 0.0, 190], velvet: ['Velvet', 1.0, 0.25, 240],
    candy: ['Candy', 0.15, 0.55, 300], flake: ['Mirror flake', 0.22, 0.85, 380], chrome: ['Liquid chrome', 0.06, 1.0, 460]
  };

  // ---------- the full pool, in a fixed order ----------
  const pool = [];
  const add = (cat, id, name, price) => pool.push({ cat, id, name, price: r10(price) });
  const SP = [['lip', 'Lip spoiler', 80], ['ducktail', 'Ducktail', 140], ['wing', 'Big wing', 220], ['rack', 'Roof rack', 160]];
  const WH = [['spoke', 'Five-spoke', 90], ['dish', 'Dish', 130], ['knobby', 'Knobblies', 170]];
  KEYS.forEach(k => {
    const [n, , metal] = C[k];
    SP.forEach(([b, bn, p]) => { if (!(b === 'wing' && k === 'navy')) add('spoiler', b + '-' + k, n + ' ' + bn.toLowerCase(), p + (metal ? 110 : 20)); });
    WH.forEach(([b, bn, p]) => { if (!(b === 'spoke' && k === 'gold')) add('wheels', b + '-' + k, n + ' ' + bn.toLowerCase(), p + (metal ? 120 : 20)); });
    add('bumper', 'bullbar-' + k, n + ' bull bar', 180 + (metal ? 90 : 20));
    if (LIGHT.includes(k)) add('bumper', 'pods-' + k, n + ' light pods', 160);
    if (!metal && !['cream', 'snow', 'sand', 'navy', 'onyx'].includes(k) && !DL.TINTS[k]) { DL.TINTS[k] = [C[k][1], 0.6]; add('tint', k, n + ' tint', 100); }
    if (k === 'chrome') { DL.TINTS.mirror = [0xc9d1da, 0.85]; add('tint', 'mirror', 'Mirror tint', 240); }
    if (k !== 'smoke') { DL.EXHAUST['smoke-' + k] = { k: 'smoke', c: [C[k][1], new THREE.Color(C[k][1]).lerp(new THREE.Color(0xffffff), 0.45).getHex()] }; add('exhaust', 'smoke-' + k, n + ' smoke', metal ? 220 : 110); }
    if (LIGHT.includes(k) || metal) { DL.EXHAUST['flame-' + k] = { k: 'flame', c: [new THREE.Color(C[k][1]).lerp(new THREE.Color(0xffffff), 0.5).getHex(), C[k][1]] }; add('exhaust', 'flame-' + k, n + ' flames', metal ? 420 : 340); }
  });
  // plates: background + text colour pairs with enough contrast
  KEYS.forEach(bg => KEYS.forEach(fg => {
    if (bg === fg || Math.abs(lum(bg) - lum(fg)) < 0.45) return;
    if ((KEYS.indexOf(bg) * 7 + KEYS.indexOf(fg) * 3) % 4) return;          // a quarter of the pairs is plenty
    const id = 'p-' + bg + '-' + fg; DL.PLATE_STYLES[id] = ['#' + C[bg][1].toString(16).padStart(6, '0'), '#' + C[fg][1].toString(16).padStart(6, '0'), '#' + C[fg][1].toString(16).padStart(6, '0')];
    add('plate', id, C[bg][0] + ' & ' + C[fg][0].toLowerCase() + ' plates', C[bg][2] || C[fg][2] ? 160 : 100);
  }));
  // ribbons: two-tone trails
  KEYS.forEach((a, i) => KEYS.forEach((b, j) => {
    if (a === b || (i * 5 + j * 11) % 3) return;
    const id = 't-' + a + '-' + b; DL.TRAIL_COLORS[id] = [C[a][1], C[b][1]];
    add('trail', id, C[a][0] + ' ' + C[b][0].toLowerCase() + ' ribbon', C[a][2] || C[b][2] ? 300 : 180);
  }));
  KEYS.forEach(k => { const id = 't-' + k; DL.TRAIL_COLORS[id] = [C[k][1], C[k][1]]; add('trail', id, C[k][0] + ' ribbon', C[k][2] ? 260 : 150); });
  Object.keys(DL.FINISH_EXTRA).forEach(k => { const f = DL.FINISH_EXTRA[k]; add('finish', k, f[0], f[3]); });

  // ---------- release schedule ----------
  DL.WEEK0 = '20261109';                       // launch Monday
  DL.WEEKLY_DROP = 12;
  DL.weekOf = day => Math.floor((DL.dayNumber(day) - DL.dayNumber(DL.WEEK0)) / 7);
  DL.msToNextWeek = () => { const dow = ((DL.dayNumber(DL.dayKey()) - DL.dayNumber(DL.WEEK0)) % 7 + 7) % 7; return DL.msToNextDay() + (6 - dow) * 86400000; };
  {
    const rnd = DL.mulberry32(0xd41a7e), shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    // launch set: a fixed share of every category so the first shop is balanced
    const QUOTA = { spoiler: 26, wheels: 24, bumper: 12, tint: 8, plate: 20, exhaust: 16, trail: 46, finish: 3 }, got = {};
    const later = [];
    shuffled.forEach(it => { if ((got[it.cat] || 0) < (QUOTA[it.cat] || 0)) { got[it.cat] = (got[it.cat] || 0) + 1; it.wk = 0; } else later.push(it); });
    later.forEach((it, i) => { it.wk = 1 + Math.floor(i / DL.WEEKLY_DROP); });
  }
  pool.forEach(it => { DL.PARTS[it.cat].push({ id: it.id, name: it.name, price: it.price, wk: it.wk, gen: 1 }); });
  // anything in the base catalogue is week 0
  for (const cat in DL.PARTS) DL.PARTS[cat].forEach(p => { if (p.wk == null) p.wk = 0; });
  DL.released = (cat, id, day) => { if (cat === 'cars') return true; const p = DL.PARTS[cat] && DL.PARTS[cat].find(x => x.id === id); return !!p && p.wk <= DL.weekOf(day || DL.dayKey()); };
})(window.DL);
