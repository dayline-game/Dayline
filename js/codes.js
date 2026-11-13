/* DAYLINE — redeem codes. Codes are stored as SHA-256 hashes (so they cannot be read from the source) and each one
   can be used once per account. Add new ones with:  node tools/code.js MYCODE '{"coins":500}'  and paste the line below. */
(function () {
  const DL = window.DL;
  DL.CODES = {
    'd8a2890e0c822950b6573a8ecd04bd34179125cf5b82cc3a74793be3074c8f9f': {"coins":500},
    '4eca7ea0a4d5eca923d22d1386e02744a617af4b0be883bf9a27802f76e24044': {"car":"random"},
    '2c446393c8e07a653ac7c9fccaa40be15501bcba4c6011127cc9f915ed6b8358': {"coins":1000},
    'f086cc60e268829915e6cae4a835914ccb004b54863157e3dd167ad0ca7203c2': {"item":"random","cat":"decal"},
    '268f41e830b78466d775bb236d896df144ac6ac7011933283efb2fbdc45a70b0': {"item":"random","cat":"finish"},
    '40aee76bfa1ef4319ed5a0267dbccbc58b8b66e187a7c4c815452c960c2af863': {"coins":2500},
    '2a8aa76300e803054be4ff34653c1c088c88f05bf18c4b7986ff4bf414d8ce7a': {"coins":300},
    'd894fa661b908fde993ddc13d67036d4e4cee474d0b78d40128e59462c76c41f': {"coins":750,"item":"random"},
    'a689f546195af6a6ceb1588c07f2a1c9b7248fc020b18940da0c063a5c71b2df': {"coins":2000,"car":"random"},
  };
  const sha = async s => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); };
  DL.codeNorm = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
  let lastTry = 0;
  // -> { ok, msg, gained:[...] }
  DL.redeemCode = async raw => {
    const Net = DL.Net, code = DL.codeNorm(raw);
    if (!code) return { ok: false, msg: 'Type a code first' };
    if (Date.now() - lastTry < 1500) return { ok: false, msg: 'One moment, then try again' };
    lastTry = Date.now();
    if (!(window.crypto && crypto.subtle)) return { ok: false, msg: 'Codes need a secure (https) connection' };
    const h = await sha('dayline:' + code), def = DL.CODES[h];
    if (!def) return { ok: false, msg: 'That code is not valid' };
    const s = Net.save; s.codes = s.codes || [];
    if (def.until && DL.dayKey() > def.until) return { ok: false, msg: 'That code has expired' };
    if (s.codes.includes(h)) return { ok: false, msg: 'You have already used that code' };
    const gained = [];
    const own = (cat, id) => (s.owned[cat] || []).includes(id);
    const grant = (cat, id, name) => { s.owned[cat] = s.owned[cat] || []; if (!s.owned[cat].includes(id)) s.owned[cat].push(id); gained.push(name); };
    if (def.coins) { s.coins += def.coins; gained.push(def.coins + ' coins'); }
    if (def.car) {
      let id = def.car;
      if (id === 'random') { const pool = DL.CAR_ORDER.filter(c => c !== 'pebble' && c !== 'ufo' && !own('cars', c)); id = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null; }
      if (id && DL.CARS[id] && !own('cars', id)) { grant('cars', id, DL.CARS[id].name); if (s.owned.cars.length >= 3) Net.award('collector'); }
      else if (def.car === 'random') { s.coins += 1500; gained.push('1500 coins (you own every car)'); }
    }
    if (def.item) {
      let it = null;
      if (def.item === 'random') {
        const pool = DL.allItems().filter(x => x.cat !== 'cars' && x.price > 0 && (!def.cat || x.cat === def.cat) && DL.released(x.cat, x.id) && !own(x.cat, x.id));
        it = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      } else it = { cat: def.cat, id: def.item, name: def.item };
      if (it) { const p = DL.PARTS[it.cat] && DL.PARTS[it.cat].find(x => x.id === it.id); grant(it.cat, it.id, (p && p.name) || it.name); }
      else { s.coins += 500; gained.push('500 coins (you own all of those)'); }
    }
    s.codes.push(h);
    Net.persist(); Net.pushProfile(); DL.emit('save');
    return { ok: true, msg: 'Code redeemed', gained };
  };
})();
