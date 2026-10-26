// Tagalog-App - Grundgeruest (Version 0.1)
// Bildschirme: Anmelden und Startseite mit Stimm-Test.
(function () {
  "use strict";

  var cfg = window.APP_CONFIG;
  var app = document.getElementById("app");

  if (!window.supabase || !cfg) {
    app.innerHTML = "";
    app.appendChild(el("p", { className: "notice" }, "Die App konnte nicht geladen werden. Bitte Internetverbindung prüfen und neu laden."));
    return;
  }

  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  var TEST_PHRASES = [
    { tl: "Magandang umaga po.", de: "Guten Morgen (höflich)" },
    { tl: "Magkano po ito?", de: "Wie viel kostet das?" },
    { tl: "Grabe, ang init ngayon. Pagod na pagod na ako.", de: "Krass, ist das heiß heute. Ich bin total müde." }
  ];

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
  var player = new Audio();
  var slow = false;

  // ---------- Hilfsfunktionen ----------

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === "dataset") Object.assign(node.dataset, props[k]);
        else if (k in node) node[k] = props[k];
        else node.setAttribute(k, props[k]);
      });
    }
    [].concat(children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
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

  async function readFunctionError(error) {
    try {
      if (error && error.context && typeof error.context.json === "function") {
        var body = await error.context.json();
        if (body && body.error) return body.error;
      }
    } catch (e) {}
    return "unknown";
  }

  async function getAudioUrl(text) {
    if (audioUrls[text]) return audioUrls[text];
    var res = await sb.functions.invoke("tts", { body: { text: text, voiceId: cfg.voiceId } });
    if (res.error) {
      var code = await readFunctionError(res.error);
      throw new Error(ERROR_TEXT[code] || "Die Stimme ist gerade nicht erreichbar.");
    }
    audioUrls[text] = res.data.url;
    return res.data.url;
  }

  async function playText(text, button, msg) {
    msg.textContent = "";
    msg.className = "msg";
    button.classList.add("busy");
    button.disabled = true;
    try {
      var url = await getAudioUrl(text);
      player.pause();
      player.src = url;
      player.playbackRate = slow ? 0.75 : 1;
      player.preservesPitch = true;
      await player.play();
    } catch (e) {
      msg.textContent = e.message || "Abspielen hat nicht geklappt.";
      msg.className = "msg error";
    } finally {
      button.classList.remove("busy");
      button.disabled = false;
    }
  }

  // ---------- Passwortfeld mit Auge ----------

  var EYE_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>';
  var EYE_CLOSED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.3 2.3 2 3.6l3.1 3.1C3.6 8 2.5 9.6 2 12c1 2.5 5 7 10 7 1.8 0 3.5-.6 4.9-1.4l3.5 3.5 1.3-1.3L3.3 2.3zM12 16.5A4.5 4.5 0 0 1 7.5 12c0-.7.2-1.4.5-2l1.5 1.5a2.5 2.5 0 0 0 3 3l1.5 1.5c-.6.3-1.3.5-2 .5zM12 5c5 0 9 4.5 10 7-.5 1.3-1.5 2.8-2.9 4.1l-3.3-3.3A4.5 4.5 0 0 0 11.2 7.5L8.6 5.6C9.7 5.2 10.8 5 12 5z"/></svg>';

  // Liefert { wrap, input }: das Eingabefeld plus Knopf zum Anzeigen/Verbergen
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

  // ---------- Bildschirm: Anmelden ----------

  function renderLogin() {
    app.innerHTML = "";
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

    forgotBtn.addEventListener("click", async function () {
      var addr = email.value.trim();
      if (!addr) { show("Trag oben zuerst deine E-Mail ein.", "error"); email.focus(); return; }
      setBusy(true);
      var res = await sb.auth.resetPasswordForEmail(addr, { redirectTo: location.origin + location.pathname });
      setBusy(false);
      if (res.error) show("Das hat nicht geklappt: " + res.error.message, "error");
      else show("Wir haben dir eine Mail geschickt. Öffne den Link darin, um ein neues Passwort zu setzen.", "ok");
    });

    function setBusy(b) { loginBtn.disabled = b; signupBtn.disabled = b; forgotBtn.disabled = b; }
    function show(text, kind) { msg.textContent = text; msg.className = "msg " + (kind || ""); }

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

  // ---------- Neues Passwort setzen ----------

  // Formular fuer ein neues Passwort. onDone wird nach Erfolg aufgerufen.
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
    app.innerHTML = "";
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

  // ---------- Bildschirm: Startseite ----------

  function renderHome(session) {
    app.innerHTML = "";

    app.appendChild(el("header", { className: "stack" }, [
      el("p", { className: "eyebrow" }, "Heute"),
      el("h1", null, greeting() + "!"),
      el("p", { className: "muted" }, new Date().toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long" }))
    ]));

    if (isIosBrowser()) {
      app.appendChild(el("p", { className: "notice" }, "Tipp: Tippe auf Teilen und dann auf „Zum Home-Bildschirm“. Dann startet die App wie eine normale App."));
    }

    app.appendChild(el("section", { className: "card highlight" }, [
      el("h2", null, "Deine erste Session"),
      el("p", null, "Kommt im nächsten Schritt: Aussprache, Wiederholung und das erste Tagesformat.")
    ]));

    var msg = el("p", { className: "msg" });
    var slowBtn = el("button", { className: "toggle", type: "button", "aria-pressed": "false" }, "Langsam");
    slowBtn.addEventListener("click", function () {
      slow = !slow;
      slowBtn.setAttribute("aria-pressed", String(slow));
      player.playbackRate = slow ? 0.75 : 1;
    });

    var phraseNodes = TEST_PHRASES.map(function (p) {
      var btn = el("button", { className: "play", type: "button", "aria-label": "Abspielen: " + p.tl });
      btn.innerHTML = PLAY_ICON;
      btn.addEventListener("click", function () { playText(p.tl, btn, msg); });
      return el("div", { className: "phrase" }, [
        el("div", { className: "text" }, [el("p", { className: "tl" }, p.tl), el("p", { className: "de" }, p.de)]),
        btn
      ]);
    });

    app.appendChild(el("section", { className: "card" }, [
      el("div", { className: "row", style: "justify-content:space-between" }, [el("h2", null, "Stimme testen"), slowBtn]),
      el("div", null, phraseNodes),
      msg
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
      el("p", null, "Version " + cfg.version)
    ]));
  }

  // ---------- Start ----------

  var currentUserId = null;
  // Kommt man ueber den Link aus der "Passwort vergessen"-Mail, steht type=recovery in der Adresse
  var recovering = /type=recovery/.test(location.hash + location.search);

  function route(session) {
    if (recovering && session) { recovering = false; currentUserId = session.user.id; renderRecovery(); return; }
    var id = session && session.user ? session.user.id : null;
    if (id === currentUserId && app.childElementCount > 1) return;
    currentUserId = id;
    if (session) renderHome(session);
    else renderLogin();
  }

  sb.auth.onAuthStateChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY") recovering = true;
    route(session);
  });
  sb.auth.getSession().then(function (res) { route(res.data.session); });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
