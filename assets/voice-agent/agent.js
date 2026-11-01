/* Rehman AI Services - "Ava" free AI voice agent (female voice, Urdu/English).
   No Firebase, no paid platform:
     listen  -> one microphone stream for the whole call; each turn is recorded with MediaRecorder, cut by simple
                voice-activity detection (~0.65 s of silence), and sent to the backend in ONE request (/turn) that
                transcribes it (Whisper), streams the AI reply sentence by sentence and sends each sentence's voice
                as soon as it is ready, so Ava starts talking while the rest of her reply is still being made. The browser's
                SpeechRecognition is deliberately NOT used: on Android Chrome it hands the mic to the Google app, which
                cannot record while the page holds the mic ("...cannot record now as Chrome is recording").
     think   -> Ava's backend (free AI model; the API key stays on the server, never in this file)
     speak   -> natural female voice from the backend (Urdu: "Uzma", English: "Ava"); the browser's own voice as a fallback
   Screen: a Screen Wake Lock keeps the phone screen on during a call (tiny muted video as a fallback); if the page is
   hidden anyway, Ava pauses and carries on when it is visible again; the call only ends after 60 s hidden or End call.
   To switch back to the old Dograh widget, see the comment in index.html. */
(function () {
  'use strict';
  if (window.RaiVoiceAgent) return;

  var CFG = {
    proxyUrl: 'https://rehmanai-ava.sites.tab.bot',   // Ava's free backend (brain + voice); empty = WhatsApp fallback only
    whatsapp: '923082890324',
    agentName: 'Ava',
    lang: 'ur-PK',              // listening language; visitor can switch to English in the card
    maxCallSeconds: 600,
    maxTurns: 30,
    hiddenGraceSeconds: 60      // page hidden (screen off / app switch) longer than this ends the call
  };
  var NOSLEEP_MP4 = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAXCbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAB9AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAlt0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAB9AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAfQAAAAAAABAAAAAAHTbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAAAgABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABfm1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAT5zdGJsAAAAunN0c2QAAAAAAAAAAQAAAKphdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAABAAEABIAAAASAAAAAAAAAABFUxhdmM1OS4zNy4xMDAgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAAMGF2Y0MBQsAK/+EAF2dCwAqmEXsBEAAAAwAQAAADACDxImEYAQAGaMhCAZSyAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAAACjwAAAo8AAAAGHN0dHMAAAAAAAAAAQAAAAIAAEAAAAAAFHN0c3MAAAAAAAAAAQAAAAEAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAHHN0c3oAAAAAAAAAAAAAAAIAAAKFAAAACgAAABhzdGNvAAAAAAAAAAIAAAYHAAAIrAAAApF0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAACAAAAAAAAB9AAAAAAAAAAAAAAAAEBAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAfQAAAEAAABAAAAAAIJbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAfQAAAQoBVxAAAAAAALWhkbHIAAAAAAAAAAHNvdW4AAAAAAAAAAAAAAABTb3VuZEhhbmRsZXIAAAABtG1pbmYAAAAQc21oZAAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABeHN0YmwAAAB+c3RzZAAAAAAAAAABAAAAbm1wNGEAAAAAAAAAAQAAAAAAAAAAAAIAEAAAAAAfQAAAAAAANmVzZHMAAAAAA4CAgCUAAgAEgICAF0AVAAAAAAAfQAAAAT8FgICABRWIVuUABoCAgAECAAAAFGJ0cnQAAAAAAAAfQAAAAT8AAAAgc3R0cwAAAAAAAAACAAAAEAAABAAAAAABAAACgAAAAChzdHNjAAAAAAAAAAIAAAABAAAAAQAAAAEAAAACAAAACAAAAAEAAABYc3RzegAAAAAAAAAAAAAAEQAAABUAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAHHN0Y28AAAAAAAAAAwAABfIAAAiMAAAItgAAABpzZ3BkAQAAAHJvbGwAAAACAAAAAf//AAAAHHNiZ3AAAAAAcm9sbAAAAAEAAAARAAAAAQAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNTkuMjcuMTAwAAAACGZyZWUAAALsbWRhdN4CAExhdmM1OS4zNy4xMDAAAjBADgAAAnIGBf//btxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMwOTUgYmFlZTQwMCAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjIgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0wIHJlZj0xNiBkZWJsb2NrPTE6MDowIGFuYWx5c2U9MHgxOjB4MTMxIG1lPXVtaCBzdWJtZT0xMCBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTI0IGNocm9tYV9tZT0xIHRyZWxsaXM9MiA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0wIHdlaWdodHA9MCBrZXlpbnQ9MjUwIGtleWludF9taW49MSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTYwIHJjPWNyZiBtYnRyZWU9MSBjcmY9NTEuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAAtliIIC3kxQABCnwAEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAcBGCAHAAAABkGaHAV9QAEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAcBGCAH';

  /* Ava's personality, prices and rules live on the backend (so nobody can misuse it as a free chatbot). */
  var GREETING = '\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u06cc\u06a9\u0645! \u0631\u062d\u0645\u0627\u0646 \u0627\u06d2 \u0622\u0626\u06cc \u0633\u0631\u0648\u0633\u0632 \u0645\u06cc\u06ba \u062e\u0648\u0634 \u0622\u0645\u062f\u06cc\u062f\u06d4 \u0645\u06cc\u06ba \u0627\u06cc\u0648\u0627 \u06c1\u0648\u06ba\u060c \u0622\u067e \u06a9\u06cc \u0627\u06d2 \u0622\u0626\u06cc \u0627\u0633\u0633\u0679\u0646\u0679\u06d4 \u0628\u062a\u0627\u0626\u06cc\u06d2\u060c \u0645\u06cc\u06ba \u0622\u067e \u06a9\u06cc \u06a9\u06cc\u0627 \u0645\u062f\u062f \u06a9\u0631 \u0633\u06a9\u062a\u06cc \u06c1\u0648\u06ba\u061f';
  var GREETING_EN = "Assalam o Alaikum! Welcome to Rehman AI Services. I'm Ava, your AI assistant. How can I help you today?";

  /* ---------- helpers ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function fmtTime(sec) { var m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
  function isUrdu(t) { return /[\u0600-\u06FF]/.test(t || ''); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- UI ---------- */
  var ui = {};
  function buildUI() {
    var btn = el('button', 'rai-va-btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Talk to our AI voice agent');
    btn.innerHTML = '<span class="rai-va-btn-orb" aria-hidden="true"></span>' +
      '<span class="rai-va-btn-txt"><b>Talk to ' + CFG.agentName + '</b><small>AI voice agent</small></span>';
    btn.addEventListener('click', open);

    var ov = el('div', 'rai-va-overlay');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'AI voice agent call');
    ov.innerHTML =
      '<div class="rai-va-card" data-state="idle">' +
      ' <button type="button" class="rai-va-x" aria-label="Close">&times;</button>' +
      ' <div class="rai-va-top"><span class="rai-va-badge"><i></i>AI VOICE AGENT</span><span class="rai-va-status">Ready</span></div>' +
      ' <button type="button" class="rai-va-stage" aria-label="Tap to talk"><span class="rai-va-orb"><span class="rai-va-orb-core"></span><span class="rai-va-orb-ring"></span><span class="rai-va-orb-ring r2"></span></span></button>' +
      ' <div class="rai-va-name">' + CFG.agentName + ' <span>&middot; Rehman AI Services</span></div>' +
      ' <canvas class="rai-va-wave" width="600" height="90" aria-hidden="true"></canvas>' +
      ' <p class="rai-va-hint"></p>' +
      ' <p class="rai-va-caption" aria-live="polite">Urdu ya English, jaise chahein baat karein.</p>' +
      ' <div class="rai-va-err" hidden></div>' +
      ' <div class="rai-va-lang" role="group" aria-label="Language"><button type="button" data-l="ur-PK" aria-pressed="true">\u0627\u0631\u062f\u0648</button><button type="button" data-l="en-US" aria-pressed="false">English</button></div>' +
      ' <div class="rai-va-ctrls">' +
      '  <button type="button" class="rai-va-start">Start talking</button>' +
      '  <button type="button" class="rai-va-end" hidden>End call</button>' +
      ' </div>' +
      ' <a class="rai-va-wa" href="https://wa.me/' + CFG.whatsapp + '" target="_blank" rel="noopener" hidden>Chat on WhatsApp instead</a>' +
      ' <p class="rai-va-fine">Free AI voice call &middot; uses your microphone</p>' +
      '</div>';
    document.body.appendChild(btn);
    document.body.appendChild(ov);
    if (CFG.proxyUrl) { try { var pc = document.createElement('link'); pc.rel = 'preconnect'; pc.href = CFG.proxyUrl.replace(/\/$/, ''); pc.crossOrigin = 'anonymous'; document.head.appendChild(pc); } catch (e) {} }
    btn.addEventListener('pointerdown', warmUp, { passive: true });
    ui = {
      btn: btn, ov: ov, card: ov.querySelector('.rai-va-card'), status: ov.querySelector('.rai-va-status'),
      stage: ov.querySelector('.rai-va-stage'), orb: ov.querySelector('.rai-va-orb'), wave: ov.querySelector('.rai-va-wave'),
      hint: ov.querySelector('.rai-va-hint'), caption: ov.querySelector('.rai-va-caption'), err: ov.querySelector('.rai-va-err'),
      start: ov.querySelector('.rai-va-start'), end: ov.querySelector('.rai-va-end'), wa: ov.querySelector('.rai-va-wa'),
      x: ov.querySelector('.rai-va-x'), langBtns: ov.querySelectorAll('.rai-va-lang button')
    };
    ui.start.addEventListener('click', startCall);
    ui.end.addEventListener('click', function () { endCall('Call ended. Shukriya!'); });
    ui.x.addEventListener('click', close);
    ui.stage.addEventListener('click', function () { if (call && call.phase === 'speaking') interrupt(call); });
    Array.prototype.forEach.call(ui.langBtns, function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-l')); });
    });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('is-open')) close(); });
  }

  function setLang(l) {
    CFG.lang = l;
    Array.prototype.forEach.call(ui.langBtns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-l') === l)); });
    if (call && call.phase === 'listening') { stopListening(call); call.lastLang = null; listen(call); }
  }
  function setState(s, statusText) {
    ui.card.setAttribute('data-state', s);
    if (statusText != null) ui.status.textContent = statusText;
    var live = (s === 'live' || s === 'connecting');
    ui.start.hidden = live; ui.end.hidden = !live;
    if (s !== 'error') { ui.err.hidden = true; ui.wa.hidden = true; ui.card.removeAttribute('data-err'); }
    ui.start.textContent = (s === 'ended' || s === 'error') ? 'Call again' : 'Start talking';
    if (!live) ui.hint.textContent = '';
  }
  function setPhase(c, p) {
    c.phase = p; ui.card.setAttribute('data-phase', p);
    ui.hint.textContent = p === 'listening' ? (CFG.lang === 'en-US' ? 'Listening\u2026 speak now' : 'Sun rahi hoon\u2026 bolein') :
      p === 'thinking' ? 'Soch rahi hoon\u2026' : p === 'speaking' ? 'Ava bol rahi hai \u00b7 tap the orb to interrupt' :
      p === 'paused' ? 'Call hold par hai \u00b7 screen on karein, Ava phir sunegi' : '';
  }
  function showError(msg, html) {
    setState('error', 'Not connected');
    if (html) ui.err.innerHTML = html; else ui.err.textContent = msg;
    ui.err.hidden = false; ui.wa.hidden = false; ui.caption.textContent = '';
    ui.wa.textContent = 'WhatsApp par baat karein';
  }
  /* Clear Urdu screen for a blocked microphone, with the WhatsApp button. */
  var MIC_DENIED_HTML =
    '<b class="rai-va-ur" dir="rtl" lang="ur">\u0645\u0627\u0626\u06cc\u06a9 \u06a9\u06cc \u0627\u062c\u0627\u0632\u062a \u0646\u06c1\u06cc\u06ba \u0645\u0644\u06cc\u06d4 \u0627\u06cc\u0648\u0627 \u0622\u067e \u06a9\u06cc \u0622\u0648\u0627\u0632 \u0646\u06c1\u06cc\u06ba \u0633\u0646 \u0633\u06a9\u062a\u06cc\u06d4</b>' +
    '<span>Mic ki ijazat nahi mili. Address bar mein <b>\uD83D\uDD12 lock</b> ka nishan dabayein \u2192 <b>Permissions / Site settings</b> \u2192 <b>Microphone \u2192 Allow</b>, phir page refresh karke "Call again" dabayein. Ya neeche WhatsApp par baat karein.</span>';
  function showMicDenied() { showError('', MIC_DENIED_HTML); ui.card.setAttribute('data-err', 'mic'); }
  function warmUp() {          /* open the connection to Ava's backend early, so the first turn doesn't pay for it */
    if (!CFG.proxyUrl || warmUp.done) return; warmUp.done = true;
    try { fetch(CFG.proxyUrl.replace(/\/$/, '') + '/', { mode: 'no-cors', cache: 'no-store' }).catch(function () {}); } catch (e) {}
  }
  function open() { warmUp(); ui.ov.classList.add('is-open'); document.documentElement.classList.add('rai-va-lock'); if (!call) setState('idle', 'Ready'); ui.start.focus(); }
  function close() { if (call) endCall(); ui.ov.classList.remove('is-open'); document.documentElement.classList.remove('rai-va-lock'); ui.btn.focus(); }

  /* ---------- brain (proxy) ---------- */
  function think(c, userText) {
    c.history.push({ role: 'user', content: userText });
    var msgs = c.history.slice(-12);
    return api.chat(msgs, c.lastLang || (CFG.lang === 'en-US' ? 'en' : 'ur')).then(function (text) {
      text = String(text || '').replace(/[*_#`>]/g, '').trim();
      if (!text) text = isUrdu(userText) ? '\u0645\u0639\u0630\u0631\u062a\u060c \u062f\u0648\u0628\u0627\u0631\u06c1 \u0628\u062a\u0627\u0626\u06cc\u06d2\u061f' : 'Sorry, could you say that again?';
      c.history.push({ role: 'assistant', content: text });
      return text;
    });
  }
  function chat(msgs, lang) {
    if (!CFG.proxyUrl) return Promise.reject(new Error('not_configured'));
    return fetch(CFG.proxyUrl.replace(/\/$/, '') + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, lang: lang })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error((j && j.error) || ('http_' + r.status));
        return j.text;
      });
    });
  }
  function sttUpload(blob) {
    if (!CFG.proxyUrl) return Promise.reject(new Error('not_configured'));
    var hint = CFG.lang === 'en-US' ? 'en' : 'ur';
    return fetch(CFG.proxyUrl.replace(/\/$/, '') + '/stt?lang=' + hint, { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error((j && j.error) || ('http_' + r.status)); return { text: j.text || '', lang: j.lang || '' }; }); });
  }

  /* ---------- voice (female) ---------- */
  var voicesReady = null;
  function getVoices() {
    if (!window.speechSynthesis) return Promise.resolve([]);
    if (voicesReady) return voicesReady;
    voicesReady = new Promise(function (res) {
      var v = speechSynthesis.getVoices(); if (v.length) return res(v);
      var done = false; speechSynthesis.onvoiceschanged = function () { if (!done) { done = true; res(speechSynthesis.getVoices()); } };
      setTimeout(function () { if (!done) { done = true; res(speechSynthesis.getVoices()); } }, 1200);
    });
    return voicesReady;
  }
  var FEMALE = /female|woman|uzma|salma|zira|aria|jenny|samantha|karen|moira|tessa|fiona|victoria|allison|ava|susan|serena|libby|sonia|natasha|heera|kalpana|swara|neerja|google uk english female|google us english/i;
  var MALE = /\bmale\b|asad|david|mark|guy|daniel|alex|fred|george|ryan|rishi|prabhat|madhur/i;
  function pickVoice(voices, ur) {
    var pool = voices.filter(function (v) { return ur ? /^ur/i.test(v.lang) : /^en/i.test(v.lang); });
    if (!pool.length) return null;
    var f = pool.filter(function (v) { return FEMALE.test(v.name) && !MALE.test(v.name.replace(/female/i, '')); });
    if (f.length) return f.sort(function (a, b) { return (/natural|online|neural/i.test(b.name) ? 1 : 0) - (/natural|online|neural/i.test(a.name) ? 1 : 0); })[0];
    if (ur) { var notMale = pool.filter(function (v) { return !MALE.test(v.name); }); return notMale[0] || null; }
    return null;
  }
  function chunks(text, max) {
    var out = [], parts = text.replace(/\s+/g, ' ').match(/[^\u06D4.!?\u061F\u060C,;:]+[\u06D4.!?\u061F\u060C,;:]*/g) || [text];
    parts = parts.map(function (p) { return p.trim(); }).filter(Boolean);
    var cur = '';
    parts.forEach(function (p) {
      if ((cur + ' ' + p).trim().length <= max) cur = (cur + ' ' + p).trim();
      else { if (cur) out.push(cur); while (p.length > max) { var cut = p.lastIndexOf(' ', max); if (cut < 20) cut = max; out.push(p.slice(0, cut)); p = p.slice(cut).trim(); } cur = p; }
    });
    if (cur) out.push(cur);
    return out;
  }
  /* Greeting / fallback: speak a fixed text through the sentence player (backend voice per sentence, browser voice if that fails). */
  function speak(c, text) {
    var list = chunks(text, 160), q = player(c, CFG.proxyUrl && !c.cloudDown);
    list.forEach(function (s, i) {
      q.add(i, s);
      if (q.cloud) fetchTts(s).then(function (b) { q.audio(i, b); }, function () { q.fail(i); });
    });
    q.close(list.length);
    return q.done;
  }
  function speakLocal(c, text) {
    return getVoices().then(function (voices) {
      var v = pickVoice(voices, isUrdu(text));
      if (v) return speakBrowser(c, text, v);
      return wait(Math.min(6000, 600 + text.length * 45)); /* no voice at all: give them time to read the caption */
    });
  }
  function speakBrowser(c, text, voice) {
    return new Promise(function (res) {
      var u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.lang = voice.lang; u.rate = 1; u.pitch = 1.05;
      u.onend = u.onerror = function () { res(); };
      c.cancelSpeak = function () { try { speechSynthesis.cancel(); } catch (e) {} res(); };
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      c.voiceUsed = voice.name;
    });
  }
  function fetchTts(s) {
    var tl = isUrdu(s) ? 'ur' : 'en';
    return fetch(CFG.proxyUrl.replace(/\/$/, '') + '/tts?tl=' + tl + '&q=' + encodeURIComponent(s)).then(function (r) {
      if (!r.ok) throw new Error('tts_' + r.status);
      return r.blob();
    });
  }
  function b64Blob(b64, mime) {
    var bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: mime || 'audio/mpeg' });
  }
  /* Sentence player: sentences arrive one by one (text first, then their audio, possibly out of order) and are played
     strictly in order the moment each one's audio is ready. A sentence whose backend voice failed is fetched once more,
     then spoken with the browser's own voice. q.done resolves when everything was spoken or Ava was interrupted. */
  function player(c, cloud) {
    var items = [], idx = 0, total = -1, busy = false, stopped = false, url = null, resolveDone, a = c.audioEl;
    var q = { cloud: !!cloud, done: new Promise(function (r) { resolveDone = r; }), started: false };
    c.interrupted = false;
    function it(i) { return items[i] || (items[i] = {}); }
    function finish() {
      if (q.finished) return; q.finished = true; busy = false;
      if (url) { try { URL.revokeObjectURL(url); } catch (e) {} url = null; }
      if (c.player === q) c.player = null;
      resolveDone();
    }
    function started() {
      if (q.started) return; q.started = true;
      if (c.tm && !c.tm.play) { c.tm.play = performance.now(); logTiming(c); }
      if (c.phase !== 'speaking') { setMic(c, false); setPhase(c, 'speaking'); }
    }
    function next() { busy = false; idx++; pump(); }
    function local(s) {
      busy = true; started();
      speakLocal(c, s).then(function () { if (!stopped && !c.closed) next(); });
    }
    function playBlob(b, s) {
      busy = true;
      if (url) { try { URL.revokeObjectURL(url); } catch (e) {} }
      url = URL.createObjectURL(b);
      var failed = false;
      function bad() { if (failed || stopped) return; failed = true; c.ttsErrors = (c.ttsErrors || 0) + 1; local(s); }
      a.onended = function () { if (!stopped && !c.closed) next(); };
      a.onerror = bad;
      a.onplaying = function () { started(); };
      a.src = url;
      var p = a.play(); if (p && p.catch) p.catch(bad);
      c.voiceUsed = isUrdu(s) ? 'Uzma' : 'Ava';
    }
    function pump() {
      if (stopped || c.closed) return finish();
      if (busy) return;
      if (total >= 0 && idx >= total) return finish();
      var x = items[idx];
      if (!x || x.text == null) return;
      if (x.blob) return playBlob(x.blob, x.text);
      if (!q.cloud || x.local) return local(x.text);
      if (x.failed && !x.retry) {
        x.retry = true; c.ttsErrors = (c.ttsErrors || 0) + 1;
        fetchTts(x.text).then(function (b) { x.blob = b; pump(); }, function () { x.local = true; c.cloudDown = true; pump(); });
      }
    }
    q.add = function (i, text) { it(i).text = text; pump(); };
    q.audio = function (i, blob) { it(i).blob = blob; pump(); };
    q.fail = function (i) { it(i).failed = true; pump(); };
    q.close = function (n) {
      total = n;
      for (var i = 0; i < n; i++) if (items[i] && items[i].text != null && !items[i].blob && !items[i].failed && q.cloud && q.streamEnded) items[i].failed = true;
      pump();
    };
    q.stop = function () {
      stopped = true; c.interrupted = true;
      try { a.pause(); } catch (e) {}
      try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
      finish();
    };
    c.player = q;
    c.cancelSpeak = function () { q.stop(); };
    return q;
  }
  function logTiming(c) {
    var t = c.tm; if (!t || !t.play) return;
    var r = { speechEnd_to_firstAudio: Math.round(t.play - t.speechEnd), silenceWait: Math.round(t.stop - t.speechEnd),
      upload_to_heard: t.heard ? Math.round(t.heard - t.up) : null, heard_to_firstSentence: t.say1 && t.heard ? Math.round(t.say1 - t.heard) : null,
      firstSentence_to_audio: t.audio1 && t.say1 ? Math.round(t.audio1 - t.say1) : null, audio_to_playing: t.audio1 ? Math.round(t.play - t.audio1) : null, server: t.server || null };
    api._timings.push(r);
    if (window.console && console.debug) console.debug('[RaiVoiceAgent] turn timing', JSON.stringify(r));
  }

  /* ---------- listening (one mic stream, no SpeechRecognition) ---------- */
  function setMic(c, on) {
    /* The mic stays open for the call, but its tracks only carry sound while Ava is listening,
       so her own voice is never recorded back as the visitor's words. */
    try { c.stream && c.stream.getAudioTracks().forEach(function (t) { t.enabled = !!on; }); } catch (e) {}
    c.micOn = !!on;
  }
  var HALLUCINATION = /^(thank(s| you)( so much)?( for watching)?[.!]*|you|bye[.!]*|subscribe.*|subtitles?.*|\u0633\u0628\u0633\u06a9\u0631\u0627\u0626\u0628.*|\u0634\u06a9\u0631\u06cc\u06c1 \u062f\u06cc\u06a9\u06be\u0646\u06d2.*|[.\u06d4\u060c,!?\u061f\s]*)$/i;
  var BYE = /allah hafiz|\u0627\u0644\u0644\u06c1 \u062d\u0627\u0641\u0638|khuda hafiz|\u062e\u062f\u0627 \u062d\u0627\u0641\u0638|\bbye\b|goodbye/i;
  function listen(c) {
    if (c.closed) return;
    if (document.hidden) { setMic(c, false); setPhase(c, 'paused'); return; }   /* screen off: wait until it's back */
    setPhase(c, 'listening');
    setMic(c, true);
    listenRecord(c).then(function (blob) {
      if (c.closed || c.phase !== 'listening') return;
      if (!blob) return heardNothing(c);
      setMic(c, false);
      setPhase(c, 'thinking');
      return runTurn(c, blob);
    }).catch(function (e) { if (!c.closed) fail(c, e); });
  }
  function heardNothing(c) {
    c.silent = (c.silent || 0) + 1;
    if (c.silent >= 4) return endCall('Koi awaz nahi aayi, call band kar di. Dobara call kar sakte hain.');
    return listen(c);
  }
  /* One request per turn: the recording goes up, and back come (as lines of JSON, streamed) what Ava heard,
     her reply sentence by sentence, and each sentence's voice. Playback starts with the first ready sentence. */
  function runTurn(c, blob) {
    var base = CFG.proxyUrl.replace(/\/$/, ''), t = c.tm, cloud = !c.cloudDown;
    var fd = new FormData();
    fd.append('audio', blob, 'speech.' + (/mp4|m4a|aac/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm'));
    fd.append('messages', JSON.stringify(c.history.slice(-11)));
    fd.append('lang', CFG.lang === 'en-US' ? 'en' : 'ur');
    fd.append('tts', cloud ? '1' : '0');
    var q = null, heard = null, reply = '', bye = false, ended = false, nSay = 0;
    t.up = performance.now();
    return fetch(base + '/turn', { method: 'POST', body: fd }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error((j && j.error) || ('http_' + r.status)); });
      return readLines(r, function (o) {
        if (c.closed) return;
        if (o.t === 'heard') {
          t.heard = performance.now();
          var text = String(o.text || '').trim();
          if (HALLUCINATION.test(text)) text = '';
          heard = text; c.lastLang = o.lang || c.lastLang;
          if (!text) return;
          c.silent = 0;
          ui.caption.textContent = '\u201C' + text.slice(-160) + '\u201D';
          c.history.push({ role: 'user', content: text });
          bye = BYE.test(text);
          if (++c.turns > CFG.maxTurns) { endCall('Call ki limit poori. Baqi baat WhatsApp par karein.'); return; }
          q = player(c, cloud);
        } else if (o.t === 'say' && q) {
          if (!t.say1) t.say1 = performance.now();
          nSay = Math.max(nSay, (o.i || 0) + 1);
          reply += (reply ? ' ' : '') + o.text;
          ui.caption.textContent = reply;
          q.add(o.i, String(o.text || '').replace(/[*_#`>]/g, ''));
        } else if (o.t === 'audio' && q) {
          if (o.i === 0 && !t.audio1) t.audio1 = performance.now();
          q.audio(o.i, b64Blob(o.b64, o.mime));
        } else if (o.t === 'audio_err' && q) {
          q.fail(o.i);
        } else if (o.t === 'end') {
          ended = true; t.server = o.ms || null;
          if (q) { c.history.push({ role: 'assistant', content: o.text || reply }); q.streamEnded = true; q.close(o.n != null ? o.n : 0); }
        } else if (o.t === 'error') {
          throw new Error(o.error || 'turn_error');
        }
      });
    }).then(function () {
      if (c.closed) return;
      if (!heard) return heardNothing(c);
      if (!q) return;
      if (!ended) {                                     /* stream broke off: speak what arrived, or say sorry */
        q.streamEnded = true;
        if (!reply) { var sorry = isUrdu(heard) ? '\u0645\u0639\u0630\u0631\u062a\u060c \u062f\u0648\u0628\u0627\u0631\u06c1 \u0628\u062a\u0627\u0626\u06cc\u06d2\u061f' : 'Sorry, could you say that again?'; q.add(0, sorry); q.close(1); reply = sorry; }
        else q.close(nSay);
        c.history.push({ role: 'assistant', content: reply });
      }
      return q.done.then(function () {
        if (c.closed) return;
        if (bye) return endCall('Shukriya! Allah Hafiz.');
        return wait(c.interrupted ? 80 : 250).then(function () { if (!c.closed) listen(c); });  /* let the last echo die away */
      });
    });
  }
  /* Read a streamed response line by line (NDJSON); falls back to reading it whole on old browsers. */
  function readLines(r, onLine) {
    function handle(line) { line = line.trim(); if (!line) return; var o; try { o = JSON.parse(line); } catch (e) { return; } onLine(o); }
    if (!r.body || !r.body.getReader || !window.TextDecoder) return r.text().then(function (s) { s.split('\n').forEach(handle); });
    var rd = r.body.getReader(), dec = new TextDecoder(), buf = '';
    return (function pull() {
      return rd.read().then(function (x) {
        if (x.done) { buf += dec.decode(); handle(buf); return; }
        buf += dec.decode(x.value, { stream: true });
        var k; while ((k = buf.indexOf('\n')) >= 0) { var line = buf.slice(0, k); buf = buf.slice(k + 1); handle(line); }
        return pull();
      });
    })();
  }
  function respond(c, reply, bye) {
    setMic(c, false);
    setPhase(c, 'speaking');
    ui.caption.textContent = reply;
    speak(c, reply).then(function () {
      if (c.closed) return;
      if (bye) return endCall('Shukriya! Allah Hafiz.');
      return wait(c.interrupted ? 80 : 250).then(function () { if (!c.closed) listen(c); });  /* let the last echo die away */
    });
  }
  function stopListening(c) {
    try { if (c.vadTimer) { clearInterval(c.vadTimer); c.vadTimer = null; } } catch (e) {}
    try { c.recorder && c.recorder.state !== 'inactive' && (c.recorder._discard = true, c.recorder.stop()); } catch (e) {}
  }
  function recType() {
    return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'].filter(function (t) {
      return window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t);
    })[0] || '';
  }
  /* Record one utterance from the call's mic stream: starts on voice, stops after ~0.65 s of silence
     (adaptive to background noise). Resolves the recording (a Blob), or null when nobody spoke. */
  function listenRecord(c) {
    if (!window.MediaRecorder) return Promise.reject(new Error('no_recorder'));
    var VAD = { tick: 40, endSilence: 650, minSpeech: 250, maxUtter: 20000, noSpeech: 9000, armQuiet: 150, armMax: 3000 };
    return new Promise(function (res, rej) {
      var type = recType(), data = new Uint8Array(1024), settled = false;
      var t0 = performance.now(), floor = 0.006, armed = false, quietMs = 0;
      var rec, parts, speechMs, silenceMs, inSpeech, startedAt, lastLoud = 0, stopAt = 0;
      function done(v, isErr) { if (settled) return; settled = true; clearInterval(c.vadTimer); c.vadTimer = null; (isErr ? rej : res)(v); }
      function begin() {
        parts = []; speechMs = 0; silenceMs = 0; inSpeech = false; startedAt = 0;
        try { rec = new MediaRecorder(c.stream, type ? { mimeType: type } : undefined); }
        catch (e) { try { rec = new MediaRecorder(c.stream); } catch (e2) { return done(new Error('no_recorder'), true); } }
        c.recorder = rec;
        rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
        rec.onstop = function () {
          if (c.recorder === rec) c.recorder = null;
          if (rec._discard || settled) return;
          if (rec._restart) return begin();
          clearInterval(c.vadTimer); c.vadTimer = null;
          if (speechMs < VAD.minSpeech) return done(null);
          setMic(c, false);
          ui.hint.textContent = 'Soch rahi hoon\u2026';
          c.tm = { speechEnd: lastLoud || performance.now(), stop: stopAt || performance.now() };
          done(new Blob(parts, { type: (rec.mimeType || type || 'audio/webm').split(';')[0] }));
        };
        rec.start(250);
      }
      function level() {
        if (!c.micAn) return -1;
        c.micAn.getByteTimeDomainData(data);
        var sum = 0; for (var i = 0; i < data.length; i++) { var v = (data[i] - 128) / 128; sum += v * v; }
        return Math.sqrt(sum / data.length);
      }
      begin();
      c.vadTimer = setInterval(function () {
        if (c.closed || settled) { clearInterval(c.vadTimer); return; }
        if (!rec || rec.state !== 'recording') return;
        var now = performance.now(), rms = level();
        if (rms < 0) {                                   /* no analyser (very old browser): fixed 6 s turn */
          speechMs = VAD.minSpeech; if (now - t0 > 6000) { stopAt = lastLoud = now; rec.stop(); } return;
        }
        var thr = Math.min(0.08, Math.max(0.015, floor * 3)), loud = rms > thr, quiet = rms < thr * 0.7;
        if (!loud) floor += (Math.min(rms, 0.05) - floor) * 0.05;             /* learn the room's noise */
        if (!armed) {                                   /* wait for a short quiet so Ava's echo tail isn't taken as speech */
          quietMs = quiet ? quietMs + VAD.tick : 0;
          if (quietMs >= VAD.armQuiet || now - t0 > VAD.armMax) armed = true; else return;
        }
        if (loud) { inSpeech = true; speechMs += VAD.tick; silenceMs = 0; lastLoud = now; if (!startedAt) startedAt = now; c.heard = true; }
        else if (inSpeech && quiet) silenceMs += VAD.tick;
        if (inSpeech && silenceMs >= VAD.endSilence) {
          if (speechMs >= VAD.minSpeech) { stopAt = now; rec.stop(); return; }
          rec._restart = true; rec.stop(); return;      /* a short click or cough: start a fresh recording */
        }
        if (startedAt && now - startedAt > VAD.maxUtter) { stopAt = now; rec.stop(); return; }
        if (!startedAt && now - t0 > VAD.noSpeech) { rec._discard = true; rec.stop(); done(null); }
      }, VAD.tick);
    });
  }

  /* ---------- the call ---------- */
  var call = null;

  function explain(e) {
    var name = String(e && e.name || ''), t = String(e && (e.message || e) || '').toLowerCase();
    if (name === 'NotAllowedError' || name === 'SecurityError' || /mic_denied|permission/.test(t)) return 'MIC_DENIED';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Is device par microphone nahi mila. WhatsApp par baat karein.';
    if (name === 'NotReadableError' || name === 'AbortError') return 'Microphone kisi aur app (call, recorder ya Google) mein chal raha hai. Use band karke dobara try karein, ya WhatsApp par baat karein.';
    if (/not_configured/.test(t)) return 'Voice agent abhi setup ho raha hai. Tab tak WhatsApp par baat karein.';
    if (/busy|slow_down|429/.test(t)) return CFG.agentName + ' abhi bohat busy hai. WhatsApp par baat karein, hum foran jawab dein ge.';
    if (/no_recorder|unsupported/.test(t)) return 'Ye browser voice call support nahi karta. Chrome use karein, ya WhatsApp par baat karein.';
    if (/failed to fetch|network|load failed/.test(t)) return 'Internet connection ka masla lag raha hai. Dobara try karein ya WhatsApp par baat karein.';
    return 'Call connect nahi ho saki. Thori dair baad dobara try karein ya WhatsApp par baat karein.';
  }
  function fail(c, e) {
    if (window.console) console.warn('[RaiVoiceAgent]', e);
    var msg = explain(e); teardown(c);
    if (msg === 'MIC_DENIED') showMicDenied(); else showError(msg);
  }

  /* ---------- keep the screen on during a call ---------- */
  function keepAwake(c) {
    if (c.closed || c.wake || document.hidden) return;
    if (navigator.wakeLock && navigator.wakeLock.request) {
      c.wake = 'pending';
      navigator.wakeLock.request('screen').then(function (s) {
        if (c.closed || call !== c) { s.release().catch(function () {}); return; }
        c.wake = s;
        s.addEventListener('release', function () { if (c.wake === s) c.wake = null; });
      }, function (e) { c.wake = null; if (window.console) console.warn('[RaiVoiceAgent] wake lock', e && e.name); noSleepVideo(c); });
    } else noSleepVideo(c);
  }
  function noSleepVideo(c) {      /* browsers without Wake Lock: a tiny muted looping video keeps the screen awake */
    if (c.closed) return;
    try {
      if (!c.nosleep) {
        var v = document.createElement('video');
        v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.muted = true; v.loop = true; v.setAttribute('aria-hidden', 'true');
        v.style.cssText = 'position:fixed;left:-10px;top:-10px;width:1px;height:1px;opacity:0;pointer-events:none';
        v.src = NOSLEEP_MP4; document.body.appendChild(v); c.nosleep = v;
      }
      var p = c.nosleep.play(); if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function releaseAwake(c) {
    var s = c.wake; c.wake = null;
    try { if (s && s.release) s.release().catch(function () {}); } catch (e) {}
    try { if (c.nosleep) { c.nosleep.pause(); c.nosleep.removeAttribute('src'); c.nosleep.load(); c.nosleep.remove(); c.nosleep = null; } } catch (e) {}
  }
  function attachMic(c, stream) {
    c.stream = stream;
    stream.getAudioTracks().forEach(function (t) {
      t.addEventListener('ended', function () {
        if (c.closed || c.stream !== stream) return;
        if (document.hidden || c.phase === 'paused') { c.micLost = true; return; }   /* phone took the mic while screen was off: get it back later */
        fail(c, new Error('mic_ended'));
      });
    });
    if (c.ctx) {
      try { if (c.ctx.state !== 'running' && c.ctx.resume) c.ctx.resume().catch(function () {}); c.micAn = c.ctx.createAnalyser(); c.micAn.fftSize = 1024; c.ctx.createMediaStreamSource(stream).connect(c.micAn); }
      catch (e) { c.micAn = null; }
    }
  }
  var MIC_OPTS = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } };
  /* page visible again after being hidden: re-take the screen lock and the mic if needed, then listen again */
  function resumeCall(c) {
    if (c.closed) return;
    keepAwake(c);
    try { if (c.ctx && c.ctx.state !== 'running' && c.ctx.resume) c.ctx.resume().catch(function () {}); } catch (e) {}
    var dead = !c.stream || c.micLost || c.stream.getAudioTracks().some(function (t) { return t.readyState === 'ended'; });
    var ready = dead ? navigator.mediaDevices.getUserMedia(MIC_OPTS).then(function (s) {
      if (c.closed) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      try { c.stream && c.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      c.micLost = false; attachMic(c, s); setMic(c, false);
    }) : Promise.resolve();
    ready.then(function () {
      if (c.closed || c.phase !== 'paused' || document.hidden) return;
      ui.caption.textContent = CFG.lang === 'en-US' ? "I'm back, go ahead." : '\u062c\u06cc\u060c \u0645\u06cc\u06ba \u0633\u0646 \u0631\u06c1\u06cc \u06c1\u0648\u06ba\u06d4';
      wait(150).then(function () { if (!c.closed && c.phase === 'paused' && !document.hidden) listen(c); });
    }, function (e) { fail(c, e); });
  }

  function startCall() {
    if (call) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      showError('Ye browser voice call support nahi karta. Chrome ya Safari ka naya version use karein, ya WhatsApp par baat karein.');
      return;
    }
    if (!CFG.proxyUrl && !api._mock) { showError(explain(new Error('not_configured'))); return; }
    var c = call = { history: [], turns: 0, closed: false, phase: 'connecting' };
    setState('connecting', 'Connecting\u2026');
    keepAwake(c);                                      /* keep the screen on for the whole call (phones dim and lock otherwise) */
    warmUp();
    /* mic already blocked for this site: show the Urdu help screen straight away */
    try {
      if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'microphone' }).then(function (p) {
        if (p && p.state === 'denied' && call === c && !c.stream) { var e = new Error('mic_denied'); e.name = 'NotAllowedError'; fail(c, e); }
      }, function () {});
    } catch (e) {}
    ui.caption.textContent = CFG.agentName + ' se connect kar rahe hain\u2026';
    /* audio element + audio context must be created inside the tap (iPhone/Android autoplay rules) */
    c.audioEl = new Audio(); c.audioEl.preload = 'auto'; c.audioEl.setAttribute('playsinline', '');
    try { c.audioEl.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='; c.audioEl.play().catch(function () {}); } catch (e) {}
    try { if (window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) {}
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      try {
        c.ctx = new Ctx(); if (c.ctx.resume) c.ctx.resume().catch(function () {});
        c.outAn = c.ctx.createAnalyser(); c.outAn.fftSize = 1024;
        var ms = c.ctx.createMediaElementSource(c.audioEl); ms.connect(c.outAn); c.outAn.connect(c.ctx.destination);
      } catch (e) { c.outAn = null; }
    }
    navigator.mediaDevices.getUserMedia(MIC_OPTS).then(function (stream) {
      if (c.closed) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      attachMic(c, stream);
      setMic(c, false);                                 /* off until Ava finishes her greeting */
      c.t0 = performance.now();
      setState('live', "You're live 0:00");
      c.timer = setInterval(function () {
        var sec = (performance.now() - c.t0) / 1000;
        ui.status.textContent = "You're live " + fmtTime(sec);
        if (sec > CFG.maxCallSeconds) endCall('Call ki time limit poori ho gayi. Dobara call kar sakte hain.');
      }, 500);
      draw(c);
      var greet = CFG.lang === 'en-US' ? GREETING_EN : GREETING;
      c.history.push({ role: 'assistant', content: greet });
      respond(c, greet, false);
    }).catch(function (e) { fail(c, e); });
  }

  function interrupt(c) {
    if (c.cancelSpeak) c.cancelSpeak();
  }

  function draw(c) {
    var cv = ui.wave, g = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2), data = new Uint8Array(512), bars = 48, sm = new Float32Array(bars), tt = 0;
    (function frame() {
      if (c.closed) return;
      var w = Math.round(cv.clientWidth * dpr) || 600, h = Math.round(cv.clientHeight * dpr) || 90;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      g.clearRect(0, 0, w, h); tt += 1;
      var lvl = 0, vals = new Float32Array(bars);
      if (c.phase === 'speaking' && c.outAn && !c.cloudDown && CFG.proxyUrl) {
        c.outAn.getByteTimeDomainData(data);
        for (var k0 = 0; k0 < 512; k0++) lvl = Math.max(lvl, Math.abs(data[k0] - 128) / 128);
        for (var b0 = 0; b0 < bars; b0++) vals[b0] = Math.min(1, Math.abs(data[Math.floor(b0 * 512 / bars)] - 128) / 128 * 3.2);
      } else if (c.phase === 'speaking') {
        for (var b = 0; b < bars; b++) vals[b] = 0.25 + 0.55 * Math.abs(Math.sin(tt / 7 + b * 0.45) * Math.sin(tt / 11 + b * 0.17)) + Math.random() * 0.2;
        lvl = 0.45 + 0.3 * Math.abs(Math.sin(tt / 9));
      } else if (c.micAn && c.phase === 'listening') {
        c.micAn.getByteTimeDomainData(data);
        for (var k = 0; k < 512; k++) lvl = Math.max(lvl, Math.abs(data[k] - 128) / 128);
        for (var b2 = 0; b2 < bars; b2++) vals[b2] = Math.min(1, Math.abs(data[Math.floor(b2 * 512 / bars)] - 128) / 128 * 3.2);
      } else if (c.phase === 'thinking') {
        for (var b3 = 0; b3 < bars; b3++) vals[b3] = 0.08 + 0.12 * Math.max(0, Math.sin(tt / 6 - b3 * 0.3));
      }
      for (var s = 0; s < bars; s++) sm[s] += (Math.max(0.04, vals[s]) - sm[s]) * 0.35;
      ui.orb.style.setProperty('--lvl', Math.min(1, lvl * 1.6).toFixed(3));
      var grad = g.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#22d3ee'); grad.addColorStop(0.5, '#a78bfa'); grad.addColorStop(1, '#f4cf7c');
      g.strokeStyle = grad; g.lineWidth = 2.2 * dpr; g.lineCap = 'round'; g.beginPath();
      var step = w / bars;
      for (var q = 0; q < bars; q++) { var amp = sm[q] * h * 0.44, x = q * step + step / 2; g.moveTo(x, h / 2 - amp); g.lineTo(x, h / 2 + amp); }
      g.stroke();
      c.raf = requestAnimationFrame(frame);
    })();
  }

  function teardown(c) {
    if (!c || c.closed) return;
    c.closed = true;
    clearInterval(c.timer); clearTimeout(c.hideTimer); if (c.raf) cancelAnimationFrame(c.raf);
    releaseAwake(c);
    if (c.cancelSpeak) c.cancelSpeak();
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
    stopListening(c);
    try { c.audioEl && c.audioEl.pause(); } catch (e) {}
    try { c.stream && c.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}   /* release the mic completely */
    c.stream = null; c.micOn = false;
    try { c.ctx && c.ctx.close(); } catch (e) {}
    ui.card.removeAttribute('data-phase');
    ui.orb.style.setProperty('--lvl', 0);
    try { ui.wave.getContext('2d').clearRect(0, 0, ui.wave.width, ui.wave.height); } catch (e) {}
    if (call === c) call = null;
  }
  function endCall(msg) {
    var c = call; if (!c) return;
    teardown(c);
    setState('ended', 'Call ended');
    ui.caption.textContent = msg || 'Call ended. Shukriya!';
  }

  var api = {
    config: CFG, chat: chat, open: open, close: close, start: startCall, end: endCall, _mock: false,
    _state: function () { return call ? { phase: call.phase, turns: call.turns, history: call.history.length, voice: call.voiceUsed, ttsErrors: call.ttsErrors || 0, sr: false, micOn: !!call.micOn, recording: !!(call.recorder && call.recorder.state === 'recording'), wakeLock: !!(call.wake && call.wake !== 'pending'), noSleepVideo: !!call.nosleep, last: call.history.slice(-2) } : null; },
    _timings: []
  };
  window.RaiVoiceAgent = api;

  /* Screen off / app switched: don't hang up. Pause listening (Ava finishes what she is saying), and carry on when the
     page is visible again. Only a long absence (60 s) ends the call; End call or leaving the page always does. */
  document.addEventListener('visibilitychange', function () {
    var c = call; if (!c || c.closed) return;
    if (document.hidden) {
      clearTimeout(c.hideTimer);
      c.hideTimer = setTimeout(function () {
        if (call === c && document.hidden) endCall('Screen kaafi der band rahi, is liye call band kar di. Dobara call kar sakte hain.');
      }, CFG.hiddenGraceSeconds * 1000);
      if (c.phase === 'listening') { stopListening(c); setMic(c, false); setPhase(c, 'paused'); }
    } else {
      clearTimeout(c.hideTimer); c.hideTimer = null;
      keepAwake(c);                                    /* the browser drops the screen lock whenever the page is hidden */
      try { if (c.ctx && c.ctx.state !== 'running' && c.ctx.resume) c.ctx.resume().catch(function () {}); } catch (e) {}
      if (c.phase === 'paused') resumeCall(c);
    }
  });
  window.addEventListener('pagehide', function () { if (call) endCall(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI); else buildUI();
})();
