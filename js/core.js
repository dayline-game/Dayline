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
    { v: '1.4', date: 'November 2026', title: 'Off the Beaten Track', art: 'offroad',
      lead: 'The road now matters. Cut a corner across the grass and you will feel it.',
      items: ['Grass, gravel and sand slow the car and reduce grip', 'Tyre skid marks, speed lines and a personal-best celebration', 'Daily track now rolls over at 12am Gulf time', 'Much faster leaderboards'] },
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
      name: 'Desert Basin', sky: 0xd8d2c6, fog: 0xd8d2c6, sun: 0xfff1d8, hemiSky: 0xdfe4ea, hemiGround: 0xb39470,
      ground: [0xd6bc8e, 0xcaa676, 0xb98c62, 0x9f8f86, 0x8d97a3], water: null, amp: 26, scale: 1 / 420,
      props: { cactus: 160, rock: 260, boulder: 40 }, mountain: 0xa39a91, offGrip: 0.6, roadGrip: 1.0
    },
    mountain: {
      name: 'High Pass', sky: 0xcdd6de, fog: 0xcdd6de, sun: 0xfff5e6, hemiSky: 0xdbe3ea, hemiGround: 0x6f7a6a,
      ground: [0x8f9c80, 0x7c8b77, 0x7a8592, 0x67727f, 0xe9edf0], water: null, amp: 70, scale: 1 / 520,
      props: { pine: 650, rock: 220, boulder: 60 }, mountain: 0x76828f, offGrip: 0.62, roadGrip: 1.0
    },
    forest: {
      name: 'Pine Forest', sky: 0xcfd7d6, fog: 0xc7d0cf, sun: 0xfff4e2, hemiSky: 0xdbe3e3, hemiGround: 0x55664f,
      ground: [0x7f9373, 0x6d8366, 0x637561, 0x6e7a80, 0x8a949c], water: -6, amp: 34, scale: 1 / 380,
      props: { pine: 1300, round: 450, rock: 120 }, mountain: 0x6b7a80, offGrip: 0.6, roadGrip: 1.0
    },
    snow: {
      name: 'Snowfield', sky: 0xd5dde4, fog: 0xd9e0e6, sun: 0xffffff, hemiSky: 0xe9eef3, hemiGround: 0x9aa6b2,
      ground: [0xe9edf1, 0xdfe5eb, 0xcbd4dd, 0x9aa6b3, 0x7b8794], water: null, amp: 48, scale: 1 / 460,
      props: { snowpine: 700, rock: 160 }, mountain: 0x8f9aa6, offGrip: 0.48, roadGrip: 0.86
    },
    coast: {
      name: 'Coast Road', sky: 0xcbd6dd, fog: 0xcbd6dd, sun: 0xfff3dd, hemiSky: 0xdbe5ec, hemiGround: 0x9e9478,
      ground: [0xd9c69e, 0xa7ad88, 0x8c9a7c, 0x7a8691, 0x6a7582], water: 0, amp: 30, scale: 1 / 400, tilt: true,
      props: { palm: 180, round: 200, rock: 160 }, mountain: 0x7b8793, offGrip: 0.58, roadGrip: 1.0
    },
    country: {
      name: 'Lake Country', sky: 0xd3dbe0, fog: 0xd3dbe0, sun: 0xfff3dc, hemiSky: 0xdfe6ea, hemiGround: 0x76845f,
      ground: [0xa4b183, 0x93a376, 0x7f9170, 0x7b8790, 0x8e98a0], water: -4, amp: 28, scale: 1 / 360,
      props: { round: 700, pine: 200, rock: 90, haybale: 50 }, mountain: 0x7f8c95, offGrip: 0.62, roadGrip: 1.0
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
    click() { this.beep(660, 0.06, 'square', 0.05); },
    chime() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep(f, 0.35, 'triangle', 0.16), i * 110)); },
    coin() { this.beep(988, 0.08, 'square', 0.06); setTimeout(() => this.beep(1319, 0.18, 'square', 0.06), 70); }
  };

})(window.DL);
