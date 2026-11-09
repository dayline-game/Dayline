/* DAYLINE — core utilities: seeded randomness, dates, biomes, palette, livery codec, audio */
'use strict';
window.DL = window.DL || {};
(function (DL) {

  // ---------- deterministic randomness ----------
  DL.mulberry32 = function (a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  DL.hashStr = function (s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  DL.makeNoise = function (seed) {
    const rnd = DL.mulberry32(seed);
    const perm = new Uint16Array(512), val = new Float32Array(256);
    const p = []; for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) val[i] = rnd() * 2 - 1;
    const sm = t => t * t * (3 - 2 * t);
    function n2(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const X = xi & 255, Y = yi & 255;
      const a = val[perm[X + perm[Y]]], b = val[perm[X + 1 + perm[Y]]];
      const c = val[perm[X + perm[Y + 1]]], d = val[perm[X + 1 + perm[Y + 1]]];
      const u = sm(xf), v = sm(yf);
      return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
    }
    function fbm(x, y, oct) {
      let s = 0, amp = 1, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) { s += n2(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
      return s / norm;
    }
    return { n2, fbm };
  };

  DL.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  DL.lerp = (a, b, t) => a + (b - a) * t;
  DL.smooth = (a, b, x) => { const t = DL.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ---------- dates: every player shares one day, which rolls over at 12am Gulf time (Dubai, UTC+4) ----------
  DL.RESET_OFFSET_H = 4;
  DL.dayKey = function (d) {
    d = d || new Date(Date.now() + DL.RESET_OFFSET_H * 3600000);   // no argument = "today" for the game; a Date = plain UTC calendar date
    return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
  };
  // Days listed here were regenerated into a brand new track after they went live: times posted before `at` belong to the old layout and are wiped.
  // Every other day, including tomorrow, keeps its normal seed and rolls over at 12am Gulf time as usual.
  DL.REGEN = { '20261104': { r: 1, at: 1793786061149 } };
  DL.seedFor = day => DL.hashStr('dayline:' + day + (DL.REGEN[day] ? ':r' + DL.REGEN[day].r : ''));
  DL.keyToDate = k => new Date(Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8)));
  DL.addDays = (k, n) => DL.dayKey(new Date(DL.keyToDate(k).getTime() + n * 86400000));
  DL.EPOCH = '20260101';
  DL.dayNumber = k => Math.round((DL.keyToDate(k) - DL.keyToDate(DL.EPOCH)) / 86400000) + 1;
  DL.prettyDay = function (k) {
    const d = DL.keyToDate(k);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).toUpperCase();
  };
  DL.msToNextDay = function () {
    const n = Date.now() + DL.RESET_OFFSET_H * 3600000, d = new Date(n);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - n;
  };
  DL.fmtTime = function (t) {
    if (t == null || !isFinite(t)) return '--:--.---';
    const m = Math.floor(t / 60), s = t - m * 60;
    return String(m).padStart(2, '0') + ':' + s.toFixed(3).padStart(6, '0');
  };
  DL.fmtDelta = function (d) {
    const s = d < 0 ? '−' : '+';
    return s + Math.abs(d).toFixed(3);
  };

  // ---------- patch notes (major releases only, newest first) ----------
  DL.PATCHES = [
    { v: '2.2', date: 'November 2026', title: 'New Look, New Shop', art: 'community',
      lead: 'A cleaner game: a lobby, a Locker for your loadout and a proper Item Shop.',
      items: ['New top bar: Play, Locker, Shop, Ranks and Tracks are always one tap away (a bottom bar on phones)', 'A cleaner lobby: today’s track on the left, a big Play button on the right, your car in the middle', 'Item Shop: Featured and Daily items rotate at midnight, the same for every driver', 'Every item now has a rarity, from Common to Legendary, and its own picture', 'Search the shop by name, part or rarity, or browse by category', 'Tap any item to inspect it on your car in 3D before you buy', 'Locker: every slot of your loadout at a glance, tap one to swap it', 'Save up to three loadouts and switch between them in one tap'] },
    { v: '2.1', date: 'November 2026', title: 'Built for Phones', art: 'community',
      lead: 'Dayline now plays properly on your phone, full screen.',
      items: ['Full screen when you race (Android and tablets), with a full screen button in the top bar', 'iPhone: add Dayline to your home screen and it opens full screen like an app', 'New touch controls: bigger buttons, slide your thumbs between them without lifting', 'Three steering styles: left/right buttons, smooth thumb slide, or tilt the phone', 'Options for auto accelerate, button size, swapping sides and vibration', 'A back-on-track button, and the race pauses if you leave the app', 'Menus, garage and leaderboards fit phone screens, upright or sideways', 'Wider view when you play upright', 'Smoother frame rate: the game lowers its resolution a little when your phone struggles', 'Track creator: two fingers to move, pinch to zoom, twist to turn'] },
    { v: '2.0', date: 'November 2026', title: 'The BIG Update', art: 'community',
      lead: 'Race together, win a UFO, and a lot more.',
      items: ['Live rooms: share a 4-letter code and race the daily or any community map together, no countdown, endless laps', 'Weekly Cup: the winner drives a floating, wheel-less UFO for the whole week', 'Community: likes, Trending and Most liked tabs, Creator of the Week, six track templates', 'Friends and weekly leaderboards, invite links with coin rewards, shareable liveries', 'Daily weather, gear-shift and exhaust sounds, photo mode in replays', 'Streak freezes and new streak rewards, colour-blind mode and a camera-shake slider', 'New cosmetics: number plates with your own text, and window tints', 'Rebuilt track creator: drag points and heights in 3D, place your own ramps and mud, snow or sand, mirror, rotate and scale, redo, much smoother editing'] },
    { v: '1.9', date: 'November 2026', title: 'Brighter World', art: 'offroad',
      lead: 'A fresh coat of paint on every map: clearer skies, richer colours, bluer water.',
      items: ['Brighter, richer landscapes in every biome', 'Gradient skies and a cleaner, longer view distance', 'Vivid water, greener trees and brighter mountains', 'New landforms per biome: desert mesas, sharp peaks, snow dunes, forest knolls, sea cliffs, terraced fields. A little different every day', 'Animated 3-2-1-GO', 'Cleaner start and finish gates with a chequered line, nothing clipping into scenery', 'Same tracks, same handling'] },
    { v: '1.7', date: 'November 2026', title: 'Roadside Life', art: 'offroad',
      lead: 'Every biome has its own landmarks and roadside life from tomorrow’s map.',
      items: ['Hot air balloons, billboards and tyre stacks beside the road', 'Cabins, watchtowers, snowmen, igloos, lifeguard towers, pumpjacks and more per biome'] },
    { v: '1.6', date: 'November 2026', title: 'Rough Roads', art: 'offroad',
      lead: 'From tomorrow, every daily has stretches where the tarmac gives way. Read the signs and adjust.',
      items: ['Mud stretches: slippery and draggy, brake early', 'Snowy maps get packed-snow sections: fast but very loose', 'Desert maps get drifting sand across the road', 'Ramps rebuilt with a proper steel structure'] },
    { v: '1.5', date: 'November 2026', title: 'Community Tracks', art: 'community',
      lead: 'Build your own track, publish it, and race the community’s.',
      items: ['Track editor: click to lay a road, drag to shape it, test drive and publish', 'Community page with automatic thumbnails, plus a side panel of fastest times with Play', 'Quick paint: pick a colour, pattern and number. The pixel editor is now under Advanced'] },
    { v: '1.4', date: 'November 2026', title: 'Off the Beaten Track', art: 'offroad',
      lead: 'The road now matters. Cut a corner across the grass and you will feel it.',
      items: ['Grass, gravel and sand slow the car and reduce grip', 'Tyre skid marks and a personal-best celebration', 'Daily track now rolls over at 12am Gulf time', 'Much faster leaderboards'] },
    { v: '1.3', date: 'November 2026', title: 'Your Account, Anywhere', art: 'account',
      lead: 'Sign in with a username and password and your garage, coins and times follow you to any device.',
      items: ['Simple username and password accounts', 'Progress syncs across devices', 'Cheat protection: implausible runs are deleted'] },
    { v: '1.2', date: 'November 2026', title: 'Ghosts and Replays', art: 'ghost',
      lead: 'Race anyone on the board. Watch how the fastest drivers took the track.',
      items: ['Race any driver’s ghost straight from the leaderboard', 'Full replays of other drivers’ best runs', 'Live gap to your ghost while you drive'] },
    { v: '1.1', date: 'November 2026', title: 'The Garage Update', art: 'garage',
      lead: 'Every car you can buy now looks and feels like its own machine.',
      items: ['Distinct bodies and details for every car', 'Rebuilt camera angles that keep the road in view'] },
    { v: '1.0', date: 'November 2026', title: 'Launch Day', art: 'launch',
      lead: 'One seeded track for everyone, every day.',
      items: ['Six biomes, daily and all-time leaderboards', 'Garage, paint editor, shop and streaks'] }
  ];
  DL.PATCH_VER = DL.PATCHES[0].v;

  // ---------- biomes ----------
  DL.BIOMES = {
    desert: {
      name: 'Desert Basin', sky: 0x62b8ef, fog: 0xf1e6cc, sun: 0xfff1d8, hemiSky: 0xd4eaff, hemiGround: 0xd9ad6c,
      ground: [0xf2d089, 0xe8bb68, 0xd9a050, 0xb5a091, 0x9ba7b4], water: null, amp: 26, scale: 1 / 420,
      props: { cactus: 160, rock: 260, boulder: 40 }, mountain: 0xc29a74, offGrip: 0.6, roadGrip: 1.0
    },
    mountain: {
      name: 'High Pass', sky: 0x5aaeea, fog: 0xdcebf7, sun: 0xfff5e6, hemiSky: 0xd4e8ff, hemiGround: 0x6aa253,
      ground: [0x86c45c, 0x70b04f, 0x8d9aa8, 0x6f7e8e, 0xf7fafd], water: null, amp: 70, scale: 1 / 520,
      props: { pine: 650, rock: 220, boulder: 60 }, mountain: 0x7589a0, offGrip: 0.62, roadGrip: 1.0
    },
    forest: {
      name: 'Pine Forest', sky: 0x5db6ec, fog: 0xd2ebf2, sun: 0xfff4e2, hemiSky: 0xd4eaf4, hemiGround: 0x4f9446,
      ground: [0x66b552, 0x57a64a, 0x4b9645, 0x7b8d96, 0x9aaab4], water: -6, amp: 34, scale: 1 / 380,
      props: { pine: 1300, round: 450, rock: 120 }, mountain: 0x5f8a94, offGrip: 0.6, roadGrip: 1.0
    },
    snow: {
      name: 'Snowfield', sky: 0x78c4f4, fog: 0xe8f3fb, sun: 0xffffff, hemiSky: 0xeaf4ff, hemiGround: 0xa9bed2,
      ground: [0xf8fbfe, 0xeaf3fa, 0xd3e3f0, 0xa4b9cf, 0x8398b0], water: null, amp: 48, scale: 1 / 460,
      props: { snowpine: 700, rock: 160 }, mountain: 0x91a9c2, offGrip: 0.48, roadGrip: 0.86
    },
    coast: {
      name: 'Coast Road', sky: 0x58b4f0, fog: 0xd6edf9, sun: 0xfff3dd, hemiSky: 0xd4ebff, hemiGround: 0xc9b985,
      ground: [0xf4dfa8, 0x9bd266, 0x7ec25c, 0x8a9cac, 0x7587a0], water: 0, amp: 30, scale: 1 / 400, tilt: true,
      props: { palm: 180, round: 200, rock: 160 }, mountain: 0x6f95b0, offGrip: 0.58, roadGrip: 1.0
    },
    country: {
      name: 'Lake Country', sky: 0x5cb8f2, fog: 0xd8eef9, sun: 0xfff3dc, hemiSky: 0xd6ecff, hemiGround: 0x6fae4c,
      ground: [0x9bd35a, 0x86c44e, 0x72b345, 0x8a9ba8, 0xa0b0bd], water: -4, amp: 28, scale: 1 / 360,
      props: { round: 700, pine: 200, rock: 90, haybale: 50 }, mountain: 0x7f9fb4, offGrip: 0.62, roadGrip: 1.0
    }
  };
  DL.BIOME_KEYS = ['desert', 'mountain', 'forest', 'snow', 'coast', 'country'];

  // ---------- UI / paint palette ----------
  DL.PALETTE = [
    null,       // 0 = unpainted (shows base colour)
    '#141821', '#1f2a3d', '#2f3e57', '#4b5b74', '#7c8a9e', '#b5bfcb', '#e3e7ec',
    '#f4ecdc', '#e6d6b5', '#c9ad7f', '#9a7653', '#5e4430', '#f05a35', '#ff7f4f', '#f7a072',
    '#c73a2e', '#8c2a2a', '#f2c14e', '#e0a526', '#8aa36b', '#4f6b4a', '#2e4a3c', '#5aa3a5',
    '#2f7d8a', '#3d5f9e', '#7d8fd0', '#b7a3d6', '#e78fb3', '#ffffff', '#6e6e6e', '#000000'
  ];

  // Livery atlas: 32 x 42 pixel grid shared by every vehicle
  DL.ATLAS_W = 32; DL.ATLAS_H = 42;
  DL.PANELS = {
    left:  { x: 0, y: 0, w: 32, h: 10, label: 'Left side' },
    right: { x: 0, y: 10, w: 32, h: 10, label: 'Right side' },
    top:   { x: 0, y: 20, w: 32, h: 12, label: 'Roof & bonnet' },
    front: { x: 0, y: 32, w: 12, h: 10, label: 'Nose' },
    rear:  { x: 12, y: 32, w: 12, h: 10, label: 'Tail' }
  };
  const ALPH = '0123456789abcdefghijklmnopqrstuv';
  DL.encodeLivery = arr => { let s = ''; for (let i = 0; i < arr.length; i++) s += ALPH[arr[i] & 31]; return s; };
  DL.decodeLivery = function (s) {
    const a = new Uint8Array(DL.ATLAS_W * DL.ATLAS_H);
    if (typeof s !== 'string') return a;
    for (let i = 0; i < a.length && i < s.length; i++) { const v = ALPH.indexOf(s[i]); a[i] = v < 0 ? 0 : v; }
    return a;
  };

  // 3x5 digits and small stamps for the paint editor
  DL.DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
    '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
  DL.STAMPS = {
    roundel: { pack: 'basic', w: 7, h: 7, rows: ['0011100', '0111110', '1111111', '1111111', '1111111', '0111110', '0011100'] },
    chevron: { pack: 'basic', w: 5, h: 5, rows: ['10000', '01000', '00100', '01000', '10000'] },
    star:    { pack: 'basic', w: 5, h: 5, rows: ['00100', '01110', '11111', '01110', '01010'] },
    bolt:    { pack: 'speed', w: 5, h: 7, rows: ['00011', '00110', '01100', '11111', '00110', '01100', '11000'] },
    arrow:   { pack: 'speed', w: 7, h: 5, rows: ['0001000', '0001100', '1111110', '0001100', '0001000'] },
    flame:   { pack: 'speed', w: 7, h: 5, rows: ['0000011', '0001110', '1111100', '0111110', '0000111'] },
    heart:   { pack: 'icons', w: 5, h: 5, rows: ['01010', '11111', '11111', '01110', '00100'] },
    skull:   { pack: 'icons', w: 5, h: 5, rows: ['01110', '10101', '11111', '01110', '01010'] },
    sun:     { pack: 'icons', w: 7, h: 7, rows: ['1001001', '0101010', '0011100', '1111111', '0011100', '0101010', '1001001'] },
    check:   { pack: 'icons', w: 4, h: 4, rows: ['1010', '0101', '1010', '0101'] }
  };

  // ---------- local storage (per-device conveniences only) ----------
  DL.store = {
    keys(prefix) { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('dayline:' + prefix)) out.push(k.slice(8)); } } catch (e) { } return out; },
    get(k, d) { try { const v = localStorage.getItem('dayline:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('dayline:' + k, JSON.stringify(v)); } catch (e) { } }
  };

  // ---------- tiny event bus ----------
  const subs = {};
  DL.on = (n, f) => (subs[n] = subs[n] || []).push(f);
  DL.emit = (n, a) => (subs[n] || []).forEach(f => { try { f(a); } catch (e) { console.error(e); } });

  // ---------- audio (synthesised, starts on first gesture) ----------
  DL.Audio = {
    ctx: null, master: null, vol: 0.6, engine: null,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        const ctx = this.ctx = new C();
        this.master = ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(ctx.destination);
        // noise buffer
        const nb = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate), d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.noise = nb;
      } catch (e) { this.ctx = null; }
    },
    setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
    startEngine() {
      if (!this.ctx || this.engine) return;
      const ctx = this.ctx;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = -1200;
      f.type = 'lowpass'; f.frequency.value = 600; f.Q.value = 2;
      g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
      o1.start(); o2.start();
      const sk = ctx.createBufferSource(); sk.buffer = this.noise; sk.loop = true;
      const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1800; sf.Q.value = 0.8;
      const sg = ctx.createGain(); sg.gain.value = 0;
      sk.connect(sf); sf.connect(sg); sg.connect(this.master); sk.start();
      const wn = ctx.createBufferSource(); wn.buffer = this.noise; wn.loop = true;
      const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 400;
      const wg = ctx.createGain(); wg.gain.value = 0;
      wn.connect(wf); wf.connect(wg); wg.connect(this.master); wn.start();
      this.engine = { o1, o2, f, g, sg, wg, nodes: [o1, o2, sk, wn] };
    },
    updateEngine(speed, throttle, slip, onGround) {
      const e = this.engine; if (!e) return;
      const t = this.ctx.currentTime;
      const gear = Math.min(5, Math.floor(Math.abs(speed) / 11));
      const rpm = 0.25 + (Math.abs(speed) - gear * 11) / 11 * 0.6 + gear * 0.03 + throttle * 0.1;
      const fq = 55 + rpm * 130;
      // gear change: brief power dip; throttle lift at speed: exhaust pops
      if (e.gear != null && gear !== e.gear && speed > 5) { e.g.gain.cancelScheduledValues(t); e.g.gain.setValueAtTime(0.01, t); this.pop(0.05, 900); }
      if (e.thr > 0.6 && throttle < 0.2 && Math.abs(speed) > 22 && t - (e.popT || 0) > 0.5) { e.popT = t; const n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) setTimeout(() => this.pop(0.07 + Math.random() * 0.05, 500 + Math.random() * 500), i * (60 + Math.random() * 70)); }
      e.gear = gear; e.thr = throttle;
      e.o1.frequency.setTargetAtTime(fq, t, 0.05); e.o2.frequency.setTargetAtTime(fq, t, 0.05);
      e.f.frequency.setTargetAtTime(400 + throttle * 1400 + rpm * 600, t, 0.08);
      e.g.gain.setTargetAtTime(0.05 + throttle * 0.07, t, 0.08);
      e.sg.gain.setTargetAtTime(onGround ? DL.clamp(slip - 0.25, 0, 1) * 0.18 : 0, t, 0.05);
      e.wg.gain.setTargetAtTime(DL.clamp(Math.abs(speed) / 50, 0, 1) * 0.12, t, 0.2);
    },
    stopEngine() {
      const e = this.engine; if (!e) return;
      e.nodes.forEach(n => { try { n.stop(); } catch (x) { } });
      this.engine = null;
    },
    beep(freq, dur, type, vol) {
      if (!this.ctx) return;
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g); g.connect(this.master); o.start(); o.stop(ctx.currentTime + dur + 0.02);
    },
    thump(v) {
      if (!this.ctx) return;
      const ctx = this.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = 220;
      g.gain.setValueAtTime(Math.min(0.6, v), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(); s.stop(ctx.currentTime + 0.3);
    },
    pop(v, fq) {
      if (!this.ctx) return;
      const ctx = this.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = fq || 700; f.Q.value = 1.2;
      g.gain.setValueAtTime(v, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(ctx.currentTime, Math.random()); s.stop(ctx.currentTime + 0.1);
    },
    click() { this.beep(660, 0.06, 'square', 0.05); },
    chime() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep(f, 0.35, 'triangle', 0.16), i * 110)); },
    coin() { this.beep(988, 0.08, 'square', 0.06); setTimeout(() => this.beep(1319, 0.18, 'square', 0.06), 70); }
  };

  // phones and tablets: a coarse pointer or touch support, ignoring touch laptops that also have a mouse
  DL.isTouch = () => matchMedia('(pointer:coarse)').matches || (('ontouchstart' in window) && !matchMedia('(pointer:fine)').matches);
})(window.DL);
