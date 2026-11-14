/* Rehman AI Services - "Ava" free AI voice agent (female voice, Urdu/English).
   No Firebase, no paid platform:
     listen  -> one microphone stream for the whole call; each turn is recorded with MediaRecorder, cut by simple
                voice-activity detection (~0.65 s of silence), and sent to the backend in ONE request (/turn) that
                transcribes it (Whisper), streams the AI reply sentence by sentence and sends each sentence's voice
                as soon as it is ready, so Ava starts talking while the rest of her reply is still being made. The browser's
                SpeechRecognition is deliberately NOT used: on Android Chrome it hands the mic to the Google app, which
                cannot record while the page holds the mic ("...cannot record now as Chrome is recording").
     think   -> Ava's backend (free AI model; the API key stays on the server, never in this file)
     speak   -> natural female voice from the backend: ElevenLabs "Sarah" first; when that is unavailable (limit used up, error,
                slow) the free Microsoft voices (Urdu: "Uzma", English: "Ava"); the browser's own voice as a last fallback
   End: the red "Call khatam karein / End call" button (always on screen, inside the card AND as a fixed button at the bottom of the screen), the X, or saying "call band karo" / "Allah Hafiz".
   Turn-taking (no-interrupt): Ava waits 1.2 s of silence before she takes an answer as finished (longer during booking), and if the visitor goes on talking while she is thinking, that extra speech is merged into the same answer instead of Ava replying mid-sentence. While she speaks, only the voice commands "chup karo" / "call band karo" stop her - ordinary speech over her does not cut her off, and she never starts a reply while the visitor is still talking.
   Voice commands (checked on the transcript before any AI or voice): "call band karo" / "Allah Hafiz" ends the call,
   "chup karo" puts Ava on hold (silent, call stays open), "shuru karo" brings her back. While she speaks, the mic
   only listens for these commands, so "chup karo" works mid-sentence while her own voice can't cut her off.
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
      ' <div class="rai-va-book" hidden role="status" aria-live="polite">' +
      '  <button type="button" class="rai-va-book-x" aria-label="Close booking card">&times;</button>' +
      '  <div class="rai-va-book-hd"><span class="rai-va-book-ok" aria-hidden="true">&#10003;</span><b>Appointment booked</b></div>' +
      '  <dl class="rai-va-book-dl"><dt>Naam</dt><dd data-k="name"></dd><dt>Din</dt><dd data-k="date"></dd><dt>Waqt</dt><dd data-k="time"></dd><dt>Kaam</dt><dd data-k="req"></dd></dl>' +
      '  <a class="rai-va-book-wa" href="#" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.03c-.25.69-1.44 1.32-1.98 1.4-.51.08-1.15.11-1.86-.12-.43-.14-.98-.32-1.68-.62-2.96-1.28-4.89-4.26-5.04-4.46-.15-.2-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46c.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.25.59.84 2.04.91 2.19.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.39-.45.52-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.06 1.13 1.01 2.09 1.32 2.39 1.47.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.39-.25.67-.15.27.1 1.73.82 2.03.97.3.15.49.22.57.35.07.12.07.71-.18 1.4z"/></svg>WhatsApp par confirm karein</a>' +
      '  <small class="rai-va-book-id"></small>' +
      ' </div>' +
      ' <div class="rai-va-err" hidden></div>' +
      ' <div class="rai-va-lang" role="group" aria-label="Language"><button type="button" data-l="ur-PK" aria-pressed="true">\u0627\u0631\u062f\u0648</button><button type="button" data-l="en-US" aria-pressed="false">English</button></div>' +
      ' <div class="rai-va-ctrls">' +
      '  <button type="button" class="rai-va-start">Start talking</button>' +
      '  <button type="button" class="rai-va-end" hidden aria-label="Call khatam karein (End call)"><span class="rai-va-end-ic"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg></span><span class="rai-va-end-lb">Call khatam karein <small>End call</small></span></button>' +
      ' </div>' +
      ' <a class="rai-va-wa" href="https://wa.me/' + CFG.whatsapp + '" target="_blank" rel="noopener" hidden>Chat on WhatsApp instead</a>' +
      ' <p class="rai-va-fine">Free AI voice call &middot; uses your microphone</p>' +
      '</div>';
    document.body.appendChild(btn);
    document.body.appendChild(ov);
    var endFab = el('button', 'rai-va-end-fab');
    endFab.type = 'button';
    endFab.hidden = true;
    endFab.setAttribute('aria-label', 'Call khatam karein (End call)');
    endFab.textContent = '\u2715  Call khatam karein';
    endFab.addEventListener('click', function () { endCall('Call ended. Shukriya!'); });
    ov.appendChild(endFab);
    if (CFG.proxyUrl) { try { var pc = document.createElement('link'); pc.rel = 'preconnect'; pc.href = CFG.proxyUrl.replace(/\/$/, ''); pc.crossOrigin = 'anonymous'; document.head.appendChild(pc); } catch (e) {} }
    btn.addEventListener('pointerdown', warmUp, { passive: true });
    ui = {
      btn: btn, ov: ov, card: ov.querySelector('.rai-va-card'), status: ov.querySelector('.rai-va-status'),
      stage: ov.querySelector('.rai-va-stage'), orb: ov.querySelector('.rai-va-orb'), wave: ov.querySelector('.rai-va-wave'),
      hint: ov.querySelector('.rai-va-hint'), caption: ov.querySelector('.rai-va-caption'), err: ov.querySelector('.rai-va-err'),
      start: ov.querySelector('.rai-va-start'), end: ov.querySelector('.rai-va-end'), endFab: ov.querySelector('.rai-va-end-fab'), wa: ov.querySelector('.rai-va-wa'),
      x: ov.querySelector('.rai-va-x'), langBtns: ov.querySelectorAll('.rai-va-lang button'),
      book: ov.querySelector('.rai-va-book'), bookWa: ov.querySelector('.rai-va-book-wa')
    };
    ov.querySelector('.rai-va-book-x').addEventListener('click', hideBooking);
    ui.start.addEventListener('click', startCall);
    ui.end.addEventListener('click', function () { endCall('Call ended. Shukriya!'); });
    ui.x.addEventListener('click', close);
    ui.stage.addEventListener('click', function () { if (call && call.phase === 'speaking') interrupt(call); else if (call && call.quiet && call.phase === 'quiet') { stopListening(call); resumeTalk(call); } });
    Array.prototype.forEach.call(ui.langBtns, function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-l')); });
    });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('is-open')) close(); });
  }

  /* Booking confirmation card: what was booked, and a WhatsApp button that sends the details to the business number. */
  function showBooking(b) {
    if (!b || !ui.book) return;
    var set = function (k, v) { var d = ui.book.querySelector('[data-k="' + k + '"]'); if (d) d.textContent = v || '-'; };
    set('name', b.name_roman || b.name);
    set('date', b.date_label || b.date); set('time', b.time_label || b.time); set('req', b.requirement_ur && isUrdu(b.requirement_ur) && (b.lang ? b.lang !== 'en' : CFG.lang !== 'en-US') ? b.requirement_ur : b.requirement);
    var wa = String(b.wa_url || '');
    ui.bookWa.href = /^https:\/\/wa\.me\//.test(wa) ? wa : 'https://wa.me/' + CFG.whatsapp;
    ui.book.querySelector('.rai-va-book-id').textContent = b.id ? 'Booking ID: ' + b.id : '';
    ui.book.hidden = false; ui.card.setAttribute('data-booked', '1');
    try { ui.book.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }
  function hideBooking() { if (ui.book) { ui.book.hidden = true; ui.card.removeAttribute('data-booked'); } }

  function setLang(l) {
    CFG.lang = l;
    if (call) { call.lang = l === 'en-US' ? 'en' : 'ur'; call.langOther = 0; }   /* the visitor picked the language: keep it for the call */
    Array.prototype.forEach.call(ui.langBtns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-l') === l)); });
    if (call && call.phase === 'listening') { stopListening(call); call.lastLang = null; listen(call); }
  }
  function setState(s, statusText) {
    ui.card.setAttribute('data-state', s);
    if (statusText != null) ui.status.textContent = statusText;
    var live = (s === 'live' || s === 'connecting');
    ui.start.hidden = live; ui.end.hidden = !live;
    if (ui.endFab) ui.endFab.hidden = !live;
    ui.x.setAttribute('aria-label', live ? 'End call' : 'Close');
    if (s !== 'error') { ui.err.hidden = true; ui.wa.hidden = true; ui.card.removeAttribute('data-err'); }
    ui.start.textContent = (s === 'ended' || s === 'error') ? 'Call again' : 'Start talking';
    if (!live) ui.hint.textContent = '';
  }
  function setPhase(c, p) {
    var was = c.phase;
    c.phase = p; ui.card.setAttribute('data-phase', p);
    if (p === 'speaking' || p === 'listening' || p === 'quiet') stopTail(c);
    if (p !== 'speaking') {
      /* the visitor is mid-sentence as Ava finishes: keep that recording and take it as their answer */
      if (was === 'speaking' && p === 'listening' && c.bargeOn && c.bargeSpeech && inBooking(c)) c.bargeHandoff = true; else stopBarge(c);
    }
    else if (was !== 'speaking') { c.bargeChecks = 0; startBarge(c); }
    ui.hint.textContent = p === 'listening' ? (CFG.lang === 'en-US' ? 'Listening\u2026 speak now' : 'Sun rahi hoon\u2026 bolein') :
      p === 'thinking' ? 'Soch rahi hoon\u2026' : p === 'speaking' ? 'Ava bol rahi hai \u00b7 khatam hone ka intezar karein, ya End call dabayein' :
      p === 'paused' ? 'Call hold par hai \u00b7 screen on karein, Ava phir sunegi' :
      p === 'quiet' ? (CFG.lang === 'en-US' ? 'Ava is quiet \u00b7 say \u201cstart\u201d' : 'Ava chup hai \u00b7 \u2018shuru karo\u2019 bolein') : '';
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
  var lastTtsVoice = '';
  function fetchTts(s) {
    var tl = isUrdu(s) ? 'ur' : 'en';
    return fetch(CFG.proxyUrl.replace(/\/$/, '') + '/tts?tl=' + tl + '&q=' + encodeURIComponent(s)).then(function (r) {
      if (!r.ok) throw new Error('tts_' + r.status);
      lastTtsVoice = r.headers.get('X-Ava-Voice') || '';
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
  var HALLUCINATION = /\u062a\u0631\u062c\u0645\u0629|\u0646\u0627\u0646\u0633\u064a|amara\.org|^(thank(s| you)( so much)?( for watching)?[.!]*|you|bye[.!]*|subscribe.*|subtitles?.*|\u0633\u0628\u0633\u06a9\u0631\u0627\u0626\u0628.*|\u0634\u06a9\u0631\u06cc\u06c1 \u062f\u06cc\u06a9\u06be\u0646\u06d2.*|[.\u06d4\u060c,!?\u061f\s]*)$/i;
  /* Voice commands (Roman Urdu, Urdu script, Hindi script, English), matched on the transcript before any AI or voice:
     'bye' ends the call, 'quiet' puts Ava on hold (silent, call stays open), 'resume' brings her back (only while quiet). */
  var CMD_BYE = new RegExp(['allah\\s*ha+fi[zs]', 'khuda\\s*ha+fi[zs]', 'fi\\s*aman\\s*allah', '\\bbye\\b', 'good\\s*-?bye', '\\bhang\\s*up\\b', '\\bend\\s*(the\\s*)?call\\b',
    '\\bcall\\s*(ko\\s*)?(band|khatam|khatm|khtm|end|cut|off|bnd)\\b', '\\b(band|khatam|khatm|end|cut)\\s*(karo|kardo|kar\\s*do|karein|kar\\s*dein|kardein|kijiye|kr\\s*do|krdo)\\s*call\\b',
    '(\u0627\u0644\u0644\u06c1|\u0627\u0644\u0644\u0647|\u0627\u0644\u0644\u0651\u0670\u06c1|\u0627\u0644\u0644\u0651\u0647|\u062e\u062f\u0627)\\s*\u062d\u0627\u0641\u0638',
    '\u06a9\u0627\u0644\\s*(\u06a9\u0648\\s*)?(\u0628\u0646\u062f|\u062e\u062a\u0645|\u0627\u06cc\u0646\u0688|\u06a9\u0627\u0679)',
    '(\u0628\u0646\u062f|\u062e\u062a\u0645)\\s*\u06a9\u0631\\s*(\u062f\u0648|\u062f\u06cc\u06ba|\u062f\u06cc\u062c\u06cc\u06d2)\\s*\u06a9\u0627\u0644',
    '\u0628\u0627\u0626\u06d2|\u0628\u0627\u0626\u06cc\\s*\u0628\u0627\u0626\u06cc|\u06af\u0688\\s*\u0628\u0627\u0626\u06d2',
    '\u0905\u0932\u094d\u0932\u093e\u0939\\s*\u0939\u093e\u092b\u093c?\u093f\u091c\u093c?|\u0916\u0941\u0926\u093e\\s*\u0939\u093e\u092b\u093c?\u093f\u091c\u093c?|\u0915\u0949\u0932\\s*(\u092c\u0902\u0926|\u0916\u093c?\u0924\u094d\u092e)'].join('|'), 'i');
  var CMD_QUIET = new RegExp(['\\bchu+p\\b', '\\bkha+mo+sh\\b', '\\bru+k\\s*(jao|ja|jaen|jayen|jaiye|jaein|jain)\\b', '\\bruko\\b', '\\brukiye\\b', '\\bstop\\b', '\\bshut\\s*up\\b', '\\bbe\\s*quiet\\b', '\\bquiet\\b', '\\bmute\\b',
    '\\bhold\\s*(par|pe|on)?\\s*(karo|kar\\s*do|rakho|kardo)?\\b', '^(acha\\s*|ok\\s*|theek\\s*hai\\s*|ava\\s*)?bas\\s*(karo|kar\\s*do|kardo|kro|kr\\s*do|kar|ava)?$', '^(ok\\s*)?wait(\\s*karo|\\s*kro)?$',
    '\u0686\u067e', '\u062e\u0627\u0645\u0648\u0634', '\u0631\u06a9\\s*\u062c\u0627', '\u0631\u06a9\u0648', '\u0631\u06a9\u06cc\u06ba', '\u0631\u06a9\u06cc\u06d2', '\u0628\u0633\\s*\u06a9\u0631', '^(\u0627\u0686\u06be\u0627\\s*|\u0628\u0633\\s*)?\u0628\u0633$', '\u0633\u0679\u0627\u067e', '\u0627\u0633\u0679\u0627\u067e', '\u06c1\u0648\u0644\u0688',
    '\u091a\u0941\u092a', '\u0916\u093c?\u093e\u092e\u094b\u0936', '\u0930\u0941\u0915', '\u092c\u0938\\s*\u0915\u0930', '\u0938\u094d\u091f\u0949\u092a'].join('|'), 'i');
  var CMD_RESUME = new RegExp(['\\bshu?r[ou]o?\\b', '\\bshuru\\b', '\\bshoru\\b', '\\bstart\\b', '\\bchalo\\b', '\\bchaliye\\b', '\\bbolo\\b', '\\bboliye\\b', '\\bbolein\\b', '\\bbolen\\b', '\\bdobara\\b', '\\bcontinue\\b', '\\bresume\\b', '\\bgo\\s*on\\b', '\\bcarry\\s*on\\b', '\\bunmute\\b', '\\bbaat\\s*karo\\b',
    '\u0634\u0631\u0648\u0639', '\u0633\u0679\u0627\u0631\u0679', '\u0627\u0633\u0679\u0627\u0631\u0679', '\u0686\u0644\u0648', '\u0686\u0644\u06cc\u06ba', '\u0686\u0644\u06cc\u06d2', '\u0628\u0648\u0644\u0648', '\u0628\u0648\u0644\u06cc\u06ba', '\u0628\u0648\u0644\u06cc\u06d2', '\u062f\u0648\u0628\u0627\u0631\u06c1',
    '\u0936\u0941\u0930\u0942', '\u092c\u094b\u0932\u094b', '\u091a\u0932\u094b', '\u0938\u094d\u091f\u093e\u0930\u094d\u091f'].join('|'), 'i');
  function cmdOf(text, quiet) {
    var t = String(text || '').toLowerCase().replace(/[.,!?\u061f\u06d4\u060c"'\u201c\u201d\u2019:;-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 48) return '';
    if (CMD_BYE.test(t)) return 'bye';
    if (quiet && CMD_RESUME.test(t) && !/\bstop\b|\u0633\u0679\u0627\u067e|\u0686\u067e|\bchu+p\b/.test(t)) return 'resume';
    if (CMD_QUIET.test(t)) return 'quiet';
    return '';
  }
  var BYE = CMD_BYE;
  function listen(c) {
    if (c.closed || c.byeing) return;
    if (document.hidden) { setMic(c, false); setPhase(c, 'paused'); return; }   /* screen off: wait until it's back */
    if (c.quiet) return listenQuiet(c);
    setPhase(c, 'listening');
    if (c.bargeHandoff) return;                          /* that recording is still going: its result decides what comes next */
    stopListening(c);                                    /* never two listening recordings at once */
    setMic(c, true); c.listenSpeech = false;
    listenRecord(c, { endSilence: pauseMs(c), minSpeech: inBooking(c) ? 150 : 250, maxUtter: inBooking(c) ? 15000 : 12000 }).then(function (blob) {
      if (c.closed || c.phase !== 'listening') return;
      if (!blob) return heardNothing(c);
      setMic(c, false);
      setPhase(c, 'thinking');
      return runTurn(c, blob);
    }).catch(function (e) { if (!c.closed) softFail(c, e); });
  }
  /* Quiet / hold mode ("chup karo"): the call stays open and Ava says nothing. She only listens for
     "shuru karo" (back to normal) or "call band karo" / "Allah Hafiz" (end); every recording is only transcribed
     and checked for those words, never answered. Tapping the orb also brings her back. */
  function enterQuiet(c) {
    c.quiet = true; c.silent = 0;
    if (c.player) interrupt(c);
    setPhase(c, 'quiet');
    ui.caption.textContent = CFG.lang === 'en-US' ? 'Ava is quiet. Say "start" (or tap the orb) to continue.' : 'Ava chup hai. "Shuru karo" bolein ya orb dabayein.';
  }
  function listenQuiet(c) {
    setPhase(c, 'quiet');
    setMic(c, true);
    listenRecord(c).then(function (blob) {
      if (c.closed || !c.quiet || c.phase !== 'quiet') return;
      if (!blob) return listen(c);
      return checkCmd(c, blob, true).then(function (cmd) {
        if (c.closed || !c.quiet || c.phase !== 'quiet') return;
        if (cmd.cmd === 'bye') return sayBye(c, cmd.text);
        if (cmd.cmd === 'resume') return resumeTalk(c);
        return listen(c);                                 /* anything else: stay quiet */
      });
    }).catch(function (e) { if (!c.closed) { if (window.console) console.warn('[RaiVoiceAgent] quiet', e); wait(800).then(function () { if (!c.closed && c.quiet) listen(c); }); } });
  }
  function resumeTalk(c) {
    if (c.closed || !c.quiet) return;
    c.quiet = false; c.silent = 0;
    var ack = CFG.lang === 'en-US' ? 'Yes, go ahead.' : '\u062c\u06cc\u060c \u0628\u062a\u0627\u0626\u06cc\u06ba\u06d4';
    respond(c, ack, false);
  }
  /* Transcribe one recording and check it for a voice command only (no AI, no voice). Resolves {cmd, text}. */
  function checkCmd(c, blob, quiet) {
    var fd = new FormData();
    fd.append('audio', blob, 'speech.' + (/mp4|m4a|aac/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm'));
    fd.append('messages', '[]'); fd.append('lang', CFG.lang === 'en-US' ? 'en' : 'ur');
    fd.append('tts', '0'); fd.append('mode', 'cmd'); fd.append('quiet', quiet ? '1' : '0');
    var out = { cmd: '', text: '' };
    return fetch(CFG.proxyUrl.replace(/\/$/, '') + '/turn?m=cmd', { method: 'POST', body: fd }).then(function (r) {
      if (!r.ok) return out;
      return readLines(r, function (o) {
        if (o.t !== 'heard') return;
        var text = String(o.text || '').trim(); if (HALLUCINATION.test(text)) text = '';
        out.text = text; out.cmd = text ? (o.cmd != null ? o.cmd : cmdOf(text, quiet)) : '';
      }).then(function () { return out; });
    }, function () { return out; });
  }
  function heardNothing(c) {
    c.silent = (c.silent || 0) + 1;
    if (c.silent >= 4) return endCall('Koi awaz nahi aayi, call band kar di. Dobara call kar sakte hain.');
    return listen(c);
  }
  /* One request per turn: the recording goes up, and back come (as lines of JSON, streamed) what Ava heard,
     her reply sentence by sentence, and each sentence's voice. Playback starts with the first ready sentence. */
  function runTurn(c, blob, src) {
    var base = CFG.proxyUrl.replace(/\/$/, ''), t = c.tm || {}, cloud = !c.cloudDown, my = c.turnSeq = (c.turnSeq || 0) + 1;
    var ext = function (b) { return 'speech.' + (/mp4|m4a|aac/.test(b.type) ? 'm4a' : /ogg/.test(b.type) ? 'ogg' : 'webm'); };
    var parts = [].concat(blob).filter(Boolean);                 /* one answer, in up to 4 parts when the visitor paused */
    var fd = new FormData();
    parts.forEach(function (b, i) { fd.append(i ? 'audio' + (i + 1) : 'audio', b, ext(b)); });
    if (src) fd.append('src', src);
    fd.append('call_lang', c.lang || ''); fd.append('lang_other', String(c.langOther || 0));   /* the call's language, kept for the whole call */
    fd.append('messages', JSON.stringify(c.history.slice(-11)));
    fd.append('lang', CFG.lang === 'en-US' ? 'en' : 'ur');
    fd.append('tts', cloud ? '1' : '0');
    fd.append('booking', JSON.stringify(c.booking || null));      /* where an appointment booking stands (the backend checks everything again) */
    var q = null, heard = null, reply = '', bye = false, ended = false, nSay = 0, quickBye = false, quickQuiet = false, merged = null, pushedUser = false;
    var ac = window.AbortController ? new AbortController() : null;
    t.up = performance.now();
    /* still talking after the pause? cancel this request and send both parts together */
    var tailP = (parts.length < 4 && ac) ? startTail(c, function () {
      if (c.closed || c.turnSeq !== my || c.phase !== 'thinking' || merged) return;
      merged = tailP; try { ac.abort(); } catch (e) {}
    }) : null;
    return fetch(base + '/turn', { method: 'POST', body: fd, signal: ac ? ac.signal : undefined }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error((j && j.error) || ('http_' + r.status)); });
      return readLines(r, function (o) {
        if (c.closed || c.turnSeq !== my || merged) return;
        if (o.t === 'heard') {
          t.heard = performance.now();
          var text = String(o.text || '').trim();
          if (HALLUCINATION.test(text)) text = '';
          if (o.cmd === 'echo') text = '';                 /* Ava's own voice came back through the speaker */
          heard = text; c.lastLang = o.lang || c.lastLang;
          if (!text) return;
          c.silent = 0;
          ui.caption.textContent = '\u201C' + text.slice(-160) + '\u201D';
          var cmd = o.cmd != null ? o.cmd : cmdOf(text, false);   /* voice command: handled here, no AI reply, no voice spent */
          if (cmd === 'bye') { quickBye = true; try { ac && ac.abort(); } catch (e) {} return; }
          if (cmd === 'quiet') { quickQuiet = true; try { ac && ac.abort(); } catch (e) {} return; }
          c.history.push({ role: 'user', content: text }); pushedUser = true;
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
          c.vias = (c.vias || []).concat(o.via || '?');
          q.audio(o.i, b64Blob(o.b64, o.mime));
        } else if (o.t === 'lang') {
          c.lang = o.lang || c.lang; c.langOther = o.other || 0;
        } else if (o.t === 'booking') {
          c.booking = o.state || null;
        } else if (o.t === 'booked') {
          c.booked = o.booking; showBooking(o.booking);
        } else if (o.t === 'audio_err' && q) {
          q.fail(o.i);
        } else if (o.t === 'end') {
          ended = true; t.server = o.ms || null; c.softFails = 0;
          if (q) { c.history.push({ role: 'assistant', content: o.text || reply }); q.streamEnded = true; q.close(o.n != null ? o.n : 0); }
        } else if (o.t === 'error') {
          throw new Error(o.error || 'turn_error');
        }
      });
    }).catch(function (e) { if (!quickBye && !quickQuiet && !merged) throw e; }).then(function () {
      if (c.closed || c.turnSeq !== my) return;
      if (merged) {                                     /* the visitor went on talking: one answer from both parts */
        if (q) { try { q.stop(); } catch (e) {} }
        if (pushedUser) { c.history.pop(); c.turns = Math.max(0, c.turns - 1); }
        setPhase(c, 'thinking'); ui.hint.textContent = 'Sun rahi hoon\u2026';
        return merged.then(function (b2) {
          if (c.closed || c.turnSeq !== my) return;
          setMic(c, false); ui.hint.textContent = 'Soch rahi hoon\u2026';
          c.tm = { speechEnd: performance.now(), stop: performance.now() };
          return runTurn(c, b2 ? parts.concat([b2]) : parts);
        });
      }
      stopTail(c);
      if (quickBye) return sayBye(c, heard);
      if (quickQuiet) { enterQuiet(c); return listen(c); }
      if (!heard) return heardNothing(c);
      if (!q) return;
      if (!ended) {                                     /* stream broke off: speak what arrived, or say sorry */
        q.streamEnded = true;
        if (!reply) { var sorry = isUrdu(heard) ? '\u0645\u0639\u0630\u0631\u062a\u060c \u062f\u0648\u0628\u0627\u0631\u06c1 \u0628\u062a\u0627\u0626\u06cc\u06d2\u061f' : 'Sorry, could you say that again?'; q.add(0, sorry); q.close(1); reply = sorry; }
        else q.close(nSay);
        c.history.push({ role: 'assistant', content: reply });
      }
      return q.done.then(function () {
        if (c.closed || c.turnSeq !== my) return;          /* a newer turn took over (the visitor spoke over Ava) */
        if (bye) return endCall('Shukriya! Allah Hafiz.');
        return wait(c.interrupted ? 80 : 250).then(function () { if (!c.closed && c.turnSeq === my) listen(c); });  /* let the last echo die away */
      });
    });
  }
  /* The visitor asked to end the call: Ava says a short goodbye, then hangs up (mic and wake lock released). */
  function sayBye(c, heard) {
    if (c.closed || c.byeing) return;
    c.byeing = true; c.quiet = false; stopBarge(c); stopListening(c);
    if (c.player) interrupt(c);
    var txt = (CFG.lang === 'en-US' && !isUrdu(heard)) ? 'Thank you for calling. Goodbye!' : '\u0634\u06a9\u0631\u06cc\u06c1! \u0627\u0644\u0644\u06c1 \u062d\u0627\u0641\u0638\u06d4';
    c.history.push({ role: 'assistant', content: txt });
    setMic(c, false); setPhase(c, 'speaking'); ui.caption.textContent = txt;
    return speak(c, txt).then(function () { if (!c.closed) endCall('Shukriya! Allah Hafiz.'); });
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
  /* While Ava speaks the mic keeps listening, but only for the voice commands: a recording made while she talks is
     transcribed, and only "chup karo" / "call band karo" (not her own voice, not other words) stops her. */
  function normTxt(t) { return String(t || '').toLowerCase().replace(/[.,!?\u061f\u06d4\u060c"'\u201c\u201d\u2019:;\-]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function startBarge(c) {
    if (c.closed || c.byeing || c.quiet || c.bargeOn || !c.stream || !window.MediaRecorder || !CFG.proxyUrl) return;
    if ((c.bargeChecks || 0) >= 3) return;
    c.bargeOn = true; c.bargeSpeech = false; setMic(c, true);
    listenRecord(c, { barge: true }).then(function (blob) {
      var handoff = c.bargeHandoff; c.bargeHandoff = false;   /* Ava finished while the visitor was still talking */
      if (c.closed || (!handoff && (!c.bargeOn || c.phase !== 'speaking'))) return;
      c.bargeOn = false;
      if (!blob) { if (handoff) listen(c); return; }
      c.bargeChecks = (c.bargeChecks || 0) + 1;
      return checkCmd(c, blob, false).then(function (r) {
        if (c.closed || c.byeing || c.quiet) { if (handoff && !c.closed && !c.byeing && c.quiet) listen(c); return; }
        var echo = r.text && normTxt(ui.caption.textContent).indexOf(normTxt(r.text)) >= 0;   /* her own words came back */
        if (r.cmd && !echo && (c.phase === 'speaking' || c.phase === 'listening')) {
          (c.bargeLog = c.bargeLog || []).push(r.cmd + ':' + r.text);
          if (r.cmd === 'bye') return sayBye(c, r.text);
          if (r.cmd === 'quiet') { var spk = c.phase === 'speaking'; enterQuiet(c); if (!spk) { stopListening(c); listen(c); } return; }
        }
        /* during a booking, an answer spoken over Ava (not her own voice coming back) is taken as the answer:
           she stops and goes on with it, so the visitor never has to say it twice. Also when she has just finished
           and the visitor was mid-sentence (the normal listening had not caught any of it yet). */
        var canTake = c.phase === 'speaking' || (c.phase === 'listening' && !c.listenSpeech);
        if (!r.cmd && r.text && inBooking(c) && canTake && overlap(r.text, ui.caption.textContent) < 0.5) {
          (c.bargeLog = c.bargeLog || []).push('answer:' + r.text);
          stopBarge(c); stopListening(c); interrupt(c); setMic(c, false); setPhase(c, 'thinking');
          c.tm = { speechEnd: performance.now(), stop: performance.now() };
          return runTurn(c, [blob], 'barge').catch(function (e) { if (!c.closed) softFail(c, e); });
        }
        if (handoff) return listen(c);
        if (c.phase === 'speaking') startBarge(c);
      });
    }).catch(function () { c.bargeOn = false; if (c.bargeHandoff) { c.bargeHandoff = false; if (!c.closed) listen(c); } });
  }
  function stopBarge(c) {
    c.bargeOn = false;
    try { if (c.bTimer) { clearInterval(c.bTimer); c.bTimer = null; } } catch (e) {}
    try { c.bRec && c.bRec.state !== 'inactive' && (c.bRec._discard = true, c.bRec.stop()); } catch (e) {}
  }
  function stopListening(c) {
    try { if (c.vadTimer) { clearInterval(c.vadTimer); c.vadTimer = null; } } catch (e) {}
    try { c.recorder && c.recorder.state !== 'inactive' && (c.recorder._discard = true, c.recorder.stop()); } catch (e) {}
    stopTail(c);
  }
  /* A booking answer often has pauses ("mera naam ... Abdul Rehman", "0323 ... 664 ... 4853"), so during a booking
     Ava waits longer before she takes the answer as finished. */
  function inBooking(c) { return !!(c.booking && c.booking.active); }
  function pauseMs(c) { return inBooking(c) ? (c.booking.asked === 'phone' ? 1800 : 1300) : 1200; }  /* no-interrupt: wait 1.2 s of silence, so a mid-sentence pause is not taken as the end */
  /* While Ava is thinking, the mic keeps listening: if the visitor goes on talking (they had only paused), that
     answer is not lost. The request is cancelled and both parts are sent together as one answer. */
  function stopTail(c) {
    try { if (c.tTimer) { clearInterval(c.tTimer); c.tTimer = null; } } catch (e) {}
    try { c.tRec && c.tRec.state !== 'inactive' && (c.tRec._discard = true, c.tRec.stop()); } catch (e) {}
    c.tRec = null;
  }
  function startTail(c, onSpeech) {
    if (c.closed || !c.stream || !window.MediaRecorder) return null;
    setMic(c, true);
    return listenRecord(c, { tail: true, endSilence: inBooking(c) ? 1300 : 900, onStart: onSpeech }).catch(function () { return null; });
  }
  /* how alike two texts are (share of words in a that also appear in b) */
  function overlap(a, b) {
    var w = normTxt(a).split(' ').filter(function (x) { return x.length > 1; }); if (!w.length) return 1;
    var B = ' ' + normTxt(b) + ' ', hit = 0; w.forEach(function (x) { if (B.indexOf(' ' + x + ' ') >= 0) hit++; }); return hit / w.length;
  }
  function recType() {
    return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'].filter(function (t) {
      return window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t);
    })[0] || '';
  }
  /* Record one utterance from the call's mic stream: starts on voice, stops after ~0.65 s of silence
     (adaptive to background noise). Resolves the recording (a Blob), or null when nobody spoke. */
  function listenRecord(c, o) {
    var tail = !!(o && o.tail), barge = !!(o && (o.barge || o.tail)), RK = tail ? 'tRec' : barge ? 'bRec' : 'recorder', TK = tail ? 'tTimer' : barge ? 'bTimer' : 'vadTimer';
    var onStart = o && o.onStart, fired = false;
    if (!window.MediaRecorder) return Promise.reject(new Error('no_recorder'));
    var VAD = tail ? { tick: 40, endSilence: (o && o.endSilence) || 900, minSpeech: 300, maxUtter: 8000, noSpeech: 1e9, armQuiet: 0, armMax: 0 }
            : barge ? { tick: 40, endSilence: 550, minSpeech: 500, maxUtter: 5000, noSpeech: 1e9, armQuiet: 0, armMax: 0 }
                    : { tick: 40, endSilence: (o && o.endSilence) || 650, minSpeech: (o && o.minSpeech) || 250, maxUtter: (o && o.maxUtter) || 12000, noSpeech: 9000, armQuiet: 150, armMax: 3000 };
    return new Promise(function (res, rej) {
      var type = recType(), data = new Uint8Array(1024), settled = false;
      var t0 = performance.now(), floor = c.noiseFloor || 0.006, armed = false, quietMs = 0;
      function loud0(r) { return r > Math.max(0.015, floor * 3); }
      var rec, parts, speechMs, silenceMs, inSpeech, startedAt, lastLoud = 0, stopAt = 0;
      var iv = null;                                     /* this recording's own timer (another recording may own c[TK] by now) */
      function done(v, isErr) { if (settled) return; settled = true; clearInterval(iv); if (c[TK] === iv) c[TK] = null; (isErr ? rej : res)(v); }
      function begin() {
        parts = []; speechMs = 0; silenceMs = 0; inSpeech = false; startedAt = 0;
        try { rec = new MediaRecorder(c.stream, type ? { mimeType: type } : undefined); }
        catch (e) { try { rec = new MediaRecorder(c.stream); } catch (e2) { return done(new Error('no_recorder'), true); } }
        c[RK] = rec;
        rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
        rec.onstop = function () {
          if (c[RK] === rec) c[RK] = null;
          if (rec._discard || settled) return;
          if (rec._restart) return begin();
          clearInterval(iv); if (c[TK] === iv) c[TK] = null;
          if (speechMs < VAD.minSpeech) return done(null);
          if (!barge) {
            setMic(c, false);
            ui.hint.textContent = 'Soch rahi hoon\u2026';
            c.tm = { speechEnd: lastLoud || performance.now(), stop: stopAt || performance.now() };
          }
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
      iv = c[TK] = setInterval(function () {
        if (c.closed || settled) { clearInterval(iv); return; }
        if (!rec || rec.state !== 'recording') return;
        var now = performance.now(), rms = level();
        if (rms < 0) {                                   /* no analyser (very old browser): fixed 6 s turn */
          speechMs = VAD.minSpeech; if (now - t0 > 6000) { stopAt = lastLoud = now; rec.stop(); } return;
        }
        /* the room's noise: the quietest moment of the last ~4 s (a fan, traffic or a TV is never quieter than itself,
           while speech always has short gaps), so steady background sound is never taken for speech */
        var nh = c.noiseHist = c.noiseHist || []; nh.push(rms); if (nh.length > 100) nh.shift();
        if (nh.length >= 12) { var mn = 1; for (var q = 0; q < nh.length; q++) if (nh[q] < mn) mn = nh[q]; floor = Math.max(0.003, mn); c.noiseFloor = floor; }
        else if (!loud0(rms)) floor += (Math.min(rms, 0.05) - floor) * 0.05;
        var strict = barge;                              /* over Ava's voice or while she thinks: only clear speech counts */
        var thr = strict ? Math.min(0.12, Math.max(0.035, floor * 4)) : Math.min(0.08, Math.max(0.015, floor * 3.5)), loud = rms > thr, quiet = rms < thr * 0.7;
        if (!armed) {                                   /* wait for a short quiet so Ava's echo tail isn't taken as speech */
          quietMs = quiet ? quietMs + VAD.tick : 0;
          if (quietMs >= VAD.armQuiet || now - t0 > VAD.armMax) armed = true; else return;
        }
        if (loud) { inSpeech = true; speechMs += VAD.tick; silenceMs = 0; lastLoud = now; if (!startedAt) startedAt = now; if (!barge) c.heard = true;
          if (onStart && !fired && speechMs >= 400 && now - t0 < 3500) { fired = true; try { onStart(); } catch (e) {} }
          if (speechMs >= 160) { if (!barge) c.listenSpeech = true; else if (!tail) c.bargeSpeech = true; } }
        else if (inSpeech && quiet) silenceMs += VAD.tick;
        if (inSpeech && silenceMs >= VAD.endSilence) {
          if (speechMs >= VAD.minSpeech) { stopAt = now; rec.stop(); return; }
          rec._restart = true; rec.stop(); return;      /* a short click or cough: start a fresh recording */
        }
        if (startedAt && now - startedAt > VAD.maxUtter) { stopAt = now; rec.stop(); return; }
        if (!barge && c.listenSpeech && now - t0 > VAD.maxUtter + 2000 && speechMs >= VAD.minSpeech) { stopAt = now; rec.stop(); return; }   /* hard cap: the answer always goes */
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
  /* a busy moment on the AI side should not end the call: say sorry and listen again (up to 3 times in a row) */
  function softFail(c, e) {
    var t = String(e && (e.message || e) || '');
    if (c.closed || !/busy|upstream|slow_down|turn_error|http_5|failed to fetch|network|load failed/i.test(t) || (c.softFails || 0) >= 3) return fail(c, e);
    c.softFails = (c.softFails || 0) + 1;
    if (window.console) console.warn('[RaiVoiceAgent] soft', t);
    var ur = !(c.lang === 'en' || (!c.lang && CFG.lang === 'en-US'));
    var msg = ur ? '\u0645\u0639\u0630\u0631\u062a\u060c \u0627\u06cc\u06a9 \u0644\u0645\u062d\u06d2 \u06a9\u06d2 \u0644\u06cc\u06d2 \u0631\u0627\u0628\u0637\u06c1 \u06a9\u0645\u0632\u0648\u0631 \u06c1\u0648\u0627\u06d4 \u062f\u0648\u0628\u0627\u0631\u06c1 \u0628\u062a\u0627\u0626\u06cc\u06ba\u061f' : 'Sorry, I missed that for a moment. Could you say it again?';
    c.history.push({ role: 'assistant', content: msg });
    return wait(500 * c.softFails).then(function () { if (!c.closed) respond(c, msg, false); });
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
    var c = call = { history: [], turns: 0, closed: false, phase: 'connecting', booking: null };
    hideBooking();
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
    stopListening(c); stopBarge(c);
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
    _state: function () { return call ? { phase: call.phase, turns: call.turns, history: call.history.length, voice: call.voiceUsed, vias: call.vias || [], ttsVoice: lastTtsVoice, ttsErrors: call.ttsErrors || 0, sr: false, micOn: !!call.micOn, recording: !!(call.recorder && call.recorder.state === 'recording'), wakeLock: !!(call.wake && call.wake !== 'pending'), noSleepVideo: !!call.nosleep, quiet: !!call.quiet, booking: call.booking || null, booked: call.booked ? call.booked.id : null, barge: !!call.bargeOn, bargeLog: call.bargeLog || [], last: call.history.slice(-2) } : null; },
    _timings: [], _showBooking: function (b) { showBooking(b); }
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
      if (c.phase === 'listening' || c.phase === 'quiet') { stopListening(c); setMic(c, false); setPhase(c, 'paused'); }
      else if (c.phase === 'speaking') { stopBarge(c); setMic(c, false); }
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
