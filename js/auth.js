/* DAYLINE — Google sign-in (Google Identity Services).
   Needs an OAuth Web Client ID (Google Cloud Console → Credentials) whose "Authorized JavaScript origins"
   include the address Dayline is served from. Set it in DL.CONFIG below or paste it in Settings → Account. */
'use strict';
(function (DL) {
  DL.CONFIG = DL.CONFIG || { googleClientId: '', apiBase: '' };

  const Auth = DL.Auth = {
    user: null,           // { sub, name, given, picture, credential, exp }
    clientId() { return (DL.store.get('gcid', '') || DL.CONFIG.googleClientId || '').trim(); },
    setClientId(id) { DL.store.set('gcid', (id || '').trim()); },
    init() {
      const u = DL.store.get('google', null);
      if (u && u.sub && (!u.exp || u.exp * 1000 > Date.now() - 30 * 86400e3)) this.user = u;
      if (this.user) this._adopt(false);
    },
    credential() { return this.user ? this.user.credential : null; },
    _adopt(announce) {
      const u = this.user; if (!u) return;
      const S = DL.Net && DL.Net.save;
      if (S && !S.tag && u.given) { S.tag = u.given.slice(0, 16); DL.Net.persist(); if (DL.Net.pushProfile) DL.Net.pushProfile(); }
      if (announce) DL.emit('toast', 'Signed in with Google as ' + (u.name || 'driver'));
      DL.emit('auth');
    },
    _decode(jwt) {
      try {
        const b = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(atob(b).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(json);
      } catch (e) { return null; }
    },
    _load() {
      if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve(true);
      if (this._p) return this._p;
      this._p = new Promise(res => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
        const t = setTimeout(() => res(false), 6000);
        s.onload = () => { clearTimeout(t); res(!!(window.google && window.google.accounts)); };
        s.onerror = () => { clearTimeout(t); res(false); };
        document.head.appendChild(s);
      }).then(ok => { if (!ok) this._p = null; return ok; });
      return this._p;
    },
    // draws Google's own button into `el`; resolves { ok } or { ok:false, reason: 'noclient' | 'blocked' }
    async mountButton(el) {
      const id = this.clientId();
      if (!id) return { ok: false, reason: 'noclient' };
      const ok = await this._load();
      if (!ok) return { ok: false, reason: 'blocked' };
      try {
        google.accounts.id.initialize({ client_id: id, callback: r => this._onCredential(r), auto_select: false, ux_mode: 'popup' });
        google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'left', width: Math.min(320, el.clientWidth || 300) });
        return { ok: true };
      } catch (e) { return { ok: false, reason: 'blocked' }; }
    },
    _onCredential(resp) {
      const p = resp && resp.credential ? this._decode(resp.credential) : null;
      if (!p || !p.sub) { DL.emit('toast', 'Google sign-in failed — try again'); return; }
      this.user = { sub: p.sub, name: p.name || p.given_name || 'Driver', given: p.given_name || '', picture: p.picture || '', credential: resp.credential, exp: p.exp || 0 };
      DL.store.set('google', this.user);
      this._adopt(true);
      if (DL.Net && DL.Net.api) DL.Net.googleSignIn(resp.credential).then(ok => { if (!ok) { this.user = null; DL.store.set('google', null); DL.emit('auth'); } });
    },
    signOut(silent) {
      try { if (window.google && window.google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) { }
      this.user = null; DL.store.set('google', null);
      if (!silent && DL.Net && DL.Net.api) DL.Net.signedOut();
      DL.emit('auth');
    }
  };
})(window.DL);
