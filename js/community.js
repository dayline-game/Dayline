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

  // ---------------- track creator ----------------
  // Tabs: Layout (waypoints), Elevation (height per waypoint), Terrain (sculpt + relief + seed), Props (palette + scatter), Look (scenery).
  const ed = { id: null, name: '', biome: 'country', pts: [], ext: null, tab: 'layout', sel: -1, v: { cx: 0, cz: 0, s: 0.3 }, tested: null, testKey: null, prob: null, spline: null, hist: [], res: { ok: false, error: '' }, W: 0, H: 0, tool: 'raise', brush: 70, str: 6, level: 6, propType: 'pine', propSize: 1, hand: false, cam: '', tr: null, hm: null };
  const cv = $('edCanvas'), cx = cv.getContext('2d'), pcv = $('edProf'), pcx = pcv.getContext('2d');
  const newId = () => 'c_' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => (b % 36).toString(36)).join('');
  const STARTER = [[-460, 120], [-250, 120], [-40, 250], [200, 220]];
  const defExt = () => ({ v: 2, hills: 0.4, rel: 1, dens: 1, seed: 0, pseed: 0, unique: true, terr: [], props: [] });
  const cloneExt = e => JSON.parse(JSON.stringify(e));
  const customObj = () => ({ id: ed.id, name: (ed.name || 'Untitled track').trim() || 'Untitled track', biome: ed.biome, pts: ed.pts.map(p => [p[0], p[1]]), ext: cleanExt() });
  function cleanExt() { const c = DL.cleanExt(ed.ext, ed.pts.length); return c.ok ? c.ext : null; }
  const edKey = () => JSON.stringify([ed.biome, ed.pts, ed.ext]);
  const PROP_NAMES = { pine: 'Pine', snowpine: 'Snow pine', round: 'Oak', palm: 'Palm', cactus: 'Cactus', bush: 'Bush', shrub: 'Shrub', rock: 'Rock', boulder: 'Boulder', haybale: 'Hay bale', house: 'House', barn: 'Barn', windmill: 'Windmill', lighthouse: 'Lighthouse', mesa: 'Mesa', cabin: 'Cabin', watchtower: 'Watch tower', tent: 'Tent', logpile: 'Log pile', snowman: 'Snowman', igloo: 'Igloo', icespire: 'Ice spire', umbrella: 'Umbrella', lifeguard: 'Lifeguard', cratestack: 'Crates', scarecrow: 'Scarecrow', silo: 'Silo', watertower: 'Water tower', tractor: 'Tractor', billboard: 'Billboard', tirestack: 'Tyres', radiomast: 'Radio mast', pumpjack: 'Pump jack', rockarch: 'Rock arch' };
  const PROP_COL = { pine: '#2f6b46', snowpine: '#5e8f86', round: '#5c9a4a', palm: '#3e9a5e', cactus: '#4d8a4a', bush: '#6aa05a', shrub: '#a39a55', rock: '#8c8f98', boulder: '#6f737c', haybale: '#d9b45a', house: '#d9705a', barn: '#b9473a', windmill: '#e9e2cf', lighthouse: '#f3ead7', mesa: '#c98a5a' };
  const propCol = t => PROP_COL[t] || '#7a6bb0';

  UI.openEditor = function (d) {
    if (!Game.edView || !Game.edCamera) { toast('Dayline updated. Reload the page to use the track creator'); return; }
    if (d) Object.assign(ed, { id: d.id, name: d.name || '', biome: d.biome || 'country', pts: d.pts.map(p => [p[0], p[1]]), ext: d.ext ? Object.assign(defExt(), cloneExt(d.ext)) : defExt(), sel: -1, tested: null, hist: [], tab: 'layout' });
    else Object.assign(ed, { id: newId(), name: '', biome: 'country', pts: STARTER.map(p => p.slice()), ext: defExt(), sel: -1, tested: null, hist: [], tab: 'layout' });
    if (!ed.ext.terr) ed.ext.terr = []; if (!ed.ext.props) ed.ext.props = [];
    ed.tr = null; ed.fitNext = true; show('editor');
  };
  UI.renderEditor = function () {
    if (!ed.id) { Object.assign(ed, { id: newId(), pts: STARTER.map(p => p.slice()), ext: defExt() }); }
    $('edName').value = ed.name;
    requestAnimationFrame(() => { sizeCanvas(); renderTabs(); changed(true); if (ed.fitNext) { previewTrack(true); fit(); ed.fitNext = false; } scheduleWorld(0); });
  };
  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, Hh = window.innerHeight;   // same size the 3D renderer uses, so handles and rays line up exactly
    ed.W = W; ed.H = Hh; ed.dpr = dpr; cv.style.width = W + 'px'; cv.style.height = Hh + 'px'; cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, Hh * dpr);
    const pr = pcv.getBoundingClientRect(); ed.PW = pr.width; ed.PH = pr.height; pcv.width = Math.max(1, pr.width * dpr); pcv.height = Math.max(1, pr.height * dpr);
  }
  window.addEventListener('resize', () => { if (!$('editor').hidden) { sizeCanvas(); draw(); drawProf(); } });
  const EV = () => Game.edView;
  const gY = (x, z) => ed.tr ? ed.tr.groundAt(x, z, {}, true).y : 0;
  function fit() {
    const v = EV(); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    ed.pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
    if (!ed.pts.length) { x0 = z0 = -200; x1 = z1 = 200; }
    v.tx = (x0 + x1) / 2; v.tz = (z0 + z1) / 2; v.ty = gY(v.tx, v.tz); v.dist = DL.clamp(Math.max(x1 - x0, z1 - z0) * 1.3 + 420, 600, 4000); v.ph = 0.9;
  }
  const _pv = new THREE.Vector3(); const proj = (x, y, z) => { const c = Game.edCamera(); const q = _pv.set(x, y, z).project(c); return [(q.x + 1) / 2 * ed.W, (1 - q.y) / 2 * ed.H, q.z > -1 && q.z < 1]; };
  // ray from the camera through a screen point, marched down onto the terrain
  function rayHit(px, pz) {
    const c = Game.edCamera(); c.updateMatrixWorld(); const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(px / ed.W * 2 - 1, -(pz / ed.H) * 2 + 1), c);
    const o = rc.ray.origin, d = rc.ray.direction, f = (t) => o.y + d.y * t - gY(o.x + d.x * t, o.z + d.z * t);
    let t = 0, pt = 0, pf = f(0);
    if (pf < 0) return null;
    for (let i = 0; i < 500 && t < 9000; i++) {
      t += Math.max(6, t * 0.02); const fv = f(t);
      if (fv < 0) { let a = pt, b = t; for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if (f(m) < 0) b = m; else a = m; } const tt = (a + b) / 2; return [o.x + d.x * tt, o.y + d.y * tt, o.z + d.z * tt]; }
      pt = t;
    }
    return null;
  }
  const snap = () => { ed.hist.push(JSON.stringify([ed.pts, ed.ext])); if (ed.hist.length > 50) ed.hist.shift(); };
  const hex = n => '#' + ('000000' + n.toString(16)).slice(-6);

  // ----- keeping the elevation list in step with the waypoints -----
  function ensureElev() {
    if (ed.ext.elev && ed.ext.elev.length === ed.pts.length) return;
    const tr = previewTrack(true); const e = [];
    if (tr && tr.wpIdx && tr.wpIdx.length === ed.pts.length) { const y0 = tr.py[14]; tr.wpIdx.forEach(i => e.push(Math.round((tr.py[i] - y0) * 10) / 10)); }
    else ed.pts.forEach(() => e.push(0));
    ed.ext.elev = e;
  }
  function insertElev(at) { if (!ed.ext.elev) return; const e = ed.ext.elev, a = e[Math.max(0, at - 1)], b = e[Math.min(e.length - 1, at)]; e.splice(at, 0, Math.round((a + b) / 2 * 10) / 10); }

  // ----- preview track (same terrain code the race uses) + 3D world refresh -----
  let prevKey = '', wT = 0;
  function previewTrack(force) {
    const k = edKey() + '|' + ed.name;
    if (!force && ed.tr && prevKey === k) return ed.tr;
    if (!ed.res.ok) return ed.tr;
    try { ed.tr = new DL.Track(ed.id, customObj()); prevKey = k; } catch (e) { console.warn(e); }
    return ed.tr;
  }
  function scheduleWorld(ms) { clearTimeout(wT); wT = setTimeout(() => { if ($('editor').hidden || !ed.res.ok) return; if (drag && drag.kind !== 'sel' && Date.now() - (ed.lastMove || 0) < 300) return scheduleWorld(300); try { Game.loadDay(ed.id, customObj()); } catch (e) { console.warn(e); } }, ms == null ? 260 : ms); }

  // ----- tabs / side panel -----
  const TAB_HELP = {
    layout: 'Click the ground to add waypoints, drag a handle to move it, click the road to insert one, double-click to remove. Drag empty ground to pan. Orbit: right-drag, Option+drag or the orbit button (or Q/E). Scroll zooms.',
    elev: 'Pick a waypoint and set its height, or drag its handle up and down in the 3D view. Drag the dots on the profile to shape hills and valleys. Red parts are too steep.',
    terr: 'Paint on the ground: raise or lower it, level it off, or erase edits. The road is never touched. The seed re-rolls the natural landforms.',
    props: 'Pick a prop and click or paint on the ground to place it. Scatter adds natural scenery on its own and its dice re-rolls it.',
    look: 'Pick the biome: it sets the colours, trees, water and weather of your track.'
  };
  function renderTabs() {
    [...$('edTabs').children].forEach(b => b.classList.toggle('on', b.dataset.t === ed.tab));
    $('edProfWrap').hidden = ed.tab !== 'elev'; if (ed.tab === 'elev') sizeCanvas(); $('edHint').textContent = TAB_HELP[ed.tab];
    const P = $('edPane'), E = ed.ext; P.innerHTML = '';
    const slider = (id, label, min, max, step, val, fmt) => `<label class="ed-sl"><span>${label}<b id="${id}V">${fmt ? fmt(val) : val}</b></span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
    const bind = (id, fn, fmt) => { const el = $(id); if (!el) return; el.oninput = () => { const v = +el.value; $(id + 'V').textContent = fmt ? fmt(v) : v; fn(v); }; };
    if (ed.tab === 'layout') {
      P.innerHTML = '<div class="btn-row"><button class="btn btn-line btn-sm" id="edDel">Delete point</button><button class="btn btn-line btn-sm" id="edFit">Fit view</button></div><div class="btn-row"><button class="btn btn-line btn-sm" id="edClear">Clear track</button><button class="btn btn-line btn-sm" id="edRev">Reverse</button></div>';
      $('edDel').onclick = () => { if (ed.sel >= 0) { snap(); ed.pts.splice(ed.sel, 1); if (E.elev) E.elev.splice(ed.sel, 1); ed.sel = -1; changed(); } };
      $('edFit').onclick = () => { fit(); draw(); };
      $('edClear').onclick = () => { if (!ed.pts.length) return; snap(); ed.pts = []; E.elev = null; ed.sel = -1; changed(); };
      $('edRev').onclick = () => { if (ed.pts.length < 2) return; snap(); ed.pts.reverse(); if (E.elev) E.elev.reverse(); ed.sel = -1; changed(); };
    } else if (ed.tab === 'elev') {
      const sel = ed.sel >= 0 && E.elev ? E.elev[ed.sel] : 0;
      P.innerHTML = `<div class="ed-sel">${ed.sel >= 0 ? 'Waypoint ' + (ed.sel === 0 ? 'S (start)' : ed.sel === ed.pts.length - 1 ? 'F (finish)' : ed.sel) : 'Select a waypoint'}</div>` +
        slider('edHeight', 'Height', DL.EXT_LIM.ELEV_MIN, DL.EXT_LIM.ELEV_MAX, 1, sel, v => v + ' m') +
        slider('edHills', 'Natural hills along the road', 0, 2, 0.1, E.hills, v => Math.round(v * 100) + '%') +
        '<div class="btn-row"><button class="btn btn-line btn-sm" id="edFlat">Flatten</button><button class="btn btn-line btn-sm" id="edSmooth">Smooth</button></div><div class="btn-row"><button class="btn btn-line btn-sm" id="edHillRand">🎲 Random hills</button><button class="btn btn-line btn-sm" id="edLegacy">Reset</button></div>';
      $('edHeight').disabled = ed.sel < 0;
      bind('edHeight', v => { if (ed.sel < 0) return; ensureElev(); E.elev[ed.sel] = v; changed(true, 'terrain'); }, v => v + ' m');
      $('edHeight').onchange = () => { snap(); };
      bind('edHills', v => { E.hills = v; changed(true, 'terrain'); }, v => Math.round(v * 100) + '%');
      $('edFlat').onclick = () => { snap(); ensureElev(); E.elev = E.elev.map(() => 0); changed(false, 'terrain'); renderTabs(); };
      $('edSmooth').onclick = () => { snap(); ensureElev(); const a = E.elev.slice(); E.elev = a.map((v, i) => Math.round(((a[Math.max(0, i - 1)] + v * 2 + a[Math.min(a.length - 1, i + 1)]) / 4) * 10) / 10); changed(false, 'terrain'); renderTabs(); };
      $('edHillRand').onclick = () => { snap(); E.elev = randomElev(Math.random, 1); changed(false, 'terrain'); renderTabs(); };
      $('edLegacy').onclick = () => { snap(); E.elev = null; changed(false, 'terrain'); renderTabs(); };
    } else if (ed.tab === 'terr') {
      const tool = (k, l) => `<button class="chk ${ed.tool === k ? 'on' : ''}" data-k="${k}">${l}</button>`;
      P.innerHTML = '<span class="lbl">Brush</span><div class="ed-biomes" id="edTools">' + tool('raise', '▲ Raise') + tool('lower', '▼ Lower') + tool('level', '▬ Level') + tool('erase', '✕ Erase') + '</div>' +
        slider('edBrush', 'Brush size', DL.EXT_LIM.R_MIN, 200, 5, ed.brush, v => v + ' m') + slider('edStr', 'Strength', 1, 20, 1, ed.str, v => v + ' m') + slider('edLevel', 'Level height (above start)', -30, 80, 1, ed.level, v => v + ' m') +
        '<span class="lbl">Natural terrain</span>' + slider('edRel', 'Relief', 0, 2.5, 0.1, E.rel, v => Math.round(v * 100) + '%') +
        `<div class="btn-row"><button class="btn btn-line btn-sm" id="edSeed">🎲 New landforms</button><button class="btn btn-line btn-sm" id="edClearT">Clear sculpt</button></div><div class="hint" id="edSeedV">Terrain seed ${E.seed} · ${E.terr.length} edit${E.terr.length === 1 ? '' : 's'}</div>`;
      $('edTools').onclick = e => { const b = e.target.closest('.chk'); if (!b) return; ed.tool = b.dataset.k; renderTabs(); };
      bind('edBrush', v => { ed.brush = v; draw(); }, v => v + ' m'); bind('edStr', v => { ed.str = v; }, v => v + ' m'); bind('edLevel', v => { ed.level = v; }, v => v + ' m');
      bind('edRel', v => { E.rel = v; changed(true, 'terrain'); }, v => Math.round(v * 100) + '%');
      $('edRel').onchange = () => snap();
      $('edSeed').onclick = () => { snap(); E.seed = Math.floor(Math.random() * 99999) + 1; changed(false, 'terrain'); renderTabs(); };
      $('edClearT').onclick = () => { if (!E.terr.length) return; snap(); E.terr = []; changed(false, 'terrain'); renderTabs(); };
    } else if (ed.tab === 'props') {
      const types = DL.PROP_TYPES, rec = (DL.PROP_REC || {})[ed.biome] || [];
      P.innerHTML = '<span class="lbl">Prop</span><div class="ed-props" id="edPalette">' + types.map(t => `<button class="chk ${ed.propType === t && ed.tool !== 'perase' ? 'on' : ''}" data-k="${t}" style="--pc:${propCol(t)}"><i></i>${PROP_NAMES[t] || t}</button>`).join('') + '</div>' +
        `<div class="btn-row"><button class="chk ${ed.tool === 'perase' ? 'on' : ''}" id="edPErase">✕ Erase props</button><button class="btn btn-line btn-sm" id="edClearP">Clear all</button></div>` +
        slider('edPSize', 'Size', 0.5, 2.2, 0.1, ed.propSize, v => Math.round(v * 100) + '%') +
        '<span class="lbl">Automatic scenery</span>' + slider('edDens', 'Scatter density', 0, 2.5, 0.1, E.dens, v => v === 0 ? 'Off' : Math.round(v * 100) + '%') +
        `<label class="ed-ck"><input type="checkbox" id="edUniq" ${E.unique ? 'checked' : ''}> Landmarks and extras (cabins, signs, tents…)</label><div class="btn-row"><button class="btn btn-line btn-sm" id="edPSeed">🎲 Re-scatter</button></div><div class="hint">${E.props.length} placed by hand · scatter seed ${E.pseed}</div>`;
      $('edPalette').onclick = e => { const b = e.target.closest('.chk'); if (!b) return; ed.propType = b.dataset.k; if (ed.tool === 'perase') ed.tool = 'raise'; renderTabs(); };
      $('edPErase').onclick = () => { ed.tool = ed.tool === 'perase' ? 'raise' : 'perase'; renderTabs(); };
      $('edClearP').onclick = () => { if (!E.props.length) return; snap(); E.props = []; changed(false, 'props'); renderTabs(); };
      bind('edPSize', v => { ed.propSize = v; }, v => Math.round(v * 100) + '%');
      bind('edDens', v => { E.dens = v; changed(true, 'props'); }, v => v === 0 ? 'Off' : Math.round(v * 100) + '%'); $('edDens').onchange = () => snap();
      $('edUniq').onchange = e => { snap(); E.unique = e.target.checked; changed(false, 'props'); };
      $('edPSeed').onclick = () => { snap(); E.pseed = Math.floor(Math.random() * 99999) + 1; changed(false, 'props'); renderTabs(); };
    } else {
      P.innerHTML = '<span class="lbl">Biome</span><div class="ed-biomes" id="edBiomes"></div><div class="hint">The biome sets ground colours, trees, water level, mountains and the kind of props that appear.</div>';
      DL.BIOME_KEYS.forEach(k => {
        const b = h(`<button class="chk ${ed.biome === k ? 'on' : ''}" data-k="${k}">${esc(DL.BIOMES[k].name)}</button>`);
        b.onclick = () => { snap(); ed.biome = k; changed(false, 'terrain'); renderTabs(); };
        $('edBiomes').appendChild(b);
      });
    }
  }
  $('edTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ed.tab = b.dataset.t; if (ed.tab === 'elev') { ensureElev(); } if (!['terr', 'props'].includes(ed.tab)) ed.tool = 'raise'; else if (ed.tab === 'props' && ed.tool !== 'perase') ed.tool = 'raise'; renderTabs(); changed(true); });

  // ----- change handling -----
  let saveT = 0;
  function changed(noSave, what) {
    ed.spline = null;
    if (ed.pts.length >= 2) { try { ed.spline = DL.customCenterline(ed.pts); } catch (e) { } }
    ed.res = DL.validateCustomTrack(ed.pts); ed.prob = ed.res.ok ? null : (ed.res.at || null);
    const tested = ed.tested && ed.tested.key === edKey();
    const st = $('edStatus');
    if (ed.res.ok) { st.className = 'ed-status ok'; st.textContent = tested ? 'Tested ✓ Ready to publish' : 'Valid track. Test drive it to unlock publishing'; }
    else { st.className = 'ed-status bad'; st.textContent = ed.res.error; }
    Game.edStale(!ed.res.ok);
    $('edTest').disabled = !ed.res.ok; $('edPublish').disabled = !(ed.res.ok && tested);
    $('edPublish').title = tested ? '' : 'Finish a test drive on this exact layout first';
    $('edUndo').disabled = !ed.hist.length;
    if (ed.res.ok) { previewTrack(); scheduleWorld(); }
    statsUpdate(); draw(); drawProf();
    if (!noSave) { clearTimeout(saveT); saveT = setTimeout(saveDraft, 400); }
  }
  function saveDraft() { if (ed.id && ed.pts.length) putDraft({ id: ed.id, name: ed.name, biome: ed.biome, pts: ed.pts, ext: ed.ext, at: Date.now() }); }
  function statsUpdate() {
    const tr = ed.res.ok ? ed.tr : null; let climb = 0, steep = 0;
    if (tr) { for (let i = 1; i < tr.N; i++) { const d = tr.py[i] - tr.py[i - 1]; if (d > 0) climb += d; } for (let i = 3; i < tr.N; i++) steep = Math.max(steep, Math.abs(tr.py[i] - tr.py[i - 3]) / 12); }
    $('edLen').textContent = ed.spline ? Math.round((ed.spline.xs.length - 1) * 4) + ' m' : '0 m'; $('edPts').textContent = ed.pts.length;
    $('edClimb').textContent = tr ? Math.round(climb) + ' m' : '—'; $('edSteep').textContent = tr ? Math.round(steep * 100) + '%' : '—';
    $('edSteep').style.color = steep > 0.14 ? '#d4441f' : '';
  }

  // ----- overlay drawing (handles on top of the real 3D scene) -----
  function draw() {
    Game.edCamera().updateMatrixWorld(); const W = ed.W, H = ed.H, E = ed.ext; if (!W) return;
    cx.setTransform(ed.dpr, 0, 0, ed.dpr, 0, 0); cx.clearRect(0, 0, W, H);
    const tr = ed.tr, okTr = tr && ed.res.ok && tr.wpIdx && tr.wpIdx.length === ed.pts.length;
    // road line
    if (okTr) {
      cx.beginPath(); let on = false;
      for (let i = 0; i < tr.N; i += 2) { const p = proj(tr.px[i], tr.py[i] + 0.8, tr.pz[i]); if (!p[2]) { on = false; continue; } if (!on) { cx.moveTo(p[0], p[1]); on = true; } else cx.lineTo(p[0], p[1]); }
      cx.strokeStyle = 'rgba(240,90,53,.9)'; cx.lineWidth = 2; cx.lineJoin = 'round'; cx.stroke();
    }
    // manual props
    if (E.props) E.props.forEach(p => { const q = proj(p[1], gY(p[1], p[2]) + 1, p[2]); if (!q[2]) return; cx.beginPath(); cx.arc(q[0], q[1], 4, 0, 7); cx.fillStyle = propCol(p[0]); cx.fill(); cx.lineWidth = 1; cx.strokeStyle = 'rgba(17,21,29,.8)'; cx.stroke(); });
    // waypoints: pole from the ground up to a handle, labelled with the road height in the elevation tab
    ed.pts.forEach((p, i) => {
      const gy = gY(p[0], p[1]), ry = okTr ? tr.py[tr.wpIdx[i]] : gy, a = proj(p[0], gy, p[1]), b = proj(p[0], ry + 7, p[1]);
      if (!b[2]) return; const first = i === 0, last = i === ed.pts.length - 1 && i > 0, on = i === ed.sel;
      cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.strokeStyle = 'rgba(255,255,255,.7)'; cx.lineWidth = 2; cx.stroke();
      cx.beginPath(); cx.arc(b[0], b[1], on ? 12 : 10, 0, 7); cx.fillStyle = first ? '#3f7d5a' : last ? '#f05a35' : '#f3ead7'; cx.fill();
      cx.lineWidth = on ? 3 : 2; cx.strokeStyle = on ? '#f05a35' : '#1c2536'; cx.stroke();
      cx.fillStyle = first || last ? '#fff' : '#1c2536'; cx.font = '700 11px Barlow, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(first ? 'S' : last ? 'F' : String(i), b[0], b[1] + 0.5);
      if (ed.tab === 'elev' && E.elev && E.elev[i] != null) { cx.font = '800 13px Barlow Condensed, sans-serif'; cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.lineWidth = 3.5; const t = Math.round(E.elev[i]) + ' m'; cx.strokeText(t, b[0], b[1] - 20); cx.fillStyle = '#1c2536'; cx.fillText(t, b[0], b[1] - 20); }
    });
    if (ed.prob) { const q = proj(ed.prob[0], gY(ed.prob[0], ed.prob[1]) + 2, ed.prob[1]); if (q[2]) { cx.strokeStyle = '#d4441f'; cx.lineWidth = 3; cx.beginPath(); cx.arc(q[0], q[1], 24, 0, 7); cx.stroke(); cx.fillStyle = 'rgba(212,68,31,.2)'; cx.fill(); } }
    // brush ring on the ground
    if (ed.hit && !ed.camDrag && (ed.tab === 'terr' || ed.tab === 'props')) {
      const R = ed.tab === 'terr' ? ed.brush : ed.tool === 'perase' ? 22 : 5 * ed.propSize + 2; cx.beginPath(); let on = false;
      for (let k = 0; k <= 48; k++) { const a = k / 48 * 6.2832, x = ed.hit[0] + Math.cos(a) * R, z = ed.hit[2] + Math.sin(a) * R, q = proj(x, gY(x, z) + 0.7, z); if (!q[2]) continue; if (!on) { cx.moveTo(q[0], q[1]); on = true; } else cx.lineTo(q[0], q[1]); }
      cx.closePath(); cx.strokeStyle = ed.tab === 'props' ? (ed.tool === 'perase' ? '#d4441f' : propCol(ed.propType)) : '#f05a35'; cx.lineWidth = 2.5; cx.stroke();
      cx.fillStyle = 'rgba(240,90,53,.12)'; if (ed.tab === 'terr') cx.fill();
    }
    if (!ed.res.ok && ed.spline && ed.spline.xs.length > 1) {
      cx.beginPath(); let on = false; const sp = ed.spline;
      for (let i = 0; i < sp.xs.length; i += 2) { const q = proj(sp.xs[i], gY(sp.xs[i], sp.zs[i]) + 1, sp.zs[i]); if (!q[2]) { on = false; continue; } if (!on) { cx.moveTo(q[0], q[1]); on = true; } else cx.lineTo(q[0], q[1]); }
      cx.setLineDash([10, 8]); cx.strokeStyle = '#d4441f'; cx.lineWidth = 3; cx.stroke(); cx.setLineDash([]);
    }
    if (!ed.res.ok) { cx.font = '800 20px Barlow Condensed, sans-serif'; cx.textAlign = 'center'; const t = ed.res.error || 'Fix the layout'; const w = cx.measureText(t).width + 28, bx = W / 2 + 150 - w / 2; cx.fillStyle = 'rgba(138,42,28,.92)'; cx.beginPath(); cx.roundRect ? cx.roundRect(bx, 16, w, 36, 10) : cx.rect(bx, 16, w, 36); cx.fill(); cx.fillStyle = '#fff'; cx.fillText(t, W / 2 + 150, 40); }
    if (!ed.pts.length) { cx.fillStyle = 'rgba(255,255,255,.9)'; cx.font = '800 26px Barlow Condensed, sans-serif'; cx.textAlign = 'center'; cx.fillText('Click the ground to place the start', W / 2 + 150, H / 2); }
  }
  Game.onEdFrame = () => { if ($('editor').hidden) return; if (ed.W !== window.innerWidth || ed.H !== window.innerHeight || ed.dpr !== Math.min(2, window.devicePixelRatio || 1)) sizeCanvas(); draw(); };
  // road height profile (elevation tab)
  const prof = { x0: 46, x1: 14, y0: 14, y1: 20 };
  function profMap() {
    const tr = ed.tr; if (!tr) return null;
    let mn = 1e9, mx = -1e9; for (let i = 0; i < tr.N; i++) { mn = Math.min(mn, tr.py[i]); mx = Math.max(mx, tr.py[i]); }
    const E = ed.ext.elev || []; const y0 = tr.py[14]; for (const v of E) { mn = Math.min(mn, y0 + v); mx = Math.max(mx, y0 + v); }
    const pad = Math.max(8, (mx - mn) * 0.12); mn -= pad; mx += pad;
    const L = tr.s[tr.N - 1] || 1, pw = ed.PW - prof.x0 - prof.x1, ph = ed.PH - prof.y0 - prof.y1;
    return { tr, mn, mx, L, X: s => prof.x0 + s / L * pw, Y: h => prof.y0 + (1 - (h - mn) / (mx - mn)) * ph, inv: py => mn + (1 - (py - prof.y0) / ph) * (mx - mn), y0 };
  }
  function drawProf() {
    if (ed.tab !== 'elev') return; const c = pcx; c.setTransform(ed.dpr, 0, 0, ed.dpr, 0, 0); c.clearRect(0, 0, ed.PW, ed.PH);
    c.fillStyle = 'rgba(251,246,234,.94)'; c.fillRect(0, 0, ed.PW, ed.PH);
    const M = profMap(); if (!M) { c.fillStyle = '#1c2536'; c.font = '700 14px Barlow'; c.fillText('Fix the layout to see the profile', 20, 40); return; }
    const { tr } = M; c.lineWidth = 1; c.strokeStyle = 'rgba(17,21,29,.12)'; c.fillStyle = '#5a6272'; c.font = '700 11px Barlow'; c.textAlign = 'right';
    for (let k = 0; k <= 4; k++) { const hv = M.mn + (M.mx - M.mn) * k / 4, y = M.Y(hv); c.beginPath(); c.moveTo(prof.x0, y); c.lineTo(ed.PW - prof.x1, y); c.stroke(); c.fillText(Math.round(hv - M.y0) + ' m', prof.x0 - 6, y + 4); }
    // filled profile coloured by slope
    for (let i = 1; i < tr.N; i++) {
      const sl = Math.abs(tr.py[i] - tr.py[Math.max(0, i - 3)]) / (Math.min(3, i) * 4);
      c.strokeStyle = sl > 0.125 ? '#d4441f' : sl > 0.08 ? '#e0a030' : '#2f7d5a'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(M.X(tr.s[i - 1]), M.Y(tr.py[i - 1])); c.lineTo(M.X(tr.s[i]), M.Y(tr.py[i])); c.stroke();
    }
    c.textAlign = 'center'; c.fillStyle = '#5a6272'; c.fillText(Math.round(M.L) + ' m', ed.PW - 30, ed.PH - 6); c.fillText('0', prof.x0, ed.PH - 6);
    (tr.wpIdx || []).forEach((wi, i) => { const x = M.X(tr.s[wi]), y = M.Y(tr.py[wi]), on = i === ed.sel; c.beginPath(); c.arc(x, y, on ? 9 : 7, 0, 7); c.fillStyle = i === 0 ? '#3f7d5a' : i === ed.pts.length - 1 ? '#f05a35' : '#f3ead7'; c.fill(); c.lineWidth = on ? 3 : 2; c.strokeStyle = on ? '#f05a35' : '#1c2536'; c.stroke(); });
  }

  // ----- pointer interaction -----
  let drag = null;
  const evPos = e => [e.clientX, e.clientY];
  const wpScreen = i => { const tr = ed.tr, p = ed.pts[i], ok = tr && tr.wpIdx && tr.wpIdx.length === ed.pts.length; return proj(p[0], (ok ? tr.py[tr.wpIdx[i]] : gY(p[0], p[1])) + 7, p[1]); };
  const hitPoint = (px, pz) => { let best = -1, bd = 28; ed.pts.forEach((p, i) => { const q = wpScreen(i), d = Math.hypot(q[0] - px, q[1] - pz); if (q[2] && d < bd) { bd = d; best = i; } }); return best; };
  const inMap = w => [DL.clamp(Math.round(w[0]), -LIM, LIM), DL.clamp(Math.round(w[1]), -LIM, LIM)];
  const nearRoad = (x, z) => { if (!ed.spline) return 1e9; let b = 1e9; const s = ed.spline; for (let i = 0; i < s.xs.length; i += 2) b = Math.min(b, Math.hypot(s.xs[i] - x, s.zs[i] - z)); return b; };
  function paintTerrain(w) {
    const E = ed.ext, R = ed.brush;
    if (ed.tool === 'erase') { E.terr = E.terr.filter(t => Math.hypot(t[0] - w[0], t[1] - w[2]) > R * 0.7); return; }
    const mode = ed.tool === 'level' ? 1 : 0, hgt = mode ? ed.level : (ed.tool === 'raise' ? 1 : -1) * ed.str;
    for (const t of E.terr) if (t[4] === mode && Math.hypot(t[0] - w[0], t[1] - w[2]) < R * 0.3 && Math.abs(t[2] - R) < 12) { t[3] = mode ? hgt : DL.clamp(Math.round((t[3] + hgt * 0.5) * 10) / 10, -DL.EXT_LIM.H, DL.EXT_LIM.H); return; }
    if (E.terr.length >= DL.EXT_LIM.TERR) { toast('Terrain edit limit reached. Use a bigger brush or clear some.'); return; }
    E.terr.push([Math.round(w[0]), Math.round(w[2]), R, mode ? hgt : hgt * 0.8, mode]);
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
    if (ch) { ed.dirtyPaint = true; changed(true, ed.tab === 'terr' ? 'terrain' : 'props'); }
  }
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const [px, pz] = evPos(e), V = EV();
    const left = e.button === 0, camBtn = e.button === 2 || e.button === 1 || (left && (ed.cam || e.altKey || e.ctrlKey || e.metaKey));
    if (camBtn) { drag = { kind: (e.shiftKey || ed.cam === 'pan' || e.button === 1) ? 'pan' : 'orbit', x: px, z: pz, th: V.th, ph: V.ph, tx: V.tx, tz: V.tz, moved: false }; ed.camDrag = true; return; }
    const i = hitPoint(px, pz), paint = ed.tab === 'terr' || ed.tab === 'props';
    if (i >= 0 && !(paint && false)) {
      ed.sel = i;
      if (ed.tab === 'layout') { snap(); drag = { kind: 'pt', i, moved: false }; }
      else if (ed.tab === 'elev') { ensureElev(); snap(); const q = wpScreen(i); drag = { kind: 'elev', i, y: pz, h0: ed.ext.elev[i], mpp: 2 * Math.hypot(q[0] - ed.W / 2, 1) * 0 + 0, moved: false }; const c = Game.edCamera(), tr = ed.tr, wp = ed.pts[i], ry = tr && tr.wpIdx ? tr.py[tr.wpIdx[i]] : 0; drag.mpp = 2 * c.position.distanceTo(new THREE.Vector3(wp[0], ry, wp[1])) * Math.tan(27.5 * Math.PI / 180) / ed.H; renderTabs(); }
      else drag = { kind: 'sel' };
      changed(true); return;
    }
    if (paint) { snap(); drag = { kind: 'paint', moved: true }; applyPaint(px, pz); return; }
    drag = { kind: 'click', x: px, z: pz, th: V.th, ph: V.ph, tx: V.tx, tz: V.tz, moved: false };
  });
  function panTo(V, d, px, pz) { const k = V.dist * 0.0012, c = Math.cos(V.th), s2 = Math.sin(V.th), dx = px - d.x, dz = pz - d.z; V.tx = d.tx - dx * k * c - dz * k * s2; V.tz = d.tz + dx * k * s2 - dz * k * c; V.ty = gY(V.tx, V.tz); }
  cv.addEventListener('pointermove', e => {
    const [px, pz] = evPos(e), V = EV(); ed.lastMove = Date.now();
    if (!drag) { if (ed.tab === 'terr' || ed.tab === 'props') { ed.ptr = [px, pz]; if (!ed.hitQ) ed.hitQ = requestAnimationFrame(() => { ed.hitQ = 0; ed.hit = ed.ptr ? rayHit(ed.ptr[0], ed.ptr[1]) : null; }); } return; }
    if (drag.kind === 'pt') { const w = rayHit(px, pz); if (w) { ed.pts[drag.i] = inMap(w); drag.moved = true; changed(true, 'layout'); } }
    else if (drag.kind === 'elev') { const E = ed.ext; E.elev[drag.i] = Math.round(DL.clamp(drag.h0 + (drag.y - pz) * drag.mpp, DL.EXT_LIM.ELEV_MIN, DL.EXT_LIM.ELEV_MAX)); drag.moved = true; changed(true, 'terrain'); const hs = $('edHeight'); if (hs) { hs.value = E.elev[drag.i]; $('edHeightV').textContent = E.elev[drag.i] + ' m'; hs.disabled = false; } }
    else if (drag.kind === 'paint') { applyPaint(px, pz); }
    else if (drag.kind === 'orbit' || (drag.kind === 'click' && Math.hypot(px - drag.x, pz - drag.z) > 5 && false)) { V.th = drag.th - (px - drag.x) * 0.006; V.ph = DL.clamp(drag.ph + (pz - drag.z) * 0.006, 0.3, 1.5); drag.moved = true; }
    else if (drag.kind === 'pan') { panTo(V, drag, px, pz); drag.moved = true; }
    else if (drag.kind === 'click') { if (Math.hypot(px - drag.x, pz - drag.z) > 5) { drag.moved = true; ed.camDrag = true; panTo(V, drag, px, pz); } }
  });
  const onUp = e => {
    if (!drag) return; const d = drag; drag = null; ed.camDrag = false; const [px, pz] = evPos(e);
    if (d.kind === 'pt') { if (!d.moved) ed.hist.pop(); else changed(); return; }
    if (d.kind === 'elev') { if (!d.moved) ed.hist.pop(); changed(false, 'terrain'); return; }
    if (d.kind === 'paint') { if (!ed.dirtyPaint) ed.hist.pop(); ed.dirtyPaint = false; changed(false, ed.tab === 'terr' ? 'terrain' : 'props'); renderTabs(); return; }
    if (d.kind === 'click' && !d.moved) {
      if (ed.tab !== 'layout') { if (ed.sel !== -1) { ed.sel = -1; renderTabs(); changed(true); } return; }
      if (ed.pts.length >= DL.CUSTOM.MAX_PTS) { toast('That is the maximum number of points'); return; }
      const h = rayHit(px, pz); if (!h) return; const w = [h[0], h[2]], np = inMap(w);
      let at = ed.pts.length, near = false;
      if (ed.spline && ed.pts.length >= 2) {
        for (let i = 0; i < ed.spline.xs.length; i += 2) if (Math.hypot(ed.spline.xs[i] - w[0], ed.spline.zs[i] - w[1]) < 14) { near = true; break; }
        if (near) {
          let bs = 1e9, bk = ed.pts.length - 2;
          for (let k = 0; k < ed.pts.length - 1; k++) {
            const A = ed.pts[k], B = ed.pts[k + 1], dx = B[0] - A[0], dz = B[1] - A[1], l2 = dx * dx + dz * dz || 1;
            const t = DL.clamp(((w[0] - A[0]) * dx + (w[1] - A[1]) * dz) / l2, 0, 1), dd = Math.hypot(A[0] + dx * t - w[0], A[1] + dz * t - w[1]);
            if (dd < bs) { bs = dd; bk = k; }
          }
          at = bk + 1;
        }
      }
      snap(); ed.pts.splice(at, 0, np); insertElev(at); ed.sel = at; changed(false, 'layout');
    }
  };
  cv.addEventListener('pointerup', onUp);
  // a drag must never get stuck (lost pointer, released over the panel or outside the window)
  const abort = () => { if (!drag) return; const d = drag; drag = null; ed.camDrag = false; if (d.kind === 'pt' || d.kind === 'elev' || d.kind === 'paint') { ed.dirtyPaint = false; changed(false, 'terrain'); } };
  cv.addEventListener('pointercancel', abort); cv.addEventListener('lostpointercapture', abort); window.addEventListener('blur', abort);
  window.addEventListener('pointerup', e => { if (drag && e.target !== cv) abort(); });
  cv.addEventListener('pointerleave', () => { ed.hit = null; ed.ptr = null; });
  cv.addEventListener('dblclick', e => { if (ed.tab !== 'layout') return; const [px, pz] = evPos(e), i = hitPoint(px, pz); if (i >= 0) { snap(); ed.pts.splice(i, 1); if (ed.ext.elev) ed.ext.elev.splice(i, 1); ed.sel = -1; changed(false, 'layout'); } });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); const V = EV(); V.dist = DL.clamp(V.dist * Math.exp(e.deltaY * 0.0012), 40, 4200); }, { passive: false });
  // profile: pick and drag waypoint heights
  let pdrag = null;
  pcv.addEventListener('pointerdown', e => {
    const M = profMap(); if (!M) return; pcv.setPointerCapture(e.pointerId); const r = pcv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    let best = -1, bd = 22; (M.tr.wpIdx || []).forEach((wi, i) => { const d = Math.hypot(M.X(M.tr.s[wi]) - px, M.Y(M.tr.py[wi]) - py); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { ed.sel = best; ensureElev(); snap(); pdrag = { i: best, moved: false, y0: M.y0 }; renderTabs(); changed(true); }
  });
  pcv.addEventListener('pointermove', e => {
    if (!pdrag) return; const M = profMap(); if (!M) return; const r = pcv.getBoundingClientRect(), py = e.clientY - r.top;
    ed.ext.elev[pdrag.i] = Math.round(DL.clamp(M.inv(py) - pdrag.y0, DL.EXT_LIM.ELEV_MIN, DL.EXT_LIM.ELEV_MAX)); pdrag.moved = true; prevKey = ''; try { previewTrack(true); } catch (er) { } changed(true, 'terrain');
    const hs = $('edHeight'); if (hs) { hs.value = ed.ext.elev[pdrag.i]; $('edHeightV').textContent = ed.ext.elev[pdrag.i] + ' m'; hs.disabled = false; }
  });
  pcv.addEventListener('pointerup', () => { if (!pdrag) return; if (!pdrag.moved) ed.hist.pop(); pdrag = null; changed(false, 'terrain'); });
  window.addEventListener('keydown', e => {
    if ($('editor').hidden || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    if ((e.code === 'Delete' || e.code === 'Backspace') && ed.sel >= 0 && ed.tab === 'layout') { e.preventDefault(); $('edDel') && $('edDel').click(); }
    else if (e.code === 'KeyQ' || e.code === 'KeyE') EV().th += e.code === 'KeyQ' ? 0.12 : -0.12;
    else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { e.preventDefault(); EV().dist = DL.clamp(EV().dist * (e.code === 'ArrowUp' ? 0.88 : 1.14), 40, 4200); }
    else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); $('edUndo').click(); }
  });
  const setCam = m => { ed.cam = ed.cam === m ? '' : m; $('edHand').classList.toggle('on', ed.cam === 'pan'); $('edOrbit').classList.toggle('on', ed.cam === 'orbit'); cv.style.cursor = ed.cam === 'pan' ? 'grab' : ed.cam === 'orbit' ? 'move' : ''; };
  $('edHand').onclick = () => setCam('pan'); $('edOrbit').onclick = () => setCam('orbit');
  $('edZoomIn').onclick = () => { const V = EV(); V.dist = DL.clamp(V.dist * 0.78, 40, 4200); }; $('edZoomOut').onclick = () => { const V = EV(); V.dist = DL.clamp(V.dist / 0.78, 40, 4200); };

  document.addEventListener('scroll', e => { if ($('editor').hidden) return; const t = e.target; if (t === document || t === $('editor') || t === document.querySelector('.ed-wrap')) { window.scrollTo(0, 0); $('editor').scrollLeft = 0; document.querySelector('.ed-wrap').scrollLeft = 0; } }, true);
  $('edName').addEventListener('input', e => { ed.name = e.target.value; clearTimeout(saveT); saveT = setTimeout(saveDraft, 400); });
  $('edUndo').onclick = () => { const p = ed.hist.pop(); if (p) { const o = JSON.parse(p); ed.pts = o[0]; ed.ext = o[1]; ed.sel = -1; ed.tr = null; prevKey = ''; renderTabs(); changed(false, 'terrain'); } };
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
    ed.tested = null; ed.tr = null; prevKey = ''; renderTabs(); changed(false, 'terrain'); previewTrack(true); fit(); scheduleWorld(0);
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
