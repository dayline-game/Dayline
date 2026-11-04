/* DAYLINE — screens, HUD, garage paint editor, shop, leaderboards, archive, modals, boot */
'use strict';
(function (DL) {
  const UI = DL.UI = {};
  const $ = id => document.getElementById(id);
  const Net = DL.Net, Game = DL.Game;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  let screen = 'loading';
  const SCREENS = ['menu', 'garage', 'shop', 'board', 'archive', 'hud', 'replay'];
  const today = () => DL.dayKey();

  DL.biomeOf = day => DL.BIOMES[DL.BIOME_KEYS[Math.floor(DL.mulberry32(DL.hashStr('dayline:' + day))() * DL.BIOME_KEYS.length)]];
  const trackCache = {};
  const trackFor = day => trackCache[day] || (trackCache[day] = (Game.track() && Game.track().day === day ? Game.track() : new DL.Track(day)));

  function show(name) {
    screen = name;
    SCREENS.forEach(s => { $(s).hidden = s !== name; });
    $('topnav').hidden = name === 'hud' || name === 'replay';
    closeModal();
    if (name !== 'shop' && Game._preview) Game.showcase(null);
    Game.setMode(name === 'hud' ? 'race' : name);
    if (name !== 'replay') $('hGap').hidden = true;
    DL.Audio.click();
    if (name === 'menu') renderMenu();
    if (name === 'garage') renderGarage();
    if (name === 'shop') renderShop();
    if (name === 'board') renderBoard();
    if (name === 'archive') renderArchive();
  }
  UI.show = show;
  UI.back = function () { if ($('modalRoot').firstChild) { closeModal(); return; } if (screen === 'replay') { show('board'); return; } if (['garage', 'shop', 'board', 'archive'].includes(screen)) show('menu'); };
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => show('menu')));

  // ---------------- toasts & modals ----------------
  function toast(html, ms) {
    const t = h(`<div class="toast">${html}</div>`); $('toasts').appendChild(t);
    setTimeout(() => t.remove(), ms || 3200);
  }
  UI.toast = toast;
  DL.on('toast', m => toast(esc(m)));
  DL.on('achievement', a => { toast(`<b>${esc(a.name)}</b> +${a.coins} <span class="coin"></span>`, 4000); DL.Audio.coin(); });

  function modal(inner, opts) {
    closeModal();
    const bg = h(`<div class="modal-bg"><div class="panel modal" role="dialog" aria-modal="true"></div></div>`);
    const m = bg.firstElementChild; m.appendChild(typeof inner === 'string' ? h(`<div class="stack">${inner}</div>`) : inner);
    if (!opts || !opts.sticky) bg.addEventListener('pointerdown', e => { if (e.target === bg) closeModal(); });
    $('modalRoot').appendChild(bg);
    return m;
  }
  function closeModal() { const r = $('modalRoot'); while (r.firstChild) r.firstChild.remove(); }

  // ---------------- top nav ----------------
  function renderCoins() { $('coinCount').textContent = Net.save.coins.toLocaleString('en-GB'); }
  $('navSettings').onclick = openSettings;
  $('navProfile').onclick = () => openProfile(null);
  $('navShare').onclick = openShare;

  // ---------------- menu ----------------
  function streakNow() {
    const s = Net.save, t = today();
    return (s.lastDay === t || s.lastDay === DL.addDays(t, -1)) ? s.streak : 0;
  }
  function renderMenu() {
    const t = trackFor(today()), d = today();
    $('mDayNo').textContent = 'Daily No. ' + DL.dayNumber(d);
    $('mDate').textContent = DL.prettyDay(d);
    $('mBiome').textContent = t.B.name;
    $('mLength').textContent = t.ramps.length + (t.ramps.length === 1 ? ' jump' : ' jumps') + (t.shortcut ? ' · shortcut' : '');
    const best = Net.save.best[d];
    $('mMedals').innerHTML = `<div class="medal-cell"><span class="lbl">Length</span><b class="num">${(t.length / 1000).toFixed(2)} km</b></div>
      <div class="medal-cell"><span class="lbl">Checkpoints</span><b class="num">${t.checkpoints.length}</b></div>
      <div class="medal-cell" style="background:var(--navy)"><span class="lbl" style="color:var(--cream-3)">Your best</span><b class="num" style="color:var(--cream)">${best ? DL.fmtTime(best).slice(1, 8) : 'No time'}</b></div>`;
    const st = streakNow();
    $('mStreak').textContent = st + (st === 1 ? ' day' : ' days') + (Net.save.lastDay === d ? '' : st ? ' · race today to keep it' : '');
    $('mStreakBars').innerHTML = Array.from({ length: 7 }, (_, i) => `<i class="${i < Math.min(st, 7) ? 'on' : ''}"></i>`).join('');
    renderNet();
  }
  function renderNet() {
    ['mNet', 'bNet'].forEach(id => {
      const el = $(id); if (!el) return;
      el.classList.toggle('on', Net.mode === 'online');
      el.querySelector('span').textContent = Net.mode === 'connecting' ? 'Connecting to the leaderboard…' : Net.status;
    });
  }
  setInterval(() => {
    const ms = DL.msToNextDay(), s = Math.floor(ms / 1000);
    $('mCountdown').textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, '0')).join(':');
    if (UI._day && UI._day !== today()) { UI._day = today(); if (screen === 'menu') { Game.loadDay(today()); renderMenu(); toast('<b>New daily track is live</b>'); } }
  }, 500);

  $('bRace').onclick = () => startRace(today(), []);
  $('bGarage').onclick = () => show('garage');
  $('bBoard').onclick = () => { board.day = today(); board.tab = 'daily'; show('board'); };
  $('bArchive').onclick = () => show('archive');
  $('bShop').onclick = () => show('shop');

  function startRace(day, ghosts) {
    DL.Audio.init();
    show('hud');
    const touchOn = Game.settings.touch === 'on' || (Game.settings.touch === 'auto' && (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window));
    $('touch').classList.toggle('on', touchOn);
    Game.startRace(day, ghosts);
  }

  // ---------------- HUD ----------------
  let deltaTimer = 0, bannerTimer = 0;
  UI.raceStarted = function (r) {
    const best = Net.save.best[r.track.day];
    $('hPB').textContent = best ? 'PB ' + DL.fmtTime(best) : 'No time yet';
    $('hDots').innerHTML = r.track.checkpoints.map(() => '<i></i>').join('');
    $('hCP').textContent = '0 / ' + r.track.checkpoints.length;
    $('hDelta').className = 'delta';
    $('hCount').hidden = true;
    $('hUnit').textContent = Game.settings.units === 'mph' ? 'mph' : 'km/h';
    closeModal();
    UI.ghostsChanged(r);
  };
  UI.ghostsChanged = r => { $('hGhost').classList.toggle('off', !r.ghostsOn || !r.ghosts.length); $('hGhost').title = r.ghosts.length ? `${r.ghosts.length} ghost${r.ghosts.length > 1 ? 's' : ''} (G)` : 'No ghosts loaded'; };
  UI.count = function (n) {
    const el = $('hCount');
    if (n > 0) { el.hidden = false; el.textContent = n; }
    else { el.textContent = 'Go'; setTimeout(() => { el.hidden = true; }, 600); }
  };
  UI.banner = function (txt, ms) {
    const b = $('hBanner'); b.textContent = txt; b.classList.add('show');
    clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), ms || 1200);
  };
  UI.checkpoint = function (k, total, delta) {
    $('hCP').textContent = k + ' / ' + total;
    [...$('hDots').children].forEach((d, i) => d.classList.toggle('on', i < k));
    if (delta != null) {
      const d = $('hDelta'); d.textContent = DL.fmtDelta(delta); d.className = 'delta show ' + (delta <= 0 ? 'good' : 'bad');
      clearTimeout(deltaTimer); deltaTimer = setTimeout(() => d.classList.remove('show'), 2500);
    } else if (k < total) UI.banner('Checkpoint ' + k, 900);
  };
  let lastHud = 0;
  UI.hud = function (r, t) {
    const now = performance.now(); if (now - lastHud < 33) return; lastHud = now;
    $('hTimer').textContent = DL.fmtTime(t);
    const sp = r.car.speed * (Game.settings.units === 'mph' ? 2.237 : 3.6);
    $('hSpeed').textContent = Math.round(sp);
  };
  UI.ghostGap = function (name, d, done) {
    const el = $('hGap');
    if (name == null) { el.hidden = true; return; }
    const a = Math.abs(d), txt = a < 1.5 ? 'level' : (a < 1000 ? Math.round(a) + ' m' : (a / 1000).toFixed(1) + ' km');
    el.hidden = false; el.className = 'ghostgap ' + (d > 1.5 ? 'ahead' : d < -1.5 ? 'behind' : '');
    el.innerHTML = '';
    const n = document.createElement('span'); n.textContent = name + ' · ';
    const b = document.createElement('b'); b.textContent = a < 1.5 ? 'level' : txt + (d > 0 ? ' ahead' : ' behind');
    el.append(n, b);
  };
  $('hPause').onclick = () => Game.togglePause();
  $('hRestart').onclick = () => Game.restart();
  $('hGhost').onclick = () => openGhostPicker();
  async function openGhostPicker() {
    const r = Game.race(); if (!r || r.replay) return;
    const day = r.track.day, wasPaused = r.paused;
    Game.setPaused(true);
    const m = modal(`<div class="lbl">Race against</div><h2>Ghosts</h2>
      <div class="toggle-row"><span>Show ghosts</span><button class="chk ${r.ghostsOn ? 'on' : ''}" id="gShow">${r.ghostsOn ? 'On' : 'Off'}</button></div>
      <div class="hint">Pick up to 3 drivers from today’s board. They appear on the track straight away.</div>
      <div id="gList" class="stack"><div class="empty"><p>Loading the board…</p></div></div>
      <button class="btn btn-go" id="gDone">Back to race</button>`, { sticky: true });
    const done = () => { closeModal(); if (!wasPaused) Game.setPaused(false); };
    m.querySelector('#gDone').onclick = done;
    m.querySelector('#gShow').onclick = e => { Game.toggleGhosts(); const on = Game.race().ghostsOn; e.target.textContent = on ? 'On' : 'Off'; e.target.classList.toggle('on', on); };
    const list = m.querySelector('#gList');
    const paint = (rows, names) => {
      list.innerHTML = '';
      const active = () => Game.activeGhosts();
      const entries = [];
      const best = Net.save.best[day];
      if (best) entries.push({ spec: { uid: 'me', label: 'Your best', car: Net.save.car, l: (Net.save.paint[Net.save.car] || {}).l, b: (Net.save.paint[Net.save.car] || {}).b, equip: Net.save.equip, mine: true }, time: best, nm: 'Your best' });
      rows.forEach((x, i) => { if (x.uid === Net.uid) return; const nm = displayName(x, names); entries.push({ spec: { uid: x.uid, label: (i === 0 ? 'WR · ' : '') + nm, car: x.car, l: x.l, b: x.b, equip: x.equip, mine: false }, time: x.time, nm, rank: i + 1 }); });
      if (!entries.length) { list.innerHTML = '<div class="empty"><p>Nobody has set a time on this track yet.</p></div>'; return; }
      entries.slice(0, 16).forEach(en => {
        const row = h(`<div class="design-row" style="grid-template-columns:34px 1fr auto auto"><b class="num"></b><span></span><span class="num"></span><button class="chk"></button></div>`);
        row.children[0].textContent = en.rank ? en.rank : '★';
        row.children[1].textContent = en.nm; row.children[1].style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600';
        row.children[2].textContent = DL.fmtTime(en.time);
        const btn = row.children[3];
        const sync = () => { const on = active().some(a => a.uid === en.spec.uid || (en.spec.mine && a.mine)); btn.textContent = on ? 'On' : 'Add'; btn.classList.toggle('on', on); btn.dataset.on = on ? '1' : ''; };
        sync();
        btn.onclick = async () => {
          if (btn.dataset.on) { Game.removeGhost(en.spec.uid); sync(); return; }
          if (active().filter(a => !a.mine).length >= 3 && !en.spec.mine) { toast('Three ghosts at a time'); return; }
          btn.textContent = '…'; const ok = await Game.addGhost(en.spec);
          if (!ok) toast('Could not load that ghost');
          sync();
        };
        list.appendChild(row);
      });
    };
    if (!Net.db) { paint([], {}); return; }
    try {
      const rows = (await Net.boardDaily(day, 40)) || [];
      let names = {}; try { names = await Net.names(rows.slice(0, 16).map(x => x.uid)); } catch (e) { }
      if (!list.isConnected) return;
      paint(rows, names);
    } catch (e) { list.innerHTML = '<div class="empty"><p>The board did not answer. Try again in a moment.</p></div>'; }
  }
  $('hCam').onclick = () => Game.cycleCamera();

  UI.paused = function (on) {
    if (!on) { closeModal(); return; }
    const m = modal(`<div class="lbl">Paused</div><h2>Take a breath</h2>
      <button class="btn btn-go" id="pResume">Resume</button>
      <div class="btn-row"><button class="btn btn-line" id="pRestart">Restart</button><button class="btn btn-line" id="pRecover">Checkpoint</button></div>
      <div class="btn-row"><button class="btn btn-line" id="pSettings">Settings</button><button class="btn btn-line" id="pQuit">Quit</button></div>`, { sticky: true });
    m.querySelector('#pResume').onclick = () => Game.pause(false);
    m.querySelector('#pRestart').onclick = () => Game.restart();
    m.querySelector('#pRecover').onclick = () => { Game.pause(false); Game.recover(); };
    m.querySelector('#pSettings').onclick = () => openSettings(true);
    m.querySelector('#pQuit').onclick = () => { Game.loadDay(today()); show('menu'); };
  };

  UI.finished = function (r, t, res, valid) {
    UI.checkpoint(r.track.checkpoints.length, r.track.checkpoints.length, null);
    const day = r.track.day, isToday = day === today();
    const prev = res ? res.prevBest : Net.save.best[day];
    let cmp = '';
    if (prev) { const d = t - prev; cmp = `<span class="num" style="color:${d <= 0 ? 'var(--good)' : 'var(--bad)'}">${DL.fmtDelta(d)}</span>`; }
    const coins = res ? res.coins.map(c => `<div class="res-row"><span>${esc(c[0])}</span><b class="num">+${c[1]}</b></div>`).join('') : '';
    const m = modal(`
      <div class="lbl">${isToday ? 'Daily No. ' + DL.dayNumber(day) : 'Archive · ' + DL.prettyDay(day)} · ${esc(r.track.B.name)}</div>
      <h2>${!valid ? 'Run not counted' : res && res.isPB && prev ? 'New personal best' : 'Finished'}</h2>
      <div class="res-time">${DL.fmtTime(t)}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${r.recoveries ? `<span class="tag">${r.recoveries} recover${r.recoveries > 1 ? 'ies' : 'y'}</span>` : '<span class="tag">Clean run</span>'}
      </div>
      ${!valid ? '<p class="hint">This run failed the plausibility check (it skipped part of the route), so it was not saved.</p>' : ''}
      <div>
        <div class="res-row"><span>Previous best</span><b class="num">${prev ? DL.fmtTime(prev) : '—'} ${cmp}</b></div>
        <div class="res-row"><span>Board position</span><b id="rPos" class="num">${Net.db && Net.mode === 'online' ? 'Checking…' : 'Saved on this device'}</b></div>
        ${coins}
        ${res && res.total ? `<div class="res-row" style="border:0"><span class="lbl">Coins earned</span><b class="price num" style="font-size:26px"><span class="coin"></span>+${res.total}</b></div>` : ''}
      </div>
      <div class="btn-row"><button class="btn btn-go" id="rRetry" style="font-size:24px">Retry</button><button class="btn btn-line" id="rMenu">Menu</button></div>
      <button class="btn btn-line btn-sm" id="rBoard">View leaderboard</button>`, { sticky: true });
    m.querySelector('#rRetry').onclick = () => Game.restart();
    m.querySelector('#rMenu').onclick = () => { Game.loadDay(today()); show('menu'); };
    m.querySelector('#rBoard').onclick = () => { board.day = day; board.tab = 'daily'; Game.loadDay(today()); show('board'); };
    if (res && res.total) { DL.Audio.coin(); renderCoins(); }
    if (Net.db && Net.mode === 'online' && valid) {
      setTimeout(async () => {
        try {
          const rows = (await Net.boardDaily(day, 500)).filter(x => x.time >= r.track.minTime);
          const mine = Net.save.best[day];
          let pos = rows.findIndex(x => x.uid === Net.uid) + 1;
          if (!pos) pos = rows.filter(x => x.time < mine).length + 1;
          const el = $('rPos'); if (el) el.textContent = `#${pos} of ${Math.max(rows.length, pos)}`;
          if (isToday && pos <= 10 && rows.length >= 1) Net.award('top10');
        } catch (e) { const el = $('rPos'); if (el) el.textContent = 'Board unreachable'; }
      }, 900);
    }
  };

  // ---------------- garage ----------------
  let gTab = 'cars';
  $('gTabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (!b) return; gTab = b.dataset.tab; renderGarage(); });
  $('gRace').onclick = () => startRace(today(), []);

  function renderGarage() {
    const s = Net.save, spec = DL.CARS[s.car];
    $('gCarName').textContent = spec.name; $('gCarClass').textContent = spec.cls;
    [...$('gTabs').children].forEach(t => t.classList.toggle('on', t.dataset.tab === gTab));
    const body = $('gBody'); body.innerHTML = '';
    Game.showcase(null);
    if (gTab !== 'paint') ed = null;
    if (gTab === 'cars') {
      const wrap = h('<div class="items"></div>');
      DL.CAR_ORDER.forEach(id => {
        const c = DL.CARS[id], own = Net.owns('cars', id);
        const it = h(`<div class="item ${s.car === id ? 'sel' : ''}"><div class="lbl">${esc(c.cls)}</div><div class="nm">${esc(c.name)}</div>
          <div class="row">${own ? (s.car === id ? '<span class="tag coral">Driving</span>' : '<button class="btn btn-navy btn-sm">Drive</button>') : `<span class="price"><span class="coin"></span>${c.price}</span><button class="btn btn-line btn-sm">Shop</button>`}</div></div>`);
        const b = it.querySelector('button');
        if (b) b.onclick = () => {
          if (own) { s.car = id; if (!s.paint[id]) s.paint[id] = { l: DL.encodeLivery(DL.defaultLivery()), b: DL.DEFAULT_BASE }; Net.persist(); Net.pushProfile(); Game.refreshPlayerCar(); renderGarage(); }
          else { shop.tab = 'cars'; show('shop'); }
        };
        wrap.appendChild(it);
      });
      body.appendChild(wrap);
      body.appendChild(h('<p class="hint">Every vehicle shares the same engine, grip and hitbox, so the board only measures driving. Drag the showroom to look around.</p>'));
    } else if (gTab === 'parts') {
      for (const cat of ['spoiler', 'wheels', 'bumper', 'finish', 'exhaust', 'trail']) {
        body.appendChild(h(`<div class="lbl">${DL.PART_LABELS[cat]}</div>`));
        const row = h('<div class="paint-tools"></div>');
        DL.PARTS[cat].forEach(p => {
          const own = Net.owns(cat, p.id);
          const b = h(`<button class="tool ${s.equip[cat] === p.id ? 'on' : ''}" ${own ? '' : 'disabled style="opacity:.45"'} title="${own ? '' : 'Buy in the shop'}">${esc(p.name)}</button>`);
          if (own) b.onclick = () => { s.equip[cat] = p.id; Net.persist(); Net.pushProfile(); Game.refreshPlayerCar(); renderGarage(); };
          row.appendChild(b);
        });
        body.appendChild(row);
      }
      body.appendChild(h('<p class="hint">Exhaust smoke and trails show while you race. Locked parts are in the shop.</p>'));
    } else if (gTab === 'paint') {
      renderPaint(body);
    } else if (gTab === 'designs') {
      renderDesigns(body);
    }
  }

  // ---------- pixel paint editor ----------
  let ed = null;
  const CELL = 12;
  function openEditor() {
    const s = Net.save, p = s.paint[s.car] || { l: DL.encodeLivery(DL.defaultLivery()), b: DL.DEFAULT_BASE };
    ed = { liv: DL.decodeLivery(p.l), base: p.b == null ? DL.DEFAULT_BASE : p.b, color: ed ? ed.color : 13, tool: ed ? ed.tool : 'brush', stamp: 'roundel', mirror: ed ? ed.mirror : true, undo: [], redo: [], active: 'left', canv: {} };
  }
  UI.paintActive = () => screen === 'garage' && gTab === 'paint' && !!ed;

  function renderPaint(body) {
    if (!ed) openEditor();
    const tools = [['brush', 'Brush'], ['big', 'Big brush'], ['fill', 'Fill'], ['erase', 'Eraser'], ['pick', 'Pick'], ['stamp', 'Stamp']];
    const tb = h('<div class="paint-tools"></div>');
    tools.forEach(([id, nm]) => { const b = h(`<button class="tool ${ed.tool === id ? 'on' : ''}">${nm}</button>`); b.onclick = () => { ed.tool = id; renderGarage(); }; tb.appendChild(b); });
    const mir = h(`<button class="tool ${ed.mirror ? 'on' : ''}" title="Paint both sides symmetrically">Mirror</button>`); mir.onclick = () => { ed.mirror = !ed.mirror; renderGarage(); }; tb.appendChild(mir);
    const un = h(`<button class="tool" ${ed.undo.length ? '' : 'disabled'}>Undo</button>`); un.onclick = () => undo(); tb.appendChild(un);
    const re = h(`<button class="tool" ${ed.redo.length ? '' : 'disabled'}>Redo</button>`); re.onclick = () => redo(); tb.appendChild(re);
    body.appendChild(tb);

    const pal = h('<div class="palette"></div>');
    DL.PALETTE.forEach((c, i) => {
      const sw = h(`<button class="sw ${i === 0 ? 'clear' : ''} ${ed.color === i ? 'on' : ''}" aria-label="${i === 0 ? 'Unpainted' : c}" ${c ? `style="background:${c}"` : ''}></button>`);
      sw.onclick = () => { ed.color = i; if (ed.tool === 'pick' || ed.tool === 'erase') ed.tool = 'brush'; renderGarage(); };
      pal.appendChild(sw);
    });
    body.appendChild(pal);
    const baseRow = h(`<div class="paint-tools" style="align-items:center"><span class="lbl">Base coat</span><span class="sw" style="width:28px;background:${DL.PALETTE[ed.base]}"></span>
      <button class="tool">Use selected colour</button><span style="flex:1"></span><button class="tool">Clear panel</button><button class="tool">Stripes</button><button class="tool">Checker</button></div>`);
    const bb = baseRow.querySelectorAll('button');
    bb[0].onclick = () => { if (!ed.color) return; pushUndo(); ed.base = ed.color; commit(); renderGarage(); };
    bb[1].onclick = () => { pushUndo(); panelOp(ed.active, () => 0); commit(); };
    bb[2].onclick = () => { pushUndo(); panelOp(ed.active, (x, y, p) => (y % 3 === 1) ? ed.color : null); commit(); };
    bb[3].onclick = () => { pushUndo(); panelOp(ed.active, (x, y) => ((x >> 1) + (y >> 1)) & 1 ? ed.color : null); commit(); };
    body.appendChild(baseRow);

    if (ed.tool === 'stamp') {
      const st = h('<div class="stamps"></div>');
      const owned = Net.save.owned.stickers;
      Object.keys(DL.STAMPS).forEach(k => {
        const S = DL.STAMPS[k], ok = owned.includes(S.pack);
        const b = h(`<button class="tool ${ed.stamp === k ? 'on' : ''}" ${ok ? '' : 'disabled style="opacity:.4" title="Sticker pack in the shop"'}>${k}</button>`);
        if (ok) b.onclick = () => { ed.stamp = k; renderGarage(); }; st.appendChild(b);
      });
      for (let d = 0; d < 10; d++) { const b = h(`<button class="tool ${ed.stamp === 'd' + d ? 'on' : ''}">${d}</button>`); b.onclick = () => { ed.stamp = 'd' + d; renderGarage(); }; st.appendChild(b); }
      body.appendChild(st);
    }

    const P = DL.PANELS;
    const mk = (key, extra) => {
      const p = P[key];
      const w = h(`<div class="pgrid-wrap"><div class="lbl"><span>${p.label}</span><span>${extra || ''}</span></div></div>`);
      const c = document.createElement('canvas'); c.className = 'pgrid'; c.width = p.w * CELL; c.height = p.h * CELL;
      if (ed.active === key) c.style.boxShadow = '0 0 0 2px var(--coral)';
      w.appendChild(c); ed.canv[key] = c; bindPanel(c, key);
      return w;
    };
    body.appendChild(mk('left', 'front ←'));
    body.appendChild(mk('right', 'front →'));
    body.appendChild(mk('top', 'front →'));
    const row = h('<div class="pgrid-row"></div>'); row.appendChild(mk('front')); row.appendChild(mk('rear')); body.appendChild(row);
    const hint = h(`<p class="hint">Paint on the grids or straight onto the car in the showroom. Mirror keeps both sides symmetrical. Changes save automatically; store favourites under Designs.</p>`);
    body.appendChild(hint);
    drawPanels();
  }

  function drawPanels() {
    if (!ed) return;
    const P = DL.PANELS, spec = DL.CARS[Net.save.car];
    for (const key in ed.canv) {
      const c = ed.canv[key], p = P[key], ctx = c.getContext('2d');
      ctx.fillStyle = DL.PALETTE[ed.base]; ctx.fillRect(0, 0, c.width, c.height);
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        const v = ed.liv[(p.y + y) * DL.ATLAS_W + p.x + x];
        if (v) { ctx.fillStyle = DL.PALETTE[v]; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
      }
      ctx.strokeStyle = 'rgba(28,37,54,.12)'; ctx.lineWidth = 1;
      for (let x = 1; x < p.w; x++) { ctx.beginPath(); ctx.moveTo(x * CELL + .5, 0); ctx.lineTo(x * CELL + .5, c.height); ctx.stroke(); }
      for (let y = 1; y < p.h; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL + .5); ctx.lineTo(c.width, y * CELL + .5); ctx.stroke(); }
      // silhouette guide for the side panels
      if (key === 'left' || key === 'right') {
        const zs = spec.lower.map(q => q[0]), ys = spec.lower.map(q => q[1]);
        const minZ = Math.min(...zs) - .05, maxZ = Math.max(...zs) + .05, minY = Math.min(...ys);
        const maxY = spec.paintCabin ? Math.max(...spec.cabin.map(q => q[1])) : Math.max(...ys);
        const U = z => (key === 'left' ? (maxZ - z) : (z - minZ)) / (maxZ - minZ) * c.width;
        const V = y => (1 - (y - minY) / (maxY - minY)) * c.height;
        ctx.strokeStyle = 'rgba(28,37,54,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        for (const wz of spec.wz) { ctx.beginPath(); ctx.arc(U(wz), V(spec.wr), (spec.wr * 1.15) / (maxZ - minZ) * c.width, Math.PI, 0); ctx.stroke(); }
        ctx.setLineDash([]);
      }
    }
  }

  function setCell(key, x, y, v) {
    const p = DL.PANELS[key]; if (x < 0 || y < 0 || x >= p.w || y >= p.h) return;
    ed.liv[(p.y + y) * DL.ATLAS_W + p.x + x] = v;
    if (ed.mirror) {
      const P = DL.PANELS;
      if (key === 'left') ed.liv[(P.right.y + y) * DL.ATLAS_W + P.right.x + (p.w - 1 - x)] = v;
      else if (key === 'right') ed.liv[(P.left.y + y) * DL.ATLAS_W + P.left.x + (p.w - 1 - x)] = v;
      else if (key === 'top') ed.liv[(p.y + (p.h - 1 - y)) * DL.ATLAS_W + p.x + x] = v;
      else ed.liv[(p.y + y) * DL.ATLAS_W + p.x + (p.w - 1 - x)] = v;
    }
  }
  const getCell = (key, x, y) => { const p = DL.PANELS[key]; return ed.liv[(p.y + y) * DL.ATLAS_W + p.x + x]; };
  function panelOp(key, fn) {
    const p = DL.PANELS[key];
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const v = fn(x, y, p); if (v != null) setCell(key, x, y, v); }
  }
  function applyTool(key, x, y, first) {
    const t = ed.tool;
    if (t === 'brush') setCell(key, x, y, ed.color);
    else if (t === 'big') { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) setCell(key, x + i, y + j, ed.color); }
    else if (t === 'erase') setCell(key, x, y, 0);
    else if (t === 'pick') { const v = getCell(key, x, y); ed.color = v || ed.base; ed.tool = 'brush'; renderGarage(); return; }
    else if (t === 'fill' && first) {
      const p = DL.PANELS[key], target = getCell(key, x, y), nv = ed.color; if (target === nv) return;
      const st = [[x, y]], seen = new Set();
      while (st.length) {
        const [cx, cy] = st.pop(); const k = cy * 64 + cx;
        if (cx < 0 || cy < 0 || cx >= p.w || cy >= p.h || seen.has(k) || getCell(key, cx, cy) !== target) continue;
        seen.add(k); setCell(key, cx, cy, nv);
        st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    } else if (t === 'stamp' && first) {
      let rows, w, hh;
      if (ed.stamp[0] === 'd') { const d = DL.DIGITS[+ed.stamp.slice(1)]; w = 3; hh = 5; rows = [0, 1, 2, 3, 4].map(j => d.slice(j * 3, j * 3 + 3)); }
      else { const S = DL.STAMPS[ed.stamp]; rows = S.rows; w = S.w; hh = S.h; }
      const ox = x - Math.floor(w / 2), oy = y - Math.floor(hh / 2);
      for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) if (rows[j][i] === '1') {
        // stamps read correctly on both sides: write the mirrored copy un-flipped
        const m = ed.mirror; ed.mirror = false; setCell(key, ox + i, oy + j, ed.color); ed.mirror = m;
        if (m && (key === 'left' || key === 'right')) {
          const other = key === 'left' ? 'right' : 'left', p = DL.PANELS[key];
          const mx = (p.w - 1 - x) - Math.floor(w / 2);
          ed.mirror = false; setCell(other, mx + i, oy + j, ed.color); ed.mirror = m;
        }
      }
    }
  }
  function pushUndo() { ed.undo.push({ l: ed.liv.slice(), b: ed.base }); if (ed.undo.length > 50) ed.undo.shift(); ed.redo.length = 0; }
  function undo() { if (!ed.undo.length) return; ed.redo.push({ l: ed.liv.slice(), b: ed.base }); const u = ed.undo.pop(); ed.liv = u.l; ed.base = u.b; commit(); renderGarage(); }
  function redo() { if (!ed.redo.length) return; ed.undo.push({ l: ed.liv.slice(), b: ed.base }); const u = ed.redo.pop(); ed.liv = u.l; ed.base = u.b; commit(); renderGarage(); }
  let commitT = 0;
  function commit() {
    drawPanels();
    Game.setGarageLivery(ed.liv, ed.base);
    clearTimeout(commitT);
    commitT = setTimeout(() => {
      const s = Net.save; s.paint[s.car] = { l: DL.encodeLivery(ed.liv), b: ed.base };
      if (s.paint[s.car].l !== DL.encodeLivery(DL.defaultLivery()) || ed.base !== DL.DEFAULT_BASE) Net.award('painter');
      Net.persist(); Net.pushProfile(); Game.refreshPlayerCar();
    }, 500);
  }
  function bindPanel(c, key) {
    let down = false;
    const at = e => { const r = c.getBoundingClientRect(), p = DL.PANELS[key]; return [Math.floor((e.clientX - r.left) / r.width * p.w), Math.floor((e.clientY - r.top) / r.height * p.h)]; };
    c.addEventListener('pointerdown', e => {
      down = true; c.setPointerCapture(e.pointerId);
      if (ed.active !== key) { Object.values(ed.canv).forEach(x => x.style.boxShadow = ''); c.style.boxShadow = '0 0 0 2px var(--coral)'; ed.active = key; }
      if (ed.tool !== 'pick') pushUndo();
      const [x, y] = at(e); applyTool(key, x, y, true); if (ed) commit();
    });
    c.addEventListener('pointermove', e => { if (!down || !ed || ['fill', 'stamp', 'pick'].includes(ed.tool)) return; const [x, y] = at(e); applyTool(key, x, y, false); commit(); });
    const up = () => { if (down) { down = false; refreshUndoButtons(); } };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }
  function refreshUndoButtons() { if (screen === 'garage' && gTab === 'paint') { const tb = $('gBody').querySelectorAll('.paint-tools')[0]; if (tb) { const b = tb.querySelectorAll('button'); b[b.length - 2].disabled = !ed.undo.length; b[b.length - 1].disabled = !ed.redo.length; } } }
  // painting directly on the 3D body
  let paintStroke = false;
  UI.paintUV = function (uv, start) {
    if (!ed) return;
    const ax = Math.floor(uv.x * DL.ATLAS_W), ay = Math.floor((1 - uv.y) * DL.ATLAS_H);
    for (const key in DL.PANELS) {
      const p = DL.PANELS[key];
      if (ax >= p.x && ax < p.x + p.w && ay >= p.y && ay < p.y + p.h) {
        if (start) { pushUndo(); paintStroke = true; }
        else if (['fill', 'stamp', 'pick'].includes(ed.tool)) return;
        applyTool(key, ax - p.x, ay - p.y, start); if (ed) commit();
        return;
      }
    }
  };
  UI.paintEnd = () => { paintStroke = false; refreshUndoButtons(); };

  function liveryThumb(l, b) {
    const c = document.createElement('canvas');
    DL.drawLiveryCanvas(c, DL.decodeLivery(l), b);
    return c;
  }
  function renderDesigns(body) {
    const s = Net.save;
    const f = h(`<div class="field"><label class="lbl" for="dName">Save the current paint as a design</label><div style="display:flex;gap:6px"><input type="text" id="dName" maxlength="24" placeholder="Design name" style="flex:1"><button class="btn btn-coral btn-sm" id="dSave">Save</button></div></div>`);
    body.appendChild(f);
    f.querySelector('#dSave').onclick = () => {
      const nm = f.querySelector('#dName').value.trim() || 'Design ' + (s.designs.length + 1);
      if (s.designs.length >= 10) { toast('Delete a design first — 10 is the limit'); return; }
      const p = s.paint[s.car]; s.designs.push({ name: nm.slice(0, 24), l: p.l, b: p.b });
      Net.award('painter'); Net.persist(); renderGarage(); toast('<b>Design saved</b>');
    };
    const list = h('<div class="designs"></div>');
    s.designs.forEach((d, i) => {
      const r = h(`<div class="design-row"><div></div><div><div class="nm" style="font-family:var(--f-display);font-weight:800;font-size:19px;text-transform:uppercase;color:var(--navy)">${esc(d.name)}</div><div class="hint">Works on every car</div></div><div style="display:flex;gap:5px"><button class="btn btn-navy btn-sm">Apply</button><button class="btn btn-line btn-sm" aria-label="Delete design">✕</button></div></div>`);
      r.firstElementChild.appendChild(liveryThumb(d.l, d.b));
      const [ap, del] = r.querySelectorAll('button');
      ap.onclick = () => { s.paint[s.car] = { l: d.l, b: d.b }; Net.persist(); Net.pushProfile(); Game.refreshPlayerCar(); ed = null; toast('<b>Livery applied</b>'); };
      del.onclick = () => { if (del.dataset.c) { s.designs.splice(i, 1); Net.persist(); renderGarage(); } else { del.dataset.c = 1; del.textContent = 'Delete?'; } };
      list.appendChild(r);
    });
    body.appendChild(list);
  }

  // ---------------- shop ----------------
  const shop = { tab: 'cars' };
  const SHOP_TABS = [['cars', 'Cars'], ['spoiler', 'Spoilers'], ['wheels', 'Wheels'], ['bumper', 'Bumpers'], ['exhaust', 'Exhaust'], ['trail', 'Trails'], ['finish', 'Finish'], ['stickers', 'Stickers']];
  function renderShop() {
    $('sTabs').innerHTML = SHOP_TABS.map(([k, n]) => `<button class="tab ${shop.tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('');
    const body = $('sBody'); body.innerHTML = '';
    const s = Net.save;
    if (Game._preview) {
      const n = h(`<div class="preview-note"><span>Previewing ${esc(Game._preview.label)}</span><button class="btn btn-line btn-sm" style="border-color:var(--cream);color:var(--cream)">Reset</button></div>`);
      n.querySelector('button').onclick = () => { Game.showcase(null); renderShop(); };
      body.appendChild(n);
    }
    const wrap = h('<div class="items"></div>');
    const paint = s.paint[s.car] || {};
    const cur = { car: s.car, livery: paint.l ? DL.decodeLivery(paint.l) : DL.defaultLivery(), base: paint.b, equip: Object.assign({}, s.equip) };
    const card = (name, meta, price, own, equipped, onTry, onUse, onBuy) => {
      const it = h(`<div class="item ${equipped ? 'sel' : ''}"><div class="nm">${esc(name)}</div><div class="meta">${esc(meta)}</div>
        <div class="row"><span class="price">${own ? '<span class="tag">Owned</span>' : `<span class="coin"></span>${price}`}</span><span class="acts" style="display:flex;gap:5px"></span></div></div>`);
      const act = it.querySelector('.acts');
      if (onTry) { const t = h('<button class="btn btn-line btn-sm">Try</button>'); t.onclick = onTry; act.appendChild(t); }
      if (own) { if (onUse && !equipped) { const u = h('<button class="btn btn-navy btn-sm">Use</button>'); u.onclick = onUse; act.appendChild(u); } else if (equipped) act.appendChild(h('<span class="tag coral">In use</span>')); }
      else {
        const b = h(`<button class="btn btn-coral btn-sm" ${s.coins < price ? 'disabled title="Not enough coins"' : ''}>Buy</button>`);
        b.onclick = () => {
          if (!b.dataset.c) { b.dataset.c = 1; b.textContent = 'Confirm'; setTimeout(() => { if (b.isConnected) { b.textContent = 'Buy'; delete b.dataset.c; } }, 3000); return; }
          if (onBuy()) { DL.Audio.coin(); renderCoins(); toast(`<b>${esc(name)}</b> unlocked`); renderShop(); }
        };
        act.appendChild(b);
      }
      return it;
    };
    if (shop.tab === 'cars') {
      DL.CAR_ORDER.forEach(id => {
        const c = DL.CARS[id], own = Net.owns('cars', id);
        wrap.appendChild(card(c.name, c.cls + ' · ' + c.blurb, c.price, own, s.car === id,
          () => { Game.showcase(Object.assign({}, cur, { car: id, label: c.name })); renderShop(); },
          () => { s.car = id; if (!s.paint[id]) s.paint[id] = { l: DL.encodeLivery(DL.defaultLivery()), b: DL.DEFAULT_BASE }; Net.persist(); Net.pushProfile(); Game._preview = null; Game.refreshPlayerCar(); renderShop(); },
          () => Net.buy('cars', id, c.price)));
      });
    } else if (shop.tab === 'stickers') {
      DL.PARTS.stickers.forEach(p => {
        const own = Net.owns('stickers', p.id), list = Object.keys(DL.STAMPS).filter(k => DL.STAMPS[k].pack === p.id).join(', ');
        wrap.appendChild(card(p.name, 'Paint stamps: ' + list, p.price, own, false, null, null, () => Net.buy('stickers', p.id, p.price)));
      });
    } else {
      const cat = shop.tab;
      DL.PARTS[cat].forEach(p => {
        const own = Net.owns(cat, p.id), fx = cat === 'exhaust' || cat === 'trail';
        wrap.appendChild(card(p.name, fx ? 'Shows while racing' : DL.PART_LABELS[cat], p.price, own, s.equip[cat] === p.id,
          fx ? null : () => { const e = Object.assign({}, cur.equip); e[cat] = p.id; Game.showcase(Object.assign({}, cur, { equip: e, label: p.name })); renderShop(); },
          () => { s.equip[cat] = p.id; Net.persist(); Net.pushProfile(); Game._preview = null; Game.refreshPlayerCar(); renderShop(); },
          () => Net.buy(cat, p.id, p.price)));
      });
    }
    body.appendChild(wrap);
    body.appendChild(h(`<p class="hint">You earn coins for finishing each daily, personal bests, streaks and achievements. Nothing here changes speed, grip or hitbox.</p>`));
  }
  $('sTabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (!b) return; shop.tab = b.dataset.tab; renderShop(); });

  // ---------------- replay ----------------
  const fmtS = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
  const RATES = [0.5, 1, 2, 4];
  const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>', PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  let seeking = false;
  UI.openReplay = function (day, spec, enc, time) {
    show('replay');
    if (!Game.startReplay(day, enc, spec)) { toast('That replay could not be played'); show('board'); return; }
    const r = Game.race();
    $('rpName').textContent = spec.label || 'Driver';
    $('rpTime').textContent = DL.fmtTime(time);
    $('rpEnd').textContent = fmtS(r.dur); $('rpRate').textContent = '1×'; $('rpPlay').innerHTML = PAUSE_SVG;
  };
  UI.replayHud = function (r, t) {
    $('rpNow').textContent = fmtS(t);
    if (!seeking) $('rpSeek').value = Math.round(t / r.dur * 1000);
    $('rpPlay').innerHTML = r.paused ? PLAY_SVG : PAUSE_SVG;
  };
  const rp = () => { const r = Game.race(); return r && r.replay ? r : null; };
  $('rpPlay').onclick = () => { const r = rp(); if (r) { if (r.rt >= r.dur) { r.rt = 0; r.snap = true; } r.paused = !r.paused; } };
  $('rpRate').onclick = () => { const r = rp(); if (!r) return; r.rate = RATES[(RATES.indexOf(r.rate) + 1) % RATES.length]; $('rpRate').textContent = r.rate + '×'; };
  $('rpCam').onclick = () => Game.cycleCamera();
  $('rpClose').onclick = () => show('board');
  $('rpSeek').addEventListener('input', e => { const r = rp(); if (r) { seeking = true; r.rt = e.target.value / 1000 * r.dur; r.snap = true; } });
  $('rpSeek').addEventListener('change', () => { seeking = false; });
  window.addEventListener('keydown', e => {
    if (screen !== 'replay' || e.repeat) return;
    const r = rp(); if (!r) return;
    if (e.code === 'Space') { e.preventDefault(); $('rpPlay').click(); }
    else if (e.code === 'KeyC') Game.cycleCamera();
    else if (e.code === 'ArrowRight') { r.rt = Math.min(r.dur, r.rt + 5); r.snap = true; }
    else if (e.code === 'ArrowLeft') { r.rt = Math.max(0, r.rt - 5); r.snap = true; }
  });

  // ---------------- leaderboard ----------------
  const board = { tab: 'daily', day: null, sel: {}, rows: [] };
  $('bTabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (!b) return; board.tab = b.dataset.tab; renderBoard(); });
  $('bPrev').onclick = () => { const d = DL.addDays(board.day, -1); if (d >= DL.addDays(today(), -30)) { board.day = d; renderBoard(); } };
  $('bNext').onclick = () => { const d = DL.addDays(board.day, 1); if (d <= today()) { board.day = d; renderBoard(); } };
  $('bRaceGhosts').onclick = () => startRace(board.day, Object.values(board.sel[board.day] || {}));

  async function renderBoard() {
    board.day = board.day || today();
    [...$('bTabs').children].forEach(t => t.classList.toggle('on', t.dataset.tab === board.tab));
    $('bTools').hidden = board.tab === 'all';
    $('bDay').textContent = (board.day === today() ? 'Today · ' : '') + DL.prettyDay(board.day) + ' · No. ' + DL.dayNumber(board.day);
    $('bSub').textContent = board.tab === 'all' ? 'Tracks finished across every daily' : DL.biomeOf(board.day).name;
    $('bRaceGhosts').textContent = board.day === today() ? 'Race today’s track' : 'Race this archive track';
    $('bRaceGhosts').hidden = board.tab === 'all';
    renderNet();
    const tbl = $('bTable');
    const selN = Object.keys(board.sel[board.day] || {}).length;
    $('bInfo').textContent = selN ? `${selN} ghost${selN > 1 ? 's' : ''} selected` : 'Pick up to 3 ghosts to race';
    if (!Net.db) {
      const best = Net.save.best[board.day];
      tbl.innerHTML = `<div class="empty"><h3>Global boards are offline here</h3><p>${esc(Net.status)}.</p>${best && board.tab !== 'all' ? `<p>Your best on this track: <b class="num">${DL.fmtTime(best)}</b></p>` : ''}</div>`;
      return;
    }
    tbl.innerHTML = '<div class="empty"><p>Loading the board…</p></div>';
    const tok = board.token = {};
    try {
      if (board.tab === 'all') {
        const rows = await Net.boardAllTime(); if (board.token !== tok) return;
        const names = await Net.names(rows.map(r => r.uid));
        if (!rows.length) { tbl.innerHTML = '<div class="empty"><h3>No finishes yet</h3><p>Finish a daily to get on the all-time board.</p></div>'; return; }
        tbl.innerHTML = '';
        const t = h(`<table><thead><tr><th>#</th><th>Driver</th><th>Tracks</th><th class="hide-sm">Runs</th><th class="hide-sm">Best streak</th></tr></thead><tbody></tbody></table>`);
        rows.forEach((r, i) => {
          const tr = h(`<tr class="${r.uid === Net.uid ? 'me' : ''}"><td class="rk">${i + 1}</td><td></td><td class="tm">${r.score}</td>
            <td class="hide-sm num">${r.runs || 0}</td><td class="hide-sm num">${r.bestStreak || 0}</td></tr>`);
          tr.children[1].appendChild(whoCell(r, names));
          t.tBodies[0].appendChild(tr);
        });
        tbl.appendChild(t);
        return;
      }
      const tr = trackFor(board.day);
      let rows = (await Net.boardDaily(board.day)).filter(r => r.time >= tr.minTime);
      if (board.token !== tok) return;
      if (board.tab === 'friends') { const fr = Net.save.friends || []; rows = rows.filter(r => r.uid === Net.uid || fr.includes(r.uid)); }
      const names = await Net.names(rows.map(r => r.uid));
      if (board.token !== tok) return;
      if (!rows.length) {
        tbl.innerHTML = board.tab === 'friends'
          ? '<div class="empty"><h3>No friends on this track yet</h3><p>Add drivers from the Daily tab with the + button, then their times appear here.</p></div>'
          : '<div class="empty"><h3>Nobody has set a time yet</h3><p>Be first on the board for this track.</p></div>';
        return;
      }
      const lead = rows[0].time;
      tbl.innerHTML = '';
      const t = h(`<table><thead><tr><th>#</th><th>Driver</th><th>Time</th><th class="hide-sm">Car</th><th>Ghost</th><th></th></tr></thead><tbody></tbody></table>`);
      const sel = board.sel[board.day] || (board.sel[board.day] = {});
      rows.forEach((r, i) => {
        const me = r.uid === Net.uid;
        const row = h(`<tr class="${me ? 'me' : ''}"><td class="rk">${i + 1}</td><td></td>
          <td class="tm">${DL.fmtTime(r.time)}<div class="gap">${i ? DL.fmtDelta(r.time - lead) : 'Leader'}</div></td>
          <td class="hide-sm">${esc((DL.CARS[r.car] || DL.CARS.pebble).name)}</td>
          <td class="gcell"><button class="chk ${sel[r.uid] ? 'on' : ''}" data-k="g">${sel[r.uid] ? 'On' : 'Race'}</button> <button class="chk" data-k="w" title="Watch a replay of this run">▶ Watch</button></td>
          <td>${me ? '' : `<button class="chk ${Net.isFriend(r.uid) ? 'on' : ''}" data-k="f" title="${Net.isFriend(r.uid) ? 'Remove friend' : 'Add friend'}">${Net.isFriend(r.uid) ? '★' : '+'}</button>`}</td></tr>`);
        row.children[1].appendChild(whoCell(r, names));
        const gb = row.querySelector('[data-k=g]'), fb = row.querySelector('[data-k=f]'), wb = row.querySelector('[data-k=w]');
        wb.onclick = async () => {
          wb.disabled = true; wb.textContent = 'Loading…';
          try {
            const enc = await Net.ghost(me ? 'me' : r.uid, board.day);
            if (!enc) { toast('No replay saved for that run'); return; }
            const nm = displayName(r, names);
            UI.openReplay(board.day, { uid: r.uid, label: me ? 'You' : nm, car: r.car, l: r.l, b: r.b, equip: r.equip }, enc, r.time);
          } catch (e) { toast('Could not load that replay'); }
          finally { wb.disabled = false; wb.textContent = '▶ Watch'; }
        };
        gb.onclick = () => {
          if (sel[r.uid]) delete sel[r.uid];
          else {
            if (Object.keys(sel).length >= 3) { toast('Three ghosts at a time'); return; }
            const nm = displayName(r, names);
            sel[r.uid] = { uid: r.uid, label: me ? 'Your best' : (i === 0 ? 'WR · ' : '') + nm, car: r.car, l: r.l, b: r.b, equip: r.equip, mine: me };
          }
          renderBoard();
        };
        if (fb) fb.onclick = () => { Net.toggleFriend(r.uid); renderBoard(); };
        t.tBodies[0].appendChild(row);
      });
      tbl.appendChild(t);
    } catch (e) {
      console.warn(e);
      if (board.token === tok) tbl.innerHTML = '<div class="empty"><h3>Board unreachable</h3><p>The leaderboard did not answer. Try again in a moment.</p></div>';
    }
  }
  function displayName(r, names) { const p = names[r.uid]; return (p && p.name) || r.tag || (r.uid === Net.uid ? 'You' : 'Driver'); }
  function whoCell(r, names) {
    const p = names[r.uid];
    const el = h(`<button class="who" style="text-align:left">${p && p.avatarUrl ? `<img alt="" src="${esc(p.avatarUrl)}">` : ''}<b></b>${r.uid === Net.uid ? '<span class="tag coral">You</span>' : ''}</button>`);
    el.querySelector('b').textContent = displayName(r, names);
    el.onclick = () => openProfile(r.uid);
    return el;
  }

  // ---------------- archive ----------------
  function renderArchive() {
    const tbl = $('aTable'); tbl.innerHTML = '';
    const t = h(`<table><thead><tr><th>Date</th><th class="hide-sm">No.</th><th>Stage</th><th>Your best</th><th></th></tr></thead><tbody></tbody></table>`);
    for (let i = 0; i <= 30; i++) {
      const d = DL.addDays(today(), -i), best = Net.save.best[d], cl = Net.save.claimed[d];
      const row = h(`<tr class="arch-row"><td><b style="font-family:var(--f-display);font-size:18px;color:var(--navy)">${i === 0 ? 'Today' : DL.prettyDay(d)}</b></td>
        <td class="hide-sm num">${DL.dayNumber(d)}</td><td class="biome-chip">${esc(DL.biomeOf(d).name)}</td>
        <td class="tm" style="font-size:17px">${best ? DL.fmtTime(best) : '<span class="gap">Not raced</span>'}</td>
        <td style="white-space:nowrap"><button class="btn btn-line btn-sm">Board</button> <button class="btn btn-coral btn-sm">Race</button></td></tr>`);
      const [bb, rb] = row.querySelectorAll('button');
      bb.onclick = () => { board.day = d; board.tab = 'daily'; show('board'); };
      rb.onclick = () => startRace(d, Object.values(board.sel[d] || {}));
      t.tBodies[0].appendChild(row);
    }
    tbl.appendChild(t);
  }

  // ---------------- account (Google sign-in) ----------------
  const G_LOGO = '<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  function renderAccount(el) {
    const A = DL.Auth, u = A.user;
    if (u) {
      el.innerHTML = `<div class="lbl">Account</div><div class="acct">${u.picture ? `<img alt="" referrerpolicy="no-referrer" src="${esc(u.picture)}">` : ''}<div class="who"><b></b><span class="meta">Signed in with Google</span></div><button class="btn btn-line" data-so>Sign out</button></div>`;
      el.querySelector('b').textContent = u.name;
      el.querySelector('[data-so]').onclick = () => { A.signOut(); renderAccount(el); };
      return;
    }
    el.innerHTML = `<div class="lbl">Account</div><div class="gwrap"><div id="gBtn"></div><p class="hint" id="gMsg"></p></div>`;
    const btn = el.querySelector('#gBtn'), msg = el.querySelector('#gMsg');
    A.mountButton(btn).then(r => {
      if (r.ok) { msg.textContent = 'Use your Google account as your driver identity.'; return; }
      btn.innerHTML = `<button class="gfake" type="button">${G_LOGO}Continue with Google</button>`;
      const setup = () => {
        btn.innerHTML = `<div class="field"><label class="lbl" for="gCid">Google OAuth Web Client ID</label><input type="text" id="gCid" placeholder="123456789-abc.apps.googleusercontent.com" value="${esc(A.clientId())}"></div><button class="btn btn-navy" id="gSave">Save and retry</button>`;
        btn.querySelector('#gSave').onclick = () => { A.setClientId(btn.querySelector('#gCid').value); renderAccount(el); };
      };
      if (r.reason === 'noclient' && Net.api) {
        msg.textContent = 'Google sign-in is not switched on for this site yet. The site owner needs to set GOOGLE_CLIENT_ID on the server.';
        btn.firstChild.onclick = () => toast('Not switched on for this site yet');
      } else if (r.reason === 'noclient') {
        msg.textContent = 'Google sign-in needs a Client ID from Google Cloud Console (Credentials → OAuth client → Web). Add your game’s address under Authorized JavaScript origins.';
        btn.firstChild.onclick = setup;
      } else {
        msg.textContent = 'Google’s sign-in script can’t load on this page (hosting sandbox). It works as soon as Dayline runs from its own address, e.g. your Cloudflare site.';
        btn.firstChild.onclick = () => toast('Available once Dayline is hosted on its own address');
      }
    });
  }
  DL.on('auth', () => { renderNet(); });

  // ---------------- profile ----------------
  async function openProfile(uid) {
    const mine = !uid || uid === Net.uid;
    let p, name = '', avatar = '';
    if (mine) {
      p = Net.save;
      if (Net.user) { try { const me = await Net.user.me(); name = me.name; avatar = me.avatarUrl; } catch (e) { } }
      if (DL.Auth.user) { name = DL.Auth.user.name; avatar = DL.Auth.user.picture || avatar; }
    } else {
      p = await Net.player(uid).catch(() => null);
      if (!p) { toast('That profile could not be loaded'); return; }
      const ns = await Net.names([uid]); name = (ns[uid] && ns[uid].name) || p.tag || 'Driver'; avatar = ns[uid] && ns[uid].avatarUrl;
    }
    const achDone = mine ? p.ach : null;
    const m = modal(`
      <div style="display:flex;gap:12px;align-items:center">${avatar ? `<img src="${esc(avatar)}" alt="" style="width:52px;height:52px;border-radius:50%">` : ''}<div><div class="lbl">${mine ? 'Your profile' : 'Driver profile'}</div><h2 id="pName"></h2></div></div>
      <div class="stat-grid">
        <div class="stat"><span class="lbl">Tracks</span><b class="num">${p.score || 0}</b></div>
        <div class="stat"><span class="lbl">Days</span><b class="num">${p.days || 0}</b></div>
        <div class="stat"><span class="lbl">Runs</span><b class="num">${p.runs || 0}</b></div>
        <div class="stat"><span class="lbl">Streak</span><b class="num">${mine ? streakNow() : (p.streak || 0)}</b></div>
        <div class="stat"><span class="lbl">Best streak</span><b class="num">${p.bestStreak || 0}</b></div>
        <div class="stat"><span class="lbl">Friends</span><b class="num">${(p.friends || []).length}</b></div>
      </div>
      <div class="lbl">Drives the ${esc((DL.CARS[p.car] || DL.CARS.pebble).name)}</div>
      ${mine ? `<div id="acctBox"></div><div class="field"><label class="lbl" for="pTag">Callsign shown when your name is hidden</label><input type="text" id="pTag" maxlength="16" value="${esc(p.tag || '')}" placeholder="e.g. Sideways Sam"></div>
        <div><div class="lbl" style="margin-bottom:4px">Achievements · ${Object.keys(achDone).length} of ${DL.ACHIEVEMENTS.length}</div>
        ${DL.ACHIEVEMENTS.map(a => `<div class="ach ${achDone[a.id] ? '' : 'locked'}"><b>${esc(a.name)}</b><span class="price"><span class="coin"></span>${a.coins}</span><span class="meta">${esc(a.desc)}</span></div>`).join('')}</div>`
        : `<button class="btn btn-line" id="pFriend">${Net.isFriend(uid) ? 'Remove friend' : 'Add friend'}</button>`}
      <button class="btn btn-navy" id="pClose">Close</button>`);
    m.querySelector('#pName').textContent = name || (mine ? (p.tag || 'You') : 'Driver');
    m.querySelector('#pClose').onclick = closeModal;
    const ab = m.querySelector('#acctBox'); if (ab) renderAccount(ab);
    const tag = m.querySelector('#pTag');
    if (tag) tag.addEventListener('change', () => { Net.save.tag = tag.value.trim().slice(0, 16); Net.persist(); Net.pushProfile(); toast('<b>Callsign saved</b>'); });
    const fb = m.querySelector('#pFriend');
    if (fb) fb.onclick = () => { const on = Net.toggleFriend(uid); fb.textContent = on ? 'Remove friend' : 'Add friend'; if (screen === 'board') renderBoard(); };
  }

  // ---------------- settings ----------------
  function openSettings(fromPause) {
    const s = Game.settings;
    const m = modal(`<div class="lbl">Settings</div><h2>Settings</h2>
      <div class="field"><label class="lbl" for="sVol">Volume</label><input type="range" id="sVol" min="0" max="1" step="0.05" value="${s.vol}"></div>
      <div class="toggle-row"><span>Shadows</span><button class="chk ${s.shadows ? 'on' : ''}" id="sSh">${s.shadows ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><span>High quality (sharper, denser scenery)</span><button class="chk ${s.hq ? 'on' : ''}" id="sHq">${s.hq ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><span>Race your best automatically</span><button class="chk ${s.pbGhost ? 'on' : ''}" id="sPb">${s.pbGhost ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><label for="sCam">Default camera</label><select id="sCam"><option value="0">Chase</option><option value="1">Far chase</option><option value="2">Bonnet</option><option value="3">Low rally</option><option value="4">Drone</option></select></div>
      <div class="toggle-row"><label for="sUnits">Speed units</label><select id="sUnits"><option value="kmh">km/h</option><option value="mph">mph</option></select></div>
      <div class="toggle-row"><label for="sTouch">Touch controls</label><select id="sTouch"><option value="auto">Automatic</option><option value="on">Always</option><option value="off">Never</option></select></div>
      <div id="acctBox"></div>
      <p class="hint">${esc(Net.status)}. Gamepads work too: right trigger accelerates, left trigger brakes, X or RB handbrake, Y recovers.</p>
      <button class="btn btn-navy" id="sDone">${fromPause === true ? 'Back to pause' : 'Done'}</button>`);
    renderAccount(m.querySelector('#acctBox'));
    m.querySelector('#sCam').value = s.cam; m.querySelector('#sUnits').value = s.units; m.querySelector('#sTouch').value = s.touch;
    m.querySelector('#sVol').oninput = e => { s.vol = +e.target.value; Game.applySettings(); };
    const tog = (id, k, after) => { const b = m.querySelector(id); b.onclick = () => { s[k] = !s[k]; b.classList.toggle('on', s[k]); b.textContent = s[k] ? 'On' : 'Off'; Game.applySettings(); if (after) after(); }; };
    tog('#sSh', 'shadows'); tog('#sPb', 'pbGhost');
    tog('#sHq', 'hq', () => toast('Scenery density changes on the next track load'));
    m.querySelector('#sCam').onchange = e => { s.cam = +e.target.value; Game.applySettings(); };
    m.querySelector('#sUnits').onchange = e => { s.units = e.target.value; Game.applySettings(); $('hUnit').textContent = s.units === 'mph' ? 'mph' : 'km/h'; };
    m.querySelector('#sTouch').onchange = e => { s.touch = e.target.value; Game.applySettings(); };
    m.querySelector('#sDone').onclick = () => { if (fromPause === true) UI.paused(true); else closeModal(); };
  }

  // ---------------- share / community ----------------
  function openShare() {
    const d = today(), t = trackFor(d), best = Net.save.best[d];
    const text = `DAYLINE No.${DL.dayNumber(d)} · ${t.B.name}\n${best ? DL.fmtTime(best) : 'No time yet — still practising'}\nStreak ${streakNow()} · one track, every driver, every day`;
    const m = modal(`<div class="lbl">Community</div><h2>Share today’s run</h2>
      <p class="hint">Copy your result into your Discord server or group chat. Everyone races the same track, so times compare directly.</p>
      <div class="share-box" id="shText"></div>
      <div class="btn-row"><button class="btn btn-go" id="shCopy" style="font-size:22px">Copy</button><button class="btn btn-line" id="shClose">Close</button></div>`);
    m.querySelector('#shText').textContent = text;
    m.querySelector('#shClose').onclick = closeModal;
    m.querySelector('#shCopy').onclick = async () => {
      try { await navigator.clipboard.writeText(text); toast('<b>Copied</b>'); }
      catch (e) { const r = document.createRange(); r.selectNodeContents(m.querySelector('#shText')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Press Ctrl+C to copy'); }
    };
  }

  // ---------------- boot ----------------
  DL.on('save', () => { renderCoins(); });
  DL.on('net', () => { renderNet(); if (screen === 'board') renderBoard(); });
  function boot() {
    Net.initLocal();
    DL.Auth.init();
    Game.init();
    setTimeout(() => {
      try {
        UI._day = today();
        Game.loadDay(today());
        Game.refreshPlayerCar();
        $('loading').hidden = true;
        renderCoins();
        show('menu');
      } catch (e) {
        console.error(e);
        $('loading').querySelector('.lbl').textContent = 'Something went wrong building the track. Reload to try again.';
      }
      let lastCar = null;
      DL.on('save', () => {
        const k = JSON.stringify([Net.save.car, Net.save.equip, Net.save.paint[Net.save.car]]);
        if (lastCar && k !== lastCar && screen !== 'hud') { Game.refreshPlayerCar(); if (screen === 'menu') renderMenu(); }
        lastCar = k;
      });
      Net.connect().then(() => { if (screen === 'menu') renderMenu(); });
    }, 30);
  }
  boot();
})(window.DL);
