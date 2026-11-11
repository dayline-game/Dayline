/* DAYLINE — phones and tablets: touch driving (buttons, slide or tilt), full screen, orientation, wake lock,
   haptics, auto-pause, adaptive resolution and the small hints that make the browser feel like an app */
'use strict';
(function (DL) {
  const Game = DL.Game, UI = DL.UI, S = Game.settings;
  const $ = id => document.getElementById(id);
  const root = document.documentElement, body = document.body;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = !!(window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone);
  const M = DL.Mobile = { state: { on: false, gas: 0, brake: 0, drift: 0, steer: 0, analog: null }, iOS, standalone };

  // first run on a phone: sensible defaults (stored settings always win)
  const stored = DL.store.get('settings', null) || {};
  const defs = { steerMode: 'buttons', autoGas: false, haptics: true, fsRace: true, orient: 'any', tScale: 1, swap: false };
  for (const k in defs) if (stored[k] === undefined && S[k] === undefined) S[k] = defs[k];

  // ---------------- device classes ----------------
  function touchOn() { return S.touch === 'on' || (S.touch === 'auto' && DL.isTouch()); }
  function classes() {
    const t = touchOn();
    body.classList.toggle('touch', t);
    body.classList.toggle('ios', iOS);
    body.classList.toggle('standalone', standalone);
    body.classList.toggle('tswap', !!S.swap);
    body.classList.toggle('ttilt', S.steerMode === 'tilt');
    body.classList.toggle('tslide', S.steerMode === 'slide');
    root.style.setProperty('--tscale', String(S.tScale || 1));
    const racing = !!(Game.mode && Game.mode() === 'race');
    body.classList.toggle('racing', racing);
    M.state.on = t && racing;
  }
  M.refresh = classes;
  // real viewport height (iOS toolbars) for layouts that need it
  function vh() { root.style.setProperty('--vh', (window.visualViewport ? window.visualViewport.height : innerHeight) * 0.01 + 'px'); }
  addEventListener('resize', vh); if (window.visualViewport) visualViewport.addEventListener('resize', vh); vh();

  // stop the page itself from scrolling, rubber-banding or zooming while playing
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => { if (e.target.closest('#gl,#touch,#hud')) e.preventDefault(); });
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 1 || !e.target.closest('.panel,.modal,.side-body,.table-wrap,.cm-side,.ed-bar,.rp-bar,input,select,textarea')) e.preventDefault();
  }, { passive: false });
  document.addEventListener('contextmenu', e => { if (body.classList.contains('touch') && !e.target.closest('input,textarea')) e.preventDefault(); });

  // ---------------- haptics ----------------
  const buzz = ms => { if (S.haptics && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } };
  M.buzz = buzz;

  // ---------------- touch pads ----------------
  // One handler for every finger. Each finger owns whatever control is under it right now, so sliding a thumb from
  // left to right, or from brake to gas, switches without lifting.
  const fingers = new Map();
  const steerPad = $('tSteer'), pedalPad = $('tPedals'), knob = steerPad.querySelector('.tknob');
  function hit(x, y) {
    const r = steerPad.getBoundingClientRect(), pad = 18;
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad * 2 && y <= r.bottom + pad) return { pad: 'steer', r };
    const el = document.elementFromPoint(x, y), b = el && el.closest && el.closest('#tPedals [data-c]');
    if (b) return { pad: 'pedal', c: b.dataset.c };
    const pr = pedalPad.getBoundingClientRect();
    if (x >= pr.left - pad && x <= pr.right + pad && y >= pr.top - pad * 2 && y <= pr.bottom + pad) {
      // a thumb that drifts into the gap goes to the nearest pedal
      let best = null, bd = 1e9;
      pedalPad.querySelectorAll('[data-c]').forEach(e => { const q = e.getBoundingClientRect(), d = Math.hypot(x - (q.left + q.width / 2), y - (q.top + q.height / 2)); if (d < bd) { bd = d; best = e.dataset.c; } });
      return { pad: 'pedal', c: best };
    }
    return null;
  }
  function apply() {
    const st = M.state; let gas = 0, brake = 0, drift = 0, steer = 0, analog = null;
    for (const f of fingers.values()) {
      if (f.pad === 'pedal') { if (f.c === 'gas') gas = 1; else if (f.c === 'brake') brake = 1; else if (f.c === 'drift') drift = 1; }
      else if (f.pad === 'steer') {
        if (S.steerMode === 'slide') analog = f.v;
        else steer += f.v;
      }
    }
    if (S.steerMode === 'tilt' && tilt.on) analog = tilt.v;
    const prev = st.gas + st.brake * 2 + st.drift * 4, now = gas + brake * 2 + drift * 4;
    if (now !== prev && now > prev) buzz(8);
    st.gas = gas; st.brake = brake; st.drift = drift; st.steer = DL.clamp(steer, -1, 1); st.analog = analog;
    pedalPad.querySelectorAll('[data-c]').forEach(e => e.classList.toggle('down', !!st[e.dataset.c]));
    steerPad.classList.toggle('l', S.steerMode !== 'slide' && st.steer < 0);
    steerPad.classList.toggle('r', S.steerMode !== 'slide' && st.steer > 0);
    const sf = [...fingers.values()].find(f => f.pad === 'steer');
    steerPad.classList.toggle('held', !!sf);
    if (S.steerMode === 'slide') {
      if (sf) { knob.style.transform = `translate(${sf.x0 - (sf.r.left + sf.r.width / 2) + sf.v * 70}px,${DL.clamp(sf.y0 - (sf.r.top + sf.r.height / 2), -sf.r.height / 2, sf.r.height / 2)}px)`; }
    }
  }
  function track(e, f) {
    const h = hit(e.clientX, e.clientY);
    if (!f) {
      if (!h) return null;
      f = { pad: h.pad, x0: e.clientX, y0: e.clientY, r: h.r || null, v: 0 };
    } else if (f.pad === 'pedal' || f.pad === 'steer') {
      // fingers keep their pad; pedals switch to whatever pedal is under the thumb now
      if (f.pad === 'pedal') { const hh = hit(e.clientX, e.clientY); if (hh && hh.pad === 'pedal') f.c = hh.c; }
    }
    if (f.pad === 'pedal' && !f.c) f.c = h && h.c;
    if (f.pad === 'steer') {
      const r = f.r || steerPad.getBoundingClientRect();
      if (S.steerMode === 'slide') f.v = DL.clamp((e.clientX - f.x0) / 70, -1, 1);
      else f.v = e.clientX < r.left + r.width / 2 ? -1 : 1;
    }
    return f;
  }
  const tz = $('touch');
  tz.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const f = track(e, null); if (!f) return;
    e.preventDefault(); DL.Audio.init();
    fingers.set(e.pointerId, f); try { tz.setPointerCapture(e.pointerId); } catch (er) { }
    apply();
  });
  tz.addEventListener('pointermove', e => { const f = fingers.get(e.pointerId); if (!f) return; e.preventDefault(); track(e, f); apply(); });
  const up = e => { if (!fingers.has(e.pointerId)) return; fingers.delete(e.pointerId); apply(); if (S.steerMode === 'slide' && ![...fingers.values()].some(f => f.pad === 'steer')) knob.style.transform = ''; };
  tz.addEventListener('pointerup', up); tz.addEventListener('pointercancel', up); tz.addEventListener('lostpointercapture', up);
  function releaseAll() { fingers.clear(); apply(); knob.style.transform = ''; }
  addEventListener('blur', releaseAll);

  $('tReset').onclick = () => { Game.recover(); buzz(12); };

  // ---------------- tilt steering ----------------
  const tilt = { on: false, v: 0, zero: null, asked: false };
  function angleNow() { return (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0); }
  function onTilt(e) {
    if (e.beta == null) return;
    const a = angleNow();
    // the axis that turns like a steering wheel depends on how the phone is held
    let raw = a === 90 ? e.beta : a === -90 || a === 270 ? -e.beta : a === 180 ? -e.gamma : e.gamma;
    if (tilt.zero == null) tilt.zero = raw;
    const d = raw - tilt.zero, dead = 2.5, k = Math.sign(d) * Math.max(0, Math.abs(d) - dead) / 22;
    tilt.v = DL.clamp(k, -1, 1);
    if (M.state.on && S.steerMode === 'tilt') apply();
  }
  M.enableTilt = async function () {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') { UI.toast('Motion access was turned off, so tilt steering cannot work. Using buttons.'); S.steerMode = 'buttons'; Game.applySettings(); classes(); return false; }
      }
      if (!tilt.on) { addEventListener('deviceorientation', onTilt); tilt.on = true; }
      tilt.zero = null; return true;
    } catch (e) { return false; }
  };
  M.recentre = () => { tilt.zero = null; };

  // ---------------- full screen & orientation ----------------
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFs = !!(root.requestFullscreen || root.webkitRequestFullscreen) && !(iOS && !/iPad/.test(ua) && navigator.maxTouchPoints > 0 && screen.width < 600);
  M.canFs = canFs;
  M.enterFs = async function () {
    if (!canFs || fsEl()) return;
    try { await (root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen()); } catch (e) { return; }
    lockOrient();
  };
  M.exitFs = () => { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { } };
  M.toggleFs = () => fsEl() ? M.exitFs() : M.enterFs();
  function lockOrient() {
    if (S.orient === 'landscape' && screen.orientation && screen.orientation.lock && fsEl()) screen.orientation.lock('landscape').catch(() => { });
    else if (S.orient !== 'landscape' && screen.orientation && screen.orientation.unlock && fsEl()) try { screen.orientation.unlock(); } catch (e) { }
  }
  M.lockOrient = lockOrient;
  const fsIcon = on => on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>';
  function fsButtons() {
    const on = !!fsEl();
    ['navFull', 'tFull'].forEach(id => { const b = $(id); if (!b) return; b.hidden = !canFs; b.innerHTML = fsIcon(on); b.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen'); });
    body.classList.toggle('fs', on);
  }
  document.addEventListener('fullscreenchange', fsButtons); document.addEventListener('webkitfullscreenchange', fsButtons);
  $('navFull').onclick = M.toggleFs; $('tFull').onclick = M.toggleFs;
  fsButtons();

  // ---------------- wake lock ----------------
  let wake = null;
  async function wakeOn() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { } }
  function wakeOff() { try { if (wake) wake.release(); } catch (e) { } wake = null; }

  // ---------------- race lifecycle ----------------
  const once = k => { const f = DL.store.get('hint_' + k, 0); if (f) return false; DL.store.set('hint_' + k, 1); return true; };
  M.raceStart = function () {
    classes(); releaseAll();
    if (!touchOn()) return;
    if (S.fsRace && canFs) M.enterFs();
    if (S.steerMode === 'tilt') M.enableTilt();
    wakeOn();
    const portrait = innerHeight > innerWidth;
    setTimeout(() => {
      if (iOS && !standalone && !canFs && once('ios_home')) UI.toast('<b>Full screen on iPhone</b> Tap Share, then Add to Home Screen', 6500);
      else if (portrait && once('rotate')) UI.toast('<b>Tip</b> Turn your phone sideways for a wider view', 4500);
      else if (once('touch_help')) UI.toast(S.steerMode === 'slide' ? '<b>Slide</b> your left thumb to steer' : '<b>Tip</b> Slide your thumbs between buttons without lifting', 4500);
    }, 1400);
  };
  // hook the menu's race start and the HUD's own life cycle
  const origSetMode = Game.setMode;
  Game.setMode = function (m) {
    origSetMode.call(Game, m);
    classes(); if (m !== 'race') { releaseAll(); wakeOff(); }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      releaseAll();
      const r = Game.race && Game.race();
      if (r && Game.mode() === 'race' && r.running && !r.finished && !r.paused && !r.replay && !(Game.inRoom && Game.inRoom())) Game.pause(true);
    } else if (Game.mode() === 'race') wakeOn();
  });
  // haptics on checkpoints and the finish
  const cp = UI.checkpoint; UI.checkpoint = function (k, total, delta) { buzz(delta != null && delta > 0 ? [10, 40, 10] : 18); return cp.apply(this, arguments); };
  const fin = UI.finished; if (fin) UI.finished = function () { buzz([30, 60, 50]); return fin.apply(this, arguments); };

  // ---------------- adaptive quality (every device) ----------------
  // Tier 1: render resolution steps down/up. Tier 2: if still slow at minimum resolution, shadows are cut (and return only with lots of headroom).
  // Add ?perf=1 to the URL for a live readout.
  let fr = [], lastT = 0, cool = 0, warned = false, hud = null, lastShadowOff = 0;
  const showHud = /[?&]perf=1/.test(location.search);
  function notify() { if (warned) return; warned = true; try { DL.UI && DL.UI.toast && DL.UI.toast('Lowering graphics to keep the game smooth'); } catch (e) { } }
  function watch(t) {
    requestAnimationFrame(watch);
    const md = Game.mode();
    if ((md !== 'race' && md !== 'replay') || document.hidden) { lastT = 0; fr.length = 0; return; }
    if (lastT) fr.push(Math.min(200, t - lastT)); lastT = t;
    if (fr.length < 90) return;
    fr.sort((a, b) => a - b); const med = fr[fr.length >> 1]; fr.length = 0;
    const k = Game.resScale || 1;
    if (showHud) {
      if (!hud) { hud = document.createElement('div'); hud.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99999;font:11px monospace;color:#fff;background:#0009;padding:3px 6px;border-radius:4px;pointer-events:none'; document.body.appendChild(hud); }
      hud.textContent = Math.round(1000 / med) + ' fps · res ' + k.toFixed(2) + ' · shadows ' + (Game.perfNoShadow ? 'cut' : 'on');
    }
    if (t < cool) return;
    if (med > 24) {
      if (k > 0.56) { Game.setResScale(Math.max(0.55, k - 0.15)); cool = t + 2500; notify(); }
      else if (!Game.perfNoShadow && Game.settings.shadows) { Game.setPerfShadows(true); lastShadowOff = t; cool = t + 4000; notify(); }
    } else if (med < 17.5 && k < 1) { Game.setResScale(k + 0.1); cool = t + 6000; }
    else if (med < 12.5 && k >= 1 && Game.perfNoShadow && t - lastShadowOff > 20000) { Game.setPerfShadows(false); cool = t + 8000; }
  }
  requestAnimationFrame(watch);

  if (DL.isTouch()) { const k = document.querySelector('.ed-keys'); if (k) k.textContent = 'Two fingers: move · pinch: zoom · twist: turn · tap the ground to add a point'; }

  classes();
  addEventListener('resize', () => { classes(); releaseAll(); });
})(window.DL);
