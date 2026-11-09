/* DAYLINE — screens, HUD, garage paint editor, shop, leaderboards, archive, modals, boot */
'use strict';
(function (DL) {
  const UI = DL.UI = {};
  const $ = id => document.getElementById(id);
  const Net = DL.Net, Game = DL.Game;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  let screen = 'loading';
  const SCREENS = ['menu', 'garage', 'shop', 'board', 'archive', 'hud', 'replay', 'community', 'editor'];
  const today = () => DL.dayKey();

  DL.biomeOf = day => DL.BIOMES[DL.BIOME_KEYS[Math.floor(DL.mulberry32(DL.seedFor(day))() * DL.BIOME_KEYS.length)]];
  const trackCache = {};
  const trackFor = day => trackCache[day] || (trackCache[day] = (Game.track() && Game.track().day === day ? Game.track() : new DL.Track(day)));

  function show(name) {
    screen = name;
    SCREENS.forEach(s => { $(s).hidden = s !== name; });
    $('topnav').hidden = name === 'hud' || name === 'replay' || name === 'editor';
    closeModal();
    if (name !== 'shop' && Game._preview) Game.showcase(null);
    if (name === 'menu' && Game.track() && Game.track().day !== today()) Game.loadDay(today());
    Game.setMode(name === 'hud' ? 'race' : name);
    if (name !== 'replay') $('hGap').hidden = true;
    DL.Audio.click();
    if (name === 'menu') renderMenu();
    if (name === 'garage') renderGarage();
    if (name === 'shop') renderShop();
    if (name === 'board') renderBoard();
    if (name === 'archive') renderArchive();
    if (name === 'community' && UI.renderCommunity) UI.renderCommunity();
    if (name === 'editor' && UI.renderEditor) UI.renderEditor();
  }
  UI.show = show;
  UI.back = function () { if ($('modalRoot').firstChild) { closeModal(); return; } if (screen === 'replay') { show(UI._replayBack || 'board'); return; } if (screen === 'editor') { show('community'); return; } if (['garage', 'shop', 'board', 'archive', 'community'].includes(screen)) show('menu'); };
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
    return (s.lastDay === t || s.lastDay === DL.addDays(t, -1) || (s.lastDay === DL.addDays(t, -2) && s.freezes > 0)) ? s.streak : 0;
  }
  function renderMenu() {
    const t = trackFor(today()), d = today();
    $('mDayNo').textContent = 'Daily No. ' + DL.dayNumber(d);
    $('mDate').textContent = DL.prettyDay(d);
    $('mBiome').textContent = t.B.name;
    $('mLength').textContent = (t.length / 1000).toFixed(2) + ' km · ' + t.checkpoints.length + ' checkpoints';
    const best = Net.save.best[d];
    $('mMedals').innerHTML = `<span class="lbl">Your best today</span><b class="num">${best ? DL.fmtTime(best).slice(1, 8) : 'No time yet'}</b>`;
    const st = streakNow();
    $('mStreak').textContent = st + (st === 1 ? ' day' : ' days') + (Net.save.lastDay === d ? '' : st ? ' · race today to keep it' : '') + (Net.save.freezes ? ' · ❄ ' + Net.save.freezes + ' freeze' + (Net.save.freezes > 1 ? 's' : '') : '');
    $('mStreakBars').innerHTML = Array.from({ length: 7 }, (_, i) => `<i class="${i < Math.min(st, 7) ? 'on' : ''}"></i>`).join('');
    renderNameBox();
    renderNet();
  }
  // leaderboard name (callsign) right on the menu so new players set one
  function renderNameBox() {
    const inp = $('mTag'), box = $('mNameBox'); if (!inp) return;
    const tag = (Net.save.tag || '').trim();
    if (document.activeElement !== inp) inp.value = Net.save.tag || '';
    box.classList.toggle('need', !tag);
    $('mTagHint').innerHTML = tag ? 'Shown next to your times on the leaderboard.' : 'No name yet: you show up as &ldquo;Driver&rdquo; on the leaderboard.';
  }
  (function () {
    const inp = $('mTag'); if (!inp) return;
    let timer = null;
    const save = () => {
      Net.save.tag = inp.value.trim().slice(0, 16); Net.persist(); if (Net.pushProfile) Net.pushProfile();
      renderNameBox(); const ok = $('mTagSaved'); ok.hidden = false; clearTimeout(ok._t); ok._t = setTimeout(() => { ok.hidden = true; }, 1600);
    };
    inp.addEventListener('input', () => { $('mNameBox').classList.toggle('need', !inp.value.trim()); clearTimeout(timer); timer = setTimeout(save, 700); });
    inp.addEventListener('change', () => { clearTimeout(timer); save(); });
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
    inp.addEventListener('keyup', e => e.stopPropagation());
  })();
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

  // ghosts picked on the leaderboard follow you into a normal Race now too
  $('bRace').onclick = () => startRace(today(), Object.values((board.sel && board.sel[today()]) || {}));
  $('bGarage').onclick = () => show('garage');
  $('bBoard').onclick = () => { board.day = today(); board.tab = 'daily'; show('board'); };
  $('bArchive').onclick = () => show('archive');
  $('bShop').onclick = () => show('shop');

  function startRace(day, ghosts, custom, opts) {
    DL.Audio.init();
    UI._leave = (opts && opts.leave) || 'menu';
    show('hud');
    const touchOn = Game.settings.touch === 'on' || (Game.settings.touch === 'auto' && (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window));
    $('touch').classList.toggle('on', touchOn);
    Game.startRace(day, ghosts, custom, opts);
  }
  // where Quit / Menu go after a race: the menu, the community page or the editor
  function leaveRace() {
    const to = UI._leave || 'menu';
    if (to === 'menu') Game.loadDay(today());
    show(to);
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
    if (!el._cd) { el.innerHTML = '<i class="cd-flash"></i><i class="cd-ring"></i><b class="cd-num"></b>'; el._cd = 1; }
    const num = el.querySelector('.cd-num'), ring = el.querySelector('.cd-ring'), flash = el.querySelector('.cd-flash');
    clearTimeout(el._hide);
    el.hidden = false; el.classList.add('on');
    const re = x => { const c = x.className; x.className = ''; void x.offsetWidth; x.className = c; };
    if (n > 0) {
      num.textContent = n; num.className = 'cd-num n' + n; ring.className = 'cd-ring go'; flash.className = 'cd-flash';
      re(num); re(ring);
    } else {
      num.textContent = 'GO'; num.className = 'cd-num ngo'; ring.className = 'cd-ring go big'; flash.className = 'cd-flash go';
      re(num); re(ring); re(flash);
      el.classList.remove('on');
      el._hide = setTimeout(() => { el.hidden = true; }, 900);
    }
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
  // speed lines + vignette (every frame cheap: one style write, only when the value changes)
  let fxLast = -1;
  UI.speedFx = function (speed, on) {
    const el = $('speedfx'); if (!el) return;
    const k = on ? DL.clamp((speed - 30) / 28, 0, 1) : 0, q = Math.round(k * 20) / 20;
    if (q === fxLast) return; fxLast = q;
    el.style.opacity = on ? String(0.35 + q * 0.65) : '0'; el.style.setProperty('--lines', (q * 0.55).toFixed(2));
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
    m.querySelector('#pQuit').onclick = () => leaveRace();
  };

  // per-sector times vs your previous best (green = faster, red = slower)
  function sectorSplits(r, t) {
    const cp = (r.splits || []).slice(); if (!cp.length) return { html: '', squares: '' };
    const pb = r.pbCp && r.pbCp.length >= cp.length ? r.pbCp : null;
    const cells = [], sq = [];
    cp.forEach((c, i) => {
      const sec = c - (i ? cp[i - 1] : 0), pbs = pb ? pb[i] - (i ? pb[i - 1] : 0) : null, d = pbs == null ? null : sec - pbs;
      const cls = d == null ? '' : d <= 0.0005 ? 'up' : 'down';
      sq.push(d == null ? '🟦' : d <= 0.0005 ? '🟩' : '🟥');
      cells.push(`<div class="sp ${cls}"><small>${i + 1}</small><b class="num">${sec.toFixed(1)}</b><em class="num">${d == null ? '' : (d <= 0 ? '' : '+') + d.toFixed(2)}</em></div>`);
    });
    return { html: `<div class="splits-wrap"><div class="lbl">Sector times${pb ? ' vs your best' : ''}</div><div class="splits" style="grid-template-columns:repeat(${cells.length},minmax(0,1fr))">${cells.join('')}</div></div>`, squares: sq.join('') };
  }
  UI.finished = function (r, t, res, valid) {
    UI.checkpoint(r.track.checkpoints.length, r.track.checkpoints.length, null);
    const day = r.track.day, isToday = day === today();
    const prev = res ? res.prevBest : Net.save.best[day];
    let cmp = '';
    if (prev) { const d = t - prev; cmp = `<span class="num" style="color:${d <= 0 ? 'var(--good)' : 'var(--bad)'}">${DL.fmtDelta(d)}</span>`; }
    const coins = res && res.coins.length ? `<details class="res-more"><summary>Coin breakdown</summary>${res.coins.map(c => `<div class="res-row"><span>${esc(c[0])}</span><b class="num">+${c[1]}</b></div>`).join('')}</details>` : '';
    const sp = sectorSplits(r, t);
    const m = modal(`
      <div class="lbl">${isToday ? 'Daily No. ' + DL.dayNumber(day) : 'Archive · ' + DL.prettyDay(day)} · ${esc(r.track.B.name)}</div>
      <h2>${!valid ? 'Lap time deleted' : res && res.isPB && prev ? 'New personal best' : 'Finished'}</h2>
      <div class="res-time" ${!valid ? 'style="text-decoration:line-through;opacity:.5"' : ''}>${DL.fmtTime(t)}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${r.recoveries ? `<span class="tag">${r.recoveries} recover${r.recoveries > 1 ? 'ies' : 'y'}</span>` : '<span class="tag">Clean run</span>'}
        ${res && res.notes ? res.notes.map(n => `<span class="tag coral">${esc(n)}</span>`).join('') : ''}
      </div>
      ${valid ? sp.html : ''}
      ${!valid ? '<p class="hint" style="color:var(--bad);font-weight:600">Don’t cheat. That run failed the plausibility check (it skipped part of the route or moved impossibly), so the time was deleted.</p>' : ''}
      <div>
        <div class="res-row"><span>Previous best</span><b class="num">${prev ? DL.fmtTime(prev) : '—'} ${cmp}</b></div>
        <div class="res-row"><span>Board position</span><b id="rPos" class="num">${Net.db && Net.mode === 'online' ? 'Checking…' : 'Saved on this device'}</b></div>
        ${coins}
        ${res && res.total ? `<div class="res-row" style="border:0"><span class="lbl">Coins earned</span><b class="price num" style="font-size:26px"><span class="coin"></span>+${res.total}</b></div>` : ''}
      </div>
      <div class="btn-row"><button class="btn btn-go" id="rRetry" style="font-size:24px">Retry</button><button class="btn btn-line" id="rMenu">Menu</button></div>
      <div class="btn-row res-links">${valid ? '<button class="btn btn-line btn-sm" id="rShare">Copy result</button><button class="btn btn-line btn-sm" id="rCard">Result card</button>' : ''}<button class="btn btn-line btn-sm" id="rBoard">Leaderboard</button></div>
      ${valid ? '<button class="btn btn-coral btn-sm" id="rClip">Save a clip of this run</button>' : ''}`, { sticky: true });
    const cardInfo = () => { const pos = ($('rPos') || {}).textContent || ''; return { title: 'No. ' + DL.dayNumber(day), pos: /^#\d+ of/.test(pos) ? 'Rank ' + pos.replace(' of ', ' / ').replace('#', '') : '', streak: streakNow(), squares: sp.squares }; };
    const cardBtn = m.querySelector('#rCard'); if (cardBtn) cardBtn.onclick = () => DL.Share && DL.Share.shareCard(r, t, cardInfo());
    const clipBtn = m.querySelector('#rClip'); if (clipBtn) clipBtn.onclick = () => DL.Share && DL.Share.clip(r, t, {});
    const shareBtn = m.querySelector('#rShare');
    if (shareBtn) shareBtn.onclick = () => {
      const pos = ($('rPos') || {}).textContent || '';
      const place = /^#\d+ of \d+/.test(pos) ? ' · ' + pos.replace(' of ', '/').replace(/^#/, 'rank ') : '';
      const txt = `Dayline No. ${DL.dayNumber(day)} · ${r.track.B.name}\n⏱ ${DL.fmtTime(t)}${place}\n${sp.squares}\n${location.origin.includes('github.io') ? location.origin + location.pathname : 'https://dayline-game.github.io/Dayline/'}`;
      const done = () => toast('Result copied. Paste it anywhere');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => window.prompt('Copy your result', txt));
      else window.prompt('Copy your result', txt);
    };
    m.querySelector('#rRetry').onclick = () => Game.restart();
    m.querySelector('#rMenu').onclick = () => leaveRace();
    m.querySelector('#rBoard').onclick = () => { board.day = day; board.tab = 'daily'; Game.loadDay(today()); show('board'); };
    if (res && res.total) { DL.Audio.coin(); renderCoins(); }
    if (valid && res && res.isPB) { UI.confetti(); DL.Audio.chime(); }
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
      DL.CAR_ORDER.concat(['ufo']).forEach(id => {
        const c = DL.CARS[id], own = Net.owns('cars', id);
        if (id === 'ufo' && !own) { wrap.appendChild(h(`<div class="item" style="opacity:.6"><div class="lbl">${esc(c.cls)}</div><div class="nm">${esc(c.name)}</div><div class="row"><span class="hint">Win the Weekly cup to fly it</span></div></div>`)); return; }
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
  UI.paintActive = () => screen === 'garage' && gTab === 'paint' && !!ed && paintMode === 'pro';

  // ---- Quick paint: body colour + pattern + number, no pixels ----
  let paintMode = 'quick';
  const QP = { pat: 'none', col: 13, num: '' };
  const PATTERNS = [['none', 'Plain'], ['stripe', 'Stripe'], ['twin', 'Twin stripe'], ['band', 'Side band'], ['checker', 'Checker'], ['nose', 'Nose & tail']];
  function patHit(pat, key, x, y, p) {
    const side = key === 'left' || key === 'right', end = key === 'front' || key === 'rear';
    if (pat === 'stripe') return key === 'top' ? (y === 5 || y === 6) : end ? (x === 5 || x === 6) : (y === 4 || y === 5);
    if (pat === 'twin') return key === 'top' ? (y === 3 || y === 4 || y === 7 || y === 8) : end ? (x === 3 || x === 4 || x === 7 || x === 8) : (y === 3 || y === 6);
    if (pat === 'band') return side ? (y >= 6 && y <= 8) : end ? (y >= 7 && y <= 8) : false;
    if (pat === 'checker') return side ? (y >= 7 && y <= 8 && (((x >> 1) + y) & 1)) : end ? (y >= 8 && (((x >> 1) + y) & 1)) : (x >= 26 && (((x >> 1) + y) & 1));
    if (pat === 'nose') return end ? true : side ? (x < 5 || x > 26) : (x < 6 || x > 25);
    return false;
  }
  function applyQuick() {
    pushUndo();
    ed.liv.fill(0);
    const P = DL.PANELS, saved = ed.mirror; ed.mirror = false;
    for (const key in P) { const p = P[key]; for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (patHit(QP.pat, key, x, y, p)) setCell(key, x, y, QP.col); }
    if (QP.num !== '') {
      const white = ed.base === 29 || ed.base === 8 ? 1 : 29, digs = String(QP.num).slice(0, 2).split('');
      const w = digs.length * 4 - 1, ox0 = Math.floor((P.left.w - w) / 2);
      for (const key of ['left', 'right', 'top']) {
        const p = P[key], oy = Math.floor((p.h - 5) / 2), ox = key === 'top' ? ox0 + 0 : ox0;
        // plate behind the digits so they read on any pattern
        for (let y = oy - 1; y <= oy + 5; y++) for (let x = ox - 1; x <= ox + w; x++) if (y >= 0 && y < p.h && x >= 0 && x < p.w) setCell(key, x, y, key === 'right' ? 0 : 0);
        digs.forEach((dg, i) => { const d = DL.DIGITS[+dg]; for (let j = 0; j < 5; j++) for (let k = 0; k < 3; k++) if (d[j * 3 + k] === '1') setCell(key, ox + i * 4 + k, oy + j, white); });
      }
    }
    ed.mirror = saved; commit();
  }
  function renderQuick(body) {
    const sec = (t, node) => { const w = h(`<div class="qp-sec"><div class="lbl">${t}</div></div>`); w.appendChild(node); body.appendChild(w); };
    const sw = (get, set) => { const pal = h('<div class="palette"></div>'); DL.PALETTE.forEach((c, i) => { if (!i) return; const b = h(`<button class="sw ${get() === i ? 'on' : ''}" aria-label="${c}" style="background:${c}"></button>`); b.onclick = () => { set(i); renderGarage(); }; pal.appendChild(b); }); return pal; };
    sec('Body colour', sw(() => ed.base, i => { pushUndo(); ed.base = i; commit(); }));
    const pr = h('<div class="paint-tools"></div>');
    PATTERNS.forEach(([id, nm]) => { const b = h(`<button class="tool ${QP.pat === id ? 'on' : ''}">${nm}</button>`); b.onclick = () => { QP.pat = id; applyQuick(); renderGarage(); }; pr.appendChild(b); });
    sec('Pattern', pr);
    if (QP.pat !== 'none') sec('Pattern colour', sw(() => QP.col, i => { QP.col = i; applyQuick(); }));
    const nr = h(`<div class="paint-tools" style="align-items:center"><input type="text" inputmode="numeric" maxlength="2" id="qpNum" value="${QP.num}" placeholder="--" style="width:64px;text-align:center"><span class="hint" style="margin:0">Race number, 1–2 digits (optional)</span></div>`);
    nr.firstElementChild.oninput = e => { QP.num = e.target.value.replace(/\D/g, '').slice(0, 2); e.target.value = QP.num; applyQuick(); };
    sec('Number', nr);
    const act = h('<div class="paint-tools"><button class="tool">Undo</button><button class="tool">Reset to stock</button></div>');
    act.children[0].disabled = !ed.undo.length; act.children[0].onclick = () => undo();
    act.children[1].onclick = () => { pushUndo(); ed.liv = DL.defaultLivery(); ed.base = DL.DEFAULT_BASE; QP.pat = 'none'; QP.num = ''; commit(); renderGarage(); };
    body.appendChild(act);
    body.appendChild(h('<p class="hint">Pick a colour, a pattern and a number. Saves automatically; keep favourites under Designs. Want pixel-level control? Switch to Advanced.</p>'));
  }

  function renderPaint(body) {
    if (!ed) openEditor();
    const modes = h('<div class="paint-tools qp-modes"><button class="tool">Quick</button><button class="tool">Advanced pixel editor</button></div>');
    modes.children[0].classList.toggle('on', paintMode === 'quick'); modes.children[1].classList.toggle('on', paintMode === 'pro');
    modes.children[0].onclick = () => { paintMode = 'quick'; renderGarage(); }; modes.children[1].onclick = () => { paintMode = 'pro'; renderGarage(); };
    body.appendChild(modes);
    if (paintMode === 'quick') { renderQuick(body); return; }
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
  function refreshUndoButtons() { if (screen === 'garage' && gTab === 'paint') { const tb = $('gBody').querySelectorAll('.paint-tools')[1]; if (tb) { const b = tb.querySelectorAll('button'); b[b.length - 2].disabled = !ed.undo.length; b[b.length - 1].disabled = !ed.redo.length; } } }
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
      const r = h(`<div class="design-row"><div></div><div><div class="nm" style="font-family:var(--f-display);font-weight:800;font-size:19px;text-transform:uppercase;color:var(--navy)">${esc(d.name)}</div><div class="hint">Works on every car</div></div><div style="display:flex;gap:5px"><button class="btn btn-navy btn-sm">Apply</button><button class="btn btn-line btn-sm" data-k="share">Share</button><button class="btn btn-line btn-sm" aria-label="Delete design">✕</button></div></div>`);
      r.firstElementChild.appendChild(liveryThumb(d.l, d.b));
      const [ap, shr, del] = r.querySelectorAll('button');
      shr.onclick = async () => {
        if (Net.mode !== 'online') { toast('Sign in to share liveries'); return; }
        shr.disabled = true; const res = await Net.shareLivery({ name: d.name, car: s.car, l: d.l, b: d.b }); shr.disabled = false;
        if (!res.ok) { toast(esc(res.error || 'Could not share')); return; }
        const u = DL.Share.base() + '?l=' + res.id; try { await navigator.clipboard.writeText(u); toast('<b>Link copied</b>. Anyone can add this paint'); } catch (e) { window.prompt('Copy this link', u); }
      };
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
    if (!Game.startReplay(day, enc, spec)) { toast('That replay could not be played'); show(UI._replayBack || 'board'); return; }
    const r = Game.race();
    $('rpName').textContent = spec.label || 'Driver';
    $('rpTime').textContent = DL.fmtTime(time);
    $('rpEnd').textContent = fmtS(r.dur); $('rpRate').textContent = '1×'; $('rpPlay').innerHTML = PAUSE_SVG;
  };
  UI.replayHud = function (r, t) {
    const k = r.keys;
    if (k) {
      $('kUp').classList.toggle('on', k.gas); $('kDown').classList.toggle('on', k.brake);
      $('kLeft').classList.toggle('on', k.left); $('kRight').classList.toggle('on', k.right);
      { const b = $('kSteer').firstElementChild; b.style.left = (50 + Math.min(0, k.st) * 50) + '%'; b.style.width = (Math.abs(k.st) * 50) + '%'; }
      $('rpSpd').textContent = Math.round((k.v || 0) * (Game.settings.units === 'mph' ? 2.237 : 3.6));
      $('rpSpdU').textContent = Game.settings.units === 'mph' ? 'mph' : 'km/h';
    }
    $('rpNow').textContent = fmtS(t);
    if (!seeking) $('rpSeek').value = Math.round(t / r.dur * 1000);
    $('rpPlay').innerHTML = r.paused ? PLAY_SVG : PAUSE_SVG;
  };
  const rp = () => { const r = Game.race(); return r && r.replay ? r : null; };
  $('rpPlay').onclick = () => { const r = rp(); if (r) { if (r.rt >= r.dur) { r.rt = 0; r.snap = true; } r.paused = !r.paused; } };
  $('rpRate').onclick = () => { const r = rp(); if (!r) return; r.rate = RATES[(RATES.indexOf(r.rate) + 1) % RATES.length]; $('rpRate').textContent = r.rate + '×'; };
  $('rpCam').onclick = () => Game.cycleCamera();
  $('rpClose').onclick = () => show(UI._replayBack || 'board');
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
    $('bTools').hidden = board.tab === 'all' || board.tab === 'weekly';
    $('bDay').textContent = (board.day === today() ? 'Today · ' : '') + DL.prettyDay(board.day) + ' · No. ' + DL.dayNumber(board.day);
    $('bSub').textContent = board.tab === 'all' ? 'Tracks finished across every daily' : DL.biomeOf(board.day).name;
    $('bRaceGhosts').textContent = board.day === today() ? 'Race today’s track' : 'Race this archive track';
    $('bRaceGhosts').hidden = board.tab === 'all' || board.tab === 'weekly';
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
      if (board.tab === 'weekly') {
        const w = await Net.boardWeekly(); if (board.token !== tok) return;
        $('bSub').textContent = 'Weekly cup · ' + DL.prettyDay(w.start) + ' to ' + DL.prettyDay(w.end);
        $('bDay').textContent = w.daysLeft ? w.daysLeft + ' day' + (w.daysLeft > 1 ? 's' : '') + ' left' : 'Final day';
        $('bInfo').textContent = 'Top 10 each day score ' + w.pts.join(', ');
        $('bTools').hidden = false; document.querySelector('.daypick').style.visibility = 'hidden';
        const names = await Net.names(w.rows.map(r => r.uid)); if (board.token !== tok) return;
        if (!w.rows.length) { tbl.innerHTML = '<div class="empty"><h3>The cup has not started</h3><p>Finish today’s daily to take the first points.</p></div>'; return; }
        tbl.innerHTML = '';
        const t = h(`<table><thead><tr><th>#</th><th>Driver</th><th>Points</th><th class="hide-sm">Days scored</th></tr></thead><tbody></tbody></table>`);
        w.rows.forEach((r, i) => { const tr = h(`<tr class="${r.uid === Net.uid ? 'me' : ''}"><td class="rk">${i + 1}</td><td></td><td class="tm">${r.score}</td><td class="hide-sm num">${r.rankedDays}</td></tr>`); tr.children[1].appendChild(whoCell(r, names)); t.tBodies[0].appendChild(tr); });
        tbl.appendChild(t); return;
      }
      document.querySelector('.daypick').style.visibility = '';
      const tr = trackFor(board.day);
      let rows = board.tab === 'friends' && Net.mode === 'online' && Net.api ? await Net.boardFriends(board.day) : (await Net.boardDaily(board.day));
      rows = rows.filter(r => r.time >= tr.minTime);
      if (board.token !== tok) return;
      if (board.tab === 'friends' && !(Net.mode === 'online' && Net.api)) { const fr = Net.save.friends || []; rows = rows.filter(r => r.uid === Net.uid || fr.includes(r.uid)); }
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
            UI._replayBack = 'board'; UI.openReplay(board.day, { uid: r.uid, label: me ? 'You' : nm, car: r.car, l: r.l, b: r.b, equip: r.equip }, enc, r.time);
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
  function renderGoogle(el) {
    const A = DL.Auth, u = A.user;
    if (u) {
      el.innerHTML = `<div class="lbl">Account</div><div class="acct">${u.picture ? `<img alt="" referrerpolicy="no-referrer" src="${esc(u.picture)}">` : ''}<div class="who"><b></b><span class="meta">Signed in with Google</span></div><button class="btn btn-line" data-so>Sign out</button></div>`;
      el.querySelector('b').textContent = u.name;
      el.querySelector('[data-so]').onclick = () => { A.signOut(); renderGoogle(el); };
      return;
    }
    el.innerHTML = `<div class="lbl">Account</div><div class="gwrap"><div id="gBtn"></div><p class="hint" id="gMsg"></p></div>`;
    const btn = el.querySelector('#gBtn'), msg = el.querySelector('#gMsg');
    A.mountButton(btn).then(r => {
      if (r.ok) { msg.textContent = 'Use your Google account as your driver identity.'; return; }
      btn.innerHTML = `<button class="gfake" type="button">${G_LOGO}Continue with Google</button>`;
      const setup = () => {
        btn.innerHTML = `<div class="field"><label class="lbl" for="gCid">Google OAuth Web Client ID</label><input type="text" id="gCid" placeholder="123456789-abc.apps.googleusercontent.com" value="${esc(A.clientId())}"></div><button class="btn btn-navy" id="gSave">Save and retry</button>`;
        btn.querySelector('#gSave').onclick = () => { A.setClientId(btn.querySelector('#gCid').value); renderGoogle(el); };
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
  function renderAccount(el) {
    if (!Net.api) return renderGoogle(el);
    if (Net.username) {
      el.innerHTML = `<div class="lbl">Account</div><div class="acct"><div class="who"><b></b><span class="meta">Signed in. Your times and progress follow you to any device.</span></div><button class="btn btn-line" data-so>Sign out</button></div>`;
      el.querySelector('b').textContent = Net.username;
      el.querySelector('[data-so]').onclick = async () => { await Net.signedOut(); toast('Signed out. You are now playing as a new guest'); renderAccount(el); };
      return;
    }
    el.innerHTML = `<div class="lbl">Account</div><div class="stack">
      <p class="hint">You are playing as a guest. Make an account to keep your times and progress, and log in from any device.</p>
      <div class="field"><label class="lbl" for="aUser">Username</label><input type="text" id="aUser" autocomplete="username" maxlength="16" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="3-16 letters, numbers or _"></div>
      <div class="field"><label class="lbl" for="aPass">Password</label><input type="password" id="aPass" autocomplete="current-password" maxlength="72" placeholder="At least 6 characters"></div>
      <div class="btn-row"><button class="btn btn-navy" id="aReg">Create account</button><button class="btn btn-line" id="aLog">Log in</button></div>
      <p class="hint" id="aMsg"></p></div>`;
    const U = el.querySelector('#aUser'), P = el.querySelector('#aPass'), msg = el.querySelector('#aMsg'), bs = el.querySelectorAll('button');
    const go = async mode => {
      const u = U.value.trim(), pw = P.value;
      if (!u || !pw) { msg.textContent = 'Enter a username and a password.'; return; }
      bs.forEach(b => b.disabled = true); msg.textContent = mode === 'register' ? 'Creating your account…' : 'Logging in…';
      const r = await Net.passwordAuth(mode, u, pw);
      bs.forEach(b => b.disabled = false);
      if (!r.ok) { msg.textContent = r.error; return; }
      toast(mode === 'register' ? '<b>Account created</b>' : '<b>Welcome back</b>');
      renderAccount(el);
    };
    el.querySelector('#aReg').onclick = () => go('register');
    el.querySelector('#aLog').onclick = () => go('login');
    P.addEventListener('keydown', e => { if (e.key === 'Enter') go('login'); });
    if (Net.google) { const gd = document.createElement('div'); gd.style.marginTop = '10px'; el.appendChild(gd); renderGoogle(gd); }
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
  // ---------------- patch notes ----------------
  function patchPip() { const seen = DL.store.get('patchSeen', ''); const p = $('patchPip'); if (p) p.hidden = seen === DL.PATCH_VER; }
  const CAR = (x, y, s, fill, op) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${op || 1}"><path d="M-46 14 L-40 -2 Q-36 -14 -22 -16 L10 -16 Q22 -16 30 -6 L44 0 Q50 4 50 14 Z" fill="${fill}"/><path d="M-30 -2 L-24 -12 L-6 -12 L-6 -2 Z M0 -2 L0 -12 L14 -12 L24 -2 Z" fill="#cdd6de" opacity=".85"/><circle cx="-26" cy="15" r="9" fill="#1c2536"/><circle cx="28" cy="15" r="9" fill="#1c2536"/><circle cx="-26" cy="15" r="3.5" fill="#9aa6b3"/><circle cx="28" cy="15" r="3.5" fill="#9aa6b3"/></g>`;
  const ART = {
    offroad: () => CAR(190, 128, 1.15, '#f05a35') + '<path d="M0 150 L60 135 L130 142 L190 138 L260 148 L400 140 L400 170 L0 170Z" fill="#8f9c80"/><g fill="#d6bc8e" opacity=".9"><circle cx="118" cy="140" r="9"/><circle cx="104" cy="132" r="6"/><circle cx="92" cy="140" r="11" opacity=".7"/><circle cx="76" cy="134" r="7" opacity=".5"/></g><path d="M130 146 L292 146" stroke="#11151d" stroke-opacity=".35" stroke-width="3" stroke-linecap="round" stroke-dasharray="40 6"/>',
    account: () => '<rect x="118" y="38" width="164" height="104" rx="12" fill="#f3ead7"/><rect x="118" y="38" width="164" height="22" rx="12" fill="#1c2536"/><circle cx="160" cy="92" r="16" fill="#f05a35"/><path d="M134 128 Q160 100 186 128Z" fill="#f05a35"/><rect x="200" y="82" width="64" height="8" rx="4" fill="#1c2536"/><rect x="200" y="100" width="48" height="8" rx="4" fill="#cbbb9c"/><rect x="200" y="116" width="56" height="8" rx="4" fill="#cbbb9c"/><circle cx="270" cy="49" r="4" fill="#f2c14e"/>',
    ghost: () => CAR(150, 126, 1.05, '#f05a35') + CAR(238, 118, 1.05, '#f3ead7', .5) + '<path d="M222 96 q0 -22 22 -22 q22 0 22 22 v18 l-7 -6 l-7 6 l-8 -6 l-7 6 l-7 -6 l-7 6Z" fill="#f3ead7" opacity=".9" transform="translate(-20 -24) scale(.8)"/>',
    garage: () => CAR(200, 120, 1.5, '#2f7d8a') + '<g><rect x="60" y="30" width="22" height="22" rx="5" fill="#f05a35"/><rect x="88" y="30" width="22" height="22" rx="5" fill="#f2c14e"/><rect x="116" y="30" width="22" height="22" rx="5" fill="#8aa36b"/><rect x="60" y="58" width="22" height="22" rx="5" fill="#7d8fd0"/><rect x="88" y="58" width="22" height="22" rx="5" fill="#e78fb3"/><rect x="116" y="58" width="22" height="22" rx="5" fill="#f3ead7"/></g>',
    community: () => '<g fill="none" stroke="#1c2536" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M70 140 C100 60 150 150 190 90 S250 50 262 100"/></g><g fill="none" stroke="#f3ead7" stroke-width="3" stroke-dasharray="7 7"><path d="M70 140 C100 60 150 150 190 90 S250 50 262 100"/></g><circle cx="70" cy="140" r="9" fill="#3a8a5a"/><circle cx="262" cy="100" r="9" fill="#f05a35"/><g fill="#f3ead7" stroke="#1c2536" stroke-width="2"><circle cx="130" cy="108" r="6"/><circle cx="190" cy="90" r="6"/></g>',
    launch: () => '<g><rect x="168" y="34" width="5" height="120" fill="#1c2536"/><path d="M173 38 H260 V86 H173Z" fill="#f3ead7"/><g fill="#1c2536">' + Array.from({ length: 24 }, (_, i) => { const x = i % 6, y = (i / 6) | 0; return (x + y) % 2 ? `<rect x="${173 + x * 14.5}" y="${38 + y * 12}" width="14.5" height="12"/>` : ''; }).join('') + '</g></g>'
  };
  function hero(kind) {
    const dot = Array.from({ length: 6 }, (_, i) => `<circle cx="${40 + i * 62}" cy="${22 + (i % 3) * 9}" r="1.6" fill="#fff" opacity=".6"/>`).join('');
    return `<svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="pnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb4c6"/><stop offset="1" stop-color="#e9dec6"/></linearGradient></defs>
      <rect width="400" height="170" fill="url(#pnSky)"/><circle cx="318" cy="52" r="26" fill="#f7d79a" opacity=".9"/>${dot}
      <path d="M0 120 L70 62 L118 104 L176 50 L250 118 L318 70 L400 116 V170 H0Z" fill="#7f8ea0"/><path d="M0 138 L84 96 L152 130 L232 90 L330 134 L400 108 V170 H0Z" fill="#5f6f82"/>
      <path d="M0 150 Q200 128 400 150 V170 H0Z" fill="#3b4558"/><path d="M0 160 Q200 142 400 160" stroke="#f3ead7" stroke-width="2.2" fill="none" stroke-dasharray="14 12" opacity=".8"/>${(ART[kind] || ART.launch)()}</svg>`;
  }
  function openPatchNotes() {
    DL.store.set('patchSeen', DL.PATCH_VER); patchPip();
    const feat = DL.PATCHES[0], rest = DL.PATCHES.slice(1);
    const body = `<article class="pn-hero"><div class="pn-art">${hero(feat.art)}<span class="pn-badge">Latest · v${esc(feat.v)}</span></div>
        <div class="pn-copy"><div class="lbl">${esc(feat.date)}</div><h3>${esc(feat.title)}</h3><p>${esc(feat.lead)}</p>
        <ul>${feat.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div></article>
      <div class="lbl" style="margin:4px 0 -2px">Earlier releases</div>
      <div class="pn-grid">${rest.map(p => `<article class="pn-card"><div class="pn-art sm">${hero(p.art)}<span class="pn-badge">v${esc(p.v)}</span></div><div class="pn-copy"><h4>${esc(p.title)}</h4><p>${esc(p.lead)}</p></div></article>`).join('')}</div>`;
    const m = modal(`<div class="pn-head"><div><div class="lbl">Dayline</div><h2>Patch notes</h2></div><button class="icon-btn" id="pnX" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="pn-wrap">${body}</div>`);
    m.classList.add('pn-modal');
    m.querySelector('#pnX').onclick = closeModal;
  }
  $('bPatch').onclick = openPatchNotes; patchPip();

  // ---------------- confetti ----------------
  UI.confetti = function () {
    const cv = $('confetti'); if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr, x = cv.getContext('2d');
    const cols = ['#f05a35', '#f7a072', '#f2c14e', '#f3ead7', '#2f7d8a', '#1f2a3d'];
    const ps = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * W * 0.25, y: H * 0.35, vx: (Math.random() - .5) * 16 * dpr, vy: (-Math.random() * 14 - 4) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * 0.4, w: (5 + Math.random() * 6) * dpr, h: (3 + Math.random() * 4) * dpr, c: cols[Math.random() * cols.length | 0] }));
    const t0 = performance.now();
    (function tick(now) {
      const t = (now - t0) / 1000; x.clearRect(0, 0, W, H);
      if (t > 3.2 || !cv.isConnected) { x.clearRect(0, 0, W, H); return; }
      for (const p of ps) { p.vy += 0.5 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.globalAlpha = Math.min(1, 3.2 - t); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); }
      requestAnimationFrame(tick);
    })(t0);
  };

  function openSettings(fromPause) {
    const s = Game.settings;
    const m = modal(`<div class="lbl">Settings</div><h2>Settings</h2>
      <div class="field"><label class="lbl" for="sVol">Volume</label><input type="range" id="sVol" min="0" max="1" step="0.05" value="${s.vol}"></div>
      <div class="toggle-row"><span>Shadows</span><button class="chk ${s.shadows ? 'on' : ''}" id="sSh">${s.shadows ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><span>High quality (sharper, denser scenery)</span><button class="chk ${s.hq ? 'on' : ''}" id="sHq">${s.hq ? 'On' : 'Off'}</button></div>
      <div class="field"><label class="lbl" for="sShake">Camera shake</label><input type="range" id="sShake" min="0" max="1" step="0.1" value="${s.shake}"></div>
      <div class="toggle-row"><span>Colour-blind friendly splits</span><button class="chk ${s.cb ? 'on' : ''}" id="sCb">${s.cb ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><span>Race your best automatically</span><button class="chk ${s.pbGhost ? 'on' : ''}" id="sPb">${s.pbGhost ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><label for="sCam">Default camera</label><select id="sCam"><option value="0">Chase</option><option value="1">Far chase</option><option value="2">Bonnet</option><option value="3">Low rally</option><option value="4">Drone</option></select></div>
      <div class="toggle-row"><label for="sUnits">Speed units</label><select id="sUnits"><option value="kmh">km/h</option><option value="mph">mph</option></select></div>
      <div class="toggle-row"><label for="sTouch">Touch controls</label><select id="sTouch"><option value="auto">Automatic</option><option value="on">Always</option><option value="off">Never</option></select></div>
      <div id="acctBox"></div>
      <div class="field" id="invBox"></div>
      <p class="hint">${esc(Net.status)}. Gamepads work too: right trigger accelerates, left trigger brakes, X or RB handbrake, Y recovers.</p>
      <button class="btn btn-navy" id="sDone">${fromPause === true ? 'Back to pause' : 'Done'}</button>`);
    renderAccount(m.querySelector('#acctBox'));
    if (Net.mode === 'online' && Net.uid) {
      const ib = m.querySelector('#invBox'); ib.innerHTML = `<span class="lbl">Invite friends</span><p class="hint">You both get coins: ${REF_WELCOME} for them, ${REF_BONUS} for you once they set a time.</p><button class="btn btn-line btn-sm" id="invCopy">Copy invite link</button> <span class="hint" id="invStat"></span>`;
      ib.querySelector('#invCopy').onclick = async () => { const u = UI.inviteLink(); try { await navigator.clipboard.writeText(u); toast('<b>Invite link copied</b>'); } catch (e) { window.prompt('Copy this link', u); } };
      Net.referral().then(r => { if (r && ib.isConnected) ib.querySelector('#invStat').textContent = r.total ? r.total + ' friend' + (r.total > 1 ? 's' : '') + ' joined' : ''; });
    }
    m.querySelector('#sCam').value = s.cam; m.querySelector('#sUnits').value = s.units; m.querySelector('#sTouch').value = s.touch;
    m.querySelector('#sVol').oninput = e => { s.vol = +e.target.value; Game.applySettings(); };
    const tog = (id, k, after) => { const b = m.querySelector(id); b.onclick = () => { s[k] = !s[k]; b.classList.toggle('on', s[k]); b.textContent = s[k] ? 'On' : 'Off'; Game.applySettings(); if (after) after(); }; };
    m.querySelector('#sShake').oninput = e => { s.shake = +e.target.value; Game.applySettings(); };
    tog('#sCb', 'cb'); tog('#sSh', 'shadows'); tog('#sPb', 'pbGhost');
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

  UI._x = { show, modal, closeModal, toast, esc, h, whoCell, displayName, startRace, leaveRace, renderCoins, board, today, renderNet };

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
      Net.connect().then(() => { if (screen === 'menu') renderMenu(); const tl = new URLSearchParams(location.search).get('t'); if (tl && UI.openTrackLink) { UI.openTrackLink(tl); history.replaceState(null, '', location.pathname); } UI.afterConnect(); });
    }, 30);
  }
  // ---------------- invites + shared liveries ----------------
  const REF_BONUS = 150, REF_WELCOME = 100;
  UI.afterConnect = async function () {
    Net.checkChampion().then(() => { if (Net.hasUfo() && !DL.store.get('ufoSeen:' + Net.save.ufoUntil, 0)) { DL.store.set('ufoSeen:' + Net.save.ufoUntil, 1); toast('<b>Weekly cup champion!</b> The UFO is in your garage until ' + DL.prettyDay(Net.save.ufoUntil)); } });
    const q = new URLSearchParams(location.search);
    const ref = q.get('ref'), lv = q.get('l');
    if (ref) { DL.store.set('pendingRef', ref); }
    if (ref || lv) history.replaceState(null, '', location.pathname);
    if (lv) {
      const L = await Net.getLivery(lv);
      if (!L) toast('That livery link is no longer valid');
      else {
        const m = modal(`<div class="lbl">Shared livery</div><h2></h2><div id="lvThumb" style="display:flex;justify-content:center;padding:6px 0"></div><p class="hint">Made by ${esc(L.by || 'a driver')}. Save it to your designs, or put it on your car now.</p><div class="btn-row"><button class="btn btn-go" id="lvApply">Wear it</button><button class="btn btn-line" id="lvSave">Save to designs</button><button class="btn btn-line" id="lvNo">Close</button></div>`);
        m.querySelector('h2').textContent = L.name;
        try { m.querySelector('#lvThumb').appendChild(liveryThumb(L.l, L.b)); } catch (e) { }
        const sv = Net.save;
        m.querySelector('#lvApply').onclick = () => { sv.paint[sv.car] = { l: L.l, b: L.b }; Net.persist(); Net.pushProfile(); Game.refreshPlayerCar(); closeModal(); toast('<b>Livery applied</b>'); };
        m.querySelector('#lvSave').onclick = () => { if (sv.designs.length >= 10) { toast('Delete a design first, 10 is the limit'); return; } sv.designs.push({ name: L.name.slice(0, 24), l: L.l, b: L.b }); Net.persist(); closeModal(); toast('<b>Saved to your designs</b>'); };
        m.querySelector('#lvNo').onclick = closeModal;
      }
    }
    if (Net.mode !== 'online') return;
    const pend = DL.store.get('pendingRef', null);
    if (pend) {
      DL.store.set('pendingRef', null);
      const r = await Net.redeemInvite(pend);
      if (r.ok) { Net.save.coins += REF_WELCOME; Net.persist(); toast(`<b>Invite accepted</b>. +${REF_WELCOME} coins`); }
    }
    const n = await Net.claimInvites();
    if (n > 0) { Net.save.coins += n * REF_BONUS; Net.persist(); if (screen === 'menu') renderMenu(); toast(`<b>${n} friend${n > 1 ? 's' : ''} joined</b>. +${n * REF_BONUS} coins`); }
  };
  UI.inviteLink = () => DL.Share.base() + '?ref=' + Net.uid;
  boot();
})(window.DL);
