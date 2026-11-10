/* DAYLINE — rewarded video ads (AppLixir). Watch an ad, get coins. Off until DL.CONFIG.applixirKey is set. */
'use strict';
(function (DL) {
  const REWARD = 100, PER_DAY = 3, GAP = 45000;            // coins per ad, ads per day, ms between ads
  const SDK = 'https://cdn.applixir.com/applixir.app.v6.1.0.js';
  let loading = null, busy = false, lastAt = 0;
  const key = () => (DL.CONFIG && DL.CONFIG.applixirKey) || '';
  const state = () => { const s = DL.Net.save, d = DL.dayKey(); if (!s.ads || s.ads.d !== d) s.ads = { d, n: 0 }; return s.ads; };
  const load = () => loading || (loading = new Promise((ok, no) => {
    if (window.initializeAndOpenPlayer) return ok();
    const sc = document.createElement('script'); sc.src = SDK;
    sc.onload = () => ok(); sc.onerror = () => { loading = null; no(new Error('sdk')); };
    document.head.appendChild(sc);
  }));
  const box = () => document.getElementById('applixir-ad-container');
  DL.Ads = {
    REWARD, PER_DAY,
    enabled: () => !!key(),
    left: () => Math.max(0, PER_DAY - state().n),
    wait: () => Math.max(0, GAP - (Date.now() - lastAt)),
    // resolves true when the ad played to the end and coins were added
    watch() {
      if (!key() || busy) return Promise.resolve(false);
      if (!DL.Ads.left()) { DL.UI.toast('No more ads today. Back tomorrow!'); return Promise.resolve(false); }
      if (DL.Ads.wait()) { DL.UI.toast('Next ad in ' + Math.ceil(DL.Ads.wait() / 1000) + 's'); return Promise.resolve(false); }
      busy = true;
      const was = DL.Audio.vol; DL.Audio.setVolume(0);
      const end = got => { busy = false; DL.Audio.setVolume(was); const b = box(); if (b) b.hidden = true; return got; };
      return load().then(() => new Promise(done => {
        const b = box(); b.hidden = false;
        let settled = false; const fin = v => { if (!settled) { settled = true; done(v); } };
        try {
          window.initializeAndOpenPlayer({
            apiKey: key(), injectionElementId: 'applixir-ad-container', userId: DL.Net.uid || 'guest',
            adStatusCallbackFn: st => {
              const t = st && st.type;
              if (t === 'complete') {
                const a = state(); a.n++; lastAt = Date.now();
                DL.Net.save.coins += REWARD; DL.Net.persist(); if (DL.Net.pushProfile) DL.Net.pushProfile();
                DL.Audio.setVolume(was); DL.Audio.coin();
                DL.UI.toast(`<b>Thanks for watching!</b> +${REWARD} <span class="coin"></span>`, 3500);
                DL.emit && DL.emit('coins');
                fin(true);
              } else if (t === 'allAdsCompleted' || t === 'skipped' || t === 'manuallyEnded' || t === 'consentDeclined') fin(false);
            },
            adErrorCallbackFn: () => { DL.UI.toast('No ad available right now. Try again later.'); fin(false); }
          });
        } catch (e) { DL.UI.toast('Ads could not load. Try again later.'); fin(false); }
        setTimeout(() => fin(false), 120000);
      })).then(end, () => { DL.UI.toast('Ads could not load. Try again later.'); return end(false); });
    }
  };
})(window.DL);
