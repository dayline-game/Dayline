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
  const reg = r => { DL.customTracks[r.id] = { id: r.id, name: r.name, biome: r.biome, pts: r.pts }; };
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
    rows.forEach(r => grid.appendChild(card(r)));
    const want = cm.focus || (cm.sel && cm.sel.id); cm.focus = null;
    const hit = want && rows.find(r => r.id === want);
    if (hit) selectTrack(hit, true); else if (cm.sel && !hit) closeSide();
  };

  function card(r) {
    const el = h(`<button class="cm-card" data-id="${esc(r.id)}"><div class="bd"><b class="nm"></b><div class="mt"></div></div></button>`);
    el.insertBefore(thumbImg(r, 320, 200), el.firstChild);
    el.querySelector('.nm').textContent = r.name;
    const best = Net.save.best[r.id], by = r.by && r.by.uid === Net.uid ? 'You' : ((r.by && r.by.tag) || 'Driver');
    el.querySelector('.mt').innerHTML = `<span>${esc((DL.BIOMES[r.biome] || {}).name || r.biome)}</span><span>${fmtLen(r.length)}</span><span>${r.n} driver${r.n === 1 ? '' : 's'}</span><span>by ${esc(by)}</span>` + (best ? `<span class="pb">PB ${DL.fmtTime(best).slice(1, 9)}</span>` : '');
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
      <div class="acts"><button class="btn btn-go" id="cmPlay">Play <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l12 8-12 8z"/></svg></button>${mineT ? '<button class="btn btn-line btn-sm" id="cmDel">Delete</button>' : ''}</div>
      <div class="lbl" style="padding:2px 16px 6px;display:flex;justify-content:space-between"><span>Fastest times</span><span id="cmSel"></span></div>
      <div class="tl" id="cmTimes"><div class="empty"><p>Loading times…</p></div></div>`;
    side.insertBefore(thumbImg(r, 480, 300, 'th-big'), side.firstChild);
    side.querySelector('h3').textContent = r.name;
    $('cmClose').onclick = closeSide;
    const sel = X.board.sel[r.id] || (X.board.sel[r.id] = {});
    const upd = () => { const n = Object.keys(sel).length; $('cmSel').textContent = n ? n + ' ghost' + (n > 1 ? 's' : '') + ' selected' : 'Pick up to 3 ghosts'; };
    upd();
    $('cmPlay').onclick = () => X.startRace(r.id, Object.values(sel), DL.customTracks[r.id], { leave: 'community' });
    const db = $('cmDel');
    if (db) db.onclick = async () => {
      if (!db.dataset.sure) { db.dataset.sure = 1; db.textContent = 'Tap again to delete'; setTimeout(() => { db.dataset.sure = ''; db.textContent = 'Delete'; }, 3000); return; }
      db.disabled = true;
      if (await Net.ctDelete(r.id)) { toast('Track deleted'); closeSide(); UI.renderCommunity(); } else { toast('Could not delete that track'); db.disabled = false; }
    };
    // the 3D scene behind the panel shows this track
    clearTimeout(bgTimer); bgTimer = setTimeout(() => { try { if (cm.sel && cm.sel.id === r.id) Game.loadDay(r.id, DL.customTracks[r.id]); } catch (e) { console.warn(e); } }, 220);
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

  // ---------------- editor ----------------
  const ed = { id: null, name: '', biome: 'country', pts: [], sel: -1, v: { cx: 0, cz: 0, s: 0.3 }, tested: null, testKey: null, prob: null, spline: null, hist: [], res: { ok: false, error: '' }, W: 0, H: 0 };
  const cv = $('edCanvas'), cx = cv.getContext('2d');
  const newId = () => 'c_' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => (b % 36).toString(36)).join('');
  const edKey = () => JSON.stringify([ed.biome, ed.pts]);
  const STARTER = [[-460, 120], [-250, 120], [-40, 250], [200, 220]];

  UI.openEditor = function (d) {
    if (d) { Object.assign(ed, { id: d.id, name: d.name || '', biome: d.biome || 'country', pts: d.pts.map(p => [p[0], p[1]]), sel: -1, tested: null, hist: [] }); }
    else Object.assign(ed, { id: newId(), name: '', biome: 'country', pts: STARTER.map(p => p.slice()), sel: -1, tested: null, hist: [] });
    ed.fitNext = true; show('editor');
  };
  UI.renderEditor = function () {
    if (!ed.id) { Object.assign(ed, { id: newId(), pts: STARTER.map(p => p.slice()) }); }
    $('edName').value = ed.name;
    $('edBiomes').innerHTML = '';
    DL.BIOME_KEYS.forEach(k => {
      const b = h(`<button class="chk ${ed.biome === k ? 'on' : ''}" data-k="${k}">${esc(DL.BIOMES[k].name)}</button>`);
      b.onclick = () => { snap(); ed.biome = k; changed(); renderBiomes(); };
      $('edBiomes').appendChild(b);
    });
    requestAnimationFrame(() => { sizeCanvas(); if (ed.fitNext) { fit(); ed.fitNext = false; } changed(true); });
  };
  const renderBiomes = () => [...$('edBiomes').children].forEach(b => b.classList.toggle('on', b.dataset.k === ed.biome));
  function sizeCanvas() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    ed.W = r.width; ed.H = r.height; ed.dpr = dpr; cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
  }
  window.addEventListener('resize', () => { if (!$('editor').hidden) { sizeCanvas(); draw(); } });
  function fit() {
    let s = Math.min(ed.W, ed.H) / (2 * LIM * 0.92), c = [0, 0];
    if (ed.pts.length) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      ed.pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
      s = DL.clamp(Math.min(ed.W / (x1 - x0 + 320), ed.H / (z1 - z0 + 320)), 0.12, 1.1); c = [(x0 + x1) / 2, (z0 + z1) / 2];
    }
    ed.v = { cx: c[0], cz: c[1], s };
  }
  const w2c = (x, z) => [ed.W / 2 + (x - ed.v.cx) * ed.v.s, ed.H / 2 - (z - ed.v.cz) * ed.v.s];
  const c2w = (px, pz) => [ed.v.cx + (px - ed.W / 2) / ed.v.s, ed.v.cz - (pz - ed.H / 2) / ed.v.s];
  const snap = () => { ed.hist.push(JSON.stringify(ed.pts)); if (ed.hist.length > 60) ed.hist.shift(); };

  let saveT = 0;
  function changed(noSave) {
    ed.spline = null;
    if (ed.pts.length >= 2) { try { ed.spline = DL.customCenterline(ed.pts); } catch (e) { } }
    ed.res = DL.validateCustomTrack(ed.pts); ed.prob = ed.res.ok ? null : (ed.res.at || null);
    const tested = ed.tested && ed.tested.key === edKey();
    $('edLen').textContent = ed.spline ? Math.round((ed.spline.xs.length - 1) * 4) + ' m' : '0 m'; $('edPts').textContent = ed.pts.length;
    const st = $('edStatus');
    if (ed.res.ok) { st.className = 'ed-status ok'; st.textContent = tested ? 'Tested ✓ Ready to publish' : 'Valid track. Test drive it to unlock publishing'; }
    else { st.className = 'ed-status bad'; st.textContent = ed.res.error; }
    $('edTest').disabled = !ed.res.ok; $('edPublish').disabled = !(ed.res.ok && tested);
    $('edPublish').title = tested ? '' : 'Finish a test drive on this exact layout first';
    $('edDel').disabled = ed.sel < 0; $('edUndo').disabled = !ed.hist.length;
    draw();
    if (!noSave) { clearTimeout(saveT); saveT = setTimeout(() => { if (ed.id && ed.pts.length) putDraft({ id: ed.id, name: ed.name, biome: ed.biome, pts: ed.pts, at: Date.now() }); }, 400); }
  }

  function draw() {
    const B = DL.BIOMES[ed.biome], hex = n => '#' + ('000000' + n.toString(16)).slice(-6), W = ed.W, H = ed.H;
    cx.setTransform(ed.dpr, 0, 0, ed.dpr, 0, 0);
    cx.fillStyle = hex(B.ground[1]); cx.fillRect(0, 0, W, H);
    // outside the buildable area
    const a = w2c(-LIM, LIM), b = w2c(LIM, -LIM);
    cx.fillStyle = 'rgba(17,21,29,.28)'; cx.fillRect(0, 0, W, H); cx.fillStyle = hex(B.ground[1]); cx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    cx.globalAlpha = 0.14; cx.fillStyle = hex(B.ground[2]); cx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); cx.globalAlpha = 1;
    // grid every 100 m
    cx.strokeStyle = 'rgba(17,21,29,.10)'; cx.lineWidth = 1; cx.beginPath();
    for (let g = -LIM; g <= LIM; g += 100) { const p = w2c(g, 0), q = w2c(0, g); cx.moveTo(p[0], a[1]); cx.lineTo(p[0], b[1]); cx.moveTo(a[0], q[1]); cx.lineTo(b[0], q[1]); }
    cx.stroke();
    cx.strokeStyle = 'rgba(17,21,29,.5)'; cx.setLineDash([8, 6]); cx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); cx.setLineDash([]);
    // road
    const sp = ed.spline, s = ed.v.s;
    if (sp && sp.xs.length > 1) {
      const path = () => { cx.beginPath(); const p0 = w2c(sp.xs[0], sp.zs[0]); cx.moveTo(p0[0], p0[1]); for (let i = 1; i < sp.xs.length; i++) { const p = w2c(sp.xs[i], sp.zs[i]); cx.lineTo(p[0], p[1]); } };
      cx.lineJoin = 'round'; cx.lineCap = 'round';
      path(); cx.strokeStyle = '#f3ead7'; cx.lineWidth = Math.max(8, 15 * s + 2); cx.stroke();
      path(); cx.strokeStyle = ed.res.ok ? '#2c3548' : '#5a3a40'; cx.lineWidth = Math.max(6, 13 * s); cx.stroke();
      path(); cx.strokeStyle = 'rgba(243,234,215,.8)'; cx.lineWidth = 1.4; cx.setLineDash([8, 9]); cx.stroke(); cx.setLineDash([]);
      // direction arrows
      cx.fillStyle = 'rgba(243,234,215,.9)';
      for (let i = 14; i < sp.xs.length - 4; i += 28) {
        const p = w2c(sp.xs[i], sp.zs[i]), q = w2c(sp.xs[i + 2], sp.zs[i + 2]), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
        cx.save(); cx.translate(p[0], p[1]); cx.rotate(ang); cx.beginPath(); cx.moveTo(6, 0); cx.lineTo(-4, -4.5); cx.lineTo(-4, 4.5); cx.closePath(); cx.fill(); cx.restore();
      }
    }
    if (ed.prob) { const p = w2c(ed.prob[0], ed.prob[1]); cx.strokeStyle = '#d4441f'; cx.lineWidth = 3; cx.beginPath(); cx.arc(p[0], p[1], 22, 0, 7); cx.stroke(); cx.fillStyle = 'rgba(212,68,31,.18)'; cx.fill(); }
    // waypoints
    ed.pts.forEach((p, i) => {
      const q = w2c(p[0], p[1]), first = i === 0, last = i === ed.pts.length - 1 && i > 0, on = i === ed.sel;
      cx.beginPath(); cx.arc(q[0], q[1], on ? 10 : 8, 0, 7);
      cx.fillStyle = first ? '#3f7d5a' : last ? '#f05a35' : '#f3ead7'; cx.fill();
      cx.lineWidth = on ? 3 : 2; cx.strokeStyle = on ? '#f05a35' : '#1c2536'; cx.stroke();
      cx.fillStyle = first || last ? '#fff' : '#1c2536'; cx.font = '700 10px Barlow, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(first ? 'S' : last ? 'F' : String(i), q[0], q[1] + 0.5);
    });
    if (!ed.pts.length) { cx.fillStyle = 'rgba(17,21,29,.6)'; cx.font = '700 22px Barlow Condensed, sans-serif'; cx.textAlign = 'center'; cx.fillText('Click to place the start', W / 2, H / 2); }
    // scale bar
    const m100 = 100 * s; cx.fillStyle = 'rgba(17,21,29,.75)'; cx.fillRect(16, H - 24, m100, 3); cx.font = '700 11px Barlow, sans-serif'; cx.textAlign = 'left'; cx.fillText('100 m', 16, H - 32);
  }

  // pointer interaction
  let drag = null;
  const evPos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const hitPoint = (px, pz) => { let best = -1, bd = 14; ed.pts.forEach((p, i) => { const q = w2c(p[0], p[1]), d = Math.hypot(q[0] - px, q[1] - pz); if (d < bd) { bd = d; best = i; } }); return best; };
  cv.addEventListener('pointerdown', e => {
    if (e.button === 2) return;
    cv.setPointerCapture(e.pointerId);
    const [px, pz] = evPos(e), i = hitPoint(px, pz);
    if (i >= 0) { ed.sel = i; snap(); drag = { kind: 'pt', i, moved: false }; changed(true); }
    else drag = { kind: 'pan', x: px, z: pz, cx: ed.v.cx, cz: ed.v.cz, moved: false };
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; const [px, pz] = evPos(e);
    if (drag.kind === 'pt') {
      const w = c2w(px, pz); ed.pts[drag.i] = [DL.clamp(Math.round(w[0]), -LIM, LIM), DL.clamp(Math.round(w[1]), -LIM, LIM)]; drag.moved = true; ed.tested = ed.tested; changed(true);
    } else {
      if (Math.hypot(px - drag.x, pz - drag.z) > 4) drag.moved = true;
      if (drag.moved) { ed.v.cx = drag.cx - (px - drag.x) / ed.v.s; ed.v.cz = drag.cz + (pz - drag.z) / ed.v.s; draw(); }
    }
  });
  cv.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null; const [px, pz] = evPos(e);
    if (d.kind === 'pt') { if (!d.moved) ed.hist.pop(); else changed(); return; }
    if (d.moved) return;
    // a click on empty map: insert on the road if it is close to it, otherwise extend the track
    if (ed.pts.length >= DL.CUSTOM.MAX_PTS) { toast('That is the maximum number of points'); return; }
    const w = c2w(px, pz), np = [DL.clamp(Math.round(w[0]), -LIM, LIM), DL.clamp(Math.round(w[1]), -LIM, LIM)];
    let at = ed.pts.length, near = false;
    if (ed.spline && ed.pts.length >= 2) {
      let bd = 16 / ed.v.s;
      for (let i = 0; i < ed.spline.xs.length; i += 2) { const dd = Math.hypot(ed.spline.xs[i] - w[0], ed.spline.zs[i] - w[1]); if (dd < bd) { bd = dd; near = true; } }
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
    snap(); ed.pts.splice(at, 0, np); ed.sel = at; changed();
  });
  cv.addEventListener('dblclick', e => { const [px, pz] = evPos(e), i = hitPoint(px, pz); if (i >= 0) { snap(); ed.pts.splice(i, 1); ed.sel = -1; changed(); } });
  cv.addEventListener('contextmenu', e => { e.preventDefault(); const [px, pz] = evPos(e), i = hitPoint(px, pz); if (i >= 0) { snap(); ed.pts.splice(i, 1); ed.sel = -1; changed(); } });
  cv.addEventListener('wheel', e => {
    e.preventDefault(); const [px, pz] = evPos(e), w = c2w(px, pz), k = Math.exp(-e.deltaY * 0.0014);
    ed.v.s = DL.clamp(ed.v.s * k, 0.1, 1.6); const w2 = c2w(px, pz); ed.v.cx += w[0] - w2[0]; ed.v.cz += w[1] - w2[1]; draw();
  }, { passive: false });
  window.addEventListener('keydown', e => {
    if ($('editor').hidden || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    if ((e.code === 'Delete' || e.code === 'Backspace') && ed.sel >= 0) { e.preventDefault(); $('edDel').click(); }
    else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); $('edUndo').click(); }
  });

  $('edName').addEventListener('input', e => { ed.name = e.target.value; clearTimeout(saveT); saveT = setTimeout(() => putDraft({ id: ed.id, name: ed.name, biome: ed.biome, pts: ed.pts, at: Date.now() }), 400); });
  $('edUndo').onclick = () => { const p = ed.hist.pop(); if (p) { ed.pts = JSON.parse(p); ed.sel = -1; changed(); } };
  $('edDel').onclick = () => { if (ed.sel >= 0) { snap(); ed.pts.splice(ed.sel, 1); ed.sel = -1; changed(); } };
  $('edClear').onclick = () => { if (!ed.pts.length) return; snap(); ed.pts = []; ed.sel = -1; changed(); };
  $('edFit').onclick = () => { fit(); draw(); };
  $('edExit').onclick = () => show('community');
  $('edTest').onclick = () => {
    if (!ed.res.ok) return;
    const custom = { id: ed.id, name: ed.name || 'Untitled track', biome: ed.biome, pts: ed.pts.map(p => [p[0], p[1]]) };
    DL.customTracks[ed.id] = custom; ed.testKey = edKey();
    X.startRace(ed.id, [], custom, { test: true, leave: 'editor' });
  };
  $('edPublish').onclick = () => doPublish($('edPublish'));

  async function doPublish(btn) {
    const t = ed.tested; if (!t || t.key !== edKey()) { toast('Test drive this exact layout first'); return; }
    if (Net.mode !== 'online' || !Net.api) { toast('Publishing needs the online leaderboard. ' + Net.status); return; }
    const old = btn && btn.textContent; if (btn) { btn.disabled = true; btn.textContent = 'Publishing…'; }
    const custom = { id: ed.id, name: (ed.name || 'Untitled track').trim() || 'Untitled track', biome: ed.biome, pts: ed.pts.map(p => [p[0], p[1]]) };
    const r = await Net.ctPublish({ id: custom.id, name: custom.name, biome: custom.biome, pts: custom.pts, time: Math.round(t.time * 1000) / 1000, ghost: t.ghost });
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
