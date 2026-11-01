/* Rehman AI Services - "Ava" free AI voice agent (female voice, Urdu/English).
   No Firebase, no paid platform:
     listen  -> the browser's speech recognition (Chrome/Edge/Android), or recorded audio sent to the backend (iPhone etc.)
     think   -> Ava's backend (free AI model; the API key stays on the server, never in this file)
     speak   -> natural female voice from the backend (Urdu: "Uzma", English: "Ava"); the browser's own voice as a fallback
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
    maxTurns: 30
  };

  /* Ava's personality, prices and rules live on the backend (so nobody can misuse it as a free chatbot). */
  var GREETING = '\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u06cc\u06a9\u0645! \u0631\u062d\u0645\u0627\u0646 \u0627\u06d2 \u0622\u0626\u06cc \u0633\u0631\u0648\u0633\u0632 \u0645\u06cc\u06ba \u062e\u0648\u0634 \u0622\u0645\u062f\u06cc\u062f\u06d4 \u0645\u06cc\u06ba \u0627\u06cc\u0648\u0627 \u06c1\u0648\u06ba\u060c \u0622\u067e \u06a9\u06cc \u0627\u06d2 \u0622\u0626\u06cc \u0627\u0633\u0633\u0679\u0646\u0679\u06d4 \u0628\u062a\u0627\u0626\u06cc\u06d2\u060c \u0645\u06cc\u06ba \u0622\u067e \u06a9\u06cc \u06a9\u06cc\u0627 \u0645\u062f\u062f \u06a9\u0631 \u0633\u06a9\u062a\u06cc \u06c1\u0648\u06ba\u061f';
  var GREETING_EN = "Assalam o Alaikum! Welcome to Rehman AI Services. I'm Ava, your AI assistant. How can I help you today?";

  /* ---------- helpers ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function fmtTime(sec) { var m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
  function isUrdu(t) { return /[\u0600-\u06FF]/.test(t || ''); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

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
    if (call && call.phase === 'listening') { stopListening(call); listen(call); }
  }
  function setState(s, statusText) {
    ui.card.setAttribute('data-state', s);
    if (statusText != null) ui.status.textContent = statusText;
    var live = (s === 'live' || s === 'connecting');
    ui.start.hidden = live; ui.end.hidden = !live;
    if (s !== 'error') { ui.err.hidden = true; ui.wa.hidden = true; }
    ui.start.textContent = (s === 'ended' || s === 'error') ? 'Call again' : 'Start talking';
    if (!live) ui.hint.textContent = '';
  }
  function setPhase(c, p) {
    c.phase = p; ui.card.setAttribute('data-phase', p);
    ui.hint.textContent = p === 'listening' ? (CFG.lang === 'en-US' ? 'Listening\u2026 speak now' : 'Sun rahi hoon\u2026 bolein') :
      p === 'thinking' ? 'Soch rahi hoon\u2026' : p === 'speaking' ? 'Ava bol rahi hai \u00b7 tap the orb to interrupt' : '';
  }
  function showError(msg) {
    setState('error', 'Not connected');
    ui.err.textContent = msg; ui.err.hidden = false; ui.wa.hidden = false; ui.caption.textContent = '';
  }
  function open() { ui.ov.classList.add('is-open'); document.documentElement.classList.add('rai-va-lock'); if (!call) setState('idle', 'Ready'); ui.start.focus(); }
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
    return fetch(CFG.proxyUrl.replace(/\/$/, '') + '/stt', { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob })
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
  function speak(c, text) {
    if (CFG.proxyUrl && !c.cloudDown) {
      return speakCloud(c, text).then(function (ok) {
        if (ok || c.closed || c.interrupted) return;
        c.cloudDown = true; return speakLocal(c, text);
      });
    }
    return speakLocal(c, text);
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
  /* Natural female voice from the backend: all sentences are fetched at once, played in order. Resolves true if it spoke. */
  function speakCloud(c, text) {
    var list = chunks(text, 160), base = CFG.proxyUrl.replace(/\/$/, '');
    var tl = isUrdu(text) ? 'ur' : 'en', stopped = false, played = 0;
    c.interrupted = false; c.voiceUsed = tl === 'ur' ? 'Uzma' : 'Ava';
    var blobs = list.map(function (q) {
      return fetch(base + '/tts?tl=' + tl + '&q=' + encodeURIComponent(q)).then(function (r) {
        if (!r.ok) throw new Error('tts_' + r.status);
        return r.blob();
      });
    });
    return new Promise(function (res) {
      var a = c.audioEl, i = 0, url = null;
      function finish(v) { if (url) { try { URL.revokeObjectURL(url); } catch (e) {} url = null; } res(v); }
      c.cancelSpeak = function () { stopped = true; c.interrupted = true; try { a.pause(); } catch (e) {} finish(true); };
      (function next() {
        if (stopped || c.closed) return finish(true);
        if (i >= blobs.length) return finish(played > 0);
        blobs[i++].then(function (b) {
          if (stopped || c.closed) return finish(true);
          if (url) { try { URL.revokeObjectURL(url); } catch (e) {} }
          url = URL.createObjectURL(b);
          a.src = url;
          a.onended = function () { played++; next(); };
          a.onerror = function () { c.ttsErrors = (c.ttsErrors || 0) + 1; next(); };
          var p = a.play(); if (p && p.catch) p.catch(function () { c.ttsErrors = (c.ttsErrors || 0) + 1; next(); });
        }, function () { c.ttsErrors = (c.ttsErrors || 0) + 1; next(); });
      })();
    });
  }

  /* ---------- listening ---------- */
  function listen(c) {
    if (c.closed) return;
    setPhase(c, 'listening');
    var p = (SR && !c.noSR && !CFG.forceRecord) ? listenSR(c) : listenRecord(c);
    p.then(function (text) {
      if (c.closed || c.phase !== 'listening') return;
      text = (text || '').trim();
      if (!text) { c.silent = (c.silent || 0) + 1; if (c.silent >= 3) return endCall('Koi awaz nahi aayi, call band kar di. Dobara call kar sakte hain.'); return listen(c); }
      c.silent = 0;
      ui.caption.textContent = '\u201C' + text.slice(-160) + '\u201D';
      if (++c.turns > CFG.maxTurns) return endCall('Call ki limit poori. Baqi baat WhatsApp par karein.');
      setPhase(c, 'thinking');
      think(c, text).then(function (reply) {
        if (c.closed) return;
        respond(c, reply, /allah hafiz|\u0627\u0644\u0644\u06c1 \u062d\u0627\u0641\u0638|khuda hafiz|\u062e\u062f\u0627 \u062d\u0627\u0641\u0638|\bbye\b|goodbye/i.test(text));
      }).catch(function (e) { fail(c, e); });
    }).catch(function (e) {
      if (c.closed) return;
      if (e && e.fallback) { c.noSR = true; return listen(c); }
      fail(c, e);
    });
  }
  function respond(c, reply, bye) {
    setPhase(c, 'speaking');
    ui.caption.textContent = reply;
    speak(c, reply).then(function () {
      if (c.closed) return;
      if (bye) return endCall('Shukriya! Allah Hafiz.');
      listen(c);
    });
  }
  function listenSR(c) {
    return new Promise(function (res, rej) {
      var r = new SR(); c.rec = r;
      r.lang = CFG.lang; c.lastLang = CFG.lang === 'en-US' ? 'en' : 'ur'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      var finalText = '', gotAny = false, audioStarted = false, settled = false;
      var wd1 = setTimeout(function () { if (!audioStarted && !settled) { settled = true; try { r.abort(); } catch (e) {} var f = new Error('sr_silent'); f.fallback = true; rej(f); } }, 4000);
      var wd2 = setTimeout(function () { try { r.stop(); } catch (e) {} }, 20000);
      r.onaudiostart = function () { audioStarted = true; };
      r.onresult = function (ev) {
        var interim = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript; else interim += ev.results[i][0].transcript;
        }
        gotAny = true;
        if (interim) ui.caption.textContent = '\u201C' + (finalText + interim).slice(-160) + '\u201D';
      };
      r.onerror = function (ev) {
        var er = ev.error;
        if (er === 'no-speech' || er === 'aborted') return;
        if (settled) return;
        if (er === 'not-allowed') { settled = true; var e = new Error('mic_denied'); e.name = 'NotAllowedError'; return rej(e); }
        if (er === 'service-not-allowed' || er === 'language-not-supported' || er === 'network') { settled = true; var f = new Error(er); f.fallback = true; return rej(f); }
      };
      r.onend = function () { clearTimeout(wd1); clearTimeout(wd2); c.rec = null; if (!settled) { settled = true; res(finalText); } };
      try { r.start(); } catch (e) { var f2 = new Error('sr_start'); f2.fallback = true; rej(f2); }
    });
  }
  function stopListening(c) {
    try { c.rec && c.rec.abort(); } catch (e) {}
    try { c.recorder && c.recorder.state !== 'inactive' && (c.recorder._discard = true, c.recorder.stop()); } catch (e) {}
  }
  /* For browsers without speech recognition: record until ~1.2 s of silence, send to the proxy (Whisper). */
  function listenRecord(c) {
    if (!window.MediaRecorder) return Promise.reject(new Error('no_recorder'));
    return new Promise(function (res, rej) {
      var type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0];
      var rec = new MediaRecorder(c.stream, type ? { mimeType: type } : undefined), parts = [];
      c.recorder = rec;
      var data = new Uint8Array(512), spoke = false, quietSince = 0, t0 = performance.now();
      rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = function () {
        clearInterval(iv); c.recorder = null;
        if (rec._discard || !spoke) return res('');
        ui.hint.textContent = 'Soch rahi hoon\u2026';
        sttUpload(new Blob(parts, { type: rec.mimeType || type || 'audio/webm' })).then(function (o) { c.lastLang = o.lang || c.lastLang; res(o.text); }, rej);
      };
      var iv = setInterval(function () {
        c.micAn.getByteTimeDomainData(data);
        var lvl = 0; for (var i = 0; i < data.length; i++) lvl = Math.max(lvl, Math.abs(data[i] - 128));
        lvl /= 128; var now = performance.now();
        if (lvl > 0.08) { spoke = true; quietSince = 0; } else if (spoke && !quietSince) quietSince = now;
        if ((spoke && quietSince && now - quietSince > 1200) || now - t0 > 15000 || (!spoke && now - t0 > 7000)) { try { rec.stop(); } catch (e) {} }
      }, 100);
      rec.start(250);
    });
  }

  /* ---------- the call ---------- */
  var call = null;

  function explain(e) {
    var name = String(e && e.name || ''), t = String(e && (e.message || e) || '').toLowerCase();
    if (name === 'NotAllowedError' || name === 'SecurityError' || /mic_denied/.test(t)) return 'Microphone ki ijazat nahi mili. Browser mein mic allow karein, phir dobara try karein.';
    if (name === 'NotFoundError' || name === 'NotReadableError') return 'Is device par microphone nahi mila.';
    if (/not_configured/.test(t)) return 'Voice agent abhi setup ho raha hai. Tab tak WhatsApp par baat karein.';
    if (/busy|slow_down|429/.test(t)) return CFG.agentName + ' abhi bohat busy hai. WhatsApp par baat karein, hum foran jawab dein ge.';
    if (/no_recorder|unsupported/.test(t)) return 'Ye browser voice call support nahi karta. Chrome use karein, ya WhatsApp par baat karein.';
    if (/failed to fetch|network|load failed/.test(t)) return 'Internet connection ka masla lag raha hai. Dobara try karein ya WhatsApp par baat karein.';
    return 'Call connect nahi ho saki. Thori dair baad dobara try karein ya WhatsApp par baat karein.';
  }
  function fail(c, e) {
    if (window.console) console.warn('[RaiVoiceAgent]', e);
    var msg = explain(e); teardown(c); showError(msg);
  }

  function startCall() {
    if (call) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('Ye browser voice call support nahi karta. Chrome ya Safari ka naya version use karein, ya WhatsApp par baat karein.');
      return;
    }
    if (!CFG.proxyUrl && !api._mock) { showError(explain(new Error('not_configured'))); return; }
    var c = call = { history: [], turns: 0, closed: false, phase: 'connecting' };
    setState('connecting', 'Connecting\u2026');
    ui.caption.textContent = CFG.agentName + ' se connect kar rahe hain\u2026';
    /* audio element + speech unlock must happen inside the tap */
    c.audioEl = new Audio(); c.audioEl.preload = 'auto'; c.audioEl.setAttribute('playsinline', '');
    try { c.audioEl.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='; c.audioEl.play().catch(function () {}); } catch (e) {}
    try { if (window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) {}
    var Ctx = window.AudioContext || window.webkitAudioContext;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      if (c.closed) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      c.stream = stream;
      if (Ctx) {
        c.ctx = new Ctx(); c.ctx.resume && c.ctx.resume();
        c.micAn = c.ctx.createAnalyser(); c.micAn.fftSize = 1024; c.ctx.createMediaStreamSource(stream).connect(c.micAn);
        try { c.outAn = c.ctx.createAnalyser(); c.outAn.fftSize = 1024; var ms = c.ctx.createMediaElementSource(c.audioEl); ms.connect(c.outAn); c.outAn.connect(c.ctx.destination); } catch (e) { c.outAn = null; }
      }
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
    clearInterval(c.timer); if (c.raf) cancelAnimationFrame(c.raf);
    if (c.cancelSpeak) c.cancelSpeak();
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
    stopListening(c);
    try { c.audioEl && c.audioEl.pause(); } catch (e) {}
    try { c.stream && c.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
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
    _state: function () { return call ? { phase: call.phase, turns: call.turns, history: call.history.length, voice: call.voiceUsed, ttsErrors: call.ttsErrors || 0, sr: !!SR && !call.noSR && !CFG.forceRecord, last: call.history.slice(-2) } : null; }
  };
  window.RaiVoiceAgent = api;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI); else buildUI();
})();
