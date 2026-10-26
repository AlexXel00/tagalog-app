// Tagalog-App (Version 0.2)
// Bildschirme: Anmelden, neues Passwort, Startseite, tägliche Session, Inhalte prüfen.
(function () {
  "use strict";

  var cfg = window.APP_CONFIG;
  var C = window.CONTENT;
  var app = document.getElementById("app");

  if (!window.supabase || !cfg || !C) {
    app.innerHTML = "";
    app.appendChild(el("p", { className: "notice" }, "Die App konnte nicht geladen werden. Bitte Internetverbindung prüfen und neu laden."));
    return;
  }

  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  // =====================================================================
  // Hilfsfunktionen
  // =====================================================================

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k in node) node[k] = props[k];
        else node.setAttribute(k, props[k]);
      });
    }
    [].concat(children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear() { app.innerHTML = ""; window.scrollTo(0, 0); }

  function shuffle(list, rnd) {
    var a = list.slice();
    rnd = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Zufallszahlen, die pro Tag gleich bleiben (damit die Session beim Neuladen gleich ist)
  function seeded(seedText) {
    var h = 2166136261;
    for (var i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5;
      var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function addDays(dateStr, n) {
    var p = dateStr.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] + n);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function greeting() {
    var h = new Date().getHours();
    if (h >= 4 && h < 11) return "Magandang umaga";
    if (h >= 11 && h < 14) return "Magandang tanghali";
    if (h >= 14 && h < 18) return "Magandang hapon";
    return "Magandang gabi";
  }

  function isIosBrowser() {
    var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    var standalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    return ios && !standalone;
  }

  // =====================================================================
  // Audio
  // =====================================================================

  var ERROR_TEXT = {
    not_signed_in: "Bitte melde dich neu an.",
    not_allowed: "Dein Konto ist noch nicht für die Stimme freigeschaltet.",
    missing_elevenlabs_key: "Der ElevenLabs-Schlüssel ist in Supabase noch nicht eingetragen.",
    elevenlabs_failed: "ElevenLabs hat die Anfrage abgelehnt. Schlüssel oder Guthaben prüfen.",
    invalid_text: "Der Text ist zu lang oder leer.",
    upload_failed: "Das Audio konnte nicht gespeichert werden."
  };
  var PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';

  var audioUrls = {};
  var audioPending = {};
  var player = new Audio();
  var slow = false;
  var toast = null;

  async function readFunctionError(error) {
    try {
      if (error && error.context && typeof error.context.json === "function") {
        var body = await error.context.json();
        if (body && body.error) return body.error;
      }
    } catch (e) {}
    return "unknown";
  }

  function getAudioUrl(text) {
    if (audioUrls[text]) return Promise.resolve(audioUrls[text]);
    if (audioPending[text]) return audioPending[text];
    audioPending[text] = sb.functions.invoke("tts", { body: { text: text, voiceId: cfg.voiceId, model: cfg.ttsModel, language: cfg.ttsLanguage } }).then(async function (res) {
      delete audioPending[text];
      if (res.error) {
        var code = await readFunctionError(res.error);
        throw new Error(ERROR_TEXT[code] || "Die Stimme ist gerade nicht erreichbar.");
      }
      audioUrls[text] = res.data.url;
      return res.data.url;
    }, function (e) { delete audioPending[text]; throw e; });
    return audioPending[text];
  }

  // Laedt Audios im Hintergrund vor, damit es beim Antippen sofort spielt
  function prefetch(texts) {
    texts.forEach(function (t) { getAudioUrl(t).catch(function () {}); });
  }

  function showToast(text) {
    if (!toast) { toast = el("p", { className: "toast", role: "status" }); document.body.appendChild(toast); }
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(showToast.t);
    showToast.t = setTimeout(function () { toast.hidden = true; }, 4000);
  }

  // auto = true: automatisch abgespielt (ohne Antippen). Fehler dann still ignorieren,
  // weil iOS automatisches Abspielen manchmal blockiert.
  async function speak(text, button, auto) {
    if (button) { button.classList.add("busy"); button.disabled = true; }
    try {
      var url = await getAudioUrl(text);
      player.pause();
      player.src = url;
      player.playbackRate = slow ? 0.75 : 1;
      player.preservesPitch = true;
      await player.play();
    } catch (e) {
      if (!auto) showToast(e.message || "Abspielen hat nicht geklappt.");
    } finally {
      if (button) { button.classList.remove("busy"); button.disabled = false; }
    }
  }

  function playButton(text, label, small) {
    var b = el("button", { className: "play" + (small ? " small" : ""), type: "button", "aria-label": label || ("Abspielen: " + text) });
    b.innerHTML = PLAY_ICON;
    b.addEventListener("click", function () { speak(text, b); });
    return b;
  }

  function slowToggle() {
    var b = el("button", { className: "toggle", type: "button", "aria-pressed": String(slow) }, "Langsam");
    b.addEventListener("click", function () {
      slow = !slow;
      b.setAttribute("aria-pressed", String(slow));
      player.playbackRate = slow ? 0.75 : 1;
    });
    return b;
  }

  // Zeile mit Tagalog, Deutsch und Play-Knopf
  function phraseRow(tl, de, extra) {
    return el("div", { className: "phrase" }, [
      el("div", { className: "text" }, [el("p", { className: "tl" }, tl), de ? el("p", { className: "de" }, de) : null, extra || null]),
      playButton(tl)
    ]);
  }

  // =====================================================================
  // Aufnehmen und Aussprache pruefen
  // =====================================================================
  // Ablauf: Mikrofon aufnehmen -> Edge Function "stt" (ElevenLabs-Spracherkennung)
  // -> erkannten Text Wort fuer Wort mit dem Ziel vergleichen.

  var MIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
  var STOP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  var STT_ERRORS = {
    not_signed_in: "Bitte melde dich neu an.",
    not_allowed: "Dein Konto ist noch nicht freigeschaltet.",
    too_long: "Die Aufnahme ist zu lang.",
    no_audio: "Die Aufnahme war leer.",
    missing_elevenlabs_key: "Der ElevenLabs-Schlüssel fehlt in Supabase."
  };

  function pickMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
    var types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    for (var i = 0; i < types.length; i++) if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    return "";
  }

  // Kleinbuchstaben, ohne Akzente und Satzzeichen, in Woerter zerlegt
  function normWords(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[-–]/g, " ").replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
  }

  function lev(a, b) {
    var m = a.length, n = b.length, d = [];
    for (var i = 0; i <= m; i++) { d[i] = [i]; }
    for (var j = 0; j <= n; j++) { d[0][j] = j; }
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[m][n];
  }
  function similarity(a, b) { return 1 - lev(a, b) / Math.max(a.length, b.length, 1); }

  // Vergleicht Ziel und Gehoertes. Ergebnis pro Zielwort: "ok", "close" oder "miss".
  function compareSpeech(target, heard) {
    var t = normWords(target), h = normWords(heard), j = 0;
    var marks = t.map(function (word) {
      var best = 0, bestK = -1;
      for (var k = j; k < Math.min(h.length, j + 3); k++) {
        var sim = similarity(word, h[k]);
        if (sim > best) { best = sim; bestK = k; }
      }
      var status = best === 1 ? "ok" : (best >= 0.7 ? "close" : "miss");
      if (status !== "miss") j = bestK + 1;
      return { word: word, status: status };
    });
    var points = marks.reduce(function (sum, m) { return sum + (m.status === "ok" ? 1 : m.status === "close" ? 0.5 : 0); }, 0);
    return { marks: marks, score: t.length ? points / t.length : 0 };
  }

  async function transcribe(blob, ext) {
    var session = (await sb.auth.getSession()).data.session;
    if (!session) throw new Error(STT_ERRORS.not_signed_in);
    var fd = new FormData();
    fd.append("file", blob, "aufnahme." + ext);
    var res = await fetch(cfg.supabaseUrl + "/functions/v1/stt", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.access_token, apikey: cfg.supabaseKey },
      body: fd
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      if (data.error === "elevenlabs_failed" && data.status === 401) throw new Error("Die Spracherkennung ist am ElevenLabs-Schlüssel noch nicht freigeschaltet.");
      throw new Error(STT_ERRORS[data.error] || "Die Spracherkennung ist gerade nicht erreichbar.");
    }
    return data;
  }

  function rememberSpeech(id, score) {
    if (!id || !state) return;
    state.speech = state.speech || {};
    var s = state.speech[id] || { tries: 0, best: 0 };
    s.tries += 1;
    s.last = Math.round(score * 100);
    s.best = Math.max(s.best, s.last);
    s.date = today();
    state.speech[id] = s;
  }

  // Baustein: Aufnahme-Knopf plus Auswertung fuer einen Zieltext.
  // onResult(score) wird nach jeder Auswertung aufgerufen.
  function speechCheck(target, opts) {
    opts = opts || {};
    var wrap = el("div", { className: "speak" });
    var mic = el("button", { className: "mic", type: "button" });
    var label = el("span", null, opts.label || "Aufnehmen und prüfen");
    var status = el("p", { className: "muted small" });
    var result = el("div", { className: "speak-result", hidden: true });
    mic.innerHTML = MIC_ICON;
    mic.appendChild(label);
    wrap.appendChild(el("div", { className: "row" }, [mic]));
    wrap.appendChild(status);
    wrap.appendChild(result);

    var rec = null, stream = null, chunks = [], timer = null, startedAt = 0, mime = pickMime();
    var maxMs = Math.min(10000, 2500 + normWords(target).length * 900);

    function setIdle(text) {
      mic.classList.remove("recording");
      mic.innerHTML = MIC_ICON;
      label.textContent = text || "Nochmal aufnehmen";
      mic.appendChild(label);
      mic.disabled = false;
    }

    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        status.textContent = "Dieser Browser kann nicht aufnehmen. Öffne die App in Safari oder Chrome.";
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        status.textContent = e && e.name === "NotAllowedError"
          ? "Das Mikrofon ist blockiert. Erlaube es am iPhone unter Einstellungen > Apps > Safari > Mikrofon und lade die App neu."
          : "Das Mikrofon konnte nicht gestartet werden.";
        return;
      }
      player.pause();
      chunks = [];
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
      rec.onstop = finish;
      rec.start();
      startedAt = Date.now();
      mic.classList.add("recording");
      mic.innerHTML = STOP_ICON;
      label.textContent = "Fertig";
      mic.appendChild(label);
      status.textContent = "Sprich jetzt: " + target;
      timer = setTimeout(stop, maxMs);
    }

    function stop() {
      clearTimeout(timer);
      if (rec && rec.state === "recording") rec.stop();
    }

    async function finish() {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      var type = (rec && rec.mimeType) || mime || "audio/mp4";
      var blob = new Blob(chunks, { type: type });
      rec = null;
      if (Date.now() - startedAt < 500 || blob.size < 1000) {
        setIdle("Aufnehmen und prüfen");
        status.textContent = "Das war zu kurz. Tippe, sprich, und tippe dann auf Fertig.";
        return;
      }
      mic.disabled = true;
      mic.classList.remove("recording");
      label.textContent = "Wird geprüft ...";
      status.textContent = "";
      var ext = type.indexOf("webm") >= 0 ? "webm" : type.indexOf("ogg") >= 0 ? "ogg" : "m4a";
      try {
        var data = await transcribe(blob, ext);
        showResult(data.text || "", blob);
      } catch (e) {
        status.textContent = e.message;
      }
      setIdle();
    }

    function showResult(heard, blob) {
      var cmp = compareSpeech(target, heard);
      var pct = Math.round(cmp.score * 100);
      var verdict = !heard.trim() ? "Ich habe nichts verstanden. Sprich etwas lauter oder näher am Handy."
        : pct >= 90 ? "Sehr gut! Man versteht dich."
        : pct >= 60 ? "Fast. Hör dir die markierten Wörter nochmal an."
        : "Noch nicht ganz. Hör zu und versuch es nochmal.";
      result.innerHTML = "";
      result.className = "speak-result " + (pct >= 90 ? "ok" : pct >= 60 ? "warn" : "bad");
      result.hidden = false;
      result.appendChild(el("p", { className: "verdict" }, verdict));
      result.appendChild(el("p", { className: "speak-words" }, cmp.marks.map(function (m) {
        return el("span", { className: "w " + m.status }, m.word);
      })));
      result.appendChild(el("p", { className: "muted small" }, "Verstanden wurde: „" + (heard.trim() || "...") + "“"));
      var mine = el("button", { className: "btn secondary small-btn", type: "button" }, "Meine Aufnahme anhören");
      var url = URL.createObjectURL(blob);
      mine.addEventListener("click", function () { player.pause(); player.src = url; player.playbackRate = 1; player.play().catch(function () {}); });
      var orig = el("button", { className: "btn secondary small-btn", type: "button" }, "Original anhören");
      orig.addEventListener("click", function () { speak(target, orig); });
      result.appendChild(el("div", { className: "row" }, [mine, orig]));
      rememberSpeech(opts.id, cmp.score);
      if (opts.onResult) opts.onResult(cmp.score);
    }

    mic.addEventListener("click", function () {
      if (rec && rec.state === "recording") stop(); else start();
    });
    return wrap;
  }

  // =====================================================================
  // Lernstand (Spaced Repetition) und Speicherung
  // =====================================================================

  var state = null;
  var userId = null;

  // Alles, was abgefragt werden kann: Woerter, Saetze, Grammatik
  var ITEMS = {};
  C.words.forEach(function (w) { ITEMS[w.id] = { kind: "word", id: w.id, tl: w.tl, stress: w.stress, de: w.de, note: w.note }; });
  C.sentences.forEach(function (s) { ITEMS[s.id] = { kind: "sentence", id: s.id, tl: s.tl, stress: s.tl, de: s.de }; });
  C.grammar.forEach(function (g) { ITEMS[g.id] = { kind: "grammar", id: g.id, title: g.title, body: g.body, examples: g.examples }; });

  // Reihenfolge, in der neue Woerter und Saetze eingefuehrt werden
  var NEW_ORDER = (function () {
    var order = [];
    var ws = C.words.map(function (w) { return w.id; });
    var ss = C.sentences.map(function (s) { return s.id; });
    // nach je 4 Woertern ein Satz
    while (ws.length || ss.length) {
      order = order.concat(ws.splice(0, 4));
      if (ss.length) order.push(ss.shift());
    }
    return order;
  })();

  function defaultState() {
    return { version: 1, items: {}, history: [], lastFormat: null, cultureIndex: 0, pronIndex: 0, review: {}, speech: {} };
  }

  function localKey() { return "tagalog-state-" + userId; }

  async function loadState() {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(localKey()) || "null"); } catch (e) {}
    var res = await sb.from("learner_state").select("data, updated_at").eq("user_id", userId).maybeSingle();
    if (!res.error && res.data && res.data.data && res.data.data.version) {
      state = res.data.data;
    } else if (cached && cached.version) {
      state = cached;
    } else {
      state = defaultState();
    }
    state.items = state.items || {};
    state.history = state.history || [];
    state.review = state.review || {};
  }

  var saving = null;
  async function saveState() {
    try { localStorage.setItem(localKey(), JSON.stringify(state)); } catch (e) {}
    var payload = { user_id: userId, data: state, updated_at: new Date().toISOString() };
    saving = sb.from("learner_state").upsert(payload);
    var res = await saving;
    if (res.error) showToast("Fortschritt nur auf diesem Gerät gespeichert. Wird beim nächsten Mal hochgeladen.");
  }

  function card(id) { return state.items[id]; }
  function isSeen(id) { return !!state.items[id]; }

  function introduce(id) {
    if (state.items[id]) return;
    state.items[id] = { due: addDays(today(), 1), interval: 1, ease: 2.5, reps: 0, lapses: 0, added: today() };
  }

  // rating: 0 = wusste ich nicht, 1 = schwer, 2 = gut, 3 = leicht
  function schedule(id, rating) {
    var c = state.items[id];
    if (!c) { introduce(id); c = state.items[id]; }
    if (rating === 0) {
      c.lapses += 1; c.reps = 0; c.interval = 1;
      c.ease = Math.max(1.3, c.ease - 0.2);
    } else {
      if (rating === 1) { c.interval = Math.max(1, Math.round(c.interval * 1.2)); c.ease = Math.max(1.3, c.ease - 0.15); }
      else if (c.reps === 0) { c.interval = rating === 3 ? 3 : 1; }
      else if (c.reps === 1) { c.interval = rating === 3 ? 6 : 3; }
      else { c.interval = Math.round(c.interval * c.ease * (rating === 3 ? 1.3 : 1)); }
      if (rating === 3) c.ease = Math.min(3.2, c.ease + 0.1);
      c.reps += 1;
    }
    c.due = addDays(today(), c.interval);
    c.last = today();
  }

  function dueIds(limit) {
    var t = today();
    return Object.keys(state.items)
      .filter(function (id) { return ITEMS[id] && state.items[id].due <= t; })
      .sort(function (a, b) { return state.items[a].due < state.items[b].due ? -1 : 1; })
      .slice(0, limit || 999);
  }

  function seenOfKind(kinds) {
    return Object.keys(state.items).filter(function (id) { return ITEMS[id] && kinds.indexOf(ITEMS[id].kind) >= 0; });
  }

  function unseenNew() { return NEW_ORDER.filter(function (id) { return !isSeen(id); }); }

  function streak() {
    var days = {};
    state.history.forEach(function (h) { days[h.date] = true; });
    var d = today();
    if (!days[d]) d = addDays(d, -1);
    var n = 0;
    while (days[d]) { n += 1; d = addDays(d, -1); }
    return n;
  }

  function doneToday() { return state.history.some(function (h) { return h.date === today() && h.type === "session"; }); }

  // =====================================================================
  // Tagesplan: welches Format heute?
  // =====================================================================

  var FORMATS = {
    neu: { name: "Neue Wörter", desc: "Neue Wörter und Sätze kennenlernen" },
    hoer: { name: "Hör-Rätsel", desc: "Hören und erraten, was gesagt wird" },
    luecke: { name: "Lückentext", desc: "Sätze vervollständigen wie im Schulbuch" },
    warum: { name: "Warum-Karte", desc: "Grammatik verstehen, mit der Logik dahinter" },
    satzbau: { name: "Satzbaukasten", desc: "Sätze aus Bausteinen zusammensetzen" },
    sprechen: { name: "Sprech-Challenge", desc: "Nachsprechen und deine Aussprache prüfen lassen" }
  };

  function planToday() {
    var learned = seenOfKind(["word", "sentence"]).length;
    var rnd = seeded("plan-" + today());
    var format;
    if (learned < 10) {
      format = "neu";
    } else {
      var pool = ["hoer", "luecke", "warum", "satzbau", "sprechen"];
      if (unseenNew().length) pool.push("neu", "neu");
      pool = pool.filter(function (f) { return f !== state.lastFormat; });
      format = pool[Math.floor(rnd() * pool.length)];
    }
    return { format: format, pron: C.pronunciation[(state.pronIndex || 0) % C.pronunciation.length], culture: C.culture[(state.cultureIndex || 0) % C.culture.length] };
  }

  // =====================================================================
  // Passwortfeld mit Auge
  // =====================================================================

  var EYE_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>';
  var EYE_CLOSED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.3 2.3 2 3.6l3.1 3.1C3.6 8 2.5 9.6 2 12c1 2.5 5 7 10 7 1.8 0 3.5-.6 4.9-1.4l3.5 3.5 1.3-1.3L3.3 2.3zM12 16.5A4.5 4.5 0 0 1 7.5 12c0-.7.2-1.4.5-2l1.5 1.5a2.5 2.5 0 0 0 3 3l1.5 1.5c-.6.3-1.3.5-2 .5zM12 5c5 0 9 4.5 10 7-.5 1.3-1.5 2.8-2.9 4.1l-3.3-3.3A4.5 4.5 0 0 0 11.2 7.5L8.6 5.6C9.7 5.2 10.8 5 12 5z"/></svg>';

  function passwordField(id, autocomplete) {
    var input = el("input", { type: "password", id: id, autocomplete: autocomplete, minLength: 8, required: true });
    var eye = el("button", { className: "eye", type: "button", "aria-label": "Passwort anzeigen", "aria-pressed": "false" });
    eye.innerHTML = EYE_OPEN;
    eye.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      eye.innerHTML = show ? EYE_CLOSED : EYE_OPEN;
      eye.setAttribute("aria-label", show ? "Passwort verbergen" : "Passwort anzeigen");
      eye.setAttribute("aria-pressed", String(show));
      input.focus();
    });
    return { wrap: el("div", { className: "pw" }, [input, eye]), input: input };
  }

  // =====================================================================
  // Bildschirm: Anmelden
  // =====================================================================

  function renderLogin() {
    clear();
    var email = el("input", { type: "email", id: "email", autocomplete: "email", inputMode: "email", required: true });
    var pw = passwordField("password", "current-password");
    var pass = pw.input;
    var msg = el("p", { className: "msg" });
    var loginBtn = el("button", { className: "btn", type: "submit" }, "Anmelden");
    var signupBtn = el("button", { className: "btn secondary", type: "button" }, "Konto erstellen");
    var forgotBtn = el("button", { className: "link", type: "button" }, "Passwort vergessen?");

    var form = el("form", { className: "card", noValidate: true }, [
      el("label", { htmlFor: "email" }, ["E-Mail", email]),
      el("label", { htmlFor: "password" }, ["Passwort (mindestens 8 Zeichen)", pw.wrap]),
      el("div", { className: "row" }, [loginBtn, signupBtn]),
      forgotBtn,
      msg
    ]);

    function setBusy(b) { loginBtn.disabled = b; signupBtn.disabled = b; forgotBtn.disabled = b; }
    function show(text, kind) { msg.textContent = text; msg.className = "msg " + (kind || ""); }

    forgotBtn.addEventListener("click", async function () {
      var addr = email.value.trim();
      if (!addr) { show("Trag oben zuerst deine E-Mail ein.", "error"); email.focus(); return; }
      setBusy(true);
      var res = await sb.auth.resetPasswordForEmail(addr, { redirectTo: location.origin + location.pathname });
      setBusy(false);
      if (res.error) show("Das hat nicht geklappt: " + res.error.message, "error");
      else show("Wir haben dir eine Mail geschickt. Öffne den Link darin, um ein neues Passwort zu setzen.", "ok");
    });

    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      setBusy(true);
      var res = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
      setBusy(false);
      if (res.error) show(/confirm/i.test(res.error.message) ? "Bitte zuerst den Link in der Bestätigungs-Mail öffnen." : "Anmelden hat nicht geklappt. E-Mail und Passwort prüfen.", "error");
    });

    signupBtn.addEventListener("click", async function () {
      if (pass.value.length < 8) { show("Das Passwort braucht mindestens 8 Zeichen.", "error"); return; }
      setBusy(true);
      var res = await sb.auth.signUp({ email: email.value.trim(), password: pass.value });
      setBusy(false);
      if (res.error) show("Konto erstellen hat nicht geklappt: " + res.error.message, "error");
      else if (!res.data.session) show("Fast fertig: Öffne den Link in der Bestätigungs-Mail und melde dich dann hier an.", "ok");
    });

    app.appendChild(el("header", { className: "stack" }, [
      el("p", { className: "eyebrow" }, "Tagalog"),
      el("h1", null, "Mabuhay!"),
      el("p", { className: "muted" }, "Melde dich an, damit die App deinen Fortschritt speichern kann.")
    ]));
    app.appendChild(form);
  }

  // =====================================================================
  // Neues Passwort
  // =====================================================================

  function newPasswordForm(onDone) {
    var pw1 = passwordField("newPassword", "new-password");
    var pw2 = passwordField("newPassword2", "new-password");
    var msg = el("p", { className: "msg" });
    var save = el("button", { className: "btn", type: "submit" }, "Passwort speichern");
    var form = el("form", { className: "stack", noValidate: true }, [
      el("label", { htmlFor: "newPassword" }, ["Neues Passwort (mindestens 8 Zeichen)", pw1.wrap]),
      el("label", { htmlFor: "newPassword2" }, ["Neues Passwort wiederholen", pw2.wrap]),
      el("div", { className: "row" }, [save]),
      msg
    ]);
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      msg.className = "msg error";
      if (pw1.input.value.length < 8) { msg.textContent = "Das Passwort braucht mindestens 8 Zeichen."; return; }
      if (pw1.input.value !== pw2.input.value) { msg.textContent = "Die beiden Passwörter sind nicht gleich."; return; }
      save.disabled = true;
      var res = await sb.auth.updateUser({ password: pw1.input.value });
      save.disabled = false;
      if (res.error) {
        msg.textContent = /different|same/i.test(res.error.message) ? "Das neue Passwort muss sich vom alten unterscheiden." : "Speichern hat nicht geklappt: " + res.error.message;
        return;
      }
      pw1.input.value = ""; pw2.input.value = "";
      msg.className = "msg ok";
      msg.textContent = "Neues Passwort gespeichert.";
      if (onDone) onDone();
    });
    return form;
  }

  function renderRecovery() {
    clear();
    app.appendChild(el("header", { className: "stack" }, [
      el("p", { className: "eyebrow" }, "Tagalog"),
      el("h1", null, "Neues Passwort"),
      el("p", { className: "muted" }, "Wähle ein Passwort, das du nur für diese App verwendest.")
    ]));
    app.appendChild(el("section", { className: "card" }, [
      newPasswordForm(function () {
        setTimeout(function () {
          history.replaceState(null, "", location.pathname);
          sb.auth.getSession().then(function (res) { currentUserId = null; route(res.data.session); });
        }, 1200);
      })
    ]));
  }

  // =====================================================================
  // Bildschirm: Startseite
  // =====================================================================

  function renderHome(session) {
    clear();
    var plan = planToday();
    var done = doneToday();
    var due = dueIds().length;
    var learned = seenOfKind(["word", "sentence"]).length;
    var total = C.words.length + C.sentences.length;

    app.appendChild(el("header", { className: "stack" }, [
      el("p", { className: "eyebrow" }, new Date().toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long" })),
      el("h1", null, greeting() + "!")
    ]));

    if (isIosBrowser()) {
      app.appendChild(el("p", { className: "notice" }, "Tipp: Tippe auf Teilen und dann auf „Zum Home-Bildschirm“. Dann startet die App wie eine normale App."));
    }

    var startBtn = el("button", { className: "btn big", type: "button" }, done ? "Extra-Runde üben" : "Session starten");
    startBtn.addEventListener("click", function () { done ? startPractice() : startSession(plan); });

    app.appendChild(el("section", { className: "card highlight" }, done ? [
      el("p", { className: "eyebrow" }, "Heute erledigt"),
      el("h2", null, "Magaling! Gut gemacht."),
      el("p", null, "Morgen wartet ein neues Format auf dich. Wenn du magst, kannst du noch eine kurze Extra-Runde mit fälligen Karten machen."),
      el("div", { className: "row" }, [startBtn])
    ] : [
      el("p", { className: "eyebrow" }, "Heute: " + FORMATS[plan.format].name),
      el("h2", null, FORMATS[plan.format].desc),
      el("ol", { className: "plan" }, [
        el("li", null, "Aussprache: " + plan.pron.title),
        el("li", null, due ? "Wiederholung: " + Math.min(due, 10) + " Karten" : "Wiederholung: heute nichts fällig"),
        el("li", null, FORMATS[plan.format].name),
        el("li", null, "Kultur: " + plan.culture.title)
      ]),
      el("div", { className: "row" }, [startBtn])
    ]));

    app.appendChild(el("section", { className: "stats" }, [
      stat(String(streak()), streak() === 1 ? "Tag in Folge" : "Tage in Folge"),
      stat(learned + "/" + total, "Wörter und Sätze"),
      stat(String(due), "heute fällig")
    ]));

    var reviewBtn = el("button", { className: "btn secondary", type: "button" }, "Prüfliste öffnen");
    reviewBtn.addEventListener("click", renderReviewList);
    var reviewedCount = Object.keys(state.review).length;
    app.appendChild(el("section", { className: "card" }, [
      el("h2", null, "Für Muttersprachler"),
      el("p", { className: "muted small" }, "Hier kann jemand, der Tagalog als Muttersprache spricht, alle Wörter und Sätze prüfen. Bisher geprüft: " + reviewedCount + " von " + (C.words.length + C.sentences.length) + "."),
      el("div", { className: "row" }, [reviewBtn])
    ]));

    var pwSection = el("section", { className: "card", hidden: true }, [
      el("h2", null, "Passwort ändern"),
      el("p", { className: "muted small" }, "Am besten ein Passwort, das du nur für diese App verwendest."),
      newPasswordForm(function () { setTimeout(function () { pwSection.hidden = true; }, 1500); })
    ]);
    app.appendChild(pwSection);

    var logout = el("button", { className: "btn secondary", type: "button" }, "Abmelden");
    logout.addEventListener("click", function () { sb.auth.signOut(); });
    var changePw = el("button", { className: "btn secondary", type: "button" }, "Passwort ändern");
    changePw.addEventListener("click", function () {
      pwSection.hidden = !pwSection.hidden;
      if (!pwSection.hidden) { pwSection.scrollIntoView({ behavior: "smooth", block: "start" }); pwSection.querySelector("input").focus(); }
    });
    app.appendChild(el("footer", { className: "stack small muted" }, [
      el("p", null, "Angemeldet als " + (session.user.email || "")),
      el("div", { className: "row" }, [changePw, logout]),
      el("p", null, "Version " + cfg.version + " · Woche " + C.week + ": " + C.title)
    ]));
  }

  function stat(value, label) {
    return el("div", { className: "stat" }, [el("p", { className: "stat-value" }, value), el("p", { className: "stat-label" }, label)]);
  }

  // =====================================================================
  // Session-Geruest: Schritte nacheinander, Fortschrittsbalken oben
  // =====================================================================

  var sessionResult = null;

  function sessionShell(steps, onFinish) {
    var index = 0;
    function next() {
      index += 1;
      if (index >= steps.length) { onFinish(); return; }
      show();
    }
    function show() {
      clear();
      var step = steps[index];
      var closeBtn = el("button", { className: "link", type: "button" }, "Beenden");
      closeBtn.addEventListener("click", function () { saveState(); route(currentSession, true); });
      var bar = el("div", { className: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(steps.length), "aria-valuenow": String(index + 1) },
        steps.map(function (s, i) { return el("span", { className: i < index ? "done" : (i === index ? "now" : "") }); }));
      app.appendChild(el("div", { className: "session-top" }, [
        el("div", { className: "row between" }, [el("p", { className: "eyebrow" }, (index + 1) + " / " + steps.length + " · " + step.label), closeBtn]),
        bar
      ]));
      var body = el("div", { className: "stack-lg" });
      app.appendChild(body);
      step.render(body, next);
    }
    show();
  }

  function startSession(plan) {
    sessionResult = { correct: 0, total: 0, newItems: 0, format: plan.format };
    var steps = [{ label: "Aussprache", render: function (b, n) { stepPronunciation(b, n, plan.pron); } }];
    if (dueIds().length) steps.push({ label: "Wiederholung", render: function (b, n) { stepReview(b, n, 10); } });
    steps.push({ label: FORMATS[plan.format].name, render: function (b, n) { MAIN[plan.format](b, n); } });
    steps.push({ label: "Kultur", render: function (b, n) { stepCulture(b, n, plan.culture); } });
    sessionShell(steps, function () {
      state.lastFormat = plan.format;
      state.pronIndex = (state.pronIndex || 0) + 1;
      state.cultureIndex = (state.cultureIndex || 0) + 1;
      state.history.push({ date: today(), type: "session", format: plan.format, correct: sessionResult.correct, total: sessionResult.total, newItems: sessionResult.newItems });
      saveState();
      renderFinish();
    });
  }

  function startPractice() {
    sessionResult = { correct: 0, total: 0, newItems: 0, format: "extra" };
    var steps = [];
    if (dueIds().length) steps.push({ label: "Wiederholung", render: function (b, n) { stepReview(b, n, 15); } });
    steps.push({ label: "Lückentext", render: function (b, n) { MAIN.luecke(b, n); } });
    sessionShell(steps, function () {
      state.history.push({ date: today(), type: "extra", correct: sessionResult.correct, total: sessionResult.total });
      saveState();
      renderFinish(true);
    });
  }

  function renderFinish(extra) {
    clear();
    var r = sessionResult;
    var pct = r.total ? Math.round((r.correct / r.total) * 100) : null;
    var homeBtn = el("button", { className: "btn big", type: "button" }, "Zur Startseite");
    homeBtn.addEventListener("click", function () { route(currentSession, true); });
    app.appendChild(el("header", { className: "stack" }, [
      el("p", { className: "eyebrow" }, extra ? "Extra-Runde fertig" : "Session fertig"),
      el("h1", null, pct === null || pct >= 70 ? "Magaling!" : "Kaya mo 'yan!"),
      el("p", { className: "muted" }, pct === null || pct >= 70 ? "Sehr gut gemacht." : "Du schaffst das. Die schwierigen Karten kommen bald wieder.")
    ]));
    app.appendChild(el("section", { className: "stats" }, [
      stat(r.total ? r.correct + "/" + r.total : "-", "richtig"),
      stat(String(r.newItems), "neu gelernt"),
      stat(String(streak()), streak() === 1 ? "Tag in Folge" : "Tage in Folge")
    ]));
    app.appendChild(el("div", { className: "row" }, [homeBtn]));
  }

  // Multiple-Choice-Frage. onAnswer(richtig) wird nach der Auswahl aufgerufen.
  function choiceQuestion(container, options, correctIndex, onAnswer, explain) {
    var list = el("div", { className: "choices" });
    var feedback = el("div", { className: "feedback-box", hidden: true });
    var answered = false;
    options.forEach(function (opt, i) {
      var b = el("button", { className: "choice", type: "button" }, opt);
      b.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        var ok = i === correctIndex;
        sessionResult.total += 1;
        if (ok) sessionResult.correct += 1;
        Array.prototype.forEach.call(list.children, function (c, j) {
          c.disabled = true;
          if (j === correctIndex) c.classList.add("right");
          else if (j === i) c.classList.add("wrong");
        });
        feedback.hidden = false;
        feedback.className = "feedback-box " + (ok ? "ok" : "bad");
        feedback.appendChild(el("p", { className: "verdict" }, ok ? "Tama! Richtig." : "Mali. Leider falsch."));
        if (explain) feedback.appendChild(typeof explain === "string" ? el("p", null, explain) : explain);
        onAnswer(ok, feedback);
      });
      list.appendChild(b);
    });
    container.appendChild(list);
    container.appendChild(feedback);
  }

  function nextButton(label, onClick) {
    var b = el("button", { className: "btn big", type: "button" }, label || "Weiter");
    b.addEventListener("click", onClick);
    return b;
  }

  // Drei falsche Antworten aus der gleichen Art von Eintraegen
  function distractors(item, field, count, rnd) {
    var pool = Object.keys(ITEMS).map(function (k) { return ITEMS[k]; })
      .filter(function (x) { return x.kind === item.kind && x.id !== item.id && x[field] && x[field] !== item[field]; });
    return shuffle(pool, rnd).slice(0, count).map(function (x) { return x[field]; });
  }

  // =====================================================================
  // Schritt: Aussprache
  // =====================================================================

  function stepPronunciation(body, next, rule) {
    prefetch(rule.examples);
    body.appendChild(el("section", { className: "card" }, [
      el("div", { className: "row between" }, [el("h2", null, rule.title), slowToggle()]),
      el("p", null, rule.tip),
      el("p", { className: "muted small" }, "Hör dir jedes Beispiel an, sprich es nach und lass es prüfen.")
    ]));
    rule.examples.forEach(function (ex) {
      body.appendChild(el("section", { className: "card" }, [phraseRow(ex, null), speechCheck(ex, { id: "pron:" + ex })]));
    });
    body.appendChild(el("div", { className: "row" }, [nextButton("Weiter", next)]));
  }

  // =====================================================================
  // Schritt: Wiederholung (Karteikarten)
  // =====================================================================

  function stepReview(body, next, limit) {
    var ids = dueIds(limit);
    var rnd = seeded("review-" + today() + "-" + ids.join(","));
    var i = 0;
    var box = el("div", { className: "stack-lg" });
    body.appendChild(box);
    prefetch(ids.filter(function (id) { return ITEMS[id].kind !== "grammar"; }).map(function (id) { return ITEMS[id].tl; }));

    function showCard() {
      box.innerHTML = "";
      if (i >= ids.length) { next(); return; }
      var item = ITEMS[ids[i]];
      var reverse = item.kind !== "grammar" && rnd() < 0.4; // manchmal Deutsch zuerst
      var front, back;
      if (item.kind === "grammar") {
        front = el("div", { className: "stack" }, [el("p", { className: "muted small" }, "Erinnerst du dich an die Regel?"), el("p", { className: "tl big" }, item.title)]);
        back = el("div", { className: "stack" }, item.body.map(function (p) { return el("p", null, p); }).concat(item.examples.map(function (ex) { return phraseRow(ex[0], ex[1]); })));
      } else if (reverse) {
        front = el("div", { className: "stack" }, [
          el("p", { className: "muted small" }, "Wie sagt man auf Tagalog? Sag es laut."),
          el("p", { className: "tl big" }, item.de),
          speechCheck(item.tl, { id: item.id, label: "Laut sagen und prüfen" })
        ]);
        back = el("div", { className: "stack" }, [phraseRow(item.tl, item.stress !== item.tl ? "Betonung: " + item.stress : null), item.note ? el("p", { className: "muted small" }, item.note) : null]);
      } else {
        front = el("div", { className: "stack" }, [el("p", { className: "muted small" }, "Was heißt das?"), phraseRow(item.tl, null)]);
        back = el("div", { className: "stack" }, [el("p", { className: "tl" }, item.de), item.stress !== item.tl ? el("p", { className: "muted small" }, "Betonung: " + item.stress) : null, item.note ? el("p", { className: "muted small" }, item.note) : null]);
      }
      back.hidden = true;
      var reveal = nextButton("Aufdecken", function () {
        back.hidden = false; reveal.hidden = true; rate.hidden = false;
        if (!reverse && item.kind !== "grammar") return;
        if (item.kind !== "grammar") speak(item.tl, null, true);
      });
      var rate = el("div", { className: "rate-row", hidden: true }, [
        rateBtn("Wusste ich nicht", 0, "bad"), rateBtn("Schwer", 1, "warn"), rateBtn("Gut", 2, "ok"), rateBtn("Leicht", 3, "ok")
      ]);
      function rateBtn(label, value, tone) {
        var b = el("button", { className: "rate " + tone, type: "button" }, label);
        b.addEventListener("click", function () {
          schedule(item.id, value);
          sessionResult.total += 1;
          if (value > 0) sessionResult.correct += 1;
          i += 1;
          saveState();
          showCard();
        });
        return b;
      }
      box.appendChild(el("p", { className: "muted small" }, "Karte " + (i + 1) + " von " + ids.length));
      box.appendChild(el("section", { className: "card flash" }, [front, back]));
      box.appendChild(reveal);
      box.appendChild(rate);
    }
    showCard();
  }

  // =====================================================================
  // Hauptteil-Formate
  // =====================================================================

  var MAIN = {};

  // --- Neue Woerter ---
  MAIN.neu = function (body, next) {
    var ids = unseenNew().slice(0, 5);
    if (!ids.length) { MAIN.hoer(body, next); return; }
    var items = ids.map(function (id) { return ITEMS[id]; });
    prefetch(items.map(function (x) { return x.tl; }));
    var i = 0;
    var box = el("div", { className: "stack-lg" });
    body.appendChild(box);

    function showIntro() {
      box.innerHTML = "";
      if (i >= items.length) { quiz(); return; }
      var it = items[i];
      box.appendChild(el("p", { className: "muted small" }, "Neu " + (i + 1) + " von " + items.length));
      box.appendChild(el("section", { className: "card flash" }, [
        el("div", { className: "row between" }, [el("p", { className: "eyebrow" }, it.kind === "sentence" ? "Satz" : "Wort"), slowToggle()]),
        phraseRow(it.tl, it.de),
        it.stress !== it.tl ? el("p", { className: "muted small" }, "Betonung: " + it.stress) : null,
        it.note ? el("p", { className: "muted small" }, it.note) : null,
        speechCheck(it.tl, { id: it.id, label: "Nachsprechen und prüfen" })
      ]));
      box.appendChild(nextButton("Weiter", function () { i += 1; showIntro(); }));
      speak(it.tl, null, true);
    }

    var q = 0;
    var order = shuffle(items, seeded("neu-" + today()));
    function quiz() {
      box.innerHTML = "";
      if (q >= order.length) {
        ids.forEach(introduce);
        sessionResult.newItems += ids.length;
        saveState();
        next();
        return;
      }
      var it = order[q];
      var rnd = seeded("neuq-" + it.id + today());
      var opts = shuffle([it.de].concat(distractors(it, "de", 3, rnd)), rnd);
      box.appendChild(el("p", { className: "muted small" }, "Kurzer Test " + (q + 1) + " von " + order.length));
      box.appendChild(el("section", { className: "card" }, [el("p", { className: "muted small" }, "Was heißt das?"), phraseRow(it.tl, null)]));
      var holder = el("div", { className: "stack" });
      box.appendChild(holder);
      choiceQuestion(holder, opts, opts.indexOf(it.de), function () {
        holder.appendChild(nextButton("Weiter", function () { q += 1; quiz(); }));
      });
    }
    showIntro();
  };

  // --- Hoer-Raetsel ---
  MAIN.hoer = function (body, next) {
    var pool = seenOfKind(["word", "sentence"]);
    var rnd = seeded("hoer-" + today());
    var ids = shuffle(pool, rnd).slice(0, 6);
    if (ids.length < 3) { MAIN.neu(body, next); return; }
    prefetch(ids.map(function (id) { return ITEMS[id].tl; }));
    var i = 0;
    var box = el("div", { className: "stack-lg" });
    body.appendChild(box);
    function round() {
      box.innerHTML = "";
      if (i >= ids.length) { saveState(); next(); return; }
      var it = ITEMS[ids[i]];
      var opts = shuffle([it.de].concat(distractors(it, "de", 3, rnd)), rnd);
      var big = el("button", { className: "listen-big", type: "button", "aria-label": "Anhören" });
      big.innerHTML = PLAY_ICON + "<span>Anhören</span>";
      big.addEventListener("click", function () { speak(it.tl, big); });
      box.appendChild(el("p", { className: "muted small" }, "Rätsel " + (i + 1) + " von " + ids.length + ": Was wird gesagt?"));
      box.appendChild(el("section", { className: "card center" }, [big, slowToggle()]));
      var holder = el("div", { className: "stack" });
      box.appendChild(holder);
      choiceQuestion(holder, opts, opts.indexOf(it.de), function (ok, fb) {
        fb.appendChild(el("p", { className: "tl" }, it.tl));
        if (!ok) schedule(it.id, 0);
        holder.appendChild(nextButton("Weiter", function () { i += 1; round(); }));
      });
    }
    round();
  };

  // --- Lueckentext ---
  MAIN.luecke = function (body, next) {
    var rnd = seeded("luecke-" + today() + (sessionResult.format === "extra" ? "x" : ""));
    var list = shuffle(C.clozes, rnd).slice(0, 6);
    var i = 0;
    var box = el("div", { className: "stack-lg" });
    body.appendChild(box);
    function round() {
      box.innerHTML = "";
      if (i >= list.length) { next(); return; }
      var c = list[i];
      var full = c.before + c.options[c.answer] + c.after;
      var gap = el("span", { className: "gap" }, "____");
      var opts = shuffle(c.options.map(function (o, k) { return { o: o, k: k }; }), rnd);
      box.appendChild(el("p", { className: "muted small" }, "Lücke " + (i + 1) + " von " + list.length));
      box.appendChild(el("section", { className: "card" }, [
        el("p", { className: "tl big" }, [c.before, gap, c.after]),
        el("p", { className: "de" }, c.de)
      ]));
      var holder = el("div", { className: "stack" });
      box.appendChild(holder);
      choiceQuestion(holder, opts.map(function (x) { return x.o; }), opts.findIndex(function (x) { return x.k === c.answer; }), function (ok, fb) {
        gap.textContent = c.options[c.answer];
        gap.className = "gap filled";
        fb.appendChild(phraseRow(full, null));
        holder.appendChild(nextButton("Weiter", function () { i += 1; round(); }));
      }, c.why);
    }
    round();
  };

  // --- Warum-Karte ---
  MAIN.warum = function (body, next) {
    var g = C.grammar.find(function (x) { return !isSeen(x.id); });
    if (!g) {
      var seen = C.grammar.slice().sort(function (a, b) { return card(a.id).due < card(b.id).due ? -1 : 1; });
      g = seen[0];
    }
    prefetch(g.examples.map(function (e) { return e[0]; }));
    var box = el("div", { className: "stack-lg" });
    body.appendChild(box);
    box.appendChild(el("section", { className: "card" }, [
      el("p", { className: "eyebrow" }, "Warum ist das so?"),
      el("h2", null, g.title)
    ].concat(g.body.map(function (p) { return el("p", null, p); }))
     .concat([el("div", null, g.examples.map(function (ex) { return phraseRow(ex[0], ex[1]); }))])));
    var q = 0;
    var quizBox = el("div", { className: "stack-lg" });
    box.appendChild(nextButton("Verstanden, testen", function (ev) { ev.currentTarget.hidden = true; ask(); }));
    box.appendChild(quizBox);
    var rnd = seeded("warum-" + g.id + today());
    function ask() {
      quizBox.innerHTML = "";
      if (q >= g.quiz.length) {
        if (!isSeen(g.id)) introduce(g.id); else schedule(g.id, 2);
        saveState();
        next();
        return;
      }
      var item = g.quiz[q];
      var opts = shuffle(item.options.map(function (o, k) { return { o: o, k: k }; }), rnd);
      quizBox.appendChild(el("section", { className: "card" }, [el("p", { className: "muted small" }, "Frage " + (q + 1) + " von " + g.quiz.length), el("p", { className: "tl" }, item.q)]));
      var holder = el("div", { className: "stack" });
      quizBox.appendChild(holder);
      choiceQuestion(holder, opts.map(function (x) { return x.o; }), opts.findIndex(function (x) { return x.k === item.answer; }), function () {
        holder.appendChild(nextButton("Weiter", function () { q += 1; ask(); }));
      });
      quizBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // --- Satzbaukasten ---
  MAIN.satzbau = function (body, next) {
    var rnd = seeded("satzbau-" + today());
    var seenS = C.sentences.filter(function (s) { return isSeen(s.id); });
    var list = shuffle(seenS.length >= 3 ? seenS : C.sentences, rnd).slice(0, 4);
    var i = 0;
    var box = el("div", { className: "stack-lg" });
    body.appendChild(box);
    function round() {
      box.innerHTML = "";
      if (i >= list.length) { next(); return; }
      var s = list[i];
      var tiles = shuffle(s.parts.map(function (p, k) { return { p: p, k: k }; }), rnd);
      if (tiles.every(function (t, k) { return t.k === k; })) tiles.reverse();
      var picked = [];
      var answerLine = el("div", { className: "answer-line" });
      var bank = el("div", { className: "bank" });
      var feedback = el("div", { className: "feedback-box", hidden: true });
      var check = nextButton("Prüfen", doCheck);
      check.disabled = true;

      function render() {
        answerLine.innerHTML = "";
        bank.innerHTML = "";
        if (!picked.length) answerLine.appendChild(el("span", { className: "muted small" }, "Tippe die Bausteine in der richtigen Reihenfolge an."));
        picked.forEach(function (t, idx) {
          var b = el("button", { className: "tile", type: "button" }, t.p);
          b.addEventListener("click", function () { picked.splice(idx, 1); render(); });
          answerLine.appendChild(b);
        });
        tiles.forEach(function (t) {
          if (picked.indexOf(t) >= 0) return;
          var b = el("button", { className: "tile", type: "button" }, t.p);
          b.addEventListener("click", function () { picked.push(t); render(); });
          bank.appendChild(b);
        });
        check.disabled = picked.length !== tiles.length;
      }
      function doCheck() {
        var built = picked.map(function (t) { return t.p; }).join(" ");
        var ok = built === s.parts.join(" ");
        sessionResult.total += 1;
        if (ok) sessionResult.correct += 1;
        else if (isSeen(s.id)) schedule(s.id, 0);
        check.hidden = true;
        Array.prototype.forEach.call(answerLine.querySelectorAll("button"), function (b) { b.disabled = true; });
        Array.prototype.forEach.call(bank.querySelectorAll("button"), function (b) { b.disabled = true; });
        feedback.hidden = false;
        feedback.className = "feedback-box " + (ok ? "ok" : "bad");
        feedback.appendChild(el("p", { className: "verdict" }, ok ? "Tama! Richtig." : "Fast. So ist es richtig:"));
        feedback.appendChild(phraseRow(s.tl, s.de));
        feedback.appendChild(nextButton("Weiter", function () { i += 1; round(); }));
        speak(s.tl, null, true);
      }
      box.appendChild(el("p", { className: "muted small" }, "Satz " + (i + 1) + " von " + list.length));
      box.appendChild(el("section", { className: "card" }, [el("p", { className: "muted small" }, "Bau diesen Satz auf Tagalog:"), el("p", { className: "tl big" }, s.de), answerLine]));
      box.appendChild(bank);
      box.appendChild(check);
      box.appendChild(feedback);
      render();
    }
    round();
  };

  // --- Sprech-Challenge ---
  MAIN.sprechen = function (body, next) {
    var rnd = seeded("sprechen-" + today());
    var pool = seenOfKind(["word", "sentence"]);
    // Bevorzugt Eintraege, die bisher schlecht verstanden wurden
    var speech = state.speech || {};
    pool.sort(function (a, b) { return ((speech[a] || {}).best || 0) - ((speech[b] || {}).best || 0) + (rnd() - 0.5) * 30; });
    var ids = pool.slice(0, 5);
    if (ids.length < 3) { MAIN.neu(body, next); return; }
    prefetch(ids.map(function (id) { return ITEMS[id].tl; }));
    var i = 0;
    var box = el("div", { className: "stack-lg" });
    body.appendChild(box);
    function round() {
      box.innerHTML = "";
      if (i >= ids.length) { saveState(); next(); return; }
      var it = ITEMS[ids[i]];
      var counted = false;
      var weiter = nextButton("Weiter", function () { i += 1; round(); });
      box.appendChild(el("p", { className: "muted small" }, "Challenge " + (i + 1) + " von " + ids.length + ": Erst anhören, dann nachsprechen."));
      box.appendChild(el("section", { className: "card" }, [
        el("div", { className: "row between" }, [el("p", { className: "eyebrow" }, it.kind === "sentence" ? "Satz" : "Wort"), slowToggle()]),
        phraseRow(it.tl, it.de),
        it.stress !== it.tl ? el("p", { className: "muted small" }, "Betonung: " + it.stress) : null,
        speechCheck(it.tl, { id: it.id, onResult: function (score) {
          if (counted) return;
          counted = true;
          sessionResult.total += 1;
          if (score >= 0.75) sessionResult.correct += 1;
        } })
      ]));
      box.appendChild(weiter);
    }
    round();
  };

  // =====================================================================
  // Schritt: Kultur
  // =====================================================================

  function stepCulture(body, next, k) {
    prefetch([k.word[0]]);
    body.appendChild(el("section", { className: "card" }, [
      el("p", { className: "eyebrow" }, "Kultur-Häppchen"),
      el("h2", null, k.title),
      el("p", null, k.text),
      phraseRow(k.word[0], k.word[1])
    ]));
    body.appendChild(el("div", { className: "row" }, [nextButton("Session abschließen", next)]));
  }

  // =====================================================================
  // Pruefliste fuer Muttersprachler
  // =====================================================================

  function renderReviewList() {
    clear();
    var back = el("button", { className: "link", type: "button" }, "Zurück");
    back.addEventListener("click", function () { route(currentSession, true); });
    app.appendChild(el("header", { className: "stack" }, [
      el("div", { className: "row between" }, [el("p", { className: "eyebrow" }, "Prüfliste"), back]),
      el("h1", null, "Salamat sa tulong!"),
      el("p", { className: "muted" }, "Please check each word or sentence: Is the Tagalog correct and natural? Is the German/English meaning right? Tap the play button to check the audio too."),
      el("p", { className: "muted small" }, "Bitte jeden Eintrag prüfen: Stimmt das Tagalog, klingt es natürlich, passt die Bedeutung?")
    ]));
    var all = C.words.map(function (w) { return ITEMS[w.id]; }).concat(C.sentences.map(function (s) { return ITEMS[s.id]; }));
    var list = el("section", { className: "card" });
    all.forEach(function (it) {
      var r = state.review[it.id] || {};
      var note = el("input", { type: "text", id: "note-" + it.id, placeholder: "Correction / comment", value: r.note || "" });
      var okBtn = el("button", { className: "rate ok" + (r.ok === true ? " picked" : ""), type: "button" }, "OK");
      var badBtn = el("button", { className: "rate bad" + (r.ok === false ? " picked" : ""), type: "button" }, "Wrong");
      function set(ok) {
        state.review[it.id] = { ok: ok, note: note.value.trim(), date: today() };
        okBtn.classList.toggle("picked", ok === true);
        badBtn.classList.toggle("picked", ok === false);
        saveState();
      }
      okBtn.addEventListener("click", function () { set(true); });
      badBtn.addEventListener("click", function () { set(false); });
      note.addEventListener("change", function () { set(state.review[it.id] ? state.review[it.id].ok : null); });
      list.appendChild(el("div", { className: "review-row" }, [
        phraseRow(it.tl, it.de, it.stress !== it.tl ? el("p", { className: "muted small" }, "Stress: " + it.stress) : null),
        el("div", { className: "row" }, [okBtn, badBtn]),
        note
      ]));
    });
    app.appendChild(list);
  }

  // =====================================================================
  // Start und Navigation
  // =====================================================================

  var currentUserId = null;
  var currentSession = null;
  var loading = null;
  var recovering = /type=recovery/.test(location.hash + location.search);

  async function route(session, force) {
    currentSession = session;
    if (recovering && session) { recovering = false; currentUserId = session.user.id; renderRecovery(); return; }
    var id = session && session.user ? session.user.id : null;
    if (!force && id === currentUserId && app.childElementCount > 1) return;
    currentUserId = id;
    if (!session) { state = null; renderLogin(); return; }
    if (!state || userId !== id) {
      if (!loading || userId !== id) {
        userId = id;
        state = null;
        clear();
        app.appendChild(el("p", { className: "muted" }, "Lernstand wird geladen ..."));
        loading = loadState();
      }
      await loading;
      loading = null;
      if (app.querySelector(".session-top")) return; // Session laeuft schon
    }
    renderHome(session);
  }

  sb.auth.onAuthStateChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY") recovering = true;
    if (event === "TOKEN_REFRESHED") { currentSession = session; return; }
    route(session);
  });
  sb.auth.getSession().then(function (res) { route(res.data.session); });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
