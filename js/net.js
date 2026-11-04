/* DAYLINE — accounts, progression, coins, leaderboards and ghost storage.
   Online: the artifact's shared database (players/<id>, players/<id>/ghosts/<day>) plus a private
   per-player save (data/users/<id>/save). Offline fallback keeps progress on this device only. */
'use strict';
(function (DL) {

  DL.ACHIEVEMENTS = [
    { id: 'first', name: 'First Light', desc: 'Finish your first daily track', coins: 50 },
    { id: 'clean', name: 'Clean Sheet', desc: 'Finish without recovering to a checkpoint', coins: 40 },
    { id: 'air', name: 'Hang Time', desc: 'Stay airborne for 1.5 seconds', coins: 60 },
    { id: 'pb3', name: 'Chipping Away', desc: 'Improve a personal best three times on one track', coins: 60 },
    { id: 'ghost', name: 'Ghostbuster', desc: 'Finish ahead of a ghost you raced', coins: 60 },
    { id: 'streak3', name: 'Three in a Row', desc: 'Keep a 3-day streak', coins: 75 },
    { id: 'streak7', name: 'Full Week', desc: 'Keep a 7-day streak', coins: 200 },
    { id: 'runs25', name: 'Regular', desc: 'Complete 25 runs', coins: 100 },
    { id: 'archive5', name: 'Archivist', desc: 'Finish 5 past dailies', coins: 80 },
    { id: 'painter', name: 'Sign Writer', desc: 'Save a custom livery', coins: 50 },
    { id: 'collector', name: 'Collector', desc: 'Own three vehicles', coins: 150 },
    { id: 'top10', name: 'Top Ten', desc: 'Place top 10 on a daily board', coins: 150 }
  ];
  const ACH = Object.fromEntries(DL.ACHIEVEMENTS.map(a => [a.id, a]));

  function defaultSave() {
    const l = DL.encodeLivery(DL.defaultLivery());
    return {
      v: 1, coins: 150, car: 'pebble',
      owned: { cars: ['pebble'], spoiler: ['none'], wheels: ['std'], bumper: ['std'], exhaust: ['none'], trail: ['none'], finish: ['matte'], stickers: ['basic'] },
      equip: { spoiler: 'none', wheels: 'std', bumper: 'std', exhaust: 'none', trail: 'none', finish: 'matte' },
      paint: { pebble: { l, b: DL.DEFAULT_BASE } },
      designs: [{ name: 'Factory', l, b: DL.DEFAULT_BASE }],
      best: {}, claimed: {}, ach: {},
      streak: 0, bestStreak: 0, lastDay: null, runs: 0, days: 0, archiveDone: 0,
      golds: 0, silvers: 0, bronzes: 0, score: 0, tag: '', friends: []
    };
  }

  const Net = DL.Net = {
    mode: 'local', status: 'Offline — progress is kept on this device', uid: null, db: null, user: null,
    save: null, canWrite: false,
    _q: {},

    // a regenerated day invalidates anything this device remembers about the old layout
    applyRegen() {
      const s = this.save; if (!s) return;
      s.regen = s.regen || {};
      let changed = false;
      for (const day of Object.keys(DL.REGEN || {})) {
        const r = DL.REGEN[day].r;
        if (s.regen[day] !== r) {
          if (s.best[day]) delete s.best[day];
          DL.store.set('ghost:' + day, null); DL.store.set('pendingRun:' + day, null);
          s.regen[day] = r; changed = true;
          if (day === DL.dayKey()) DL.emit('toast', 'Today’s track was regenerated. Old times for it were cleared');
        }
      }
      if (changed) this.persist();
    },
    initLocal() {
      const s = DL.store.get('save', null);
      this.save = Object.assign(defaultSave(), s || {});
      this.save.owned = Object.assign(defaultSave().owned, this.save.owned || {});
      this.save.equip = Object.assign(defaultSave().equip, this.save.equip || {});
      this.applyRegen();
    },

    async connect() {
      if (!window.claude || typeof window.claude.use !== 'function') return this.connectApi();
      this.mode = 'connecting'; DL.emit('net');
      let db = null, user = null;
      try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch (e) { }
      this.user = user;
      if (!db || !user) { this._setStatus('local'); return; }
      let uid = null; try { uid = await user.id(); } catch (e) { }
      if (!uid) { this.db = db; this._setStatus('signedout'); return; }
      this.db = db; this.uid = uid;
      let can = null; try { can = await user.can('data.write'); } catch (e) { }
      this.canWrite = can !== false;
      try {
        const snap = await this._timeout(db.doc('data/users/' + uid + '/save').get(), 10000);
        if (snap.exists) {
          const d = snap.data();
          const merged = Object.assign(defaultSave(), JSON.parse(JSON.stringify(d)));
          merged.owned = Object.assign(defaultSave().owned, merged.owned || {});
          merged.equip = Object.assign(defaultSave().equip, merged.equip || {});
          this.save = merged;
        } else if (this.canWrite) {
          await this._write('save', () => db.doc('data/users/' + uid + '/save').set(this._clean(this.save)));
        }
        this.mode = this.canWrite ? 'online' : 'readonly';
        this.status = this.canWrite ? 'Online — times post to the global board' : 'View-only access — you can race and watch boards; times stay on this device';
        if (this.canWrite) this.pushProfile();
      } catch (e) {
        console.warn('db', e);
        if (e && e.code === 'invalid_argument') { this.mode = 'readonly'; this.canWrite = false; this.status = 'View-only access — times stay on this device'; }
        else this._setStatus('unreachable');
      }
      DL.store.set('save', this.save);
      DL.emit('net'); DL.emit('save');
    },


    // ---------- own backend (Cloudflare Worker + D1) ----------
    api: false, google: false, token: null, trackVer: null,
    async _fetch(method, path, body) {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const t = ctl && setTimeout(() => ctl.abort(), 12000);
      try {
        const h = { 'content-type': 'application/json' };
        if (this.token) h.authorization = 'Bearer ' + this.token;
        const r = await fetch((DL.CONFIG.apiBase || '').replace(/\/$/, '') + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined });
        let j = null; try { j = await r.json(); } catch (e) { }
        return { s: r.status, j: j || {} };
      } finally { if (t) clearTimeout(t); }
    },
    _normSave(d) {
      const m = Object.assign(defaultSave(), JSON.parse(JSON.stringify(d || {})));
      m.owned = Object.assign(defaultSave().owned, m.owned || {});
      m.equip = Object.assign(defaultSave().equip, m.equip || {});
      return m;
    },
    // keep whichever save has more progress; push ours up if it is ahead
    _reconcile(server) {
      if (server && (server.runs || 0) >= (this.save.runs || 0)) { this.save = this._normSave(server); DL.store.set('save', this.save); DL.emit('save'); }
      else this.persist();
    },
    async connectApi() {
      this.mode = 'connecting'; DL.emit('net');
      let ping = null;
      try { const r = await this._fetch('GET', '/api/ping'); if (r.s === 200 && r.j.ok) ping = r.j; } catch (e) { }
      if (!ping) { this._setStatus('local'); return; }
      this.api = true; this.db = { api: true }; this.canWrite = true; this.trackVer = ping.ver; this.google = !!ping.google;
      if (ping.clientId) DL.CONFIG.googleClientId = ping.clientId;
      this.token = DL.store.get('token', null);
      let me = null;
      try {
        if (this.token) { const r = await this._fetch('GET', '/api/me'); if (r.s === 200 && r.j.ok) me = r.j; }
        if (!me) {
          const g = await this._fetch('POST', '/api/auth/guest');
          if (!g.j.ok) throw new Error('guest');
          this.token = g.j.token; DL.store.set('token', this.token);
          me = { id: g.j.id, save: null, linked: false, tag: '' };
        }
      } catch (e) { this._setStatus('unreachable'); return; }
      this.uid = me.id; this.username = me.username || ''; this.linked = !!me.linked || !!this.username;
      if (!this.linked && DL.Auth && DL.Auth.user) DL.Auth.signOut(true);
      this._reconcile(me.save);
      this.applyRegen();
      this.mode = 'online'; this.status = this.username ? 'Online — signed in as ' + this.username : this.linked ? 'Online — signed in with Google' : 'Online — playing as a guest. Create an account in Settings to keep your progress on any device';
      this.pushProfile(); this._flushPending();
      DL.emit('net'); DL.emit('save');
    },
    async googleSignIn(credential) {
      if (!this.api) return false;
      try {
        const r = await this._fetch('POST', '/api/auth/google', { credential });
        if (!r.j.ok) { DL.emit('toast', 'Google sign-in was rejected: ' + (r.j.error || r.s)); return false; }
        this.token = r.j.token; DL.store.set('token', this.token);
        this.uid = r.j.id; this.linked = true; this.mode = 'online';
        this.status = 'Online — signed in with Google';
        this._reconcile(r.j.save);
        if (r.j.merged) DL.emit('toast', 'Your guest times were merged into your account');
        this.pushProfile(); this._flushPending();
        DL.emit('net'); DL.emit('save');
        return true;
      } catch (e) { DL.emit('toast', 'Could not reach the server'); return false; }
    },
    // username + password: mode is 'register' (turns this guest into an account) or 'login'
    async passwordAuth(mode, username, password) {
      if (!this.api) return { ok: false, error: 'Accounts need the online leaderboard' };
      try {
        const r = await this._fetch('POST', '/api/auth/' + mode, { username, password });
        if (!r.j.ok) return { ok: false, error: r.j.error || ('Error ' + r.s) };
        this.token = r.j.token; DL.store.set('token', this.token);
        this.uid = r.j.id; this.username = r.j.username || username; this.linked = true; this.mode = 'online';
        this.status = 'Online — signed in as ' + this.username;
        this._reconcile(r.j.save);
        if (r.j.merged) DL.emit('toast', 'Your guest times were merged into your account');
        if (mode === 'login' && r.j.tag && !this.save.tag) this.save.tag = r.j.tag;
        this.pushProfile(); this._flushPending();
        DL.emit('net'); DL.emit('save');
        return { ok: true };
      } catch (e) { return { ok: false, error: 'Could not reach the server' }; }
    },
    async signedOut() {
      if (!this.api) return;
      try { await this._fetch('POST', '/api/auth/logout'); } catch (e) { }
      DL.store.set('token', null); this.token = null; this.uid = null; this.linked = false; this.username = '';
      await this.connectApi();
    },
    async _postRun(payload) {
      for (let attempt = 0; attempt < 2; attempt++) {
        this._bc = null;
        const r = await this._fetch('POST', '/api/run', payload);
        if (r.s === 429 && attempt === 0) { await new Promise(res => setTimeout(res, 6500)); continue; }
        return r;
      }
    },
    _flushPending() {
      for (const k of DL.store.keys ? DL.store.keys('pendingRun:') : []) {
        const p = DL.store.get(k, null); if (!p) continue;
        p.tv = this.trackVer;
        this._postRun(p).then(r => { if (r && (r.s === 200 || r.s === 422 || r.s === 400)) DL.store.set(k, null); }).catch(() => { });
      }
    },

    _setStatus(k) {
      this.mode = k === 'signedout' || k === 'unreachable' ? 'readonly' : 'local';
      this.status = {
        local: 'Offline — progress is kept on this device',
        signedout: 'Sign in to claude.ai to post times — boards are read-only',
        unreachable: 'Leaderboard server unreachable — progress is kept on this device'
      }[k];
      DL.emit('net');
    },
    _timeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]); },
    _clean(o) { return JSON.parse(JSON.stringify(o)); },
    // one write at a time per document
    _write(key, fn) {
      const prev = this._q[key] || Promise.resolve();
      const next = prev.then(fn, fn).catch(e => { console.warn('write failed', key, e); if (e && e.code === 'quota_exceeded') DL.emit('toast', 'The leaderboard database is full.'); });
      this._q[key] = next; return next;
    },

    persist() {
      DL.store.set('save', this.save);
      if (this.mode === 'online' && this.uid) {
        clearTimeout(this._pt);
        if (this.api) this._pt = setTimeout(() => this._write('save', () => this._fetch('PUT', '/api/save', { save: this._clean(this.save) })), 900);
        else this._pt = setTimeout(() => this._write('save', () => this.db.doc('data/users/' + this.uid + '/save').set(this._clean(this.save))), 700);
      }
      DL.emit('save');
    },

    publicProfile() {
      const s = this.save, p = s.paint[s.car] || { l: DL.encodeLivery(DL.defaultLivery()), b: DL.DEFAULT_BASE };
      return {
        car: s.car, l: p.l, b: p.b, equip: s.equip, tag: (s.tag || '').slice(0, 16),
        days: s.days, streak: s.streak, bestStreak: s.bestStreak, score: s.score, runs: s.runs,
        friends: (s.friends || []).slice(0, 50),
        ach: Object.keys(s.ach || {}).length, at: Date.now()
      };
    },
    pushProfile(extra) {
      if (this.mode !== 'online') return;
      if (this.api) {
        clearTimeout(this._ppt);
        this._ppt = setTimeout(() => this._write('profile', () => this._fetch('PUT', '/api/profile', this.publicProfile())), 800);
        return;
      }
      const body = Object.assign(this.publicProfile(), extra || {});
      const ref = this.db.doc('players/' + this.uid);
      return this._write('profile', async () => {
        const snap = await ref.get();
        if (snap.exists) await ref.update(body); else await ref.set(body);
      });
    },

    // ---------- economy ----------
    spend(n) { if (this.save.coins < n) return false; this.save.coins -= n; this.persist(); return true; },
    owns(cat, id) { return (this.save.owned[cat] || []).includes(id); },
    buy(cat, id, price) {
      if (this.owns(cat, id)) return true;
      if (!this.spend(price)) return false;
      this.save.owned[cat].push(id);
      if (cat === 'cars' && this.save.owned.cars.length >= 3) this.award('collector');
      this.persist(); this.pushProfile(); return true;
    },
    award(id, list) {
      if (this.save.ach[id]) return null;
      this.save.ach[id] = Date.now();
      this.save.coins += ACH[id].coins;
      if (list) list.push(ACH[id]); else DL.emit('achievement', ACH[id]);
      return ACH[id];
    },

    // ---------- runs ----------
    // meta: {recoveries, airMax, beatGhost, archive}
    // community tracks: a small finish reward, a personal best and a posted time, but no streak or daily score
    _submitCustom(track, time, ghostEnc) {
      const s = this.save, day = track.day;
      const res = { coins: [], ach: [], prevBest: s.best[day] || null, isPB: false, community: true };
      s.runs++;
      const cl = s.claimed[day] || (s.claimed[day] = { done: 0, pb: 0 });
      if (!cl.done) { cl.done = 1; res.coins.push(['Community finish', 10]); s.coins += 10; }
      if (!res.prevBest || time < res.prevBest) {
        res.isPB = true; s.best[day] = time;
        DL.store.set('ghost:' + day, ghostEnc);
        if (this.mode === 'online' && this.api) {
          const payload = { day, time: Math.round(time * 1000) / 1000, ghost: ghostEnc, car: s.car, tv: this.trackVer };
          this._pending = this._postRun(payload).then(r => {
            if (r.s === 409 && r.j.reload) DL.emit('toast', 'A new version of Dayline is out — reload the page to post times');
            else if (r.s === 422) { if (res.prevBest) s.best[day] = res.prevBest; else delete s.best[day]; DL.store.set('ghost:' + day, null); this.persist(); DL.emit('toast', 'Lap time deleted. Don’t cheat.'); }
            else if (r.s === 404) DL.emit('toast', 'That track no longer exists');
            else if (r.s !== 200) throw new Error('post');
          }).catch(() => { DL.store.set('pendingRun:' + day, payload); DL.emit('toast', 'Offline — your time will post when the connection returns'); });
        }
      }
      res.total = res.coins.reduce((a, c) => a + c[1], 0);
      this.persist();
      return res;
    },
    // fire-and-forget: one row per attempt (finished or not) for the daily recap reels
    logAttempt(day, secs, finished, ghostEnc, cps) {
      if (!this.api || !this.token) return;
      const body = { day, secs, fin: finished ? 1 : 0, cps: cps | 0, ghost: ghostEnc, car: this.save.car, tv: this.trackVer };
      const send = () => this._fetch('POST', '/api/attempt', body).catch(() => { });
      if (finished) setTimeout(send, 1500); else send();   // let the scored run go first
    },
    submitRun(track, time, ghostEnc, meta) {
      if (track.custom) return this._submitCustom(track, time, ghostEnc);
      const s = this.save, day = track.day, today = DL.dayKey();
      const res = { coins: [], ach: [], prevBest: s.best[day] || null, isPB: false };
      const add = (label, n) => { if (n > 0) { res.coins.push([label, n]); s.coins += n; } };
      s.runs++;
      const cl = s.claimed[day] || (s.claimed[day] = { done: 0, pb: 0 });
      const archive = day !== today;
      if (!cl.done) {
        cl.done = 1;
        add(archive ? 'Archive finish' : 'Daily finish', archive ? 12 : 25);
        if (archive) { s.archiveDone++; if (s.archiveDone >= 5) this.award('archive5', res.ach); }
        else {
          s.days++;
          if (s.lastDay === DL.addDays(today, -1)) s.streak++;
          else if (s.lastDay !== today) s.streak = 1;
          s.lastDay = today; s.bestStreak = Math.max(s.bestStreak, s.streak);
          add('Streak bonus ×' + s.streak, 5 * Math.min(s.streak, 8));
          if (s.streak >= 3) this.award('streak3', res.ach);
          if (s.streak >= 7) this.award('streak7', res.ach);
        }
        s.score += 1;
      }
      if (!res.prevBest || time < res.prevBest) {
        res.isPB = true;
        if (res.prevBest && cl.pb < 4) { cl.pb++; add('Personal best', 8); }
        s.best[day] = time;
      }
      this.award('first', res.ach);
      if (meta.recoveries === 0) this.award('clean', res.ach);
      if (meta.airMax >= 1.5) this.award('air', res.ach);
      if (cl.pb >= 3) this.award('pb3', res.ach);
      if (meta.beatGhost) this.award('ghost', res.ach);
      if (s.runs >= 25) this.award('runs25', res.ach);
      res.ach.forEach(a => res.coins.push([a.name, a.coins]));
      res.total = res.coins.reduce((a, c) => a + c[1], 0);

      if (res.isPB) {
        DL.store.set('ghost:' + day, ghostEnc);
        if (this.mode === 'online' && this.api) {
          const payload = { day, time: Math.round(time * 1000) / 1000, ghost: ghostEnc, car: s.car, tv: this.trackVer };
          this._pending = this._postRun(payload).then(r => {
            if (r.s === 409 && r.j.reload) DL.emit('toast', 'A new version of Dayline is out — reload the page to post times');
            else if (r.s === 422) {
              // the server checks every run against the track: an impossible one is deleted, never kept
              if (res.prevBest) s.best[day] = res.prevBest; else delete s.best[day];
              DL.store.set('ghost:' + day, null); this.persist();
              DL.emit('toast', 'Lap time deleted. Don’t cheat.');
            }
            else if (r.s !== 200) throw new Error('post');
          }).catch(() => { DL.store.set('pendingRun:' + day, payload); DL.emit('toast', 'Offline — your time will post when the connection returns'); });
          this.pushProfile();
        } else if (this.mode === 'online') {
          const fields = {}; fields['t_' + day] = Math.round(time * 1000) / 1000;
          this._write('ghost', () => this.db.doc('players/' + this.uid + '/ghosts/' + day).set({ day, time: fields['t_' + day], car: s.car, g: ghostEnc }));
          this.pushProfile(fields);
        }
      } else if (this.mode === 'online') this.pushProfile();
      this.persist();
      return res;
    },

    // ---------- community tracks ----------
    async ctList(sort) {
      if (!this.api) return null;
      const bc = this._cc || (this._cc = {}), c = bc[sort];
      if (c && Date.now() - c.t < 15000) return c.rows;
      if (this._pending) { try { await this._pending; } catch (e) { } }
      const r = await this._fetch('GET', '/api/ctracks?sort=' + encodeURIComponent(sort || 'new'));
      if (!r.j.ok) throw new Error('list');
      bc[sort || 'new'] = { rows: r.j.rows, t: Date.now() }; return r.j.rows;
    },
    async ctGet(id) {
      const r = await this._fetch('GET', '/api/ctrack/' + id);
      return r.j.ok ? r.j.track : null;
    },
    async ctPublish(p) {
      if (!this.api || this.mode !== 'online') return { ok: false, error: 'Publishing needs the online leaderboard' };
      try {
        const r = await this._fetch('POST', '/api/ctrack', Object.assign({ tv: this.trackVer, car: this.save.car }, p));
        this._cc = null;
        if (r.j.ok) return { ok: true, id: r.j.id };
        return { ok: false, error: r.j.reload ? 'A new version of Dayline is out. Reload the page' : (r.j.error || 'Could not publish (' + r.s + ')') };
      } catch (e) { return { ok: false, error: 'Could not reach the server' }; }
    },
    async ctDelete(id) {
      const r = await this._fetch('POST', '/api/ctrack/' + id + '/delete'); this._cc = null; return !!r.j.ok;
    },

    // ---------- boards ----------
    async boardDaily(day, limit) {
      if (!this.db) return null;
      if (this.api) {
        const bc = this._bc || (this._bc = {}), c = bc[day];
        if (c && c.rows && Date.now() - c.t < 20000) return c.rows.slice(0, limit || 200);
        if (c && c.p) return (await c.p).slice(0, limit || 200);
        const p = (async () => { if (this._pending) await this._pending; const r = await this._fetch('GET', '/api/board/daily?day=' + day); if (!r.j.ok) throw new Error('board'); return r.j.rows; })();
        bc[day] = { p, t: 0 };
        try { const rows = await p; bc[day] = { rows, t: Date.now() }; return rows.slice(0, limit || 200); } catch (e) { delete bc[day]; throw e; }
      }
      const f = 't_' + day;
      const snap = await this._timeout(this.db.collection('players').where(f, '>', 0).orderBy(f).limit(limit || 200).get(), 12000);
      return snap.docs.map(d => { const x = d.data(); return { uid: d.id, time: x[f], car: x.car, l: x.l, b: x.b, equip: x.equip, tag: x.tag, streak: x.streak, friends: x.friends || [] }; });
    },
    async boardAllTime() {
      if (!this.db) return null;
      if (this.api) { const r = await this._fetch('GET', '/api/board/alltime'); if (!r.j.ok) throw new Error('board'); return r.j.rows; }
      const snap = await this._timeout(this.db.collection('players').orderBy('score', 'desc').limit(100).get(), 12000);
      return snap.docs.map(d => { const x = d.data(); return Object.assign({ uid: d.id }, x); }).filter(x => x.score > 0);
    },
    async player(uid) {
      if (!this.db) return null;
      if (this.api) { const r = await this._fetch('GET', '/api/player/' + encodeURIComponent(uid)); return r.j.ok ? Object.assign({ uid }, r.j.player) : null; }
      const s = await this.db.doc('players/' + uid).get();
      return s.exists ? Object.assign({ uid }, s.data()) : null;
    },
    async ghost(uid, day) {
      if (uid === 'me' || uid === this.uid) {
        const g = DL.store.get('ghost:' + day, null);
        if (g) return g;
      }
      if (!this.db || uid === 'me') return null;
      const key = uid + '/' + day, c = this._gcache || (this._gcache = {});
      if (c[key]) return c[key];
      if (this.api) { const r = await this._fetch('GET', '/api/ghost/' + encodeURIComponent(uid) + '/' + day); if (r.j && r.j.ok) c[key] = r.j.g; return r.j && r.j.ok ? r.j.g : null; }
      const s = await this._timeout(this.db.doc('players/' + uid + '/ghosts/' + day).get(), 12000);
      return (c[key] = s.exists ? s.data().g : null);
    },
    async names(ids) {
      const out = {};
      if (this.user && ids.length) {
        try { const ps = await this.user.profiles(ids); for (const id of ids) out[id] = ps[id] || null; } catch (e) { }
      }
      return out;
    },
    toggleFriend(uid) {
      const f = this.save.friends || (this.save.friends = []);
      const i = f.indexOf(uid); if (i >= 0) f.splice(i, 1); else f.push(uid);
      this.persist(); this.pushProfile();
      return i < 0;
    },
    isFriend(uid) { return (this.save.friends || []).includes(uid); }
  };

})(window.DL);
