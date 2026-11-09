/* DAYLINE — sharing: result card image, one-tap clip of your run, community track links */
(function (DL) {
  'use strict';
  const X = DL.UI._x, { toast, modal, closeModal, show, esc } = X, Net = DL.Net, Game = DL.Game || window.Game;
  const BASE = () => (location.origin.includes('github.io') ? location.origin + location.pathname : 'https://dayline-game.github.io/Dayline/');
  const S = DL.Share = {};
  S.trackLink = id => BASE() + '?t=' + encodeURIComponent(id);
  S.base = BASE;

  function save(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && (matchMedia('(pointer:coarse)').matches)) {
      return navigator.share({ files: [file], text: 'Dayline · ' + BASE() }).catch(() => dl());
    }
    return dl();
    function dl() { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  }

  // ---------- result card (1080 x 1350) ----------
  S.card = function (r, t, o) {
    o = o || {};
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const B = r.track.B, hex = n => '#' + ('000000' + n.toString(16)).slice(-6);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1c2536'); g.addColorStop(1, '#0f1522'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const F = 'Barlow Condensed, Barlow, sans-serif';
    c.textAlign = 'left'; c.fillStyle = '#f05a35'; c.font = `800 44px ${F}`; c.fillText('DAYLINE', 70, 110);
    c.fillStyle = '#f3ead7'; c.font = `700 40px ${F}`; c.textAlign = 'right'; c.fillText(o.title || '', W - 70, 110); c.textAlign = 'left';
    // map panel
    const mx = 70, my = 160, mw = W - 140, mh = 560;
    const bg = c.createLinearGradient(mx, my, mx + mw, my + mh); bg.addColorStop(0, hex(B.ground[1])); bg.addColorStop(1, hex(B.ground[0]));
    c.fillStyle = bg; c.beginPath(); c.roundRect ? c.roundRect(mx, my, mw, mh, 28) : c.rect(mx, my, mw, mh); c.fill();
    const px = r.track.px, pz = r.track.pz, n = px.length; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < n; i += 3) { x0 = Math.min(x0, px[i]); x1 = Math.max(x1, px[i]); z0 = Math.min(z0, pz[i]); z1 = Math.max(z1, pz[i]); }
    const pad = 70, s = Math.min((mw - pad * 2) / Math.max(40, x1 - x0), (mh - pad * 2) / Math.max(40, z1 - z0)), cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2;
    const X0 = x => mx + mw / 2 + (x - cxm) * s, Z0 = z => my + mh / 2 - (z - czm) * s;
    const path = () => { c.beginPath(); c.moveTo(X0(px[0]), Z0(pz[0])); for (let i = 3; i < n; i += 3) c.lineTo(X0(px[i]), Z0(pz[i])); c.lineTo(X0(px[n - 1]), Z0(pz[n - 1])); };
    c.lineJoin = 'round'; c.lineCap = 'round';
    path(); c.strokeStyle = 'rgba(17,21,29,.25)'; c.lineWidth = 26; c.stroke();
    path(); c.strokeStyle = '#f3ead7'; c.lineWidth = 22; c.stroke();
    path(); c.strokeStyle = '#2c3548'; c.lineWidth = 17; c.stroke();
    c.fillStyle = '#3f7d5a'; c.beginPath(); c.arc(X0(px[0]), Z0(pz[0]), 13, 0, 7); c.fill();
    c.fillStyle = '#f05a35'; c.beginPath(); c.arc(X0(px[n - 1]), Z0(pz[n - 1]), 13, 0, 7); c.fill();
    c.fillStyle = 'rgba(17,21,29,.55)'; c.font = `700 30px ${F}`; c.fillText((B.name || '').toUpperCase(), mx + 28, my + mh - 28);
    // time
    c.fillStyle = '#f3ead7'; c.font = `800 190px ${F}`; c.textAlign = 'center'; c.fillText(DL.fmtTime(t).replace(/^00:/, ''), W / 2, 930);
    c.font = `700 46px ${F}`; c.fillStyle = '#9aa7bd';
    const bits = [o.pos, o.streak ? 'Streak ' + o.streak : '', o.name].filter(Boolean).join('  ·  ');
    c.fillText(bits.toUpperCase(), W / 2, 1000);
    if (o.squares) { c.font = '64px sans-serif'; c.fillText(o.squares, W / 2, 1110); }
    c.fillStyle = '#f05a35'; c.beginPath(); c.roundRect ? c.roundRect(W / 2 - 330, 1170, 660, 84, 42) : c.rect(W / 2 - 330, 1170, 660, 84); c.fill();
    c.fillStyle = '#fff'; c.font = `800 44px ${F}`; c.fillText('CAN YOU BEAT THIS?', W / 2, 1228);
    c.fillStyle = '#9aa7bd'; c.font = `600 30px ${F}`; c.fillText(BASE().replace(/^https?:\/\//, ''), W / 2, 1306);
    return cv;
  };
  S.shareCard = function (r, t, o) {
    const cv = S.card(r, t, o);
    cv.toBlob(b => { if (!b) { toast('Could not make the image'); return; } save(b, `dayline-${r.track.day}-${DL.fmtTime(t).replace(/[:.]/g, '-')}.png`); toast('<b>Result card saved</b>'); }, 'image/png');
  };

  // ---------- one-tap clip of your run (vertical 9:16, no audio) ----------
  S.clip = async function (r, t, o) {
    o = o || {};
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast('This browser cannot record video. Try Chrome or Safari 17+'); return; }
    if (!r.enc) { toast('No run to record'); return; }
    const sv = Net.save, p = sv.paint[sv.car] || {}, spec = { uid: 'me', label: o.name || 'You', car: sv.car, l: p.l, b: p.b, equip: sv.equip };
    const day = r.track.day;
    closeModal(); DL.UI._replayBack = 'menu';
    DL.UI.openReplay(day, spec, r.enc, t);
    await new Promise(res => setTimeout(res, 700));
    const rr = Game.race(); if (!rr || !rr.replay) { toast('Could not start the clip'); return; }
    rr.rt = 0; rr.snap = true; rr.paused = false; rr.rate = 1; rr.hold = 0;
    const W = 720, H = 1280, out = document.createElement('canvas'); out.width = W; out.height = H; const c = out.getContext('2d');
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'], mime = types.find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(out.captureStream(30), mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : { videoBitsPerSecond: 6e6 }), chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const F = 'Barlow Condensed, Barlow, sans-serif'; let done = false, endAt = 0;
    const hook = o.hook || ('CAN YOU BEAT ' + DL.fmtTime(t).replace(/^00:/, '') + '?');
    Game.onReplayFrame = src => {
      if (done) return;
      const sw = src.height * 9 / 16, sx = (src.width - sw) / 2; c.drawImage(src, sx, 0, sw, src.height, 0, 0, W, H);
      const g = c.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 300);
      const g2 = c.createLinearGradient(0, H - 330, 0, H); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.6)'); c.fillStyle = g2; c.fillRect(0, H - 330, W, 330);
      c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 10; c.strokeStyle = '#000';
      c.font = `800 84px ${F}`; c.fillStyle = '#fff'; if (rr.rt < 3.2 || true) { c.strokeText(hook, W / 2, 150); c.fillText(hook, W / 2, 150); }
      c.font = `800 120px ${F}`; const ts = DL.fmtTime(Math.min(rr.rt, t)).replace(/^00:/, ''); c.strokeText(ts, W / 2, H - 200); c.fillStyle = '#fff'; c.fillText(ts, W / 2, H - 200);
      c.font = `700 44px ${F}`; c.fillStyle = '#f05a35'; c.strokeText('DAYLINE', W / 2, H - 120); c.fillText('DAYLINE', W / 2, H - 120);
      c.font = `600 34px ${F}`; c.fillStyle = '#fff'; c.strokeText(BASE().replace(/^https?:\/\//, ''), W / 2, H - 70); c.fillText(BASE().replace(/^https?:\/\//, ''), W / 2, H - 70);
      if (rr.rt >= rr.dur - 0.01 && !endAt) endAt = performance.now() + 1200;
      if (endAt && performance.now() > endAt) { done = true; rec.stop(); }
    };
    rec.onstop = () => {
      Game.onReplayFrame = null;
      const type = (rec.mimeType || mime || 'video/webm').split(';')[0], blob = new Blob(chunks, { type }), ext = type.includes('mp4') ? 'mp4' : 'webm';
      save(blob, `dayline-${day}-${DL.fmtTime(t).replace(/[:.]/g, '-')}.${ext}`);
      toast('<b>Clip saved</b>' + (ext === 'webm' ? ' (this browser saves WebM)' : ''));
      show(DL.UI._replayBack || 'menu');
    };
    toast('Recording your clip… about ' + Math.ceil(rr.dur) + ' s');
    rec.start(250);
    setTimeout(() => { if (!done) { done = true; try { rec.stop(); } catch (e) { } } }, (rr.dur + 8) * 1000);
  };
})(window.DL);
