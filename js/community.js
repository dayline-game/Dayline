/* DAYLINE — community tracks page (auto thumbnails, side panel with fastest times) and the track editor */
'use strict';
(function (DL) {
  const UI = DL.UI, X = UI._x, Net = DL.Net, Game = DL.Game;
  const $ = id => document.getElementById(id);
  const { show, modal, closeModal, toast, esc, h } = X;
  const LIM = DL.CUSTOM.LIM;

  // ---------------- automatic thumbnails ----------------
  // A top-down picture of the road drawn from its waypoints, in the biome's colours. Nothing is stored: every client draws the same image.
  const thumbCache = {};
  DL.trackThumb = function (t, w, hh) {
    const key = t.id + '|' + w + 'x' + hh + '|' + t.biome + '|' + t.pts.length + '|' + (t.pts[1] || []).join(',');
    if (thumbCache[key]) return thumbCache[key];
    const dpr = 2, cv = document.createElement('canvas'); cv.width = w * dpr; cv.height = hh * dpr;
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    const B = DL.BIOMES[t.biome] || DL.BIOMES.country, hex = n => '#' + ('000000' + n.toString(16)).slice(-6);
    const g = c.createLinearGradient(0, 0, w, hh); g.addColorStop(0, hex(B.ground[1])); g.addColorStop(1, hex(B.ground[0]));
    c.fillStyle = g; c.fillRect(0, 0, w, hh);
    const rnd = DL.mulberry32(DL.hashStr('thumb' + t.id));
    for (let i = 0; i < 14; i++) { c.globalAlpha = 0.16 + rnd() * 0.14; c.fillStyle = hex(B.ground[2 + Math.floor(rnd() * 3)]); c.beginPath(); c.ellipse(rnd() * w, rnd() * hh, 22 + rnd() * 60, 14 + rnd() * 40, rnd() * 3, 0, 7); c.fill(); }
    if (B.water != null) { c.globalAlpha = 0.5; c.fillStyle = '#7fa6bd'; c.beginPath(); c.ellipse(w * (0.15 + rnd() * 0.7), hh * (0.2 + rnd() * 0.6), 40 + rnd() * 40, 20 + rnd() * 24, rnd() * 3, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    let sp; try { sp = DL.customCenterline(t.pts); } catch (e) { return thumbCache[key] = cv; }
    const xs = sp.xs, zs = sp.zs;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < xs.length; i++) { x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); z0 = Math.min(z0, zs[i]); z1 = Math.max(z1, zs[i]); }
    const pad = 0.13, s = Math.min(w * (1 - 2 * pad) / Math.max(40, x1 - x0), hh * (1 - 2 * pad) / Math.max(40, z1 - z0));
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, X0 = x => w / 2 + (x - mx) * s, Z0 = z => hh / 2 - (z - mz) * s;
    const path = () => { c.beginPath(); c.moveTo(X0(xs[0]), Z0(zs[0])); for (let i = 1; i < xs.length; i++) c.lineTo(X0(xs[i]), Z0(zs[i])); };
    c.lineJoin = 'round'; c.lineCap = 'round';
    path(); c.strokeStyle = 'rgba(17,21,29,.22)'; c.lineWidth = Math.max(8, 15 * s) + 4; c.translate(1.5, 2.5); c.stroke(); c.translate(-1.5, -2.5);
    path(); c.strokeStyle = '#f3ead7'; c.lineWidth = Math.max(8, 15 * s) + 2.6; c.stroke();
    path(); c.strokeStyle = '#2c3548'; c.lineWidth = Math.max(5.6, 13 * s); c.stroke();
    path(); c.strokeStyle = 'rgba(243,234,215,.75)'; c.lineWidth = 1.2; c.setLineDash([5, 6]); c.stroke(); c.setLineDash([]);
    const a = [X0(xs[0]), Z0(zs[0])], b = [X0(xs[xs.length - 1]), Z0(zs[zs.length - 1])];
    c.fillStyle = '#3f7d5a'; c.strokeStyle = '#f3ead7'; c.lineWidth = 2; c.beginPath(); c.arc(a[0], a[1], 6, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#f05a35'; c.beginPath(); c.arc(b[0], b[1], 6, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#f3ead7'; c.fillRect(b[0] - 2.5, b[1] - 2.5, 5, 5);
    return thumbCache[key] = cv;
  };
  const thumbImg = (t, w, hh, cls) => { const im = new Image(); im.className = cls || 'th'; im.alt = ''; im.src = DL.trackThumb(t, w, hh).toDataURL('image/png'); return im; };

  // ---------------- drafts (saved on this device) ----------------
  const drafts = () => DL.store.get('drafts', []);
  const saveDraftList = l => DL.store.set('drafts', l.slice(0, 12));
  function putDraft(d) { const l = drafts().filter(x => x.id !== d.id); l.unshift(d); saveDraftList(l); }
  function dropDraft(id) { saveDraftList(drafts().filter(x => x.id !== id)); }

  // ---------------- community page ----------------
  const cm = { tab: 'new', rows: [], sel: null, token: null, focus: null };
  $('bCommunity').onclick = () => show('community');
  $('cmCreate').onclick = () => UI.openEditor(null);
  $('cmTabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (!b) return; cm.tab = b.dataset.tab; UI.renderCommunity(); });
  const reg = r => { const old = DL.customTracks[r.id]; DL.customTracks[r.id] = { id: r.id, name: r.name, biome: r.biome, pts: r.pts, ext: r.ext || (old && old.ext) || null, needExt: !!r.hasExt && !r.ext && !(old && old.ext) }; };
  async function ensureExt(id) { const c = DL.customTracks[id]; if (!c || !c.needExt) return c; const t = await Net.ctGet(id); if (t) { c.ext = t.ext || null; c.needExt = false; } return c; }
  const fmtLen = m => (m / 1000).toFixed(2) + ' km';

  UI.renderCommunity = async function () {
    [...$('cmTabs').children].forEach(t => t.classList.toggle('on', t.dataset.tab === cm.tab));
    const grid = $('cmGrid'), tok = cm.token = {};
    const mine = cm.tab === 'mine', dr = mine ? drafts() : [];
    if (!Net.api) {
      grid.innerHTML = '';
      dr.forEach(d => grid.appendChild(draftCard(d)));
      if (!dr.length) grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Community tracks are offline</h3><p>${esc(Net.status)}. You can still build and test a track with the editor.</p></div>`;
      closeSide(); return;
    }
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><p>Loading tracks…</p></div>';
    let rows;
    try { rows = await Net.ctList(mine ? 'mine' : cm.tab); }
    catch (e) { if (cm.token === tok) grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Could not load tracks</h3><p>The server did not answer. Try again in a moment.</p></div>'; return; }
    if (cm.token !== tok) return;
    cm.rows = rows; rows.forEach(reg);
    grid.innerHTML = '';
    dr.forEach(d => grid.appendChild(draftCard(d)));
    if (!rows.length && !dr.length) grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>${mine ? 'You have not published a track yet' : 'No tracks yet'}</h3><p>Be the first. Build one in the editor, finish it once, then publish it.</p><button class="btn btn-coral" id="cmEmpty">+ Create a track</button></div>`;
    const eb = $('cmEmpty'); if (eb) eb.onclick = () => UI.openEditor(null);
    if (rows.length && (cm.tab === 'new' || cm.tab === 'trending')) {
      const w = await Net.cotw(); if (cm.token !== tok) return;
      if (w && w.track) {
        const b = h(`<button class="cm-card cm-cotw" style="grid-column:1/-1"><div class="bd"><div class="lbl">Creator of the week</div><b class="nm"></b><div class="mt"></div></div></button>`);
        const c = w.creator, t = w.track; reg(t);
        b.querySelector('.nm').textContent = (c && c.tag ? c.tag : 'A driver') + ' · ' + t.name;
        b.querySelector('.mt').innerHTML = `<span>♥ ${t.likes}</span><span>${t.n} driver${t.n === 1 ? '' : 's'}</span>` + (c ? `<span>${c.tracks} track${c.tracks === 1 ? '' : 's'}</span>` : '');
        b.onclick = () => selectTrack(t);
        grid.appendChild(b);
      }
    }
    rows.forEach(r => grid.appendChild(card(r)));
    const want = cm.focus || (cm.sel && cm.sel.id); cm.focus = null;
    const hit = want && (rows.find(r => r.id === want) || (cm.link && cm.link.id === want ? cm.link : null));
    if (hit) selectTrack(hit, true); else if (cm.sel && !hit) closeSide();
  };

  function card(r) {
    const el = h(`<button class="cm-card" data-id="${esc(r.id)}"><div class="bd"><b class="nm"></b><div class="mt"></div></div></button>`);
    el.insertBefore(thumbImg(r, 320, 200), el.firstChild);
    el.querySelector('.nm').textContent = r.name;
    const best = Net.save.best[r.id], by = r.by && r.by.uid === Net.uid ? 'You' : ((r.by && r.by.tag) || 'Driver');
    el.querySelector('.mt').innerHTML = `<span>${esc((DL.BIOMES[r.biome] || {}).name || r.biome)}</span><span>${fmtLen(r.length)}</span><span>${r.n} driver${r.n === 1 ? '' : 's'}</span>${r.likes ? `<span>♥ ${r.likes}</span>` : ''}<span>by ${esc(by)}</span>` + (best ? `<span class="pb">PB ${DL.fmtTime(best).slice(1, 9)}</span>` : '');
    el.onclick = () => selectTrack(r);
    if (cm.sel && cm.sel.id === r.id) el.classList.add('on');
    return el;
  }
  function draftCard(d) {
    const el = h(`<button class="cm-card"><div class="bd"><b class="nm"></b><div class="mt"><span class="tag coral">Draft</span><span>Tap to keep editing</span></div></div></button>`);
    try { el.insertBefore(thumbImg({ id: d.id, biome: d.biome, pts: d.pts }, 320, 200), el.firstChild); } catch (e) { }
    el.querySelector('.nm').textContent = d.name || 'Untitled track';
    el.onclick = () => UI.openEditor(d);
    return el;
  }

  function closeSide() { cm.sel = null; $('cmSide').hidden = true; document.querySelectorAll('.cm-card.on').forEach(c => c.classList.remove('on')); }
  // open a shared link (?t=<id>) straight on that track
  UI.openTrackLink = async function (id) {
    try {
      const t = await Net.ctGet(id);
      if (!t) { toast('That track link is no longer valid'); return; }
      cm.link = t; cm.focus = t.id; cm.tab = 'new'; reg(t); show('community');
    } catch (e) { toast('Could not open that track link'); }
  };
  let bgTimer = 0;
  async function selectTrack(r, keep) {
    cm.sel = r; reg(r);
    document.querySelectorAll('.cm-card').forEach(c => c.classList.toggle('on', c.dataset.id === r.id));
    const side = $('cmSide'); side.hidden = false;
    if (!keep) { side.style.animation = 'none'; void side.offsetWidth; side.style.animation = ''; }
    const mineT = r.by && r.by.uid === Net.uid, by = mineT ? 'you' : ((r.by && r.by.tag) || 'a driver');
    side.innerHTML = `<button class="icon-btn cm-x" id="cmClose" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="hd"><div class="lbl">Track by ${esc(by)}</div><h3></h3>
      <div class="chips"><span class="tag">${esc((DL.BIOMES[r.biome] || {}).name || r.biome)}</span><span class="tag">${fmtLen(r.length)}</span><span class="tag" id="cmN">${r.n} driver${r.n === 1 ? '' : 's'}</span></div></div>
      <div class="acts"><button class="btn btn-go" id="cmPlay">Play <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l12 8-12 8z"/></svg></button><button class="btn btn-line btn-sm" id="cmLink">Copy link</button>${mineT || !Net.api ? '' : '<button class="btn btn-line btn-sm" id="cmLike">♡ Like</button>'}${mineT ? '<button class="btn btn-line btn-sm" id="cmDel">Delete</button>' : ''}</div>
      <div class="lbl" style="padding:2px 16px 6px;display:flex;justify-content:space-between"><span>Fastest times</span><span id="cmSel"></span></div>
      <div class="tl" id="cmTimes"><div class="empty"><p>Loading times…</p></div></div>`;
    side.insertBefore(thumbImg(r, 480, 300, 'th-big'), side.firstChild);
    side.querySelector('h3').textContent = r.name;
    $('cmClose').onclick = closeSide;
    const sel = X.board.sel[r.id] || (X.board.sel[r.id] = {});
    const upd = () => { const n = Object.keys(sel).length; $('cmSel').textContent = n ? n + ' ghost' + (n > 1 ? 's' : '') + ' selected' : 'Pick up to 3 ghosts'; };
    upd();
    $('cmPlay').onclick = async () => { const c = await ensureExt(r.id); X.startRace(r.id, Object.values(sel), c, { leave: 'community' }); };
    $('cmLink').onclick = async () => { const u = DL.Share ? DL.Share.trackLink(r.id) : location.href; try { await navigator.clipboard.writeText(u); toast('<b>Link copied</b>. Anyone can race this track'); } catch (e) { window.prompt('Copy this link', u); } };
    const lk = $('cmLike');
    if (lk) {
      const paint = (liked, n) => { lk.textContent = (liked ? '♥ Liked' : '♡ Like') + (n ? ' · ' + n : ''); lk.classList.toggle('on', liked); };
      paint(false, r.likes || 0);
      Net.myLikes().then(set => { if (cm.sel && cm.sel.id === r.id) paint(set.has(r.id), r.likes || 0); });
      lk.onclick = async () => {
        if (Net.mode !== 'online') { toast('Sign in to like tracks'); return; }
        lk.disabled = true; const res = await Net.ctLike(r.id); lk.disabled = false;
        if (!res.ok) { toast(res.error); return; }
        r.likes = res.likes; paint(res.liked, res.likes);
      };
    }
    const db = $('cmDel');
    if (db) db.onclick = async () => {
      if (!db.dataset.sure) { db.dataset.sure = 1; db.textContent = 'Tap again to delete'; setTimeout(() => { db.dataset.sure = ''; db.textContent = 'Delete'; }, 3000); return; }
      db.disabled = true;
      if (await Net.ctDelete(r.id)) { toast('Track deleted'); closeSide(); UI.renderCommunity(); } else { toast('Could not delete that track'); db.disabled = false; }
    };
    // the 3D scene behind the panel shows this track
    clearTimeout(bgTimer); bgTimer = setTimeout(async () => { try { const c = await ensureExt(r.id); if (cm.sel && cm.sel.id === r.id) Game.loadDay(r.id, c); } catch (e) { console.warn(e); } }, 220);
    // times
    const box = $('cmTimes');
    try {
      const rows = await Net.boardDaily(r.id, 25);
      if (cm.sel !== r) return;
      const names = await Net.names(rows.map(x => x.uid));
      if (cm.sel !== r || !box.isConnected) return;
      $('cmN').textContent = rows.length + ' driver' + (rows.length === 1 ? '' : 's');
      if (!rows.length) { box.innerHTML = '<div class="empty"><h3>No times yet</h3><p>Be the first on the board.</p></div>'; return; }
      const lead = rows[0].time, t = h('<table><tbody></tbody></table>');
      rows.forEach((x, i) => {
        const me = x.uid === Net.uid;
        const tr = h(`<tr class="${me ? 'me' : ''}"><td class="rk">${i + 1}</td><td></td><td class="tm">${DL.fmtTime(x.time)}<div class="gap">${i ? DL.fmtDelta(x.time - lead) : 'Leader'}</div></td><td class="gcell"><button class="chk ${sel[x.uid] ? 'on' : ''}" data-k="g">${sel[x.uid] ? 'On' : 'Race'}</button> <button class="chk" data-k="w" title="Watch a replay">▶</button></td></tr>`);
        tr.children[1].appendChild(X.whoCell(x, names));
        const gb = tr.querySelector('[data-k=g]'), wb = tr.querySelector('[data-k=w]');
        gb.onclick = () => {
          if (sel[x.uid]) delete sel[x.uid];
          else { if (Object.keys(sel).length >= 3) { toast('Three ghosts at a time'); return; } sel[x.uid] = { uid: x.uid, label: me ? 'Your best' : (i === 0 ? 'WR · ' : '') + X.displayName(x, names), car: x.car, l: x.l, b: x.b, equip: x.equip, mine: me }; }
          gb.classList.toggle('on', !!sel[x.uid]); gb.textContent = sel[x.uid] ? 'On' : 'Race'; upd();
        };
        wb.onclick = async () => {
          wb.disabled = true;
          try {
            const enc = await Net.ghost(me ? 'me' : x.uid, r.id);
            if (!enc) { toast('No replay saved for that run'); return; }
            UI._replayBack = 'community';
            UI.openReplay(r.id, { uid: x.uid, label: me ? 'You' : X.displayName(x, names), car: x.car, l: x.l, b: x.b, equip: x.equip }, enc, x.time);
          } catch (e) { toast('Could not load that replay'); } finally { wb.disabled = false; }
        };
        t.tBodies[0].appendChild(tr);
      });
      box.innerHTML = ''; box.appendChild(t);
    } catch (e) { if (box.isConnected) box.innerHTML = '<div class="empty"><p>The board did not answer. Try again in a moment.</p></div>'; }
  }

  // ---------------- results ----------------
  UI.finishedCustom = function (r, t, res, valid) {
    UI.checkpoint(r.track.checkpoints.length, r.track.checkpoints.length, null);
    const c = r.track.custom, day = r.track.day, prev = res ? res.prevBest : Net.save.best[day];
    let cmp = ''; if (prev) { const d = t - prev; cmp = `<span class="num" style="color:${d <= 0 ? 'var(--good)' : 'var(--bad)'}">${DL.fmtDelta(d)}</span>`; }
    const coins = res ? res.coins.map(x => `<div class="res-row"><span>${esc(x[0])}</span><b class="num">+${x[1]}</b></div>`).join('') : '';
    const m = modal(`<div class="lbl">Community · ${esc(c.name)}</div>
      <h2>${!valid ? 'Lap time deleted' : res && res.isPB && prev ? 'New personal best' : 'Finished'}</h2>
      <div class="res-time" ${!valid ? 'style="text-decoration:line-through;opacity:.5"' : ''}>${DL.fmtTime(t)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${r.recoveries ? `<span class="tag">${r.recoveries} recover${r.recoveries > 1 ? 'ies' : 'y'}</span>` : '<span class="tag">Clean run</span>'}</div>
      ${!valid ? '<p class="hint" style="color:var(--bad);font-weight:600">Don’t cheat. That run failed the plausibility check, so the time was deleted.</p>' : ''}
      <div><div class="res-row"><span>Previous best</span><b class="num">${prev ? DL.fmtTime(prev) : '—'} ${cmp}</b></div>
      <div class="res-row"><span>Board position</span><b id="rPos" class="num">${Net.db && Net.mode === 'online' ? 'Checking…' : 'Saved on this device'}</b></div>${coins}</div>
      <div class="btn-row"><button class="btn btn-go" id="rRetry" style="font-size:24px">Retry</button><button class="btn btn-line" id="rMenu">Track page</button></div>`, { sticky: true });
    m.querySelector('#rRetry').onclick = () => Game.restart();
    m.querySelector('#rMenu').onclick = () => { cm.focus = day; X.leaveRace(); };
    if (res && res.total) { DL.Audio.coin(); X.renderCoins(); }
    if (valid && res && res.isPB) { UI.confetti(); DL.Audio.chime(); }
    if (Net.db && Net.mode === 'online' && valid) {
      setTimeout(async () => {
        try {
          const rows = await Net.boardDaily(day, 500), mine = Net.save.best[day];
          let pos = rows.findIndex(x => x.uid === Net.uid) + 1; if (!pos) pos = rows.filter(x => x.time < mine).length + 1;
          const el = $('rPos'); if (el) el.textContent = `#${pos} of ${Math.max(rows.length, pos)}`;
        } catch (e) { const el = $('rPos'); if (el) el.textContent = 'Saved'; }
      }, 700);
    }
  };

  // ---------------- track creator (v3) ----------------
  // One 3D workspace. Road: place, move and lift waypoints right in the world. Features: ramps and loose surfaces on the road.
  // Terrain and Props paint on the ground. Every edit redraws a light live preview at once; the full 3D world only rebuilds
  // when a drag ends, so dragging stays smooth.
  const HALFW = DL.ROAD_HALF || 6.5, STEPM = 4;
  const ed = {
    id: null, name: '', biome: 'country', pts: [], ext: null, tab: 'road', sel: -1, fsel: null, feat: 'ramp', tested: null, testKey: null,
    prob: null, spline: null, hist: [], redo: [], res: { ok: false, error: '' }, W: 0, H: 0, tool: 'raise', brush: 70, str: 6, level: 6,
    propType: 'pine', propSize: 1, cam: '', tr: null, dirty: false, live: null, showProf: true, ct: null
  };
  const cv = $('edCanvas'), cx = cv.getContext('2d'), pcv = $('edProf'), pcx = pcv.getContext('2d');
  const newId = () => 'c_' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => (b % 36).toString(36)).join('');
  const STARTER = [[-460, 120], [-250, 120], [-40, 250], [200, 220]];
  const defExt = () => ({ v: 2, hills: 0.4, rel: 1, dens: 1, seed: 0, pseed: 0, unique: true, terr: [], props: [], ramps: [], surf: [] });
  const cloneExt = e => JSON.parse(JSON.stringify(e));
  const customObj = () => ({ id: ed.id, name: (ed.name || 'Untitled track').trim() || 'Untitled track', biome: ed.biome, pts: ed.pts.map(p => [p[0], p[1]]), ext: cleanExt() });
  function cleanExt() { const c = DL.cleanExt(ed.ext, ed.pts.length); return c.ok ? c.ext : null; }
  const edKey = () => JSON.stringify([ed.biome, ed.pts, ed.ext]);
  const PROP_NAMES = { pine: 'Pine', snowpine: 'Snow pine', round: 'Oak', palm: 'Palm', cactus: 'Cactus', bush: 'Bush', shrub: 'Shrub', rock: 'Rock', boulder: 'Boulder', haybale: 'Hay bale', house: 'House', barn: 'Barn', windmill: 'Windmill', lighthouse: 'Lighthouse', mesa: 'Mesa', cabin: 'Cabin', watchtower: 'Watch tower', tent: 'Tent', logpile: 'Log pile', snowman: 'Snowman', igloo: 'Igloo', icespire: 'Ice spire', umbrella: 'Umbrella', lifeguard: 'Lifeguard', cratestack: 'Crates', scarecrow: 'Scarecrow', silo: 'Silo', watertower: 'Water tower', tractor: 'Tractor', billboard: 'Billboard', tirestack: 'Tyres', radiomast: 'Radio mast', pumpjack: 'Pump jack', rockarch: 'Rock arch' };
  const PROP_COL = { pine: '#2f6b46', snowpine: '#5e8f86', round: '#5c9a4a', palm: '#3e9a5e', cactus: '#4d8a4a', bush: '#6aa05a', shrub: '#a39a55', rock: '#8c8f98', boulder: '#6f737c', haybale: '#d9b45a', house: '#d9705a', barn: '#b9473a', windmill: '#e9e2cf', lighthouse: '#f3ead7', mesa: '#c98a5a' };
  const propCol = t => PROP_COL[t] || '#7a6bb0';
  const FEAT = { ramp: { name: 'Ramp', col: '#f2c14e' }, mud: { name: 'Mud', col: '#7a5230' }, snow: { name: 'Snow', col: '#e6f0f5' }, sand: { name: 'Sand', col: '#e1bf73' } };

  // ---------------- open / layout ----------------
  UI.openEditor = function (d) {
    if (!Game.edView || !Game.edCamera) { toast('Dayline updated. Reload the page to use the track creator'); return; }
    if (d) Object.assign(ed, { id: d.id, name: d.name || '', biome: d.biome || 'country', pts: d.pts.map(p => [p[0], p[1]]), ext: d.ext ? Object.assign({ v: 2, hills: 0.4, rel: 1, dens: 1, seed: 0, pseed: 0, unique: true, terr: [], props: [] }, cloneExt(d.ext)) : defExt() });
    else Object.assign(ed, { id: newId(), name: '', biome: 'country', pts: STARTER.map(p => p.slice()), ext: defExt() });
    Object.assign(ed, { sel: -1, fsel: null, tested: null, hist: [], redo: [], tab: 'road', tr: null, dirty: false, live: null });
    if (!ed.ext.terr) ed.ext.terr = []; if (!ed.ext.props) ed.ext.props = [];
    ed.fitNext = true; show('editor');
  };
  UI.renderEditor = function () {
    if (!ed.id) { Object.assign(ed, { id: newId(), pts: STARTER.map(p => p.slice()), ext: defExt() }); }
    $('edName').value = ed.name;
    requestAnimationFrame(() => { sizeCanvas(); renderTabs(); changed(true); if (ed.fitNext) { rebuild(true); fit(true); ed.fitNext = false; } else rebuild(); });
  };
  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, Hh = window.innerHeight;   // same size as the 3D renderer, so handles and rays line up
    ed.W = W; ed.H = Hh; ed.dpr = dpr; cv.style.width = W + 'px'; cv.style.height = Hh + 'px'; cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, Hh * dpr);
    const pr = pcv.getBoundingClientRect(); ed.PW = pr.width; ed.PH = pr.height; pcv.width = Math.max(1, pr.width * dpr); pcv.height = Math.max(1, pr.height * dpr);
  }
  window.addEventListener('resize', () => { if (!$('editor').hidden) { sizeCanvas(); draw(); drawProf(); } });
  const EV = () => Game.edView;
  const gY = (x, z) => ed.tr ? ed.tr.groundAt(x, z, {}, true).y : 0;

  // ---------------- camera: everything moves a target, the view eases toward it ----------------
  const CT = () => ed.ct || (ed.ct = Object.assign({}, EV()));
  function fit(snapNow) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    ed.pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
    if (!ed.pts.length) { x0 = z0 = -200; x1 = z1 = 200; }
    const c = CT(); c.tx = (x0 + x1) / 2; c.tz = (z0 + z1) / 2; c.ty = gY(c.tx, c.tz); c.dist = DL.clamp(Math.max(x1 - x0, z1 - z0) * 1.05 + 220, 300, 4000); c.ph = 0.95;
    if (c.th == null) c.th = 0.8;
    if (snapNow) Object.assign(EV(), c);
  }
  function focus(x, z, dist) { const c = CT(); c.tx = x; c.tz = z; c.ty = gY(x, z); if (dist) c.dist = dist; }
  function easeCam() {
    const v = EV(), c = CT(), k = 0.22;
    let dth = c.th - v.th; while (dth > Math.PI) dth -= 2 * Math.PI; while (dth < -Math.PI) dth += 2 * Math.PI;
    v.th += dth * k; v.ph += (c.ph - v.ph) * k; v.dist += (c.dist - v.dist) * k; v.tx += (c.tx - v.tx) * k; v.tz += (c.tz - v.tz) * k; v.ty += (c.ty - v.ty) * k;
  }
  const _pv = new THREE.Vector3();
  const proj = (x, y, z) => { const c = Game.edCamera(); const q = _pv.set(x, y, z).project(c); return [(q.x + 1) / 2 * ed.W, (1 - q.y) / 2 * ed.H, q.z > -1 && q.z < 1]; };
  // ray from the camera through a screen point, marched down onto the terrain
  function rayHit(px, pz) {
    const c = Game.edCamera(); c.updateMatrixWorld(); const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(px / ed.W * 2 - 1, -(pz / ed.H) * 2 + 1), c);
    const o = rc.ray.origin, d = rc.ray.direction, f = t => o.y + d.y * t - gY(o.x + d.x * t, o.z + d.z * t);
    let t = 0, pt = 0; if (f(0) < 0) return null;
    for (let i = 0; i < 500 && t < 9000; i++) {
      t += Math.max(6, t * 0.02); const fv = f(t);
      if (fv < 0) { let a = pt, b = t; for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if (f(m) < 0) b = m; else a = m; } const tt = (a + b) / 2; return [o.x + d.x * tt, o.y + d.y * tt, o.z + d.z * tt]; }
      pt = t;
    }
    return null;
  }

  // ---------------- undo / redo ----------------
  const state = () => JSON.stringify([ed.pts, ed.ext, ed.biome]);
  const snap = () => { ed.hist.push(state()); if (ed.hist.length > 80) ed.hist.shift(); ed.redo = []; };
  function restore(s) { const o = JSON.parse(s); ed.pts = o[0]; ed.ext = o[1]; ed.biome = o[2] || ed.biome; ed.sel = -1; ed.fsel = null; ed.tr = null; prevKey = ''; renderTabs(); changed(false); rebuild(); }
  function undo() { const p = ed.hist.pop(); if (!p) return; ed.redo.push(state()); restore(p); }
  function redo() { const p = ed.redo.pop(); if (!p) return; ed.hist.push(state()); restore(p); }

  // ---------------- elevation list kept in step with the waypoints ----------------
  function ensureElev() {
    if (ed.ext.elev && ed.ext.elev.length === ed.pts.length) return;
    const tr = previewTrack(true); const e = [];
    if (tr && tr.wpIdx && tr.wpIdx.length === ed.pts.length) { const y0 = tr.py[14]; tr.wpIdx.forEach(i => e.push(Math.round((tr.py[i] - y0) * 10) / 10)); }
    else ed.pts.forEach(() => e.push(0));
    ed.ext.elev = e;
  }
  function insertElev(at) { if (!ed.ext.elev) return; const e = ed.ext.elev, a = e[Math.max(0, at - 1)], b = e[Math.min(e.length - 1, at)]; e.splice(at, 0, Math.round((a + b) / 2 * 10) / 10); }

  // ---------------- full preview (same code the race uses) and the light live preview ----------------
  let prevKey = '', wT = 0;
  function previewTrack(force) {
    const k = edKey();
    if (!force && ed.tr && prevKey === k) return ed.tr;
    if (!ed.res.ok) return ed.tr;
    try { ed.tr = new DL.Track(ed.id, customObj()); prevKey = k; } catch (e) { console.warn(e); }
    return ed.tr;
  }
  // rebuild the real track + 3D world. Never while a drag is in progress.
  function rebuild(now) {
    clearTimeout(wT);
    wT = setTimeout(() => {
      if ($('editor').hidden) return;
      if (drag && drag.kind !== 'click' && drag.kind !== 'pan' && drag.kind !== 'orbit') return rebuild();
      if (!ed.res.ok) { ed.dirty = !!ed.spline; draw(); return; }
      previewTrack(true); ed.dirty = false; ed.live = null;
      try { Game.loadDay(ed.id, customObj()); } catch (e) { console.warn(e); }
      statsUpdate(); draw(); drawProf();
    }, now ? 0 : 140);
  }
  // live road: the new centreline with heights from the waypoint elevations (or the old road / ground), no terrain or scenery work
  function liveRoad() {
    if (ed.live) return ed.live;
    if (!ed.spline || ed.spline.xs.length < 2) return null;
    const sp = ed.spline, n = sp.xs.length, ys = new Float32Array(n), E = ed.ext, tr = ed.tr;
    const wi = DL.waypointIndex(ed.pts, sp.xs, sp.zs);
    if (E.elev && E.elev.length === ed.pts.length) {
      const y0 = tr ? tr.py[14] : gY(sp.xs[14] || sp.xs[0], sp.zs[14] || sp.zs[0]);
      const kn = [[0, E.elev[0]]].concat(wi.map((k, j) => [k, E.elev[j]]), [[n - 1, E.elev[E.elev.length - 1]]]);
      let a = 0;
      for (let i = 0; i < n; i++) {
        while (a < kn.length - 2 && kn[a + 1][0] <= i) a++;
        const k1 = kn[a], k2 = kn[a + 1], t = DL.clamp((i - k1[0]) / Math.max(1, k2[0] - k1[0]), 0, 1), e = t * t * (3 - 2 * t);
        ys[i] = y0 + k1[1] + (k2[1] - k1[1]) * e;
      }
    } else {
      for (let i = 0; i < n; i += 4) ys[i] = gY(sp.xs[i], sp.zs[i]);
      for (let i = 0; i < n; i++) if (i % 4) { const a = i - i % 4, b = Math.min(n - 1, a + 4); if (b % 4) ys[b] = gY(sp.xs[b], sp.zs[b]); ys[i] = ys[a] + (ys[b] - ys[a]) * (i - a) / Math.max(1, b - a); }
    }
    return (ed.live = { xs: sp.xs, zs: sp.zs, ys, n, wi });
  }
  // the road to draw: the real one when it is up to date, otherwise the live one
  function road() {
    const tr = ed.tr;
    if (!ed.dirty && tr && ed.res.ok && tr.wpIdx && tr.wpIdx.length === ed.pts.length) return { xs: tr.px, zs: tr.pz, ys: tr.py, n: tr.N, wi: tr.wpIdx, real: true };
    return liveRoad();
  }
  const wpY = i => { const R = road(); return R && R.wi && R.wi[i] != null ? R.ys[R.wi[i]] : gY(ed.pts[i][0], ed.pts[i][1]); };

  // ---------------- side panel ----------------
  const TAB_HELP = {
    road: 'Click the ground to add a point, click the road to insert one. Drag a point to move it; drag its ↕ arrow (or Shift+drag the point) to raise or lower the road there. Right-drag or Alt+drag orbits, drag empty ground to pan, scroll zooms to the cursor.',
    feat: 'Pick a feature and click the road to place it. Drag a marker along the road to move it. Select one to change it or delete it.',
    terr: 'Paint on the ground: raise or lower it, level it off, or erase edits. The road is never touched. The seed re-rolls the natural landforms.',
    props: 'Pick a prop and click or paint on the ground to place it. Scatter adds natural scenery on its own and its dice re-rolls it.',
    look: 'Pick the biome: it sets the colours, trees, water and weather of your track.'
  };
  const slider = (id, label, min, max, step, val, fmt) => `<label class="ed-sl"><span>${label}<b id="${id}V">${fmt ? fmt(val) : val}</b></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  const bind = (id, fn, fmt) => { const el = $(id); if (!el) return; el.oninput = () => { const v = +el.value; $(id + 'V').textContent = fmt ? fmt(v) : v; fn(v); }; };
  const ptName = i => i === 0 ? 'Start' : i === ed.pts.length - 1 ? 'Finish' : 'Point ' + i;
  function renderTabs() {
    [...$('edTabs').children].forEach(b => b.classList.toggle('on', b.dataset.t === ed.tab));
    $('edProfWrap').hidden = !(ed.tab === 'road' && ed.showProf); if (ed.tab === 'road') sizeCanvas();
    $('edHint').textContent = TAB_HELP[ed.tab];
    const P = $('edPane'), E = ed.ext; P.innerHTML = '';
    if (ed.tab === 'road') {
      const has = ed.sel >= 0, Rr = has ? road() : null, hv = !has ? 0 : E.elev && E.elev[ed.sel] != null ? E.elev[ed.sel] : Rr ? Math.round(wpY(ed.sel) - Rr.ys[Math.min(14, Rr.n - 1)]) : 0;
      P.innerHTML = `<div class="ed-sel">${has ? ptName(ed.sel) : 'No point selected'}</div>` +
        (has ? slider('edHeight', 'Road height here', DL.EXT_LIM.ELEV_MIN, DL.EXT_LIM.ELEV_MAX, 1, hv, v => v + ' m') +
          '<div class="btn-row"><button class="btn btn-line btn-sm" id="edIns">+ Insert after</button><button class="btn btn-line btn-sm" id="edDel">Delete</button></div>' : '') +
        '<span class="lbl">Shape</span><div class="ed-grid">' +
        '<button class="btn btn-line btn-sm" id="edRev" title="Swap start and finish">⇄ Reverse</button><button class="btn btn-line btn-sm" id="edMx" title="Mirror left-right">◧ Mirror</button>' +
        '<button class="btn btn-line btn-sm" id="edRot" title="Rotate 90°">⟳ Rotate</button><button class="btn btn-line btn-sm" id="edFlip" title="Mirror front-back">⬒ Flip</button>' +
        '<button class="btn btn-line btn-sm" id="edBig" title="Scale up 10%">⤢ Bigger</button><button class="btn btn-line btn-sm" id="edSmall" title="Scale down 10%">⤡ Smaller</button></div>' +
        '<span class="lbl">Hills</span>' + slider('edHills', 'Natural rolling', 0, 2, 0.1, E.hills, v => Math.round(v * 100) + '%') +
        '<div class="ed-grid"><button class="btn btn-line btn-sm" id="edSmooth">Smooth heights</button><button class="btn btn-line btn-sm" id="edFlat">Flatten</button>' +
        '<button class="btn btn-line btn-sm" id="edHillRand">🎲 Random hills</button><button class="btn btn-line btn-sm" id="edProfT">' + (ed.showProf ? 'Hide profile' : 'Show profile') + '</button></div>' +
        '<div class="btn-row"><button class="btn btn-line btn-sm" id="edClear">Clear track</button><button class="btn btn-line btn-sm" id="edFit">Fit view</button></div>';
      if (has) {
        bind('edHeight', v => { ensureElev(); E.elev[ed.sel] = v; ed.dirty = true; ed.live = null; changed(true); rebuild(); }, v => v + ' m');
        $('edHeight').onpointerdown = () => snap();
        $('edIns').onclick = insertAfter; $('edDel').onclick = delSel;
      }
      $('edRev').onclick = () => { if (ed.pts.length < 2) return; snap(); ed.pts.reverse(); if (E.elev) E.elev.reverse(); flipFeatures(); ed.sel = -1; changed(); rebuild(); };
      $('edMx').onclick = () => transform((x, z) => [-x, z]);
      $('edFlip').onclick = () => transform((x, z) => [x, -z]);
      $('edRot').onclick = () => transform((x, z) => [z, -x]);
      $('edBig').onclick = () => scaleBy(1.1); $('edSmall').onclick = () => scaleBy(1 / 1.1);
      bind('edHills', v => { E.hills = v; changed(true); rebuild(); }, v => Math.round(v * 100) + '%'); $('edHills').onpointerdown = () => snap();
      $('edFlat').onclick = () => { snap(); ensureElev(); E.elev = E.elev.map(() => 0); afterEdit(); };
      $('edSmooth').onclick = () => { snap(); ensureElev(); const a = E.elev.slice(); E.elev = a.map((v, i) => Math.round(((a[Math.max(0, i - 1)] + v * 2 + a[Math.min(a.length - 1, i + 1)]) / 4) * 10) / 10); afterEdit(); };
      $('edHillRand').onclick = () => { snap(); E.elev = randomElev(Math.random, 1); afterEdit(); };
      $('edProfT').onclick = () => { ed.showProf = !ed.showProf; renderTabs(); drawProf(); };
      $('edClear').onclick = () => { if (!ed.pts.length) return; snap(); ed.pts = []; E.elev = null; ed.sel = -1; changed(); rebuild(); };
      $('edFit').onclick = () => fit();
    } else if (ed.tab === 'feat') {
      const auto = !Array.isArray(E.ramps), f = ed.fsel, list = f ? (f.t === 'ramp' ? E.ramps : E.surf) : null, it = list && list[f.i];
      P.innerHTML = '<span class="lbl">Place on the road</span><div class="ed-biomes" id="edFeat">' + Object.keys(FEAT).map(k => `<button class="chk ${ed.feat === k ? 'on' : ''}" data-k="${k}"><i class="fdot" style="background:${FEAT[k].col}"></i>${FEAT[k].name}</button>`).join('') + '</div>' +
        (auto ? '<div class="hint">This track still uses automatic ramps. Placing one switches to your own ramps.</div>' : '') +
        (it ? `<div class="ed-sel">${f.t === 'ramp' ? 'Ramp' : FEAT[it[2]].name} · ${Math.round(it[0])} m</div>` +
          (f.t === 'ramp' ? slider('edFH', 'Ramp height', 1.5, 4, 0.1, it[1], v => v.toFixed(1) + ' m') : slider('edFL', 'Length', 24, 240, 4, it[1], v => v + ' m')) +
          '<div class="btn-row"><button class="btn btn-line btn-sm" id="edFDel">Delete</button><button class="btn btn-line btn-sm" id="edFGo">Show</button></div>' : '<div class="hint">Select a marker on the road to edit it.</div>') +
        `<div class="hint">${(E.ramps || []).length} ramp${(E.ramps || []).length === 1 ? '' : 's'} (max ${DL.EXT_LIM.RAMPS}) · ${(E.surf || []).length} surface${(E.surf || []).length === 1 ? '' : 's'} (max ${DL.EXT_LIM.SURFS})</div>` +
        '<div class="btn-row"><button class="btn btn-line btn-sm" id="edFClear">Clear features</button></div>';
      $('edFeat').onclick = e => { const b = e.target.closest('.chk'); if (!b) return; ed.feat = b.dataset.k; renderTabs(); };
      if (it) {
        if (f.t === 'ramp') { bind('edFH', v => { it[1] = v; featEdited(); }, v => v.toFixed(1) + ' m'); $('edFH').onpointerdown = () => snap(); }
        else { bind('edFL', v => { it[1] = v; featEdited(); }, v => v + ' m'); $('edFL').onpointerdown = () => snap(); }
        $('edFDel').onclick = () => { snap(); list.splice(f.i, 1); ed.fsel = null; featEdited(); renderTabs(); };
        $('edFGo').onclick = () => { const R = road(); if (!R) return; const i = DL.clamp(Math.round(it[0] / STEPM), 0, R.n - 1); focus(R.xs[i], R.zs[i], 260); };
      }
      $('edFClear').onclick = () => { snap(); E.ramps = []; E.surf = []; ed.fsel = null; featEdited(); renderTabs(); };
    } else if (ed.tab === 'terr') {
      const tool = (k, l) => `<button class="chk ${ed.tool === k ? 'on' : ''}" data-k="${k}">${l}</button>`;
      P.innerHTML = '<span class="lbl">Brush</span><div class="ed-biomes" id="edTools">' + tool('raise', '▲ Raise') + tool('lower', '▼ Lower') + tool('level', '▬ Level') + tool('erase', '✕ Erase') + '</div>' +
        slider('edBrush', 'Brush size', DL.EXT_LIM.R_MIN, 200, 5, ed.brush, v => v + ' m') + slider('edStr', 'Strength', 1, 20, 1, ed.str, v => v + ' m') + slider('edLevel', 'Level height (above start)', -30, 80, 1, ed.level, v => v + ' m') +
        '<span class="lbl">Natural terrain</span>' + slider('edRel', 'Relief', 0, 2.5, 0.1, E.rel, v => Math.round(v * 100) + '%') +
        `<div class="btn-row"><button class="btn btn-line btn-sm" id="edSeed">🎲 New landforms</button><button class="btn btn-line btn-sm" id="edClearT">Clear sculpt</button></div><div class="hint">Terrain seed ${E.seed} · ${E.terr.length} edit${E.terr.length === 1 ? '' : 's'}</div>`;
      $('edTools').onclick = e => { const b = e.target.closest('.chk'); if (!b) return; ed.tool = b.dataset.k; renderTabs(); };
      bind('edBrush', v => { ed.brush = v; draw(); }, v => v + ' m'); bind('edStr', v => { ed.str = v; }, v => v + ' m'); bind('edLevel', v => { ed.level = v; }, v => v + ' m');
      bind('edRel', v => { E.rel = v; changed(true); rebuild(); }, v => Math.round(v * 100) + '%'); $('edRel').onpointerdown = () => snap();
      $('edSeed').onclick = () => { snap(); E.seed = Math.floor(Math.random() * 99999) + 1; afterEdit(); };
      $('edClearT').onclick = () => { if (!E.terr.length) return; snap(); E.terr = []; afterEdit(); };
    } else if (ed.tab === 'props') {
      const types = DL.PROP_TYPES;
      P.innerHTML = '<span class="lbl">Prop</span><div class="ed-props" id="edPalette">' + types.map(t => `<button class="chk ${ed.propType === t && ed.tool !== 'perase' ? 'on' : ''}" data-k="${t}" style="--pc:${propCol(t)}"><i></i>${PROP_NAMES[t] || t}</button>`).join('') + '</div>' +
        `<div class="btn-row"><button class="chk ${ed.tool === 'perase' ? 'on' : ''}" id="edPErase">✕ Erase props</button><button class="btn btn-line btn-sm" id="edClearP">Clear all</button></div>` +
        slider('edPSize', 'Size', 0.5, 2.2, 0.1, ed.propSize, v => Math.round(v * 100) + '%') +
        '<span class="lbl">Automatic scenery</span>' + slider('edDens', 'Scatter density', 0, 2.5, 0.1, E.dens, v => v === 0 ? 'Off' : Math.round(v * 100) + '%') +
        `<label class="ed-ck"><input type="checkbox" id="edUniq" ${E.unique ? 'checked' : ''}> Landmarks and extras (cabins, signs, tents…)</label><div class="btn-row"><button class="btn btn-line btn-sm" id="edPSeed">🎲 Re-scatter</button></div><div class="hint">${E.props.length} placed by hand · scatter seed ${E.pseed}</div>`;
      $('edPalette').onclick = e => { const b = e.target.closest('.chk'); if (!b) return; ed.propType = b.dataset.k; if (ed.tool === 'perase') ed.tool = 'raise'; renderTabs(); };
      $('edPErase').onclick = () => { ed.tool = ed.tool === 'perase' ? 'raise' : 'perase'; renderTabs(); };
      $('edClearP').onclick = () => { if (!E.props.length) return; snap(); E.props = []; afterEdit(); };
      bind('edPSize', v => { ed.propSize = v; }, v => Math.round(v * 100) + '%');
      bind('edDens', v => { E.dens = v; changed(true); rebuild(); }, v => v === 0 ? 'Off' : Math.round(v * 100) + '%'); $('edDens').onpointerdown = () => snap();
      $('edUniq').onchange = e => { snap(); E.unique = e.target.checked; afterEdit(); };
      $('edPSeed').onclick = () => { snap(); E.pseed = Math.floor(Math.random() * 99999) + 1; afterEdit(); };
    } else {
      P.innerHTML = '<span class="lbl">Biome</span><div class="ed-biomes" id="edBiomes"></div><div class="hint">The biome sets ground colours, trees, water level, mountains and the kind of props that appear.</div>';
      DL.BIOME_KEYS.forEach(k => {
        const b = h(`<button class="chk ${ed.biome === k ? 'on' : ''}" data-k="${k}">${esc(DL.BIOMES[k].name)}</button>`);
        b.onclick = () => { snap(); ed.biome = k; afterEdit(); };
        $('edBiomes').appendChild(b);
      });
    }
  }
  function afterEdit() { ed.live = null; changed(false); renderTabs(); rebuild(); }
  function featEdited() { ed.live = null; changed(false); rebuild(); }
  $('edTabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; ed.tab = b.dataset.t;
    if (ed.tab === 'terr' && !['raise', 'lower', 'level', 'erase'].includes(ed.tool)) ed.tool = 'raise';
    if (ed.tab === 'props' && ed.tool !== 'perase') ed.tool = 'raise';
    renderTabs(); changed(true);
  });

  // ---------------- layout tools ----------------
  function insertAfter() {
    const i = ed.sel; if (i < 0 || ed.pts.length >= DL.CUSTOM.MAX_PTS) return;
    const a = ed.pts[i], b = ed.pts[i + 1];
    let np;
    if (b) np = [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)];
    else { const p = ed.pts[i - 1] || [a[0] - 100, a[1]], dx = a[0] - p[0], dz = a[1] - p[1], l = Math.hypot(dx, dz) || 1; np = inMap([a[0] + dx / l * 140, a[1] + dz / l * 140]); }
    snap(); ed.pts.splice(i + 1, 0, np); insertElev(i + 1); ed.sel = i + 1; changed(); rebuild(); renderTabs();
  }
  function delSel() { if (ed.sel < 0) return; snap(); ed.pts.splice(ed.sel, 1); if (ed.ext.elev) ed.ext.elev.splice(ed.sel, 1); ed.sel = -1; changed(); rebuild(); renderTabs(); }
  // reverse keeps features at the same place on the ground
  function flipFeatures() {
    const L = ed.spline ? (ed.spline.xs.length - 1) * STEPM : 0, E = ed.ext; if (!L) return;
    if (E.ramps) E.ramps = E.ramps.map(r => [Math.round(L - r[0]), r[1]]);
    if (E.surf) E.surf = E.surf.map(p => [Math.round(L - p[0] - p[1]), p[1], p[2]]);
  }
  function transform(fn, center) {
    if (!ed.pts.length) return;
    const c = center || [0, 0], t = (x, z) => { const q = fn(x - c[0], z - c[1]); return [q[0] + c[0], q[1] + c[1]]; };
    const np = ed.pts.map(p => t(p[0], p[1]).map(Math.round));
    if (np.some(p => Math.abs(p[0]) > LIM || Math.abs(p[1]) > LIM)) { toast('That would push the track off the map'); return; }
    snap(); ed.pts = np; const E = ed.ext;
    E.terr = E.terr.map(b => { const q = t(b[0], b[1]); return [Math.round(q[0]), Math.round(q[1]), b[2], b[3], b[4]]; });
    E.props = E.props.map(p => { const q = t(p[1], p[2]); return [p[0], Math.round(q[0]), Math.round(q[1]), p[3], p[4]]; });
    ed.tr = null; prevKey = ''; afterEdit(); fit();
  }
  function scaleBy(k) {
    let x = 0, z = 0; ed.pts.forEach(p => { x += p[0]; z += p[1]; }); const c = [x / ed.pts.length, z / ed.pts.length];
    const L0 = ed.spline ? (ed.spline.xs.length - 1) * STEPM : 0, E = ed.ext;
    transform((a, b) => [a * k, b * k], c);
    const L1 = ed.spline ? (ed.spline.xs.length - 1) * STEPM : 0;
    if (L0 && L1) { const r = L1 / L0; if (E.ramps) E.ramps.forEach(q => { q[0] = Math.round(q[0] * r); }); if (E.surf) E.surf.forEach(q => { q[0] = Math.round(q[0] * r); }); changed(true); rebuild(); }
  }

  // ---------------- change handling ----------------
  let saveT = 0;
  function changed(noSave) {
    ed.spline = null; ed.live = null;
    if (ed.pts.length >= 2) { try { ed.spline = DL.customCenterline(ed.pts); } catch (e) { } }
    ed.res = DL.validateCustomTrack(ed.pts); ed.prob = ed.res.ok ? null : (ed.res.at || null);
    if (!ed.tr || prevKey !== edKey()) ed.dirty = true;
    const tested = ed.tested && ed.tested.key === edKey(), st = $('edStatus');
    if (ed.res.ok) { st.className = 'ed-status ok'; st.textContent = tested ? 'Tested ✓ Ready to publish' : 'Valid track. Test drive it to unlock publishing'; }
    else { st.className = 'ed-status bad'; st.textContent = ed.res.error; }
    Game.edStale(!ed.res.ok);
    $('edTest').disabled = !ed.res.ok; $('edPublish').disabled = !(ed.res.ok && tested);
    $('edPublish').title = tested ? '' : 'Finish a test drive on this exact layout first';
    $('edUndo').disabled = !ed.hist.length; $('edRedo').disabled = !ed.redo.length;
    statsUpdate(); draw(); drawProf();
    if (!noSave) { clearTimeout(saveT); saveT = setTimeout(saveDraft, 400); }
  }
  function saveDraft() { if (ed.id && ed.pts.length) putDraft({ id: ed.id, name: ed.name, biome: ed.biome, pts: ed.pts, ext: ed.ext, at: Date.now() }); }
  function statsUpdate() {
    const R = ed.res.ok ? road() : null; let climb = 0, steep = 0;
    if (R) { for (let i = 1; i < R.n; i++) { const d = R.ys[i] - R.ys[i - 1]; if (d > 0) climb += d; } for (let i = 3; i < R.n; i++) steep = Math.max(steep, Math.abs(R.ys[i] - R.ys[i - 3]) / 12); }
    $('edLen').textContent = ed.spline ? Math.round((ed.spline.xs.length - 1) * STEPM) + ' m' : '0 m'; $('edPts').textContent = ed.pts.length;
    $('edClimb').textContent = R ? Math.round(climb) + ' m' : '—'; $('edSteep').textContent = R ? Math.round(steep * 100) + '%' : '—';
    $('edSteep').style.color = steep > 0.14 ? '#d4441f' : '';
  }

  // ---------------- overlay: road, features and handles drawn over the real 3D scene ----------------
  const slopeCol = sl => sl > 0.125 ? '#d4441f' : sl > 0.08 ? '#e0a030' : null;
  function strip(R, i0, i1, off0, off1, yAdd, fill, stroke, lw) {
    // a band along the road between lateral offsets off0..off1 (both sides drawn as one polygon per chunk)
    const step = Math.max(1, Math.round((i1 - i0) / 160)); let L = [], Rr = [];
    const flush = () => { if (L.length > 1) { cx.beginPath(); cx.moveTo(L[0][0], L[0][1]); for (let k = 1; k < L.length; k++) cx.lineTo(L[k][0], L[k][1]); for (let k = Rr.length - 1; k >= 0; k--) cx.lineTo(Rr[k][0], Rr[k][1]); cx.closePath(); if (fill) { cx.fillStyle = fill; cx.fill(); } if (stroke) { cx.strokeStyle = stroke; cx.lineWidth = lw || 2; cx.stroke(); } } L = []; Rr = []; };
    for (let i = i0; i <= i1; i += step) {
      const a = Math.max(0, i - 1), b = Math.min(R.n - 1, i + 1), tx = R.xs[b] - R.xs[a], tz = R.zs[b] - R.zs[a], tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
      const p = proj(R.xs[i] + nx * off0, R.ys[i] + yAdd, R.zs[i] + nz * off0), q = proj(R.xs[i] + nx * off1, R.ys[i] + yAdd, R.zs[i] + nz * off1);
      if (!p[2] || !q[2]) { flush(); continue; }
      L.push(p); Rr.push(q);
    }
    flush();
  }
  function edgeLine(R, off, col, lw, every) {
    const step = every || 2; cx.beginPath(); let on = false;
    for (let i = 0; i < R.n; i += step) {
      const a = Math.max(0, i - 1), b = Math.min(R.n - 1, i + 1), tx = R.xs[b] - R.xs[a], tz = R.zs[b] - R.zs[a], tl = Math.hypot(tx, tz) || 1;
      const p = proj(R.xs[i] - tz / tl * off, R.ys[i] + 0.6, R.zs[i] + tx / tl * off);
      if (!p[2]) { on = false; continue; } if (!on) { cx.moveTo(p[0], p[1]); on = true; } else cx.lineTo(p[0], p[1]);
    }
    cx.strokeStyle = col; cx.lineWidth = lw; cx.stroke();
  }
  function featMarker(R, s, label, col, on) {
    const i = DL.clamp(Math.round(s / STEPM), 0, R.n - 1), p = proj(R.xs[i], R.ys[i] + 9, R.zs[i]), g = proj(R.xs[i], R.ys[i] + 0.6, R.zs[i]);
    if (!p[2]) return null;
    cx.beginPath(); cx.moveTo(g[0], g[1]); cx.lineTo(p[0], p[1]); cx.strokeStyle = 'rgba(255,255,255,.75)'; cx.lineWidth = 2; cx.stroke();
    cx.font = '800 13px Barlow Condensed, sans-serif'; const w = cx.measureText(label).width + 16;
    cx.beginPath(); cx.roundRect ? cx.roundRect(p[0] - w / 2, p[1] - 11, w, 22, 7) : cx.rect(p[0] - w / 2, p[1] - 11, w, 22);
    cx.fillStyle = col; cx.fill(); cx.lineWidth = on ? 3 : 1.5; cx.strokeStyle = on ? '#f05a35' : '#1c2536'; cx.stroke();
    cx.fillStyle = col === FEAT.mud.col ? '#fff' : '#1c2536'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(label, p[0], p[1] + 0.5);
    return p;
  }
  function draw() {
    Game.edCamera().updateMatrixWorld(); const W = ed.W, H = ed.H, E = ed.ext; if (!W) return;
    cx.setTransform(ed.dpr, 0, 0, ed.dpr, 0, 0); cx.clearRect(0, 0, W, H);
    const R = road(); ed.fmark = [];
    if (R && ed.res.ok) {
      // the live road is drawn as a full ribbon so you see the new shape while the world catches up
      if (!R.real) strip(R, 0, R.n - 1, -HALFW, HALFW, 0.5, 'rgba(44,53,72,.78)', null);
      // surfaces
      (E.surf || []).forEach((p, k) => { const i0 = DL.clamp(Math.round(p[0] / STEPM), 0, R.n - 1), i1 = DL.clamp(Math.round((p[0] + p[1]) / STEPM), 0, R.n - 1); strip(R, i0, i1, -HALFW, HALFW, 0.7, FEAT[p[2]].col + 'cc', null); });
      // edges, slope warnings on the edge colour
      edgeLine(R, HALFW, 'rgba(243,234,215,.95)', 2); edgeLine(R, -HALFW, 'rgba(243,234,215,.95)', 2);
      for (let i = 3; i < R.n; i += 3) { const c = slopeCol(Math.abs(R.ys[i] - R.ys[i - 3]) / 12); if (!c) continue; const a = proj(R.xs[i - 3], R.ys[i - 3] + 0.8, R.zs[i - 3]), b = proj(R.xs[i], R.ys[i] + 0.8, R.zs[i]); if (!a[2] || !b[2]) continue; cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.strokeStyle = c; cx.lineWidth = 5; cx.stroke(); }
      // direction chevrons along the centre
      cx.fillStyle = 'rgba(240,90,53,.95)';
      for (let i = 20; i < R.n - 10; i += 30) { const a = proj(R.xs[i], R.ys[i] + 0.8, R.zs[i]), b = proj(R.xs[i + 2], R.ys[i + 2] + 0.8, R.zs[i + 2]); if (!a[2] || !b[2]) continue; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, s = 7; cx.beginPath(); cx.moveTo(a[0] + ux * s, a[1] + uy * s); cx.lineTo(a[0] - ux * s - uy * s, a[1] - uy * s + ux * s); cx.lineTo(a[0] - ux * s + uy * s, a[1] - uy * s - ux * s); cx.closePath(); cx.fill(); }
      // feature markers
      const showF = ed.tab === 'feat' || ed.tab === 'road';
      if (showF) {
        (E.ramps || []).forEach((r, k) => { const p = featMarker(R, r[0], '▲ RAMP ' + r[1].toFixed(1) + ' m', FEAT.ramp.col, ed.fsel && ed.fsel.t === 'ramp' && ed.fsel.i === k); if (p) ed.fmark.push({ t: 'ramp', i: k, p }); });
        (E.surf || []).forEach((q, k) => { const p = featMarker(R, q[0] + q[1] / 2, FEAT[q[2]].name.toUpperCase() + ' ' + q[1] + ' m', FEAT[q[2]].col, ed.fsel && ed.fsel.t === 'surf' && ed.fsel.i === k); if (p) ed.fmark.push({ t: 'surf', i: k, p }); });
      }
    }
    // manual props
    if (E.props && ed.tab === 'props') E.props.forEach(p => { const q = proj(p[1], gY(p[1], p[2]) + 1, p[2]); if (!q[2]) return; cx.beginPath(); cx.arc(q[0], q[1], 4, 0, 7); cx.fillStyle = propCol(p[0]); cx.fill(); cx.lineWidth = 1; cx.strokeStyle = 'rgba(17,21,29,.8)'; cx.stroke(); });
    // invalid layout: dashed centreline on the ground
    if (!ed.res.ok && ed.spline && ed.spline.xs.length > 1) {
      cx.beginPath(); let on = false; const sp = ed.spline;
      for (let i = 0; i < sp.xs.length; i += 2) { const q = proj(sp.xs[i], gY(sp.xs[i], sp.zs[i]) + 1, sp.zs[i]); if (!q[2]) { on = false; continue; } if (!on) { cx.moveTo(q[0], q[1]); on = true; } else cx.lineTo(q[0], q[1]); }
      cx.setLineDash([10, 8]); cx.strokeStyle = '#d4441f'; cx.lineWidth = 3; cx.stroke(); cx.setLineDash([]);
    }
    // waypoints: stem from the ground to a handle at road height; the selected one gets a height arrow
    if (ed.tab === 'road' || ed.tab === 'feat') ed.pts.forEach((p, i) => {
      const gy = gY(p[0], p[1]), ry = wpY(i), a = proj(p[0], Math.min(gy, ry), p[1]), b = proj(p[0], ry + 6, p[1]);
      if (!b[2]) return; const first = i === 0, last = i === ed.pts.length - 1 && i > 0, on = i === ed.sel, faint = ed.tab === 'feat';
      cx.globalAlpha = faint ? 0.45 : 1;
      cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.strokeStyle = 'rgba(255,255,255,.8)'; cx.lineWidth = 2; cx.stroke();
      cx.beginPath(); cx.arc(b[0], b[1], on ? 13 : 10, 0, 7); cx.fillStyle = first ? '#3f7d5a' : last ? '#f05a35' : '#f3ead7'; cx.fill();
      cx.lineWidth = on ? 3.5 : 2; cx.strokeStyle = on ? '#f05a35' : '#1c2536'; cx.stroke();
      cx.fillStyle = first || last ? '#fff' : '#1c2536'; cx.font = '700 11px Barlow, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(first ? 'S' : last ? 'F' : String(i), b[0], b[1] + 0.5);
      if (E.elev && E.elev[i] != null && (on || ed.showProf) && !faint) { cx.font = '800 13px Barlow Condensed, sans-serif'; cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.lineWidth = 3.5; const t = (E.elev[i] > 0 ? '+' : '') + Math.round(E.elev[i]) + ' m'; cx.strokeText(t, b[0] + 22, b[1]); cx.fillStyle = '#1c2536'; cx.fillText(t, b[0] + 22, b[1]); }
      if (on && ed.tab === 'road') {
        const ar = arrowPos(i);
        if (ar) { cx.beginPath(); cx.moveTo(b[0], b[1] - 13); cx.lineTo(ar[0], ar[1]); cx.strokeStyle = '#f05a35'; cx.lineWidth = 3; cx.stroke(); cx.beginPath(); cx.arc(ar[0], ar[1], 13, 0, 7); cx.fillStyle = '#f05a35'; cx.fill(); cx.fillStyle = '#fff'; cx.font = '900 16px Barlow, sans-serif'; cx.fillText('↕', ar[0], ar[1] + 1); }
      }
      cx.globalAlpha = 1;
    });
    if (ed.prob) { const q = proj(ed.prob[0], gY(ed.prob[0], ed.prob[1]) + 2, ed.prob[1]); if (q[2]) { cx.strokeStyle = '#d4441f'; cx.lineWidth = 3; cx.beginPath(); cx.arc(q[0], q[1], 24, 0, 7); cx.stroke(); cx.fillStyle = 'rgba(212,68,31,.2)'; cx.fill(); } }
    // brush ring
    if (ed.hit && !ed.camDrag && (ed.tab === 'terr' || ed.tab === 'props')) {
      const Rr = ed.tab === 'terr' ? ed.brush : ed.tool === 'perase' ? 22 : 5 * ed.propSize + 2; cx.beginPath(); let on = false;
      for (let k = 0; k <= 48; k++) { const a = k / 48 * 6.2832, x = ed.hit[0] + Math.cos(a) * Rr, z = ed.hit[2] + Math.sin(a) * Rr, q = proj(x, gY(x, z) + 0.7, z); if (!q[2]) continue; if (!on) { cx.moveTo(q[0], q[1]); on = true; } else cx.lineTo(q[0], q[1]); }
      cx.closePath(); cx.strokeStyle = ed.tab === 'props' ? (ed.tool === 'perase' ? '#d4441f' : propCol(ed.propType)) : '#f05a35'; cx.lineWidth = 2.5; cx.stroke();
      cx.fillStyle = 'rgba(240,90,53,.12)'; if (ed.tab === 'terr') cx.fill();
    }
    // feature ghost under the cursor
    if (ed.tab === 'feat' && ed.hover != null && R && !drag) { const i = ed.hover, p = proj(R.xs[i], R.ys[i] + 1, R.zs[i]); if (p[2]) { cx.beginPath(); cx.arc(p[0], p[1], 9, 0, 7); cx.fillStyle = FEAT[ed.feat].col; cx.fill(); cx.strokeStyle = '#1c2536'; cx.lineWidth = 2; cx.stroke(); } }
    if (!ed.res.ok) { cx.font = '800 20px Barlow Condensed, sans-serif'; cx.textAlign = 'center'; const t = ed.res.error || 'Fix the layout'; const w = cx.measureText(t).width + 28, mid = W > 760 ? W / 2 + 150 : W / 2, bx = mid - w / 2; cx.fillStyle = 'rgba(138,42,28,.92)'; cx.beginPath(); cx.roundRect ? cx.roundRect(bx, 16, w, 36, 10) : cx.rect(bx, 16, w, 36); cx.fill(); cx.fillStyle = '#fff'; cx.fillText(t, mid, 40); }
    if (!ed.pts.length) { cx.fillStyle = 'rgba(255,255,255,.9)'; cx.font = '800 26px Barlow Condensed, sans-serif'; cx.textAlign = 'center'; cx.fillText('Click the ground to place the start', W > 760 ? W / 2 + 150 : W / 2, H / 2); }
  }
  // the height arrow sits a fixed screen distance above the handle
  function arrowPos(i) { const p = ed.pts[i], b = proj(p[0], wpY(i) + 6, p[1]); return b[2] ? [b[0], b[1] - 46] : null; }
  Game.onEdFrame = () => {
    if ($('editor').hidden) return;
    if (ed.W !== window.innerWidth || ed.H !== window.innerHeight || ed.dpr !== Math.min(2, window.devicePixelRatio || 1)) sizeCanvas();
    easeCam(); keyPan(); draw();
  };

  // ---------------- height profile ----------------
  const prof = { x0: 46, x1: 14, y0: 14, y1: 20 };
  function profMap() {
    const R = ed.res.ok ? road() : null; if (!R) return null;
    let mn = 1e9, mx = -1e9; for (let i = 0; i < R.n; i++) { mn = Math.min(mn, R.ys[i]); mx = Math.max(mx, R.ys[i]); }
    const y0 = R.ys[14] != null ? R.ys[14] : R.ys[0]; const pad = Math.max(8, (mx - mn) * 0.12); mn -= pad; mx += pad;
    const L = (R.n - 1) * STEPM || 1, pw = ed.PW - prof.x0 - prof.x1, ph = ed.PH - prof.y0 - prof.y1;
    return { R, mn, mx, L, y0, X: s => prof.x0 + s / L * pw, Y: hh => prof.y0 + (1 - (hh - mn) / (mx - mn)) * ph, inv: py => mn + (1 - (py - prof.y0) / ph) * (mx - mn), s: x => DL.clamp((x - prof.x0) / pw, 0, 1) * L };
  }
  function drawProf() {
    if ($('edProfWrap').hidden) return; const c = pcx; c.setTransform(ed.dpr, 0, 0, ed.dpr, 0, 0); c.clearRect(0, 0, ed.PW, ed.PH);
    c.fillStyle = 'rgba(251,246,234,.94)'; c.fillRect(0, 0, ed.PW, ed.PH);
    const M = profMap(); if (!M) { c.fillStyle = '#1c2536'; c.font = '700 14px Barlow'; c.fillText('Fix the layout to see the height profile', 20, 40); return; }
    const { R } = M; c.lineWidth = 1; c.strokeStyle = 'rgba(17,21,29,.12)'; c.fillStyle = '#5a6272'; c.font = '700 11px Barlow'; c.textAlign = 'right';
    for (let k = 0; k <= 4; k++) { const hv = M.mn + (M.mx - M.mn) * k / 4, y = M.Y(hv); c.beginPath(); c.moveTo(prof.x0, y); c.lineTo(ed.PW - prof.x1, y); c.stroke(); c.fillText(Math.round(hv - M.y0) + ' m', prof.x0 - 6, y + 4); }
    // features as bands under the line
    (ed.ext.surf || []).forEach(p => { c.fillStyle = FEAT[p[2]].col + '88'; c.fillRect(M.X(p[0]), prof.y0, M.X(p[0] + p[1]) - M.X(p[0]), ed.PH - prof.y0 - prof.y1); });
    (ed.ext.ramps || []).forEach(r => { const x = M.X(r[0]); c.fillStyle = FEAT.ramp.col; c.beginPath(); c.moveTo(x - 6, ed.PH - prof.y1); c.lineTo(x + 6, ed.PH - prof.y1); c.lineTo(x + 6, ed.PH - prof.y1 - 10); c.closePath(); c.fill(); });
    c.beginPath(); c.moveTo(M.X(0), ed.PH - prof.y1); for (let i = 0; i < R.n; i += 2) c.lineTo(M.X(i * STEPM), M.Y(R.ys[i])); c.lineTo(M.X((R.n - 1) * STEPM), ed.PH - prof.y1); c.closePath(); c.fillStyle = 'rgba(47,125,90,.12)'; c.fill();
    for (let i = 1; i < R.n; i++) {
      const sl = Math.abs(R.ys[i] - R.ys[Math.max(0, i - 3)]) / (Math.min(3, i) * 4);
      c.strokeStyle = slopeCol(sl) || '#2f7d5a'; c.lineWidth = 3.5;
      c.beginPath(); c.moveTo(M.X((i - 1) * STEPM), M.Y(R.ys[i - 1])); c.lineTo(M.X(i * STEPM), M.Y(R.ys[i])); c.stroke();
    }
    c.textAlign = 'center'; c.fillStyle = '#5a6272'; c.fillText(Math.round(M.L) + ' m', ed.PW - 30, ed.PH - 6); c.fillText('0', prof.x0, ed.PH - 6);
    (R.wi || []).forEach((wi, i) => { const x = M.X(wi * STEPM), y = M.Y(R.ys[wi]), on = i === ed.sel; c.beginPath(); c.arc(x, y, on ? 9 : 7, 0, 7); c.fillStyle = i === 0 ? '#3f7d5a' : i === ed.pts.length - 1 ? '#f05a35' : '#f3ead7'; c.fill(); c.lineWidth = on ? 3 : 2; c.strokeStyle = on ? '#f05a35' : '#1c2536'; c.stroke(); });
  }

  // ---------------- pointer interaction ----------------
  let drag = null;
  const evPos = e => [e.clientX, e.clientY];
  const wpScreen = i => { const p = ed.pts[i]; return proj(p[0], wpY(i) + 6, p[1]); };
  const hitPoint = (px, pz) => { let best = -1, bd = 26; ed.pts.forEach((p, i) => { const q = wpScreen(i), d = Math.hypot(q[0] - px, q[1] - pz); if (q[2] && d < bd) { bd = d; best = i; } }); return best; };
  const hitArrow = (px, pz) => { if (ed.sel < 0) return false; const a = arrowPos(ed.sel); return a && Math.hypot(a[0] - px, a[1] - pz) < 18; };
  const hitFeat = (px, pz) => { let best = null, bd = 18; (ed.fmark || []).forEach(m => { const d = Math.hypot(m.p[0] - px, m.p[1] - pz); if (d < bd) { bd = d; best = m; } }); return best; };
  // nearest road sample to the cursor, on screen
  function hitRoad(px, pz, maxPx) {
    const R = road(); if (!R) return -1; let best = -1, bd = maxPx || 22;
    for (let i = 0; i < R.n; i += 1) { const q = proj(R.xs[i], R.ys[i] + 0.5, R.zs[i]); if (!q[2]) continue; const d = Math.hypot(q[0] - px, q[1] - pz); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  const inMap = w => [DL.clamp(Math.round(w[0]), -LIM, LIM), DL.clamp(Math.round(w[1]), -LIM, LIM)];
  const nearRoad = (x, z) => { if (!ed.spline) return 1e9; let b = 1e9; const s = ed.spline; for (let i = 0; i < s.xs.length; i += 2) b = Math.min(b, Math.hypot(s.xs[i] - x, s.zs[i] - z)); return b; };
  function paintTerrain(w) {
    const E = ed.ext, Rb = ed.brush;
    if (ed.tool === 'erase') { E.terr = E.terr.filter(t => Math.hypot(t[0] - w[0], t[1] - w[2]) > Rb * 0.7); return; }
    const mode = ed.tool === 'level' ? 1 : 0, hgt = mode ? ed.level : (ed.tool === 'raise' ? 1 : -1) * ed.str;
    for (const t of E.terr) if (t[4] === mode && Math.hypot(t[0] - w[0], t[1] - w[2]) < Rb * 0.3 && Math.abs(t[2] - Rb) < 12) { t[3] = mode ? hgt : DL.clamp(Math.round((t[3] + hgt * 0.5) * 10) / 10, -DL.EXT_LIM.H, DL.EXT_LIM.H); return; }
    if (E.terr.length >= DL.EXT_LIM.TERR) { toast('Terrain edit limit reached. Use a bigger brush or clear some.'); return; }
    E.terr.push([Math.round(w[0]), Math.round(w[2]), Rb, mode ? hgt : hgt * 0.8, mode]);
  }
  function paintProp(w) {
    const E = ed.ext;
    if (ed.tool === 'perase') { const n0 = E.props.length; E.props = E.props.filter(p => Math.hypot(p[1] - w[0], p[2] - w[2]) > 22); return E.props.length !== n0; }
    if (E.props.length >= DL.EXT_LIM.PROPS) { toast('Prop limit reached'); return false; }
    if (nearRoad(w[0], w[2]) < 11) return false;
    const gap = 9 * ed.propSize + 4; if (E.props.some(p => Math.hypot(p[1] - w[0], p[2] - w[2]) < gap)) return false;
    E.props.push([ed.propType, Math.round(w[0]), Math.round(w[2]), Math.round(Math.random() * 628) / 100, ed.propSize]); return true;
  }
  function applyPaint(px, pz) {
    const w = rayHit(px, pz); if (!w) return; ed.hit = w; let ch = false;
    if (ed.tab === 'terr') { const last = drag.last; if (!last || Math.hypot(last[0] - w[0], last[2] - w[2]) > ed.brush * 0.45) { paintTerrain(w); drag.last = w; ch = true; } }
    else { const last = drag.last, sp = 9 * ed.propSize + 6; if (!last || Math.hypot(last[0] - w[0], last[2] - w[2]) > sp) { drag.last = w; ch = paintProp(w); } }
    if (ch) { drag.dirty = true; changed(true); }
  }
  // place a feature at road sample i
  function addFeature(i) {
    const R = road(), E = ed.ext, L = (R.n - 1) * STEPM, s = DL.clamp(i * STEPM, 100, L - 120);
    if (ed.feat === 'ramp') {
      if (!Array.isArray(E.ramps)) E.ramps = [];
      if (E.ramps.length >= DL.EXT_LIM.RAMPS) { toast('That is the most ramps a track can have'); return; }
      if (E.ramps.some(r => Math.abs(r[0] - s) < 50)) { toast('Too close to another ramp'); return; }
      snap(); E.ramps.push([Math.round(s), 2.4]); E.ramps.sort((a, b) => a[0] - b[0]); ed.fsel = { t: 'ramp', i: E.ramps.findIndex(r => r[0] === Math.round(s)) };
    } else {
      if (!Array.isArray(E.surf)) E.surf = [];
      if (E.surf.length >= DL.EXT_LIM.SURFS) { toast('That is the most surface patches a track can have'); return; }
      snap(); const st = Math.round(DL.clamp(s - 40, 64, L - 120)); E.surf.push([st, 80, ed.feat]); E.surf.sort((a, b) => a[0] - b[0]); ed.fsel = { t: 'surf', i: E.surf.findIndex(p => p[0] === st && p[2] === ed.feat) };
    }
    featEdited(); renderTabs();
  }
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const [px, pz] = evPos(e), c = CT();
    const left = e.button === 0, camBtn = e.button === 2 || e.button === 1 || (left && (ed.cam || e.altKey || e.ctrlKey || e.metaKey || ed.space));
    if (camBtn) { drag = { kind: (e.shiftKey || ed.cam === 'pan' || e.button === 1 || ed.space) ? 'pan' : 'orbit', x: px, z: pz, th: c.th, ph: c.ph, tx: c.tx, tz: c.tz, moved: false }; ed.camDrag = true; return; }
    if (ed.tab === 'road') {
      if (hitArrow(px, pz)) { startElev(ed.sel, pz); return; }
      const i = hitPoint(px, pz);
      if (i >= 0) { ed.sel = i; renderTabs(); if (e.shiftKey) { startElev(i, pz); return; } snap(); drag = { kind: 'pt', i, moved: false }; draw(); return; }
    } else if (ed.tab === 'feat') {
      const m = hitFeat(px, pz);
      if (m) { ed.fsel = { t: m.t, i: m.i }; renderTabs(); snap(); drag = { kind: 'feat', t: m.t, i: m.i, moved: false }; draw(); return; }
      const ri = hitRoad(px, pz, 26); if (ri >= 0) { addFeature(ri); return; }
    } else if (ed.tab === 'terr' || ed.tab === 'props') { snap(); drag = { kind: 'paint', moved: true }; applyPaint(px, pz); return; }
    drag = { kind: 'click', x: px, z: pz, th: c.th, ph: c.ph, tx: c.tx, tz: c.tz, moved: false };
  });
  function startElev(i, pz) {
    ensureElev(); snap(); ed.sel = i;
    const p = ed.pts[i], dist = Game.edCamera().position.distanceTo(new THREE.Vector3(p[0], wpY(i), p[1]));
    drag = { kind: 'elev', i, y: pz, h0: ed.ext.elev[i], mpp: 2 * dist * Math.tan(27.5 * Math.PI / 180) / ed.H, moved: false };
    renderTabs();
  }
  function panTo(d, px, pz) { const c = CT(), v = EV(), k = v.dist * 0.0012, cs = Math.cos(c.th), sn = Math.sin(c.th), dx = px - d.x, dz = pz - d.z; c.tx = d.tx - dx * k * cs - dz * k * sn; c.tz = d.tz + dx * k * sn - dz * k * cs; c.ty = gY(c.tx, c.tz); v.tx = c.tx; v.tz = c.tz; }
  let hoverQ = 0;
  cv.addEventListener('pointermove', e => {
    const [px, pz] = evPos(e), c = CT(); ed.lastMove = Date.now();
    if (!drag) {
      if (ed.tab === 'terr' || ed.tab === 'props') { ed.ptr = [px, pz]; if (!ed.hitQ) ed.hitQ = requestAnimationFrame(() => { ed.hitQ = 0; ed.hit = ed.ptr ? rayHit(ed.ptr[0], ed.ptr[1]) : null; }); }
      else if (ed.tab === 'feat' && !hoverQ) hoverQ = requestAnimationFrame(() => { hoverQ = 0; ed.hover = hitFeat(px, pz) ? null : (r => r < 0 ? null : r)(hitRoad(px, pz, 26)); });
      else if (ed.tab === 'road') cv.style.cursor = hitArrow(px, pz) ? 'ns-resize' : hitPoint(px, pz) >= 0 ? (e.shiftKey ? 'ns-resize' : 'move') : (ed.cam ? '' : 'crosshair');
      return;
    }
    if (drag.kind === 'pt') { const w = rayHit(px, pz); if (w) { ed.pts[drag.i] = inMap([w[0], w[2]]); drag.moved = true; changed(true); } }
    else if (drag.kind === 'elev') { const E = ed.ext; E.elev[drag.i] = Math.round(DL.clamp(drag.h0 + (drag.y - pz) * drag.mpp, DL.EXT_LIM.ELEV_MIN, DL.EXT_LIM.ELEV_MAX)); drag.moved = true; ed.dirty = true; ed.live = null; changed(true); const hs = $('edHeight'); if (hs) { hs.value = E.elev[drag.i]; $('edHeightV').textContent = E.elev[drag.i] + ' m'; } }
    else if (drag.kind === 'feat') {
      const ri = hitRoad(px, pz, 400); if (ri < 0) return; const R = road(), L = (R.n - 1) * STEPM, E = ed.ext;
      if (drag.t === 'ramp') { E.ramps[drag.i][0] = Math.round(DL.clamp(ri * STEPM, 100, L - 120)); }
      else { const p = E.surf[drag.i]; p[0] = Math.round(DL.clamp(ri * STEPM - p[1] / 2, 64, L - 120 - p[1] / 2)); }
      drag.moved = true; ed.live = null; ed.dirty = true; changed(true);
    }
    else if (drag.kind === 'paint') applyPaint(px, pz);
    else if (drag.kind === 'orbit') { c.th = drag.th - (px - drag.x) * 0.006; c.ph = DL.clamp(drag.ph + (pz - drag.z) * 0.006, 0.25, 1.52); drag.moved = true; }
    else if (drag.kind === 'pan') { panTo(drag, px, pz); drag.moved = true; }
    else if (drag.kind === 'click') { if (Math.hypot(px - drag.x, pz - drag.z) > 5) { drag.moved = true; ed.camDrag = true; panTo(drag, px, pz); } }
  });
  const onUp = e => {
    if (!drag) return; const d = drag; drag = null; ed.camDrag = false; const [px, pz] = evPos(e);
    if (d.kind === 'pt' || d.kind === 'elev' || d.kind === 'feat') { if (!d.moved) ed.hist.pop(); else { changed(); rebuild(true); } if (d.kind === 'feat') ed.ext.ramps && ed.ext.ramps.sort((a, b) => a[0] - b[0]); renderTabs(); return; }
    if (d.kind === 'paint') { if (!d.dirty) ed.hist.pop(); changed(false); renderTabs(); rebuild(true); return; }
    if (d.kind === 'click' && !d.moved) {
      if (ed.tab !== 'road') { if (ed.sel !== -1 || ed.fsel) { ed.sel = -1; ed.fsel = null; renderTabs(); draw(); } return; }
      if (ed.pts.length >= DL.CUSTOM.MAX_PTS) { toast('That is the maximum number of points'); return; }
      const hit = rayHit(px, pz); if (!hit) return; const w = [hit[0], hit[2]], np = inMap(w);
      let at = ed.pts.length;
      const ri = ed.spline && ed.pts.length >= 2 ? hitRoad(px, pz, 16) : -1;
      if (ri >= 0) {
        // insert between the waypoints the road passes through here
        const wi = (road() || {}).wi || []; at = wi.findIndex(k => k > ri); if (at <= 0) at = ed.pts.length;
      } else if (ed.sel >= 0 && ed.sel === 0 && ed.pts.length > 1) at = 0;       // extend from the start when it is selected
      snap(); ed.pts.splice(at, 0, np); insertElev(at); ed.sel = at; changed(); rebuild(true); renderTabs();
    }
  };
  cv.addEventListener('pointerup', onUp);
  // a drag must never get stuck (lost pointer, released over the panel or outside the window)
  const abort = () => { if (!drag) return; const d = drag; drag = null; ed.camDrag = false; if (d.kind === 'pt' || d.kind === 'elev' || d.kind === 'paint' || d.kind === 'feat') { changed(false); rebuild(true); } };
  cv.addEventListener('pointercancel', abort); cv.addEventListener('lostpointercapture', abort); window.addEventListener('blur', abort);
  window.addEventListener('pointerup', e => { if (drag && e.target !== cv) abort(); });
  cv.addEventListener('pointerleave', () => { ed.hit = null; ed.ptr = null; ed.hover = null; });
  cv.addEventListener('dblclick', e => { if (ed.tab !== 'road') return; const [px, pz] = evPos(e), i = hitPoint(px, pz); if (i >= 0) { ed.sel = i; delSel(); } });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  // zoom toward the cursor
  cv.addEventListener('wheel', e => {
    e.preventDefault(); const c = CT(), f = Math.exp(DL.clamp(e.deltaY, -120, 120) * 0.0014), nd = DL.clamp(c.dist * f, 40, 4200), k = nd / c.dist;
    const hit = rayHit(e.clientX, e.clientY);
    if (hit) { c.tx = hit[0] + (c.tx - hit[0]) * k; c.tz = hit[2] + (c.tz - hit[2]) * k; c.ty = gY(c.tx, c.tz); }
    c.dist = nd;
  }, { passive: false });
  // profile: pick and drag waypoint heights
  let pdrag = null;
  pcv.addEventListener('pointerdown', e => {
    const M = profMap(); if (!M) return; pcv.setPointerCapture(e.pointerId); const r = pcv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    let best = -1, bd = 22; (M.R.wi || []).forEach((wi, i) => { const d = Math.hypot(M.X(wi * STEPM) - px, M.Y(M.R.ys[wi]) - py); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { ed.sel = best; ensureElev(); snap(); pdrag = { i: best, moved: false, y0: M.y0, M }; renderTabs(); draw(); }
  });
  pcv.addEventListener('pointermove', e => {
    if (!pdrag) return; const M = pdrag.M, r = pcv.getBoundingClientRect(), py = e.clientY - r.top;
    ed.ext.elev[pdrag.i] = Math.round(DL.clamp(M.inv(py) - pdrag.y0, DL.EXT_LIM.ELEV_MIN, DL.EXT_LIM.ELEV_MAX)); pdrag.moved = true; ed.dirty = true; ed.live = null; changed(true);
    const hs = $('edHeight'); if (hs) { hs.value = ed.ext.elev[pdrag.i]; $('edHeightV').textContent = ed.ext.elev[pdrag.i] + ' m'; }
  });
  pcv.addEventListener('pointerup', () => { if (!pdrag) return; if (!pdrag.moved) ed.hist.pop(); pdrag = null; changed(false); rebuild(true); });

  // ---------------- keyboard ----------------
  const keys = {};
  function keyPan() {
    const c = CT(), k = c.dist * 0.012; let dx = 0, dz = 0;
    if (keys.KeyW || keys.ArrowUp) dz -= 1; if (keys.KeyS || keys.ArrowDown) dz += 1; if (keys.KeyA || keys.ArrowLeft) dx -= 1; if (keys.KeyD || keys.ArrowRight) dx += 1;
    if (!dx && !dz) return; const cs = Math.cos(c.th), sn = Math.sin(c.th);
    c.tx += (dx * cs + dz * sn) * k; c.tz += (-dx * sn + dz * cs) * k; c.ty = gY(c.tx, c.tz);
  }
  window.addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') ed.space = false; });
  window.addEventListener('keydown', e => {
    if ($('editor').hidden || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || $('modalRoot').firstChild) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.code === 'KeyY') { e.preventDefault(); redo(); return; }
    if (mod) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); keys[e.code] = true; return; }
    if (e.code === 'Space') { ed.space = true; e.preventDefault(); return; }
    if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      if (ed.tab === 'feat' && ed.fsel) { const L = ed.fsel.t === 'ramp' ? ed.ext.ramps : ed.ext.surf; snap(); L.splice(ed.fsel.i, 1); ed.fsel = null; featEdited(); renderTabs(); }
      else if (ed.tab === 'road') delSel();
    }
    else if (e.code === 'KeyQ' || e.code === 'KeyE') CT().th += e.code === 'KeyQ' ? 0.2 : -0.2;
    else if (e.code === 'KeyR' || e.code === 'KeyF') { if (e.code === 'KeyF' && ed.sel >= 0) { const p = ed.pts[ed.sel]; focus(p[0], p[1], 300); } else fit(); }
    else if (e.code === 'KeyI' && ed.tab === 'road') insertAfter();
    else if (e.code === 'Escape') { ed.sel = -1; ed.fsel = null; renderTabs(); draw(); }
    else if (/^Digit[1-5]$/.test(e.code)) { ed.tab = ['road', 'feat', 'terr', 'props', 'look'][+e.code.slice(5) - 1]; renderTabs(); changed(true); }
  });
  const setCam = m => { ed.cam = ed.cam === m ? '' : m; $('edHand').classList.toggle('on', ed.cam === 'pan'); $('edOrbit').classList.toggle('on', ed.cam === 'orbit'); cv.style.cursor = ed.cam === 'pan' ? 'grab' : ed.cam === 'orbit' ? 'move' : ''; };
  $('edHand').onclick = () => setCam('pan'); $('edOrbit').onclick = () => setCam('orbit');
  $('edZoomIn').onclick = () => { const c = CT(); c.dist = DL.clamp(c.dist * 0.75, 40, 4200); }; $('edZoomOut').onclick = () => { const c = CT(); c.dist = DL.clamp(c.dist / 0.75, 40, 4200); };
  $('edTop').onclick = () => { const c = CT(); c.ph = c.ph > 1.3 ? 0.95 : 1.52; };
  $('edFitB').onclick = () => fit();

  document.addEventListener('scroll', e => { if ($('editor').hidden) return; const t = e.target; if (t === document || t === $('editor') || t === document.querySelector('.ed-wrap')) { window.scrollTo(0, 0); $('editor').scrollLeft = 0; document.querySelector('.ed-wrap').scrollLeft = 0; } }, true);
  $('edName').addEventListener('input', e => { ed.name = e.target.value; clearTimeout(saveT); saveT = setTimeout(saveDraft, 400); });
  $('edUndo').onclick = undo; $('edRedo').onclick = redo;
  $('edExit').onclick = () => { saveDraft(); Game.edStale(false); show('community'); };

  // ----- random track generator -----
  function randomElev(rnd, level) {
    const n = ed.pts.length, e = [0]; let v = 0, trend = 0;
    for (let i = 1; i < n; i++) {
      const d = Math.hypot(ed.pts[i][0] - ed.pts[i - 1][0], ed.pts[i][1] - ed.pts[i - 1][1]);
      trend = trend * 0.6 + (rnd() - 0.5) * 2 * 0.07 * level; v = DL.clamp(v + trend * d * 1.2, -20, 100); e.push(Math.round(v * 10) / 10);
    }
    return e;
  }
  function genLayout(rnd, len, twist) {
    const TW = [0.55, 0.95, 1.45][twist];
    for (let tries = 0; tries < 400; tries++) {
      let x = (rnd() - 0.5) * LIM, z = (rnd() - 0.5) * LIM, hd = rnd() * 6.283; const pts = [[Math.round(x), Math.round(z)]]; let acc = 0, bad = false;
      while (acc < len && pts.length < 38) {
        const step = 85 + rnd() * 70; hd += (rnd() - 0.5) * 2 * TW * (0.35 + rnd() * 0.65);
        const lim = LIM * 0.88; if (Math.abs(x) > lim * 0.7 || Math.abs(z) > lim * 0.7) { const toC = Math.atan2(-x, -z); let dd = toC - hd; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI; hd += DL.clamp(dd, -0.5, 0.5); }
        x += Math.sin(hd) * step; z += Math.cos(hd) * step; if (Math.abs(x) > lim || Math.abs(z) > lim) { bad = true; break; }
        pts.push([Math.round(x), Math.round(z)]); acc += step;
      }
      if (bad || pts.length < 4) continue;
      const v = DL.validateCustomTrack(pts); if (v.ok) return pts;
    }
    return null;
  }
  function randomTrack(o) {
    const rnd = Math.random, pts = genLayout(rnd, o.len, o.twist);
    if (!pts) { toast('Could not make a track like that. Try again'); return; }
    snap();
    ed.pts = pts; ed.sel = -1; if (o.biome) ed.biome = o.biome; else ed.biome = DL.BIOME_KEYS[Math.floor(rnd() * DL.BIOME_KEYS.length)];
    const E = ed.ext = defExt(); E.seed = Math.floor(rnd() * 99999) + 1; E.pseed = Math.floor(rnd() * 99999) + 1; E.rel = [0.5, 1, 1.7][o.hills]; E.dens = o.dens;
    E.elev = o.hills === 0 ? pts.map(() => 0) : randomElev(rnd, o.hills === 1 ? 1 : 2.2); E.hills = [0.2, 0.5, 0.9][o.hills];
    // a few mounds and hollows away from the road
    const sp = DL.customCenterline(pts), n = 5 + Math.floor(rnd() * 7);
    for (let k = 0; k < n * 4 && E.terr.length < n; k++) {
      const p = pts[Math.floor(rnd() * pts.length)], a = rnd() * 6.283, d = 110 + rnd() * 260, x = Math.round(p[0] + Math.sin(a) * d), z = Math.round(p[1] + Math.cos(a) * d);
      let md = 1e9; for (let i = 0; i < sp.xs.length; i += 3) md = Math.min(md, Math.hypot(sp.xs[i] - x, sp.zs[i] - z)); if (md < 95 || Math.abs(x) > LIM + 200 || Math.abs(z) > LIM + 200) continue;
      E.terr.push([x, z, Math.round(80 + rnd() * 120), Math.round((rnd() < 0.7 ? 1 : -1) * (8 + rnd() * 30 * (0.5 + o.hills * 0.5))), 0]);
    }
    if (!ed.name) { const W1 = ['Misty', 'Golden', 'Crimson', 'Silent', 'Windy', 'Ember', 'Frosty', 'Hidden', 'Lone', 'Sunset', 'Thunder', 'Velvet'], W2 = ['Ridge', 'Run', 'Pass', 'Loop', 'Drift', 'Canyon', 'Sprint', 'Valley', 'Rise', 'Descent', 'Hairpins', 'Circuit']; ed.name = W1[Math.floor(rnd() * W1.length)] + ' ' + W2[Math.floor(rnd() * W2.length)]; $('edName').value = ed.name; }
    // a couple of ramps on the straightest stretches and sometimes a loose-surface patch that suits the biome
    E.ramps = []; E.surf = [];
    const L = (sp.xs.length - 1) * 4, straight = s => { const i = Math.round(s / 4); if (i < 6 || i > sp.xs.length - 7) return 9; const h1 = Math.atan2(sp.xs[i] - sp.xs[i - 6], sp.zs[i] - sp.zs[i - 6]), h2 = Math.atan2(sp.xs[i + 6] - sp.xs[i], sp.zs[i + 6] - sp.zs[i]); let d = h2 - h1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
    const nr = L > 2000 ? 2 : L > 900 ? 1 : 0;
    for (let k = 0; k < nr; k++) { let bs = 9, bp = 0; for (let tries = 0; tries < 24; tries++) { const s = 140 + rnd() * (L - 300); if (E.ramps.some(r => Math.abs(r[0] - s) < 300)) continue; const v = straight(s); if (v < bs) { bs = v; bp = s; } } if (bp && bs < 0.12) E.ramps.push([Math.round(bp), 2.4]); }
    if (rnd() < 0.6 && L > 900) { const kind = ed.biome === 'snow' ? 'snow' : ed.biome === 'desert' ? 'sand' : 'mud'; E.surf.push([Math.round(L * (0.4 + rnd() * 0.25)), 60 + Math.round(rnd() * 10) * 4, kind]); }
    E.ramps.sort((a, b) => a[0] - b[0]);
    ed.tested = null; ed.tr = null; prevKey = ''; renderTabs(); changed(false); rebuild(true); setTimeout(() => fit(), 60);
  }
  const TPL = [
    { n: 'Sprint', o: { len: 800, twist: 0, hills: 0, dens: 0.4, biome: 'country' } },
    { n: 'Mountain pass', o: { len: 2400, twist: 1, hills: 2, dens: 1, biome: 'mountain' } },
    { n: 'Hairpin hell', o: { len: 1500, twist: 2, hills: 1, dens: 1, biome: 'forest' } },
    { n: 'Coast cruise', o: { len: 2400, twist: 0, hills: 1, dens: 1, biome: 'coast' } },
    { n: 'Desert blast', o: { len: 3200, twist: 0, hills: 0, dens: 0.4, biome: 'desert' } },
    { n: 'Snow epic', o: { len: 3200, twist: 1, hills: 2, dens: 1.8, biome: 'snow' } }
  ];
  $('edRandom').onclick = () => {
    const o = { len: 1500, twist: 1, hills: 1, dens: 1, biome: '' };
    const m = modal(`<div class="lbl">Track creator</div><h2>Random track</h2>
      <p class="hint">Builds the road, hills, terrain and scenery for you. You can change anything afterwards.</p>
      <div class="field"><span class="lbl">Starter templates</span><div class="ed-biomes" id="rgTpl">${TPL.map((t, i) => `<button class="chk" data-i="${i}">${esc(t.n)}</button>`).join('')}</div></div>
      <div class="field"><span class="lbl">Length</span><div class="ed-biomes" id="rgLen"><button class="chk" data-v="800">Short</button><button class="chk on" data-v="1500">Medium</button><button class="chk" data-v="2400">Long</button><button class="chk" data-v="3200">Epic</button></div></div>
      <div class="field"><span class="lbl">Corners</span><div class="ed-biomes" id="rgTw"><button class="chk" data-v="0">Flowing</button><button class="chk on" data-v="1">Mixed</button><button class="chk" data-v="2">Technical</button></div></div>
      <div class="field"><span class="lbl">Hills</span><div class="ed-biomes" id="rgHi"><button class="chk" data-v="0">Flat</button><button class="chk on" data-v="1">Rolling</button><button class="chk" data-v="2">Mountainous</button></div></div>
      <div class="field"><span class="lbl">Scenery</span><div class="ed-biomes" id="rgBi"><button class="chk on" data-v="">Surprise me</button>${DL.BIOME_KEYS.map(k => `<button class="chk" data-v="${k}">${esc(DL.BIOMES[k].name)}</button>`).join('')}</div></div>
      <div class="field"><span class="lbl">Props</span><div class="ed-biomes" id="rgDe"><button class="chk" data-v="0.4">Few</button><button class="chk on" data-v="1">Normal</button><button class="chk" data-v="1.8">Lots</button></div></div>
      <div class="btn-row"><button class="btn btn-go" id="rgGo" style="font-size:22px">Generate</button><button class="btn btn-line" id="rgNo">Cancel</button></div>`, { sticky: true });
    const pick = (id, key, num) => m.querySelector('#' + id).onclick = e => { const b = e.target.closest('.chk'); if (!b) return; [...b.parentNode.children].forEach(c => c.classList.toggle('on', c === b)); o[key] = num ? +b.dataset.v : b.dataset.v; };
    pick('rgLen', 'len', 1); pick('rgTw', 'twist', 1); pick('rgHi', 'hills', 1); pick('rgBi', 'biome', 0); pick('rgDe', 'dens', 1);
    m.querySelector('#rgTpl').onclick = e => { const b = e.target.closest('.chk'); if (!b) return; Object.assign(o, TPL[+b.dataset.i].o); closeModal(); setTimeout(() => randomTrack(o), 30); };
    m.querySelector('#rgNo').onclick = closeModal;
    m.querySelector('#rgGo').onclick = () => { closeModal(); setTimeout(() => randomTrack(o), 30); };
  };

  $('edTest').onclick = () => {
    if (!ed.res.ok) return;
    const custom = customObj(); DL.customTracks[ed.id] = custom; ed.testKey = edKey();
    X.startRace(ed.id, [], custom, { test: true, leave: 'editor' });
  };
  $('edPublish').onclick = () => doPublish($('edPublish'));

  async function doPublish(btn) {
    const t = ed.tested; if (!t || t.key !== edKey()) { toast('Test drive this exact layout first'); return; }
    if (Net.mode !== 'online' || !Net.api) { toast('Publishing needs the online leaderboard. ' + Net.status); return; }
    if (!ed.name.trim()) { toast('Give your track a name first'); closeModal(); return; }
    const old = btn && btn.textContent; if (btn) { btn.disabled = true; btn.textContent = 'Publishing…'; }
    const custom = customObj();
    const r = await Net.ctPublish({ id: custom.id, name: custom.name, biome: custom.biome, pts: custom.pts, ext: custom.ext, time: Math.round(t.time * 1000) / 1000, ghost: t.ghost });
    if (btn) { btn.disabled = false; btn.textContent = old; }
    if (!r.ok) { toast(r.error); return; }
    toast('<b>Track published</b>');
    DL.customTracks[custom.id] = custom; Net.save.best[custom.id] = t.time; DL.store.set('ghost:' + custom.id, t.ghost); Net.persist();
    dropDraft(custom.id); ed.id = null; ed.tested = null; closeModal();
    cm.tab = 'mine'; cm.focus = custom.id; show('community');
  }

  UI.testFinished = function (r, t, valid, enc) {
    UI.checkpoint(r.track.checkpoints.length, r.track.checkpoints.length, null);
    const key = edKey();
    if (valid && ed.testKey === key && (!ed.tested || ed.tested.key !== key || t < ed.tested.time)) ed.tested = { key, time: t, ghost: enc };
    const online = Net.mode === 'online' && Net.api;
    const m = modal(`<div class="lbl">Test drive · ${esc(ed.name || 'Untitled track')}</div>
      <h2>${valid ? 'Track tested' : 'Run not accepted'}</h2>
      <div class="res-time">${DL.fmtTime(t)}</div>
      <p class="hint">${valid ? (online ? 'Your time becomes the first one on the board when you publish.' : 'Publishing needs the online leaderboard (' + esc(Net.status) + ').') : 'That run did not pass the plausibility check. Drive the whole track from start to finish.'}</p>
      <div class="btn-row"><button class="btn btn-go" id="tfPub" style="font-size:22px" ${valid && online ? '' : 'disabled'}>Publish</button><button class="btn btn-line" id="tfRetry">Retry</button></div>
      <button class="btn btn-line" id="tfBack">Back to editor</button>`, { sticky: true });
    m.querySelector('#tfPub').onclick = () => doPublish(m.querySelector('#tfPub'));
    m.querySelector('#tfRetry').onclick = () => Game.restart();
    m.querySelector('#tfBack').onclick = () => X.leaveRace();
    if (valid) { DL.Audio.chime(); }
  };
})(window.DL);
