/* DAYLINE — screens, HUD, garage paint editor, shop, leaderboards, archive, modals, boot */
'use strict';
(function (DL) {
  const UI = DL.UI = {};
  const $ = id => document.getElementById(id);
  const Net = DL.Net, Game = DL.Game;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  let screen = 'loading';
  const SCREENS = ['menu', 'garage', 'shop', 'board', 'archive', 'hud', 'replay', 'community', 'editor', 'room'];
  const today = () => DL.dayKey();

  DL.biomeOf = day => DL.BIOMES[DL.BIOME_KEYS[Math.floor(DL.mulberry32(DL.seedFor(day))() * DL.BIOME_KEYS.length)]];
  const trackCache = {};
  const trackFor = day => trackCache[day] || (trackCache[day] = (Game.track() && Game.track().day === day ? Game.track() : new DL.Track(day)));

  function show(name) {
    screen = name;
    SCREENS.forEach(s => { $(s).hidden = s !== name; });
    $('topnav').hidden = name === 'hud' || name === 'replay' || name === 'editor';
    const tabFor = name === 'archive' || name === 'room' ? 'menu' : name;
    document.querySelectorAll('#navTabs [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === tabFor));
    if (name !== 'shop' && shop.item) { shop.item = null; $('shop').classList.remove('inspecting'); }
    closeModal();
    if (name !== 'garage') Game.setGarageGrid(false);
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
  UI.back = function () { if ($('modalRoot').firstChild) { closeModal(); return; } if (screen === 'replay') { show(UI._replayBack || 'board'); return; } if (screen === 'editor') { show('community'); return; } if (screen === 'shop' && shop.item) { shop.item = null; renderShop(); return; } if (['garage', 'shop', 'board', 'archive', 'community'].includes(screen)) show('menu'); };
  document.querySelectorAll('#navTabs [data-go]').forEach(b => b.addEventListener('click', () => {
    const g = b.dataset.go;
    if (g === 'board') $('bBoard').click(); else if (g === 'community') $('bCommunity').click();
    else { if (g === 'shop') shop.item = null; show(g); }
  }));
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
  // ---------------- daily rewards ----------------
  function renderDailyCard() {
    const st = Net.dailyState(), card = $('mDaily'); if (!card) return;
    $('mStreak').textContent = st.can ? 'Day ' + (st.step + 1) + ' ready' : 'Back tomorrow';
    $('mStreakBars').innerHTML = Array.from({ length: 7 }, (_, i) => `<i class="${i < st.step ? 'on' : i === st.step && st.can ? 'now' : ''}${i === 6 ? ' car' : ''}"></i>`).join('');
    card.classList.toggle('ready', st.can);
  }
  function openDaily() {
    const st = Net.dailyState(), R = DL.DAILY_REWARDS;
    const tiles = R.map((r, i) => {
      const cls = i < st.step ? 'got' : i === st.step && st.can ? 'now' : '';
      const what = r === 'car' ? '<svg class="dr-car" viewBox="0 0 64 34"><path d="M6 24 L8 15 L20 13 L28 5 H44 L52 13 L58 15 L59 24 Z" fill="#fff"/><path d="M30 8 H42 L48 13 H25Z" fill="#1c2536" opacity=".55"/><circle cx="18" cy="25" r="6" fill="#1c2536"/><circle cx="48" cy="25" r="6" fill="#1c2536"/><circle cx="18" cy="25" r="2.4" fill="#fff"/><circle cx="48" cy="25" r="2.4" fill="#fff"/></svg><b>Free car</b>' : `<div class="dr-coin"><span class="coin"></span></div><b>${r}</b>`;
      return `<div class="dr-tile ${cls}${r === 'car' ? ' big' : ''}"><small>Day ${i + 1}</small>${what}${i < st.step ? '<em>✓</em>' : ''}</div>`;
    }).join('');
    const m = modal(`<h2 class="dr-h">Daily rewards</h2><p class="dr-sub">Claim once a day. Day 7 is a free car you don't own yet. Missing a day never resets your progress.</p><div class="dr-grid">${tiles}</div>
      <div style="display:flex;gap:10px;align-items:stretch"><button class="btn btn-line" style="flex:none" id="drClose">Close</button><button class="btn btn-go" style="flex:1" id="drClaim" ${st.can ? '' : 'disabled'}>${st.can ? 'Claim day ' + (st.step + 1) : 'Come back tomorrow'}</button></div>`);
    m.classList.add('dr-modal');
    m.querySelector('#drClose').onclick = closeModal;
    m.querySelector('#drClaim').onclick = () => {
      const got = Net.claimDaily(); if (!got) return;
      renderCoins(); renderDailyCard(); closeModal();
      if (got.car) {
        const info = DL.itemInfo('cars', got.car); UI.confetti && UI.confetti(); DL.Audio.chime();
        const mm = modal(`<h2 class="dr-h">Day 7: a new car!</h2><p class="dr-sub">The <b>${esc(info.name)}</b> (${esc(info.sub)}) is now in your locker.</p><div style="display:flex;gap:10px;align-items:stretch"><button class="btn btn-line" style="flex:none" id="drOk">Nice</button><button class="btn btn-go" style="flex:1" id="drDrive">Drive it</button></div>`);
        mm.querySelector('#drOk').onclick = closeModal;
        mm.querySelector('#drDrive').onclick = () => { Net.save.car = got.car; if (!Net.save.paint[got.car]) Net.save.paint[got.car] = { l: DL.encodeLivery(DL.defaultLivery()), b: DL.DEFAULT_BASE }; Net.persist(); Net.pushProfile(); Game.refreshPlayerCar(); closeModal(); };
      } else { DL.Audio.coin(); toast(`<b>Day ${got.step + 1} reward</b> +${got.coins} <span class="coin"></span>`, 3500); }
    };
  }
  UI.openDaily = openDaily;
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#mDaily')) openDaily(); });
  function renderMenu() {
    if (Net.save && !Net.save.gift24) { Net.save.gift24 = 1; Net.save.coins += 500; Net.persist(); Net.pushProfile(); renderCoins(); setTimeout(() => toast('<b>Coin boost</b>: +500 <span class="coin"></span> and bigger rewards from now on', 5000), 800); }
    const t = trackFor(today()), d = today();
    $('mDayNo').textContent = 'Daily No. ' + DL.dayNumber(d);
    $('mDate').textContent = DL.prettyDay(d);
    $('mBiome').textContent = t.B.name;
    $('mLength').textContent = (t.length / 1000).toFixed(2) + ' km · ' + t.checkpoints.length + ' checkpoints';
    const best = Net.save.best[d];
    $('mMedals').innerHTML = `<span class="lbl">Your best today</span><b class="num">${best ? DL.fmtTime(best).slice(1, 8) : 'No time yet'}</b>`;
    renderDailyCard();
    if (Net.dailyState().can && !UI._drShown) { UI._drShown = 1; setTimeout(() => { if (screen === 'menu' && !$('modalRoot').firstChild) openDaily(); }, 900); }
    renderNameBox();
    renderNet();
    $('lbPlaySub').textContent = 'Daily No. ' + DL.dayNumber(d) + ' · ' + t.B.name;
    shopPip();
  }
  // leaderboard name (callsign) right on the menu so new players set one
  function renderNameBox() {
    const inp = $('mTag'), box = $('mNameBox'); if (!inp) return;
    const tag = (Net.save.tag || '').trim();
    if (document.activeElement !== inp) inp.value = Net.save.tag || '';
    box.classList.toggle('need', !tag);
    const nt = $('lbNameTxt'); if (nt) nt.textContent = tag || 'Driver';
    $('mTagHint').innerHTML = tag ? 'Shown next to your times on the leaderboard.' : 'No name yet: you show up as &ldquo;Driver&rdquo; on the leaderboard.';
  }
  $('lbName').onclick = () => { const b = $('mNameBox'); b.classList.toggle('open'); if (b.classList.contains('open')) $('mTag').focus(); };
  (function () {
    const inp = $('mTag'); if (!inp) return;
    let timer = null;
    const save = () => {
      Net.save.tag = inp.value.trim().slice(0, 16); Net.persist(); if (Net.pushProfile) Net.pushProfile();
      renderNameBox(); const ok = $('mTagSaved'); ok.hidden = false; clearTimeout(ok._t); ok._t = setTimeout(() => { ok.hidden = true; }, 1600);
    };
    inp.addEventListener('input', () => { $('mNameBox').classList.toggle('need', !inp.value.trim()); clearTimeout(timer); timer = setTimeout(save, 700); });
    inp.addEventListener('change', () => { clearTimeout(timer); save(); $('mNameBox').classList.remove('open'); });
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
    $('mCountdown').textContent = $('isTimer').textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, '0')).join(':');
    if (UI._day && UI._day !== today()) { UI._day = today(); if (screen === 'menu') { Game.loadDay(today()); renderMenu(); toast('<b>New daily track is live</b>'); } if (screen === 'shop' && !shop.item) renderShop(); shopPip(); }
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
    if (DL.Mobile) DL.Mobile.raceStart();
    Game.startRace(day, ghosts, custom, opts);
  }
  // where Quit / Menu go after a race: the menu, the community page or the editor
  function leaveRace() {
    const to = UI._leave || 'menu';
    if (to === 'room' && DL.Rooms) DL.Rooms.quitRace();
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
    if ((n === 3 || (n === 1 && DL.Game.settings.quick)) && !DL.store.get('driftHint', 0)) { DL.store.set('driftHint', 1); setTimeout(() => toast('<b>New:</b> hold ' + (DL.isTouch && DL.isTouch() ? 'the drift button' : 'Space') + ' and steer to slide the car', 5000), 600); }
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
      cells.push(`<div class="sp ${cls}"><small>${i + 1}</small><b class="num">${sec.toFixed(3)}</b><em class="num">${d == null ? '' : (d <= 0 ? '' : '+') + d.toFixed(3)}</em></div>`);
    });
    return { html: `<div class="splits-wrap"><div class="lbl">Sector times${pb ? ' vs your best' : ''}</div><div class="splits" style="grid-template-columns:repeat(${cells.length},minmax(0,1fr))">${cells.join('')}</div></div>`, squares: sq.join('') };
  }
  UI.roomFinished = function (r, t, valid, res) {
    UI.checkpoint(r.track.checkpoints.length, r.track.checkpoints.length, null);
    const R = DL.Rooms, sp = sectorSplits(r, t), best = Net.save.best[r.track.day];
    const prev = res ? res.prevBest : null, isPB = valid && res && res.isPB && prev;
    const m = modal(`
      <div class="lbl">Room ${esc(r.room.code)} · ${esc(r.track.B.name)}</div>
      <h2>${!valid ? 'Lap not counted' : isPB ? 'New personal best' : 'Finished'}</h2>
      <div class="res-time" ${!valid ? 'style="text-decoration:line-through;opacity:.5"' : ''}>${DL.fmtTime(t)}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${r.recoveries ? `<span class="tag">${r.recoveries} recover${r.recoveries > 1 ? 'ies' : 'y'}</span>` : '<span class="tag">Clean run</span>'}${res && res.notes ? res.notes.map(n => `<span class="tag coral">${esc(n)}</span>`).join('') : ''}</div>
      ${valid ? sp.html : ''}
      <div class="lbl">Room standings</div>
      <div class="rm-head"><span></span><span>Driver</span><span>Last</span><span>Best</span></div>
      <div class="rm-list" id="rmFin">${R ? R.boardHtml() : ''}</div>
      ${res && res.total ? `<div class="res-row" style="border:0"><span class="lbl">Coins earned</span><b class="price num" style="font-size:26px"><span class="coin"></span>+${res.total}</b></div>` : ''}
      <button class="btn btn-go" id="rmAgain" style="font-size:24px">Restart</button>
      <button class="btn btn-line btn-sm" id="rmLobby">Back to lobby</button>`, { sticky: true });
    m.querySelector('#rmAgain').onclick = () => Game.restart();
    m.querySelector('#rmLobby').onclick = () => R.backToLobby();
    const iv = setInterval(() => { const el = $('rmFin'); if (!el) { clearInterval(iv); return; } el.innerHTML = R.boardHtml(); }, 700);
    if (res && res.total) { DL.Audio.coin(); renderCoins(); }
    if (isPB) { UI.confetti(); DL.Audio.chime(); }
  };
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

  // ---------- locker: loadout slots on the left, the car in the middle, a drawer of items on the right ----------
  const SLOTS = ['cars', 'paint', 'spoiler', 'wheels', 'bumper', 'finish', 'tint', 'plate', 'exhaust', 'trail'];
  const SVG_PAINT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1.5-1.6-1.5-3s1-2 2.5-2H18a3 3 0 0 0 3-3c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/></svg>';
  const SVG_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const rarVars = (el, r) => { const R = DL.RARITIES[r] || DL.RARITIES.common; el.style.setProperty('--rc', R.c); el.style.setProperty('--ra', R.a); };
  // one item tile, used by the shop and the locker
  function tileEl(it, o) {
    o = o || {};
    const R = DL.RARITIES[it.rarity];
    const price = o.price ? `<span class="pr"><span class="coin"></span>${it.price.toLocaleString('en-GB')}</span>` : '';
    const t = h(`<button class="tile ${o.big ? 'big' : ''} ${o.locked ? 'locked' : ''} ${o.equipped ? 'equipped' : ''}" aria-label="${esc(it.name)}"><div class="art"></div><div class="info"><span class="nm">${esc(it.name)}</span><span class="sub">${esc(R.n)} · ${esc(it.sub)}</span>${price}</div><i class="bar"></i></button>`);
    rarVars(t, it.rarity);
    t.querySelector('.art').appendChild(DL.thumbImg(it.cat, it.id));
    if (o.badge) t.appendChild(h(`<span class="badge">${esc(o.badge)}</span>`));
    if (o.equipped) t.appendChild(h('<span class="badge on">Equipped</span>'));
    else if (o.owned && o.showOwned) t.appendChild(h('<span class="badge own">Owned</span>'));
    else if (o.locked) t.appendChild(h(`<span class="lock">${SVG_LOCK}</span>`));
    return t;
  }
  function equip(cat, id) {
    const s = Net.save;
    if (cat === 'cars') { s.car = id; if (!s.paint[id]) s.paint[id] = { l: DL.encodeLivery(DL.defaultLivery()), b: DL.DEFAULT_BASE }; }
    else s.equip[cat] = id;
    Net.persist(); Net.pushProfile(); Game._preview = null; Game.refreshPlayerCar(); DL.Audio.click();
  }
  function renderGarage() {
    const s = Net.save, spec = DL.CARS[s.car];
    $('gCarName').textContent = spec.name; $('gCarClass').textContent = spec.cls;
    Game.sideView = 'locker'; Game.showcase(null);
    if (gTab !== 'paint') ed = null;
    // loadout slots
    const sl = $('gSlots'); sl.innerHTML = '';
    SLOTS.forEach(k => {
      const on = k === gTab || (k === 'paint' && gTab === 'designs');
      const it = k === 'paint' ? null : k === 'cars' ? DL.itemInfo('cars', s.car) : DL.itemInfo(k, s.equip[k] || DL.PARTS[k][0].id);
      const b = h(`<button class="slot ${on ? 'on' : ''}"><span class="sw"></span><div><span class="lbl">${esc(DL.CAT_ONE[k])}</span><b>${esc(it ? it.name : 'Livery')}</b></div></button>`);
      if (it) { rarVars(b, it.rarity); b.querySelector('.sw').appendChild(DL.thumbImg(it.cat, it.id)); }
      else { const pt = s.paint[s.car] || {}; b.querySelector('.sw').innerHTML = SVG_PAINT; b.querySelector('.sw').style.background = DL.PALETTE[pt.b == null ? DL.DEFAULT_BASE : pt.b] || '#888'; }
      b.onclick = () => { gTab = k; renderGarage(); };
      sl.appendChild(b);
    });
    renderPresets();
    const painting = gTab === 'paint' || gTab === 'designs';
    Game.paintView(gTab === 'paint' && paintMode === 'car');
    Game.setGarageGrid(false);
    $('gDrawTitle').textContent = painting ? 'Paint' : DL.CAT_NAMES[gTab];
    $('gDrawSub').textContent = painting ? 'Livery for the ' + spec.name : 'Tap to equip';
    const tabs = $('gTabs'); tabs.hidden = !painting;
    tabs.innerHTML = painting ? `<button class="tab ${gTab === 'paint' ? 'on' : ''}" data-tab="paint">Paint</button><button class="tab ${gTab === 'designs' ? 'on' : ''}" data-tab="designs">Designs</button>` : '';
    const body = $('gBody'); body.innerHTML = '';
    if (gTab === 'paint') { renderPaint(body); return; }
    if (gTab === 'designs') { renderDesigns(body); return; }
    const cat = gTab;
    // only what you own (plus whatever is on the car right now)
    const ids = cat === 'cars' ? DL.CAR_ORDER.concat(['ufo']) : DL.PARTS[cat].map(p => p.id);
    const cur = cat === 'cars' ? s.car : s.equip[cat];
    const list = ids.filter(id => Net.owns(cat, id) || id === cur).map(id => DL.itemInfo(cat, id)).filter(Boolean);
    list.sort((a, b) => a.price - b.price);
    const grid = h('<div class="lk-grid"></div>');
    list.forEach(it => {
      const own = Net.owns(cat, it.id), eq = cat === 'cars' ? s.car === it.id : s.equip[cat] === it.id;
      const t = tileEl(it, { owned: own, locked: !own, equipped: eq, price: !own });
      t.onclick = () => { if (!own) { openShopItem(it); return; } if (!eq) { equip(cat, it.id); renderGarage(); } };
      grid.appendChild(t);
    });
    const nOwn = list.length, nAll = ids.filter(id => DL.released(cat, id)).length;
    $('gDrawSub').textContent = 'Tap to equip · ' + nOwn + ' owned';
    const more = h(`<button class="lk-more"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0"/></svg>Get more in the shop</button>`);
    more.onclick = () => { shop.cat = cat; shop.item = null; show('shop'); };
    grid.appendChild(more);
    body.appendChild(grid);
    if (cat === 'plate') {
      const pr = h(`<div class="field"><label class="lbl">Plate text</label><div class="namerow"><input type="text" maxlength="7" placeholder="DAYLINE" autocomplete="off" spellcheck="false" value="${esc(s.equip.plateText || '')}" style="text-transform:uppercase;letter-spacing:.12em"></div></div>`);
      const inp = pr.querySelector('input');
      inp.addEventListener('keydown', e => e.stopPropagation()); inp.addEventListener('keyup', e => e.stopPropagation());
      inp.addEventListener('change', e => { s.equip.plateText = DL.plateText(e.target.value === '' ? '' : e.target.value); if (!e.target.value) delete s.equip.plateText; Net.persist(); Net.pushProfile(); Game.refreshPlayerCar(); renderGarage(); });
      body.appendChild(pr);
    }
    const hint = cat === 'cars' ? 'Every car shares the same engine, grip and hitbox, so the leaderboard only measures driving. Drag the car to look around.'
      : cat === 'exhaust' || cat === 'trail' ? 'You see this behind your car while you race.' : 'Fits every car you own. Drag the car to look around.';
    body.appendChild(h(`<p class="hint">${hint}</p>`));
  }
  // three saved loadouts (car, its paint and parts), kept on this device
  function renderPresets() {
    const el = $('gPresets'); if (!el) return; el.innerHTML = '';
    const P = DL.store.get('loadouts', [null, null, null]), s = Net.save;
    P.forEach((p, i) => {
      const d = h(`<div class="pre"><b>Loadout ${i + 1}</b><small>${p && DL.CARS[p.car] ? esc(DL.CARS[p.car].name) : 'Empty'}</small><div><button ${p ? '' : 'disabled'}>Use</button><button class="ghost">Save</button></div></div>`);
      const [use, save] = d.querySelectorAll('button');
      use.onclick = () => {
        if (!p || !Net.owns('cars', p.car)) { toast('You no longer own that car'); return; }
        s.car = p.car; if (p.paint) s.paint[p.car] = p.paint; else if (!s.paint[p.car]) s.paint[p.car] = { l: DL.encodeLivery(DL.defaultLivery()), b: DL.DEFAULT_BASE };
        for (const k in p.equip || {}) if (k === 'plateText' || Net.owns(k, p.equip[k])) s.equip[k] = p.equip[k];
        Net.persist(); Net.pushProfile(); Game.refreshPlayerCar(); renderGarage(); toast(`<b>Loadout ${i + 1}</b> equipped`);
      };
      save.onclick = () => { const all = DL.store.get('loadouts', [null, null, null]); all[i] = { car: s.car, paint: s.paint[s.car] || null, equip: Object.assign({}, s.equip) }; DL.store.set('loadouts', all); renderPresets(); toast(`Saved to <b>Loadout ${i + 1}</b>`); };
      el.appendChild(d);
    });
  }

  // ---------- pixel paint editor ----------
  let ed = null;
  const CELL = 12;
  function openEditor() {
    const s = Net.save, p = s.paint[s.car] || { l: DL.encodeLivery(DL.defaultLivery()), b: DL.DEFAULT_BASE };
    ed = { liv: DL.decodeLivery(p.l), base: p.b == null ? DL.DEFAULT_BASE : p.b, color: ed ? ed.color : 13, tool: ed ? ed.tool : 'brush', stamp: 'roundel', mirror: ed ? ed.mirror : true, grid: ed ? ed.grid : true, undo: [], redo: [], active: 'left', canv: {} };
  }
  UI.paintActive = () => screen === 'garage' && gTab === 'paint' && !!ed && (paintMode === 'car' || paintMode === 'pro') && ed.tool !== 'look';

  // ---- Quick paint: body colour + pattern + number, no pixels ----
  let paintMode = 'car';
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
    const keep = Object.keys(DL.PART_SLOTS).map(k => DL.partColour(ed.liv, k));
    ed.liv.fill(0); Object.keys(DL.PART_SLOTS).forEach((k, i) => { const sl = DL.PART_SLOTS[k]; ed.liv[sl[1] * DL.ATLAS_W + sl[0]] = keep[i]; });
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

  // Colour the window frame, lights and add-ons separately from the body (stored in spare livery cells)
  function partsSection(body, pickGet) {
    const wrap = h('<div class="qp-sec"><div class="lbl">Parts</div></div>');
    Object.keys(DL.PART_SLOTS).forEach(k => {
      const sl = DL.PART_SLOTS[k], cur = DL.partColour(ed.liv, k), col = cur ? DL.PALETTE[cur] : null;
      const row = h(`<div class="paint-tools" style="align-items:center"><span class="lbl" style="min-width:118px">${sl[2]}</span><span class="sw ${col ? '' : 'clear'}" style="width:28px;${col ? 'background:' + col : ''}"></span><button class="tool">Use selected colour</button><button class="tool" ${cur ? '' : 'disabled'}>Auto</button></div>`);
      const set = v => { pushUndo(); ed.liv[sl[1] * DL.ATLAS_W + sl[0]] = v; commit(); renderGarage(); };
      row.children[2].onclick = () => { const c = pickGet(); if (c) set(c); };
      row.children[3].onclick = () => set(0);
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
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
    sec('Parts colour', sw(() => ed.partPick || 0, i => { ed.partPick = i; }));
    partsSection(body, () => ed.partPick || ed.base);
    const act = h('<div class="paint-tools"><button class="tool">Undo</button><button class="tool">Reset to stock</button></div>');
    act.children[0].disabled = !ed.undo.length; act.children[0].onclick = () => undo();
    act.children[1].onclick = () => { pushUndo(); ed.liv = DL.defaultLivery(); ed.base = DL.DEFAULT_BASE; QP.pat = 'none'; QP.num = ''; commit(); renderGarage(); };
    body.appendChild(act);
    body.appendChild(h('<p class="hint">Pick a colour, a pattern and a number. Saves automatically; keep favourites under Designs. Want pixel-level control? Switch to Advanced.</p>'));
  }

  function renderPaint(body) {
    if (!ed) openEditor();
    Game.setGarageGrid(paintMode !== 'quick' && ed.grid !== false, ed.liv, ed.base);
    const modes = h('<div class="paint-tools qp-modes"><button class="tool">Paint on car</button><button class="tool">Quick</button><button class="tool">Panels</button></div>');
    ['car', 'quick', 'pro'].forEach((m, i) => { modes.children[i].classList.toggle('on', paintMode === m); modes.children[i].onclick = () => { paintMode = m; renderGarage(); }; });
    body.appendChild(modes);
    if (paintMode === 'quick') { renderQuick(body); return; }
    const tools = [['brush', 'Brush'], ['big', 'Big brush'], ['fill', 'Fill'], ['erase', 'Eraser'], ['pick', 'Pick'], ['stamp', 'Stamp']];
    if (paintMode === 'car') tools.push(['look', 'Rotate']);
    const tb = h('<div class="paint-tools"></div>');
    tools.forEach(([id, nm]) => { const b = h(`<button class="tool ${ed.tool === id ? 'on' : ''}">${nm}</button>`); b.onclick = () => { ed.tool = id; renderGarage(); }; tb.appendChild(b); });
    const gr = h(`<button class="tool ${ed.grid !== false ? 'on' : ''}" title="Show the pixel grid on the car">Grid</button>`); gr.onclick = () => { ed.grid = ed.grid === false; renderGarage(); }; tb.appendChild(gr);
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
    partsSection(body, () => ed.color);

    if (ed.tool === 'stamp') {
      const st = h('<div class="stamps"></div>');
      const owned = Net.isDev() ? Object.values(DL.STAMPS).map(x => x.pack) : Net.save.owned.stickers;
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
    if (paintMode === 'pro') {
      body.appendChild(mk('left', 'front ←'));
      body.appendChild(mk('right', 'front →'));
      body.appendChild(mk('top', 'front →'));
      const row = h('<div class="pgrid-row"></div>'); row.appendChild(mk('front')); row.appendChild(mk('rear')); body.appendChild(row);
    }
    const touch = DL.isTouch && DL.isTouch();
    body.appendChild(h(`<p class="hint">${paintMode === 'car' ? (touch ? 'Touch the car to paint a pixel. Use the Rotate tool (or two fingers) to turn it, pinch to zoom.' : 'Click and drag on the car to paint pixels. Right-drag or the Rotate tool turns the car, scroll to zoom.') + ' Mirror keeps both sides symmetrical.' : 'Paint on the grids or straight onto the car in the showroom. Mirror keeps both sides symmetrical.'} Changes save automatically; store favourites under Designs.</p>`));
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
  let paintStroke = false, lastPx = null, hoverK = '';
  const atlasCell = uv => {
    const ax = Math.floor(uv.x * DL.ATLAS_W), ay = Math.floor((1 - uv.y) * DL.ATLAS_H);
    for (const key in DL.PANELS) { const p = DL.PANELS[key]; if (ax >= p.x && ax < p.x + p.w && ay >= p.y && ay < p.y + p.h) return { key, x: ax - p.x, y: ay - p.y }; }
    return null;
  };
  UI.paintUV = function (uv, start) {
    if (!ed) return;
    const c = atlasCell(uv); if (!c) return;
    hoverK = '';
    if (start) { pushUndo(); paintStroke = true; lastPx = null; }
    else if (['fill', 'stamp', 'pick'].includes(ed.tool)) return;
    // fill the gap when the pointer moves faster than one pixel per event
    if (!start && lastPx && lastPx.key === c.key && ['brush', 'big', 'erase'].includes(ed.tool)) {
      let x0 = lastPx.x, y0 = lastPx.y; const dx = Math.abs(c.x - x0), dy = Math.abs(c.y - y0), sx = x0 < c.x ? 1 : -1, sy = y0 < c.y ? 1 : -1; let err = dx - dy;
      for (let n = 0; n < 64 && !(x0 === c.x && y0 === c.y); n++) { const e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } applyTool(c.key, x0, y0, false); }
    } else applyTool(c.key, c.x, c.y, start);
    lastPx = c;
    if (ed) commit();
  };
  UI.paintEnd = () => { paintStroke = false; lastPx = null; refreshUndoButtons(); };
  // a faint preview of the brush on the car under the pointer
  UI.paintHover = function (uv) {
    if (!ed || paintStroke) return;
    const c = uv && UI.paintActive() && ['brush', 'big', 'erase', 'stamp'].includes(ed.tool) ? atlasCell(uv) : null;
    const k = c ? c.key + c.x + ',' + c.y + ed.tool + ed.color + ed.stamp + ed.mirror : '';
    if (k === hoverK) return; hoverK = k;
    if (!c) { Game.setGarageLivery(ed.liv, ed.base); return; }
    const keep = ed.liv; ed.liv = keep.slice(); applyTool(c.key, c.x, c.y, true); const tmp = ed.liv; ed.liv = keep;
    Game.setGarageLivery(tmp, ed.base);
  };
  UI.paintTool = () => ed && ed.tool;

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
  // ---------- item shop: featured + daily items rotate for everyone at midnight; a new drop lands every Monday ----------
  const shop = { cat: 'all', q: '', item: null };
  // this week's drop (in launch week: a fixed pick from the launch pool)
  function weekDrop(day) {
    const wk = DL.weekOf(day), parts = DL.allItems().filter(it => it.cat !== 'cars' && it.price > 0 && DL.released(it.cat, it.id, day));
    let list = parts.filter(it => { const p = DL.PARTS[it.cat].find(x => x.id === it.id); return p.gen && p.wk === wk; });
    if (wk === 0) { const r = DL.mulberry32(0x1a0c4), L = list.slice(); list = []; while (list.length < DL.WEEKLY_DROP && L.length) list.push(L.splice(Math.floor(r() * L.length), 1)[0]); }
    return list.sort((x, y) => y.price - x.price);
  }
  function shopRotation(day) {
    const r = DL.mulberry32((DL.seedFor(day) ^ 0x5eed1) >>> 0);
    const take = arr => arr.splice(Math.floor(r() * arr.length), 1)[0];
    const cars = DL.CAR_ORDER.filter(id => id !== 'pebble').map(id => DL.itemInfo('cars', id));
    const fresh = weekDrop(day), freshKeys = new Set(fresh.map(it => it.key));
    const parts = DL.allItems().filter(it => it.cat !== 'cars' && it.price > 0 && DL.released(it.cat, it.id, day) && !freshKeys.has(it.key));
    const big = parts.filter(p => p.price >= 240), bigPart = take(big);
    const rest = parts.filter(p => p.key !== bigPart.key);
    // daily: one per category where possible so the six slots feel varied
    const daily = [], cats = ['spoiler', 'wheels', 'bumper', 'tint', 'plate', 'exhaust', 'trail', 'finish', 'stickers'];
    while (daily.length < 6 && rest.length) {
      const want = cats[Math.floor(r() * cats.length)], pickFrom = rest.filter(p => p.cat === want && !daily.some(d => d.cat === want));
      const it = pickFrom.length ? pickFrom[Math.floor(r() * pickFrom.length)] : (daily.length >= 4 ? take(rest) : null);
      if (it) { rest.splice(rest.indexOf(it), 1); daily.push(it); }
    }
    const featCar = take(cars), carsRow = [take(cars), take(cars), take(cars)].filter(Boolean);
    return { feat: [featCar, bigPart], daily, fresh, cars: carsRow };
  }
  const SEARCH_WORDS = it => [it.name, it.sub, DL.CAT_NAMES[it.cat], DL.RARITIES[it.rarity].n, it.cat].join(' ').toLowerCase();
  function shopTile(it, big) {
    const own = Net.owns(it.cat, it.id);
    const eq = it.cat === 'cars' ? Net.save.car === it.id : Net.save.equip[it.cat] === it.id;
    const t = tileEl(it, { big, price: !own, owned: own, showOwned: true, equipped: own && eq && it.cat !== 'stickers' });
    t.onclick = () => openShopItem(it);
    return t;
  }
  function openShopItem(it) { shop.item = it; if (screen !== 'shop') show('shop'); else renderShop(); }
  UI.openShopItem = openShopItem;
  function shopPip() { const p = $('shopPip'); if (p) p.hidden = DL.store.get('shopSeen', '') === today(); }
  function weekTimer() { const el = $('isWeek'); if (!el) return; const ms = DL.msToNextWeek(), d = Math.floor(ms / 86400000), hh = Math.floor(ms / 3600000) % 24; el.textContent = d ? d + 'd ' + hh + 'h' : hh + 'h ' + Math.floor(ms / 60000) % 60 + 'm'; }
  function renderShop() {
    const sc = $('shop');
    DL.store.set('shopSeen', today()); shopPip();
    if (shop.item) { renderInspect(); return; }
    sc.classList.remove('inspecting'); $('isInspect').hidden = true;
    Game.showcase(null);
    const body = $('isBody'); body.innerHTML = '';
    const rot = shopRotation(today());
    if (DL.Ads && DL.Ads.enabled()) {
      const left = DL.Ads.left(), ab = h(`<div class="is-adbar"><span class="coin"></span><div><b>Free coins</b><br><small>Watch a short ad for +${DL.Ads.REWARD} · ${left} left today</small></div><button ${left ? '' : 'disabled'}>${left ? 'Watch ad' : 'Back tomorrow'}</button></div>`);
      ab.querySelector('button').onclick = e => { e.target.disabled = true; DL.Ads.watch().then(got => { if (got) renderCoins(); renderShop(); }); };
      body.appendChild(ab);
    }
    const f = h('<section class="is-sec"><h3>Featured <small>Today only</small></h3><div class="is-feat"></div></section>');
    rot.feat.forEach(it => f.lastElementChild.appendChild(shopTile(it, true)));
    body.appendChild(f);
    if (rot.cars && rot.cars.length) { const cr = h(`<section class="is-sec"><h3>Cars <small>Three more in the showroom today · ${DL.CAR_ORDER.length} to collect</small></h3><div class="is-grid"></div></section>`); rot.cars.forEach(it => cr.lastElementChild.appendChild(shopTile(it))); body.appendChild(cr); }
    const d = h('<section class="is-sec"><h3>Daily <small>New items every day · same for every driver</small></h3><div class="is-grid"></div></section>');
    rot.daily.forEach(it => d.lastElementChild.appendChild(shopTile(it)));
    body.appendChild(d);
    if (rot.fresh.length) {
      const w = h(`<section class="is-sec is-new"><h3>New this week <small>Drop ${DL.weekOf(today()) + 1} · next drop in <b id="isWeek"></b></small></h3><div class="is-grid"></div></section>`);
      rot.fresh.forEach(it => { const t = shopTile(it); if (!Net.owns(it.cat, it.id)) t.appendChild(h('<span class="badge new">New</span>')); w.lastElementChild.appendChild(t); });
      body.appendChild(w); weekTimer();
    }
    body.appendChild(h('<p class="is-foot">You earn coins for finishing each daily, extra laps, personal bests, daily rewards and achievements. Nothing here changes speed, grip or hitbox.</p>'));
  }
  const SHOW_3D = { cars: 1, spoiler: 1, wheels: 1, bumper: 1, finish: 1, tint: 1, exhaust: 1, trail: 1 };
  function renderInspect() {
    const it = shop.item, s = Net.save, sc = $('shop'), box = $('isInspect');
    sc.classList.add('inspecting'); box.hidden = false; Game.sideView = 'inspect';
    const own = Net.owns(it.cat, it.id), eq = it.cat === 'cars' ? s.car === it.id : s.equip[it.cat] === it.id, R = DL.RARITIES[it.rarity];
    // try it on in the showroom
    const paint = s.paint[it.cat === 'cars' ? it.id : s.car] || {};
    if (it.cat === 'exhaust' || it.cat === 'trail') { if (shop.rearFor !== it.key) { shop.rearFor = it.key; Game.rearView(it.cat === 'trail'); } } else shop.rearFor = null;
    if (SHOW_3D[it.cat]) {
      const e = Object.assign({}, s.equip); if (it.cat !== 'cars') e[it.cat] = it.id;
      Game.showcase({ car: it.cat === 'cars' ? it.id : s.car, livery: paint.l ? DL.decodeLivery(paint.l) : DL.defaultLivery(), base: paint.b == null ? DL.DEFAULT_BASE : paint.b, equip: e, label: it.name });
    } else Game.showcase(null);
    const note = it.cat === 'exhaust' || it.cat === 'trail' ? '<div class="note">Shows behind your car while you race.</div>' : it.cat === 'stickers' ? '<div class="note">Stamps: ' + esc(Object.keys(DL.STAMPS).filter(k => DL.STAMPS[k].pack === it.id).join(', ')) + '. Use them in Locker → Paint.</div>' : '';
    const short = Math.max(0, it.price - s.coins);
    box.innerHTML = '';
    const card = h(`<div class="ii-card"><span class="rar">${esc(R.n)}</span><h2>${esc(it.name)}</h2><div class="sub">${esc(it.sub)}${it.cat === 'cars' ? '' : ' · fits every car'}</div><p>${esc(it.blurb)}</p>${note}</div>`);
    rarVars(card, it.rarity);
    if (!SHOW_3D[it.cat]) { const im = DL.thumbImg(it.cat, it.id, 'big-thumb'); card.insertBefore(im, card.querySelector('p')); }
    box.appendChild(card);
    const acts = h('<div class="ii-acts"></div>');
    if (!own) {
      const buy = h(`<button class="ii-buy" ${short ? 'disabled' : ''}>Buy <span class="coin"></span>${it.price.toLocaleString('en-GB')}</button>`);
      if (short) buy.insertAdjacentHTML('beforeend', `<small style="font-size:14px;letter-spacing:.06em">· ${short} more</small>`);
      buy.onclick = () => {
        if (!buy.classList.contains('confirm')) { buy.classList.add('confirm'); buy.innerHTML = `Buy for <span class="coin"></span>${it.price.toLocaleString('en-GB')}?`; setTimeout(() => { if (buy.isConnected && buy.classList.contains('confirm')) renderInspect(); }, 3500); return; }
        if (Net.buy(it.cat, it.id, it.price)) {
          DL.Audio.coin(); renderCoins(); toast(`<b>${esc(it.name)}</b> unlocked`);
          if (it.cat !== 'stickers') equip(it.cat, it.id);
          if (UI.confetti) UI.confetti();
          renderInspect();
        } else toast('Not enough coins');
      };
      acts.appendChild(buy);
    }
    const row = h('<div class="ii-row"></div>');
    const back = h('<button class="ii-btn">← Shop</button>'); back.onclick = () => { shop.item = null; renderShop(); };
    row.appendChild(back);
    if (own && it.cat !== 'stickers') {
      const u = h(`<button class="ii-btn ${eq ? 'on' : ''}">${eq ? 'Equipped' : 'Equip'}</button>`);
      u.onclick = () => { if (!eq) { equip(it.cat, it.id); toast(`<b>${esc(it.name)}</b> equipped`); renderInspect(); } };
      row.appendChild(u);
    } else {
      const l = h('<button class="ii-btn">Locker</button>'); l.onclick = () => { gTab = it.cat === 'stickers' ? 'paint' : it.cat; shop.item = null; show('garage'); };
      row.appendChild(l);
    }
    acts.appendChild(row);
    box.appendChild(acts);
  }
  (function () {
    const inp = $('isSearch'); let t = null;
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { shop.q = inp.value; shop.item = null; renderShop(); }, 120); });
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { inp.value = ''; shop.q = ''; renderShop(); inp.blur(); } });
    inp.addEventListener('keyup', e => e.stopPropagation());
  })();

  // ---------------- replay ----------------
  const fmtS = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
  const RATES = [0.5, 1, 2, 4];
  const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>', PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  let seeking = false;
  UI.openReplay = function (day, spec, enc, time) {
    $('replay').classList.remove('nohud'); show('replay');
    if (!Game.startReplay(day, enc, spec)) { toast('That replay could not be played'); show(UI._replayBack || 'board'); return; }
    const r = Game.race();
    $('rpName').textContent = spec.label || 'Driver';
    $('rpTime').textContent = DL.fmtTime(time);
    $('rpEnd').textContent = fmtS(r.dur); $('rpRate').textContent = '1×'; $('rpPlay').innerHTML = PAUSE_SVG;
    setupReplaySectors(day, spec);
  };
  // sector loop chips + compare list
  let rpSel = 0, rpCmpOn = {};
  function setupReplaySectors(day, spec) {
    const r = Game.race(), n = r && r.cp ? r.cp.length : 0, wrap = $('rpChips'), cmpB = $('rpCmp'), list = $('rpCmpList');
    rpSel = 0; rpCmpOn = {}; list.hidden = true; list.innerHTML = ''; $('rpGaps').innerHTML = '';
    $('rpSec').hidden = n < 2; wrap.innerHTML = '';
    const chips = [['Full run', null]].concat(r && r.cp ? r.cp.map((c, i) => ['S' + (i + 1), i]) : []);
    chips.forEach(([txt, k]) => {
      const b = h(`<button class="chk ${k == null ? 'on' : ''}">${txt}</button>`);
      b.onclick = () => { Game.replaySector(k); [...wrap.children].forEach(x => x.classList.toggle('on', x === b)); };
      wrap.appendChild(b);
    });
    const rows = board.rowsDay === day ? board.rowsNow || [] : [];
    cmpB.hidden = !rows.length; cmpB.textContent = 'Compare';
    cmpB.onclick = () => {
      if (!list.hidden) { list.hidden = true; return; }
      list.hidden = false; list.innerHTML = '<div class="lbl">Race another run alongside this one (up to 2)</div>';
      rows.slice(0, 30).forEach((x, i) => {
        if (x.uid === spec.uid) return;
        const me = x.uid === Net.uid, nm = me ? 'You' : displayName(x, board.names || {}), on = !!rpCmpOn[x.uid];
        const row = h(`<div class="rowc"><span>${i + 1}. ${esc(nm)} · <b class="num">${DL.fmtTime(x.time)}</b></span><button class="chk ${on ? 'on' : ''}">${on ? 'On' : 'Add'}</button></div>`);
        const btn = row.querySelector('button');
        btn.onclick = async () => {
          if (rpCmpOn[x.uid]) { Game.replayRemoveGhost(x.uid); delete rpCmpOn[x.uid]; btn.classList.remove('on'); btn.textContent = 'Add'; cmpB.textContent = Object.keys(rpCmpOn).length ? 'Compare · ' + Object.keys(rpCmpOn).length : 'Compare'; return; }
          if (Object.keys(rpCmpOn).length >= 2) { toast('Two comparisons at a time'); return; }
          btn.disabled = true; btn.textContent = '…';
          try {
            const enc = await Net.ghost(me ? 'me' : x.uid, day), g = enc && Game.replayAddGhost({ uid: x.uid, label: me ? 'You' : nm, car: x.car, l: x.l, b: x.b, equip: x.equip, mine: me }, enc);
            if (!g) { toast('No replay saved for that run'); btn.textContent = 'Add'; return; }
            rpCmpOn[x.uid] = { name: me ? 'You' : nm }; btn.classList.add('on'); btn.textContent = 'On';
            cmpB.textContent = 'Compare · ' + Object.keys(rpCmpOn).length;
          } catch (e) { toast('Could not load that run'); btn.textContent = 'Add'; }
          finally { btn.disabled = false; }
        };
        list.appendChild(row);
      });
    };
  }

  UI.replayHud = function (r, t) {
    const k = r.keys;
    if (k) {
      $('kUp').classList.toggle('on', k.gas); $('kDown').classList.toggle('on', k.brake); $('kSpace').classList.toggle('on', !!k.hb);
      $('kLeft').classList.toggle('on', k.left); $('kRight').classList.toggle('on', k.right);
      { const b = $('kSteer').firstElementChild; b.style.left = (50 + Math.min(0, k.st) * 50) + '%'; b.style.width = (Math.abs(k.st) * 50) + '%'; }
      $('rpSpd').textContent = Math.round((k.v || 0) * (Game.settings.units === 'mph' ? 2.237 : 3.6));
      $('rpSpdU').textContent = Game.settings.units === 'mph' ? 'mph' : 'km/h';
    }
    { const gs = r.ghosts.filter(g => g.cmp), el = $('rpGaps'); if (gs.length || el.firstChild) el.innerHTML = gs.map(g => g.gap == null ? `<span>${esc(g.spec.label || '')} …</span>` : `<span class="${g.gap <= 0 ? 'good' : 'bad'}" title="Gap at the last checkpoint passed (green = the replayed driver is ahead of this run)">${esc((g.spec.label || '').slice(0, 12))} ${g.gap > 0 ? 'ahead' : 'behind'} ${Math.abs(g.gap).toFixed(3)}</span>`).join(''); }
    $('rpNow').textContent = fmtS(t);
    if (!seeking) $('rpSeek').value = Math.round(t / r.dur * 1000);
    $('rpPlay').innerHTML = r.paused ? PLAY_SVG : PAUSE_SVG;
  };
  const rp = () => { const r = Game.race(); return r && r.replay ? r : null; };
  $('rpPlay').onclick = () => { const r = rp(); if (r) { if (r.rt >= r.dur) { r.rt = 0; r.snap = true; } r.paused = !r.paused; } };
  $('rpRate').onclick = () => { const r = rp(); if (!r) return; r.rate = RATES[(RATES.indexOf(r.rate) + 1) % RATES.length]; $('rpRate').textContent = r.rate + '×'; };
  $('rpCam').onclick = () => Game.cycleCamera();
  $('rpHide').onclick = () => $('replay').classList.add('nohud');
  $('rpShow').onclick = () => $('replay').classList.remove('nohud');
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

  // checkpoint times of a leaderboard run, worked out from its ghost (cached)
  async function splitsOf(r) {
    const key = r.uid + '|' + board.day, c = board.spl || (board.spl = {});
    if (c[key] !== undefined) return c[key];
    const enc = await Net.ghost(r.uid === Net.uid ? 'me' : r.uid, board.day), gh = enc && DL.decodeGhost(enc);
    if (!gh) return (c[key] = null);
    const pg = new DL.Progress(trackFor(board.day));
    for (let k = 1; k < gh.n; k++) pg.update(gh.f[(k - 1) * 8], gh.f[(k - 1) * 8 + 2], gh.f[k * 8], gh.f[k * 8 + 2], k / gh.hz);
    return (c[key] = pg.cpTimes.length ? pg.cpTimes.slice() : null);
  }
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
        $('bInfo').textContent = 'Top 10 each day score ' + w.pts.join(', ') + ' · added when the day ends' + ' · added when the day ends';
        $('bTools').hidden = false; document.querySelector('.daypick').style.visibility = 'hidden';
        const names = await Net.names(w.rows.map(r => r.uid)); if (board.token !== tok) return;
        if (!w.rows.length) { tbl.innerHTML = '<div class="empty"><h3>The cup has not started</h3><p>Points are added when each day ends, so the first scores appear tomorrow.</p></div>'; return; }
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
      board.rowsNow = rows; board.rowsDay = board.day; board.names = names;
      const lead = rows[0].time;
      tbl.innerHTML = '';
      const t = h(`<table><thead><tr><th>#</th><th>Driver</th><th>Time</th><th class="hide-sm">Car</th><th>Ghost</th><th></th></tr></thead><tbody></tbody></table>`);
      const sel = board.sel[board.day] || (board.sel[board.day] = {});
      rows.forEach((r, i) => {
        const me = r.uid === Net.uid;
        const row = h(`<tr class="${me ? 'me' : ''}"><td class="rk">${i + 1}</td><td></td>
          <td class="tm">${DL.fmtTime(r.time)}<div class="gap">${i ? DL.fmtDelta(r.time - lead) : 'Leader'}</div></td>
          <td class="hide-sm">${esc((DL.CARS[r.car] || DL.CARS.pebble).name)}</td>
          <td class="gcell"><button class="chk ${sel[r.uid] ? 'on' : ''}" data-k="g">${sel[r.uid] ? 'On' : 'Race'}</button> <button class="chk" data-k="w" title="Watch a replay of this run">▶ Watch</button> <button class="chk" data-k="s" title="Sector times for this run">Sectors</button></td>
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
        const sbtn = row.querySelector('[data-k=s]');
        sbtn.onclick = async () => {
          const nx = row.nextElementSibling;
          if (nx && nx.classList.contains('spl')) { nx.remove(); sbtn.classList.remove('on'); return; }
          sbtn.disabled = true; sbtn.textContent = '…';
          try {
            const mine = rows.find(x => x.uid === Net.uid), theirs = await splitsOf(r);
            if (!theirs) { toast('No ghost saved for that run, so no sector times'); return; }
            const vsYou = mine && !me ? await splitsOf(mine) : null, ref = vsYou || (i ? await splitsOf(rows[0]) : null);
            const sec = a => a.map((c, k) => c - (k ? a[k - 1] : 0));
            const ts = sec(theirs), rs = ref ? sec(ref) : null;
            const cells = ts.map((s, k) => {
              const d = rs && rs[k] != null ? (vsYou ? rs[k] - s : s - rs[k]) : null;   // vs you: how much YOU lose in this sector; vs leader: how much they lose
              const cls = d == null ? '' : d <= 0.0005 ? 'up' : 'down';
              return `<div class="sp ${cls}"><small>${k + 1}</small><b class="num">${s.toFixed(3)}</b><em class="num">${d == null ? '' : (d <= 0 ? '' : '+') + d.toFixed(3)}</em></div>`;
            });
            const cap = vsYou ? 'Sector times · red = where you lose time to this driver' : ref ? 'Sector times · +/− vs the leader' : 'Sector times';
            const tr2 = h(`<tr class="spl"><td colspan="6"><div class="splits-wrap"><div class="lbl">${cap}</div><div class="splits" style="grid-template-columns:repeat(${cells.length},minmax(0,1fr))">${cells.join('')}</div></div></td></tr>`);
            row.after(tr2); sbtn.classList.add('on');
          } catch (e) { toast('Could not load sector times'); }
          finally { sbtn.disabled = false; sbtn.textContent = 'Sectors'; }
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
      if (board.token === tok) {
        tbl.innerHTML = '<div class="empty"><h3>Board unreachable</h3><p>The leaderboard did not answer. Check your connection and try again.</p><button class="btn btn-coral btn-sm" id="bRetry">Try again</button></div>';
        const rb = tbl.querySelector('#bRetry'); if (rb) rb.onclick = async () => { rb.disabled = true; rb.textContent = 'Trying…'; try { if (!(Net.api && Net.mode === 'online')) await Net.connectApi(); } catch (e2) { } renderBoard(); };
      }
    }
  }
  function displayName(r, names) { const p = names[r.uid]; return DL.devAlias((p && p.name) || r.tag || (r.uid === Net.uid ? 'You' : 'Driver')); }
  function whoCell(r, names) {
    const p = names[r.uid];
    const el = h(`<button class="who" style="text-align:left">${p && p.avatarUrl ? `<img alt="" src="${esc(p.avatarUrl)}">` : ''}<b></b>${r.uid === Net.uid ? '<span class="tag coral">You</span>' : ''}</button>`);
    const dn = displayName(r, names); el.querySelector('b').textContent = dn;
    if (DL.isDevName(dn) || (r.uid === Net.uid && Net.isDev())) el.insertAdjacentHTML('beforeend', DL.devBadge());
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
    m.querySelector('#pName').textContent = DL.devAlias(name || (mine ? (p.tag || 'You') : 'Driver'));
    if (DL.isDevName(name) || (mine && Net.isDev())) m.querySelector('#pName').insertAdjacentHTML('beforeend', DL.devBadge());
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
    daily: () => [0, 1, 2, 3, 4, 5].map(i => `<g transform="translate(${34 + i * 46} ${i % 2 ? 58 : 50})"><rect width="38" height="54" rx="7" fill="${i < 4 ? '#f3ead7' : '#f3ead7'}" opacity="${i < 4 ? 1 : .55}"/><circle cx="19" cy="24" r="9" fill="#f2c14e" stroke="#1c2536" stroke-width="2"/>${i < 4 ? '<path d="M12 44 l5 5 l9 -10" stroke="#3f8d4e" stroke-width="3.5" fill="none" stroke-linecap="round"/>' : ''}</g>`).join('') + '<g transform="translate(312 30)"><rect width="66" height="94" rx="10" fill="#f2c14e" stroke="#1c2536" stroke-width="3"/><text x="33" y="22" font-size="13" font-weight="800" text-anchor="middle" fill="#1c2536" font-family="sans-serif">DAY 7</text></g>' + CAR(345, 92, 0.42, '#f05a35'),
    newcars: () => CAR(92, 132, 0.95, '#f3ead7') + '<g transform="translate(60 92)"><rect x="0" y="0" width="70" height="16" rx="8" fill="#c0563a"/><path d="M8 6 l8 4 l8 -4 l8 4 l8 -4 l8 4 l8 -4" stroke="#f2c419" stroke-width="3" fill="none"/></g>' + CAR(200, 120, 1.15, '#7cc3f2') + '<g transform="translate(186 40)"><path d="M14 40 L0 10 H28Z" fill="#d8a45c"/><circle cx="14" cy="6" r="12" fill="#f2a0c4"/><circle cx="14" cy="-10" r="9" fill="#9fe3c4"/><circle cx="14" cy="-21" r="3.5" fill="#d12f3a"/></g>' + CAR(312, 132, 0.95, '#f05a35') + '<g transform="translate(290 84)"><path d="M0 22 L22 -4 L44 22Z" fill="#f2c96b" stroke="#b8742f" stroke-width="4" stroke-linejoin="round"/><circle cx="16" cy="13" r="3.5" fill="#c8243a"/><circle cx="27" cy="9" r="3" fill="#c8243a"/><circle cx="24" cy="17" r="3" fill="#c8243a"/></g><g font-family="sans-serif" font-weight="800" fill="#f2c14e"><text x="340" y="44" font-size="26" text-anchor="middle">+20</text></g>',
    drift: () => '<g fill="#e9e4da" opacity=".85"><circle cx="86" cy="140" r="14"/><circle cx="64" cy="146" r="18" opacity=".7"/><circle cx="40" cy="150" r="20" opacity=".5"/><circle cx="108" cy="132" r="9"/></g><path d="M60 156 Q140 150 214 140" stroke="#11151d" stroke-opacity=".5" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M56 150 Q136 144 210 134" stroke="#11151d" stroke-opacity=".4" stroke-width="5" stroke-linecap="round" fill="none"/><g transform="rotate(9 230 140)">' + CAR(230, 128, 1.3, '#f05a35') + '</g><g stroke="#f2c14e" stroke-width="3" stroke-linecap="round"><path d="M304 126 l18 -4"/><path d="M302 138 l20 2"/><path d="M300 114 l16 -9"/></g>',
    shop: () => ['#7a3bc4:70:44:Epic', '#2766b7:140:36:Rare', '#c4631c:210:44:Legendary', '#3f8d4e:280:36:New'].map(s => { const [c, x, y, t] = s.split(':'); return `<g transform="translate(${x} ${y})"><rect width="62" height="82" rx="8" fill="${c}"/><rect x="5" y="5" width="52" height="46" rx="5" fill="#fff" opacity=".18"/><circle cx="31" cy="28" r="12" fill="#f3ead7" opacity=".9"/><rect x="8" y="58" width="46" height="7" rx="3" fill="#f3ead7" opacity=".9"/><rect x="8" y="69" width="28" height="6" rx="3" fill="#f3ead7" opacity=".55"/></g>`; }).join('') + '<circle cx="332" cy="40" r="15" fill="#f2c14e" stroke="#1c2536" stroke-width="3"/><text x="332" y="46" font-size="17" font-weight="800" text-anchor="middle" fill="#1c2536" font-family="sans-serif">7</text>',
    newlook: () => '<rect x="40" y="26" width="320" height="22" rx="11" fill="#1c2536"/><g fill="#f3ead7"><rect x="56" y="34" width="34" height="6" rx="3"/><rect x="150" y="30" width="46" height="14" rx="7"/></g><g fill="#7d8fa3"><rect x="206" y="34" width="34" height="6" rx="3"/><rect x="250" y="34" width="34" height="6" rx="3"/></g><circle cx="334" cy="37" r="6" fill="#f2c14e"/>' + CAR(160, 112, 1.25, '#f3ead7') + '<rect x="272" y="112" width="92" height="30" rx="8" fill="#f2c14e"/><rect x="286" y="124" width="64" height="7" rx="3.5" fill="#1c2536"/><rect x="48" y="66" width="70" height="46" rx="8" fill="#f3ead7" opacity=".92"/><rect x="58" y="76" width="50" height="6" rx="3" fill="#1c2536"/><rect x="58" y="90" width="36" height="6" rx="3" fill="#cbbb9c"/>',
    phones: () => '<g transform="translate(150 12) rotate(-6 50 70)"><rect width="104" height="146" rx="14" fill="#11151d"/><rect x="6" y="8" width="92" height="130" rx="9" fill="#9fb4c6"/><path d="M6 100 Q52 84 98 100 V138 H6Z" fill="#5f6f82"/><rect x="40" y="82" width="26" height="14" rx="4" fill="#f05a35"/></g><g fill="#f3ead7" stroke="#1c2536" stroke-width="3"><circle cx="112" cy="118" r="20"/><circle cx="296" cy="118" r="20"/><circle cx="262" cy="86" r="14"/></g><g fill="none" stroke="#1c2536" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M104 118 l-6 -6 m6 6 l-6 6"/><path d="M304 118 l6 -6 m-6 6 l6 6"/></g><path d="M80 60 q-18 18 0 36 M96 52 q-26 26 0 52" fill="none" stroke="#f2c14e" stroke-width="3" stroke-linecap="round" opacity=".9"/>',
    bigupdate: () => '<path d="M170 60 L120 150 H280 L230 60Z" fill="#7fe8ff" opacity=".3"/><g transform="translate(200 46)"><ellipse rx="52" ry="14" fill="#c9d1da"/><ellipse cy="-8" rx="26" ry="16" fill="#7fe8ff" opacity=".9"/><g fill="#f2c14e"><circle cx="-34" cy="2" r="3.5"/><circle cx="-12" cy="6" r="3.5"/><circle cx="12" cy="6" r="3.5"/><circle cx="34" cy="2" r="3.5"/></g></g>' + CAR(120, 136, .8, '#f05a35') + CAR(280, 136, .8, '#2f7d8a') + '<g fill="#f3ead7" opacity=".9"><circle cx="60" cy="40" r="3"/><circle cx="340" cy="30" r="3"/><circle cx="330" cy="76" r="2"/><circle cx="72" cy="78" r="2"/></g>',
    brighter: () => '<g opacity=".95"><circle cx="318" cy="52" r="34" fill="#f7d79a"/><g stroke="#f7d79a" stroke-width="4" stroke-linecap="round"><path d="M318 4 v10"/><path d="M270 52 h10"/><path d="M366 52 h-10"/><path d="M284 18 l7 7"/><path d="M352 18 l-7 7"/></g></g><g fill="#fff" opacity=".95"><ellipse cx="90" cy="46" rx="34" ry="12"/><ellipse cx="112" cy="38" rx="22" ry="12"/><ellipse cx="230" cy="70" rx="30" ry="10"/><ellipse cx="248" cy="62" rx="18" ry="10"/></g><path d="M60 150 Q200 20 340 150" fill="none" stroke="#e5534b" stroke-width="5" opacity=".8"/><path d="M68 150 Q200 34 332 150" fill="none" stroke="#f2c14e" stroke-width="5" opacity=".8"/><path d="M76 150 Q200 48 324 150" fill="none" stroke="#4fb3ff" stroke-width="5" opacity=".8"/>' + CAR(200, 136, 1, '#f3ead7'),
    roadside: () => [60, 110, 300, 350].map((x, i) => `<g transform="translate(${x} ${i % 2 ? 106 : 100})"><rect x="-3" y="22" width="6" height="22" fill="#6b4b2f"/><path d="M0 -14 L16 24 H-16Z" fill="${i % 2 ? '#3f7a4a' : '#2f6b3c'}"/><path d="M0 -30 L12 4 H-12Z" fill="${i % 2 ? '#4a8d57' : '#3b7d49'}"/></g>`).join('') + '<g transform="translate(250 100)"><rect width="58" height="42" fill="#f3ead7"/><path d="M-6 0 L29 -26 L64 0Z" fill="#f05a35"/><rect x="10" y="14" width="14" height="14" fill="#7fb6d6"/><rect x="34" y="14" width="14" height="28" fill="#6b4b2f"/></g><g transform="translate(160 96)"><rect x="-2" y="0" width="4" height="46" fill="#1c2536"/><rect x="-22" y="-8" width="44" height="30" rx="4" fill="#f2c14e" stroke="#1c2536" stroke-width="3"/><path d="M-12 14 L0 -2 L12 14Z" fill="#1c2536"/></g>' + CAR(210, 142, .7, '#2f7d8a'),
    rough: () => '<path d="M0 146 H400 V170 H0Z" fill="#8a6f4a"/><path d="M40 146 q40 -18 80 0 z" fill="#6b5338"/><ellipse cx="300" cy="152" rx="46" ry="8" fill="#6fa8c9" opacity=".85"/><ellipse cx="300" cy="150" rx="30" ry="4" fill="#fff" opacity=".4"/><g fill="#d6bc8e" opacity=".95"><circle cx="110" cy="136" r="10"/><circle cx="92" cy="128" r="7"/><circle cx="74" cy="138" r="12" opacity=".7"/></g>' + CAR(190, 126, 1.2, '#c4631c') + '<g stroke="#11151d" stroke-opacity=".4" stroke-width="4" stroke-linecap="round" fill="none"><path d="M120 150 H160"/><path d="M230 150 H270"/></g>',
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
      <div class="toggle-row"><span>Cinematic lighting (sunset sky, bloom, light shafts, long shadows)</span><button class="chk ${s.light ? 'on' : ''}" id="sLight">${s.light ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><span>High quality (sharper, denser scenery)</span><button class="chk ${s.hq ? 'on' : ''}" id="sHq">${s.hq ? 'On' : 'Off'}</button></div>
      <div class="field"><label class="lbl" for="sShake">Camera shake</label><input type="range" id="sShake" min="0" max="1" step="0.1" value="${s.shake}"></div>
      <div class="toggle-row"><span>Colour-blind friendly splits</span><button class="chk ${s.cb ? 'on' : ''}" id="sCb">${s.cb ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><span>Race your best automatically</span><button class="chk ${s.pbGhost ? 'on' : ''}" id="sPb">${s.pbGhost ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><span>Quick start (1 second countdown)</span><button class="chk ${s.quick ? 'on' : ''}" id="sQuick">${s.quick ? 'On' : 'Off'}</button></div>
      <div class="toggle-row"><label for="sCam">Default camera</label><select id="sCam"><option value="0">Chase</option><option value="1">Far chase</option><option value="2">Bonnet</option><option value="3">Low rally</option><option value="4">Drone</option></select></div>
      <div class="toggle-row"><label for="sUnits">Speed units</label><select id="sUnits"><option value="kmh">km/h</option><option value="mph">mph</option></select></div>
      <div class="toggle-row"><label for="sTouch">Touch controls</label><select id="sTouch"><option value="auto">Automatic</option><option value="on">Always</option><option value="off">Never</option></select></div>
      <div class="mob-set" id="mobSet">
        <div class="lbl" style="margin-top:6px">Phone and tablet</div>
        <div class="toggle-row"><label for="sSteer">Steering</label><select id="sSteer"><option value="buttons">Left / right buttons</option><option value="slide">Slide thumb (smooth)</option><option value="tilt">Tilt the phone</option></select></div>
        <div class="toggle-row"><span>Accelerate automatically</span><button class="chk ${s.autoGas ? 'on' : ''}" id="sAuto">${s.autoGas ? 'On' : 'Off'}</button></div>
        <div class="toggle-row"><span>Swap sides (pedals on the left)</span><button class="chk ${s.swap ? 'on' : ''}" id="sSwap">${s.swap ? 'On' : 'Off'}</button></div>
        <div class="field"><label class="lbl" for="sTs">Button size</label><input type="range" id="sTs" min="0.8" max="1.3" step="0.05" value="${s.tScale || 1}"></div>
        <div class="toggle-row"><span>Vibrate on taps and checkpoints</span><button class="chk ${s.haptics ? 'on' : ''}" id="sHap">${s.haptics ? 'On' : 'Off'}</button></div>
        <div class="toggle-row" id="fsRow"><span>Full screen when racing</span><button class="chk ${s.fsRace ? 'on' : ''}" id="sFs">${s.fsRace ? 'On' : 'Off'}</button></div>
        <div class="toggle-row" id="orRow"><label for="sOr">Screen direction in full screen</label><select id="sOr"><option value="any">Follow the phone</option><option value="landscape">Always sideways</option></select></div>
        <p class="hint" id="iosHint" hidden>On iPhone, full screen works from the home screen: tap Share, then Add to Home Screen.</p>
      </div>
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
    tog('#sCb', 'cb'); tog('#sSh', 'shadows'); tog('#sPb', 'pbGhost'); tog('#sQuick', 'quick');
    tog('#sLight', 'light');
    tog('#sHq', 'hq', () => toast('Scenery density changes on the next track load'));
    m.querySelector('#sCam').onchange = e => { s.cam = +e.target.value; Game.applySettings(); };
    m.querySelector('#sUnits').onchange = e => { s.units = e.target.value; Game.applySettings(); $('hUnit').textContent = s.units === 'mph' ? 'mph' : 'km/h'; };
    m.querySelector('#sTouch').onchange = e => { s.touch = e.target.value; Game.applySettings(); if (DL.Mobile) DL.Mobile.refresh(); };
    { const Mo = DL.Mobile, q = x => m.querySelector(x), after = () => { if (Mo) Mo.refresh(); };
      q('#sSteer').value = s.steerMode || 'buttons'; q('#sOr').value = s.orient || 'any';
      q('#sSteer').onchange = async e => { s.steerMode = e.target.value; Game.applySettings(); after(); if (s.steerMode === 'tilt' && Mo) { if (await Mo.enableTilt()) toast('<b>Tilt steering on</b> Hold the phone how you like: it centres when the race starts'); else q('#sSteer').value = s.steerMode; } };
      tog('#sAuto', 'autoGas'); tog('#sSwap', 'swap', after); tog('#sHap', 'haptics', () => { if (s.haptics && Mo) Mo.buzz(20); }); tog('#sFs', 'fsRace');
      q('#sTs').oninput = e => { s.tScale = +e.target.value; Game.applySettings(); after(); };
      q('#sOr').onchange = e => { s.orient = e.target.value; Game.applySettings(); if (Mo) Mo.lockOrient(); };
      if (Mo && !Mo.canFs) { q('#fsRow').hidden = true; q('#orRow').hidden = true; q('#iosHint').hidden = !(Mo.iOS && !Mo.standalone); }
      if (!DL.isTouch() && s.touch !== 'on') q('#mobSet').hidden = true; }
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
  const REF_BONUS = 300, REF_WELCOME = 200;
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
