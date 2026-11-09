/* DAYLINE — live rooms: join with a 4-letter code, race the same map together as many rounds as you like */
'use strict';
(function (DL) {
  const UI = DL.UI, X = UI._x, Net = DL.Net, Game = DL.Game;
  const $ = id => document.getElementById(id);
  const { show, modal, closeModal, toast, esc } = X;
  const R = DL.Rooms = { room: null, off: 0, startedRound: -1, racing: false };

  const api = (m, p, b) => Net._fetch(m, '/api/room' + p, b);
  const online = () => Net.api && Net.mode === 'online';
  R.clock = () => Date.now() + R.off;

  function absorb(room) {
    if (!room) return;
    R.off = room.now - Date.now();
    R.room = room;
  }
  const me = () => R.room && R.room.players.find(p => p.uid === Net.uid);
  const isHost = () => R.room && R.room.host === Net.uid;
  const nameOf = uid => { const p = R.room && R.room.players.find(x => x.uid === uid); return p ? p.tag : 'Driver'; };

  // ---------------- map helpers ----------------
  async function prepMap(day) {
    if (!/^c_/.test(day)) return null;
    let c = DL.customTracks[day];
    if (!c || c.needExt) {
      const t = await Net.ctGet(day);
      if (!t) throw new Error('map');
      c = DL.customTracks[day] = { id: t.id, name: t.name, biome: t.biome, pts: t.pts, ext: t.ext || null, needExt: false };
    }
    return c;
  }
  function mapName(day) {
    if (/^c_/.test(day)) { const c = DL.customTracks[day]; return c ? c.name : 'Community map'; }
    return day === DL.dayKey() ? "Today's daily · No. " + DL.dayNumber(day) : 'Daily No. ' + DL.dayNumber(day);
  }

  // ---------------- create / join ----------------
  async function create(day) {
    if (!online()) { toast('Live rooms need the online server'); return; }
    const r = await api('POST', '', { day: day || DL.dayKey() });
    if (!r.j.ok) { toast(esc(r.j.error || 'Could not create a room')); return; }
    enter(r.j.room);
  }
  async function join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { toast('Codes are 4 letters or numbers'); return false; }
    const r = await api('POST', '/' + code + '/join', {});
    if (!r.j.ok) { toast(esc(r.j.error || 'No room with that code')); return false; }
    enter(r.j.room); return true;
  }
  async function enter(room) {
    absorb(room); R.startedRound = room.state === 'lobby' ? room.round : room.round;
    try { await prepMap(room.day); } catch (e) { }
    closeModal(); show('room'); render(); drive();
  }
  R.join = join; R.render = render;
  UI.joinFromLink = code => { if (code) setTimeout(() => join(code), 600); };

  // ---------------- polling ----------------
  let pollT = 0, tickT = 0;
  function poll(now) {
    clearTimeout(pollT);
    if (!R.room) return;
    pollT = setTimeout(doPoll, now ? 0 : 1000);
  }
  async function doPoll() {
    if (!R.room) return;
    if (R.racing) { poll(); return; }
    try {
      const r = await api('GET', '/' + R.room.code);
      if (!R.room) return;
      if (!r.j.ok) { if (r.status === 404 || r.j.error) { drop('That room has closed'); return; } }
      else { absorb(r.j.room); render(); }
    } catch (e) { /* retry next tick */ }
    poll();
  }
  function drop(msg) { stop(); if (msg) toast(msg); if ($('room') && !$('room').hidden) show('menu'); }
  function stop() { clearTimeout(pollT); clearInterval(tickT); R.room = null; R.racing = false; }

  async function drive() {
    const rm = R.room; if (!rm || R.racing) return;
    let custom = null;
    try { custom = await prepMap(rm.day); } catch (e) { toast('Could not load the map'); poll(true); return; }
    R.racing = true; R.day = rm.day;
    clearTimeout(pollT);
    X.startRace(rm.day, [], custom, { leave: 'room', room: { code: rm.code } });
    clearInterval(tickT);
    tickT = setInterval(tick, 250);
  }
  R.drive = drive;

  async function tick() {
    const s = Game.roomState && Game.roomState();
    if (!R.room || !R.racing) { clearInterval(tickT); return; }
    try {
      const r = await api('POST', '/' + R.room.code + '/tick', { s: s || [0, 0, 0, 0, 0, 0, 0, 0] });
      if (!r.j.ok) return;
      absorb(r.j.room); hudBoard();
      if (R.room.day !== R.day) { R.racing = false; clearInterval(tickT); drive(); return; }
      Game.roomOthers(r.j.others || [], uid => {
        const p = R.room.players.find(x => x.uid === uid);
        return p ? { uid, label: p.tag, car: p.car, l: p.l, b: p.b, equip: p.equip } : null;
      });
    } catch (e) { }
  }

  // called by Game when the player's room race ends
  R.finished = async function (r, t, valid) {
    const rc = r.room;
    if (valid) {
      try { const x = await api('POST', '/' + rc.code + '/finish', { secs: t }); if (x.j.ok) { absorb(x.j.room); hudBoard(); } } catch (e) { }
    }
    // straight back to the line: no countdown, no lobby
    setTimeout(() => { if (R.racing && Game.inRoom() && Game.raceNow() === r) Game.restart(); }, 2200);
  };
  // quitting mid-race goes back to the lobby
  R.quitRace = function () { R.racing = false; clearInterval(tickT); poll(true); };

  // small live standings while driving
  function hudBoard() {
    let el = $('rmHud');
    if (!el) { el = document.createElement('div'); el.id = 'rmHud'; $('hud').appendChild(el); }
    const rm = R.room; if (!rm || !R.racing) { el.hidden = true; return; }
    el.hidden = false;
    const rows = rm.players.slice().sort((a, b) => (a.best || 1e9) - (b.best || 1e9)).slice(0, 6);
    el.innerHTML = '<b>' + rm.code + '</b>' + rows.map((p, i) => `<div class="${p.uid === Net.uid ? 'me' : ''}"><span>${i + 1}</span><span>${esc(p.tag)}</span><span class="num">${p.best ? DL.fmtTime(p.best) : '—'}</span></div>`).join('');
  }

  // ---------------- screen ----------------
  const fmt = s => s ? DL.fmtTime(s) : '—';
  function render() {
    const rm = R.room; if (!rm || $('room').hidden) return;
    const host = isHost(), me_ = me();
    $('rmCode').textContent = rm.code;
    $('rmMap').textContent = mapName(rm.day);
    const st = rm.state;
    $('rmState').textContent = rm.players.length + ' driver' + (rm.players.length > 1 ? 's' : '') + ' in the room';
    const order = rm.players.slice().sort((a, b) => (a.best || 1e9) - (b.best || 1e9));
    $('rmPlayers').innerHTML = order.map((p, i) => `<div class="rm-row${p.uid === Net.uid ? ' me' : ''}"><span class="rm-pos">${p.best ? i + 1 : '·'}</span><span class="rm-name">${esc(p.tag)}${p.uid === rm.host ? ' <em>host</em>' : ''}</span><span class="rm-t num">${fmt(p.secs)}</span><span class="rm-b num">${fmt(p.best)}</span></div>`).join('');
    $('rmRounds').innerHTML = '<div class="empty-note">Drive as many laps as you like. Finish and you go straight back to the start; fastest lap wins.</div>';
    $('rmStart').hidden = false; $('rmStart').textContent = 'Drive'; $('rmStart').disabled = false;
    $('rmMapBtn').hidden = !host;
    $('rmWait').hidden = true;
  }

  $('rmCopy').onclick = async () => {
    if (!R.room) return;
    const url = location.origin + location.pathname + '?room=' + R.room.code;
    try { if (navigator.share) { await navigator.share({ title: 'Race me on Dayline', text: 'Join my Dayline room: ' + R.room.code, url }); return; } } catch (e) { }
    try { await navigator.clipboard.writeText(url); toast('Invite link copied'); } catch (e) { toast('Code: ' + R.room.code); }
  };
  $('rmStart').onclick = () => drive();
  $('rmLeave').onclick = async () => {
    const code = R.room && R.room.code; stop(); show('menu');
    if (code) try { await api('POST', '/' + code + '/leave', {}); } catch (e) { }
  };
  $('rmMapBtn').onclick = async () => {
    const m = modal(`<div class="lbl">Host</div><h2>Pick a map</h2>
      <button class="btn btn-go" id="pkDaily">Today's daily</button>
      <div class="lbl" style="margin-top:6px">Community maps</div>
      <div class="rm-picks" id="pkList"><div class="empty-note">Loading…</div></div>
      <button class="btn btn-line" id="pkClose">Cancel</button>`);
    m.querySelector('#pkClose').onclick = closeModal;
    const set = async day => {
      closeModal();
      const r = await api('POST', '/' + R.room.code + '/map', { day });
      if (!r.j.ok) { toast(esc(r.j.error || 'Could not change map')); return; }
      try { await prepMap(day); } catch (e) { }
      absorb(r.j.room); render();
    };
    m.querySelector('#pkDaily').onclick = () => set(DL.dayKey());
    try {
      const rows = (await Net.ctList('trending')) || [];
      const list = m.querySelector('#pkList');
      list.innerHTML = '';
      rows.slice(0, 14).forEach(t => {
        DL.customTracks[t.id] = DL.customTracks[t.id] || { id: t.id, name: t.name, biome: t.biome, pts: t.pts, ext: t.ext || null, needExt: !!t.hasExt };
        const b = document.createElement('button'); b.className = 'rm-pick';
        b.innerHTML = `<b>${esc(t.name)}</b><span>${esc(t.by || t.tag || '')}</span>`;
        b.onclick = () => set(t.id); list.appendChild(b);
      });
      if (!rows.length) list.innerHTML = '<div class="empty-note">No community maps yet.</div>';
    } catch (e) { m.querySelector('#pkList').innerHTML = '<div class="empty-note">Could not load maps.</div>'; }
  };

  // ---------------- menu entry ----------------
  $('bRooms').onclick = () => {
    if (!online()) { toast('Live rooms need the online server'); return; }
    if (R.room) { show('room'); render(); drive(); return; }
    const m = modal(`<div class="lbl">Live multiplayer</div><h2>Race together</h2>
      <button class="btn btn-go" id="rmNew">Create a room</button>
      <div class="lbl" style="text-align:center">or join with a code</div>
      <div class="namerow"><input type="text" id="rmIn" maxlength="4" placeholder="ABCD" autocomplete="off" spellcheck="false" style="text-transform:uppercase;letter-spacing:.3em;text-align:center;font-size:26px"><button class="btn btn-coral" id="rmJoin">Join</button></div>`);
    m.querySelector('#rmNew').onclick = () => create();
    m.querySelector('#rmJoin').onclick = () => join(m.querySelector('#rmIn').value);
    m.querySelector('#rmIn').addEventListener('keydown', e => { if (e.key === 'Enter') join(e.target.value); });
    setTimeout(() => m.querySelector('#rmIn').focus(), 50);
  };

  // invite link: ?room=ABCD
  const q = new URLSearchParams(location.search).get('room');
  if (q) { setTimeout(() => { if (!R.room && Net.mode === 'online') join(q); }, 2500); }
})(window.DL);
