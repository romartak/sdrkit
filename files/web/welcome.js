/* SDR-Kit · Bienvenida, versión en la cabecera y aviso de versiones nuevas (opcional, el usuario decide) */
"use strict";
const Welcome = (() => {
  const REPO = "https://github.com/romartak/sdrkit";
  const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd400" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 18h3l2-9 3 13 3-17 3 11 2-4h4"/></svg>';
  const W = {steps: [], i: 0, kind: null, started: false, off: false, updFor: null};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* almacenamiento bloqueado */ } },
  };
  const upd = () => (SDR.status && SDR.status.update) || {};

  // ------------------------------------------------------------ versión en la cabecera
  function renderChip() {
    const s = SDR.status; if (!s) return;
    const u = upd(), chip = $("#verChip");
    $("#verTxt").textContent = "v" + s.version;
    const state = u.ok && u.behind > 0 ? "old" : u.ok && u.checked ? "ok" : "unk";
    chip.className = "verchip " + state;
    const label = state === "old" ? _t("Versión {v} · hay una nueva: {n}", {v: s.version, n: u.latest})
      : state === "ok" ? _t("Versión {v} · al día", {v: s.version})
      : _t("Versión {v} · sin revisar si hay una nueva", {v: s.version});
    chip.title = label; chip.setAttribute("aria-label", label);
  }

  // ------------------------------------------------------------ hoja (bienvenida / avisos)
  function open(kind, steps) {
    W.kind = kind; W.steps = steps; W.i = 0;
    $("#wSheet").classList.remove("hidden");
    render();
  }
  function close() {
    if (W.kind === "welcome") store.set("sdrkit.welcome", "1");
    $("#wSheet").classList.add("hidden");
    W.kind = null;
  }
  function render() {
    const st = W.steps[W.i];
    $("#wTitle").textContent = st.title;
    $("#wBody").innerHTML = st.body();
    $("#wDots").innerHTML = W.steps.length > 1 ? W.steps.map((_, k) => `<i class="${k === W.i ? "on" : ""}"></i>`).join("") : "";
    const btns = st.buttons ? st.buttons() : [];
    if (!st.buttons) {
      if (W.i > 0) btns.push(["back", _t("← Atrás"), ""]);
      btns.push(W.i < W.steps.length - 1 ? ["next", _t("Siguiente →"), "primary"] : ["done", _t("Empezar"), "primary"]);
    }
    $("#wBtns").innerHTML = btns.map(([id, label, cls]) => `<button type="button" class="btn ${cls}" data-w="${id}">${SDR.esc(label)}</button>`).join("");
    const first = $("#wBtns .primary"); if (first) first.focus();
  }
  function go(d) { W.i = Math.max(0, Math.min(W.steps.length - 1, W.i + d)); render(); }

  async function setNotify(on, quiet) {
    try {
      await SDR.api("/api/system/autoupdate", {on});
      if (!quiet) SDR.toast(on ? _t("Listo: te avisaremos cuando haya una versión nueva.") : _t("No se revisarán versiones nuevas. Puedes activarlo en Más → Sistema."));
      setTimeout(SDR.pollStatus, 300); setTimeout(SDR.pollStatus, 2500);
    } catch (e) { SDR.toast(e.message, true); }
  }

  // ------------------------------------------------------------ pasos
  const howItWorks = () => `<p>${_t("¿Quieres que SDR-Kit te avise cuando se publique una versión nueva en su repositorio?")}</p>
    <h4>${_t("Cómo funciona")}</h4><ul>
      <li>${_t("Cuando la Raspberry está conectada a <b>tu WiFi</b> (la red de tu casa que configuraste, la misma por la que entras por SSH), revisa en GitHub si hay una versión nueva: al conectarse y luego cada 6 horas.")}</li>
      <li>${_t("Si la hay, al abrir el panel te aparece un aviso con la lista de cambios. <b>Tú decides</b>: «Actualizar ahora» o «Más tarde».")}</li>
      <li>${_t("Lo único automático es el aviso: <b>nunca se instala nada sin que lo confirmes</b>.")}</li>
      <li>${_t("Con el hotspot propio de la Raspberry (sin internet) no revisa nada.")}</li></ul>
    <div class="wnote">🔒 ${_t("<b>Privacidad:</b> sólo se lee información pública del repositorio (el número de versión y la lista de cambios). No se envía nada tuyo: ni grabaciones, ni ubicación, ni contraseñas, ni configuración, ni datos personales. GitHub sólo ve la dirección IP de tu conexión, como en cualquier visita a una página web.")}</div>
    <p class="muted small">${_t("Puedes cambiarlo cuando quieras en Más → Sistema → Actualizaciones.")}</p>`;

  const stepUpdates = {
    title: _t("Avisos de versiones nuevas"),
    body: howItWorks,
    buttons: () => [["no", _t("Ahora no"), ""], ["yes", _t("✅ Sí, avísame"), "primary"]],
  };

  function welcomeSteps() {
    const s = SDR.status || {};
    const steps = [
      {title: _t("Bienvenido"), body: () => `<div class="whero">${LOGO}<h3>SDR-Kit</h3><span class="wver">v${SDR.esc(s.version || "")}</span>
        <p>${_t("Tu Raspberry Pi y un dongle SDR convertidos en un laboratorio de radio de bolsillo, manejado desde el celular. Sólo recibe: escucha, mide y decodifica.")}</p></div>`},
      {title: _t("Qué puedes hacer"), body: () => `<div class="wgrid">
        <div><b>📈 ${_t("Analizador")}</b><span>${_t("Mira qué frecuencias tienen actividad, mide señales y vigila 24/7.")}</span></div>
        <div><b>📻 ${_t("Radio")}</b><span>${_t("Escucha FM, AM y voz digital, detecta subtonos y escanea canales.")}</span></div>
        <div><b>🔓 ${_t("Decodificar")}</b><span>${_t("Buscapersonas, APRS, sensores de 433 MHz y radar de aviones.")}</span></div>
        <div><b>🎙 ${_t("Grabaciones")}</b><span>${_t("Todo lo que grabas, ordenado por día, con su registro de actividad.")}</span></div></div>
        <p class="muted small">${_t("Toca cualquier ⓘ del panel para saber qué hace cada parte, o el «?» de arriba para la guía rápida.")}</p>`},
    ];
    if (upd().notify == null) steps.push(stepUpdates);
    steps.push({title: _t("Apoya el proyecto"), body: () => `<div class="whero">⭐<p>${_t("SDR-Kit es libre y gratuito. Si te gusta, dale una estrella en GitHub, compártelo o reporta lo que falle: eso ayuda a que siga mejorando.")}</p>
      <p><a class="btn primary" href="${REPO}" target="_blank" rel="noopener">⭐ ${_t("Ver el repositorio en GitHub")}</a></p>
      <p class="muted small mono">${REPO.replace("https://", "")}</p></div>`});
    return steps;
  }

  function updateSteps() {
    const s = SDR.status || {}, u = upd();
    return [{
      title: _t("Hay una versión nueva"),
      body: () => `<div class="whero">${LOGO}<h3>${SDR.esc(s.version)} → ${SDR.esc(u.latest || "?")}</h3>
        <p>${_tn(u.behind || 0, "Se publicó {n} cambio en el repositorio.", "Se publicaron {n} cambios en el repositorio.")}</p></div>` +
        (u.changes && u.changes.length ? `<ul class="wchanges">${u.changes.map(c => `<li>${SDR.esc(c)}</li>`).join("")}</ul>` : "") +
        `<div class="wnote y">${_t("La actualización tarda ≈1 minuto y el panel se reinicia. Tu configuración, grabaciones y memorias se conservan; si la versión nueva falla, vuelve sola a la anterior.")}</div>`,
      buttons: () => [["later", _t("Más tarde"), ""], ["update", _t("⬇ Actualizar ahora"), "primary"]],
    }];
  }

  function versionSteps() {
    const s = SDR.status || {}, u = upd();
    const when = u.checked ? new Date(u.checked * 1000).toLocaleString(I18N.locale, {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}) : null;
    const line = u.ok && u.behind > 0 ? `🟠 ${_t("Hay una versión nueva: {v}", {v: SDR.esc(u.latest)})}`
      : u.ok && u.checked ? `🟢 ${_t("Estás al día.")}` : u.online === false ? `⚪ ${_t("Sin internet: no se pudo revisar.")}` : `⚪ ${_t("Todavía no se ha revisado si hay una versión nueva.")}`;
    return [{
      title: _t("Versión de SDR-Kit"),
      body: () => `<div class="whero">${LOGO}<h3>v${SDR.esc(s.version)}</h3><p>${line}</p>${when ? `<p class="muted small">${_t("Última revisión: {t}", {t: SDR.esc(when)})}</p>` : ""}</div>
        <div class="wnote">${u.notify ? _t("🔔 Avisos de versiones nuevas: <b>activados</b>.") : _t("🔕 Avisos de versiones nuevas: <b>desactivados</b>. Actívalos en Más → Sistema → Actualizaciones.")}</div>
        <p class="small"><a href="${REPO}" target="_blank" rel="noopener">⭐ ${_t("Ver el repositorio en GitHub")}</a></p>`,
      buttons: () => (u.ok && u.behind > 0 ? [["update", _t("⬇ Actualizar ahora"), "primary"]] : [["check", _t("🔎 Buscar ahora"), ""], ["ok", _t("Cerrar"), "primary"]]),
    }];
  }

  async function onButton(id) {
    if (id === "next") return go(1);
    if (id === "back") return go(-1);
    if (id === "yes" || id === "no") {
      await setNotify(id === "yes");
      if (W.kind === "welcome" && W.i < W.steps.length - 1) return go(1);
      return close();
    }
    if (id === "later") {
      store.set("sdrkit.updLater", JSON.stringify({v: upd().latest, t: Date.now()}));
      return close();
    }
    if (id === "update") { close(); SDR.showTab("more"); SDR.showSub("sys"); return Upd.apply(true); }
    if (id === "check") { close(); SDR.showTab("more"); SDR.showSub("sys"); return Upd.check(); }
    close();
  }

  // ------------------------------------------------------------ cuándo aparece cada cosa
  function maybeShow() {
    if (!SDR.status || W.kind || W.off) return;
    if (new URLSearchParams(location.search).has("nointro")) { W.off = true; return; }   // capturas de pantalla y pruebas
    const u = upd();
    if (!W.started) {   // al entrar: la bienvenida la primera vez; si nunca se eligió, la pregunta de los avisos
      W.started = true;
      if (store.get("sdrkit.welcome") !== "1") return open("welcome", welcomeSteps());
      if (u.notify == null) return open("ask", [stepUpdates]);
    }
    if (u.notify && u.ok && u.behind > 0 && W.updFor !== u.latest) {
      W.updFor = u.latest;   // una vez por versión y por visita
      let later = null;
      try { later = JSON.parse(store.get("sdrkit.updLater") || "null"); } catch (e) {}
      if (later && later.v === u.latest && Date.now() - later.t < 24 * 3600e3) return;   // «Más tarde»: vuelve a avisar mañana
      open("update", updateSteps());
    }
  }

  function syncSys() {
    const u = upd();
    const cb = $("#updNotify"); if (cb) cb.checked = !!u.notify;
  }

  function init() {
    $("#verChip").addEventListener("click", () => open("version", versionSteps()));
    $("#wBtns").addEventListener("click", ev => { const b = ev.target.closest("[data-w]"); if (b) onButton(b.dataset.w); });
    $("#wClose").addEventListener("click", close);
    $("#wSheet").addEventListener("click", ev => { if (ev.target.id === "wSheet") close(); });
    document.addEventListener("keydown", ev => { if (ev.key === "Escape" && W.kind) close(); });
    $("#updNotify").addEventListener("change", ev => setNotify(ev.target.checked));
    $("#btnIntro").addEventListener("click", () => open("welcome", welcomeSteps()));
  }
  function onStatus() {
    renderChip();
    syncSys();
    // si se está mostrando la versión y llega información nueva, se actualiza
    if (W.kind === "version") { W.steps = versionSteps(); render(); }
    maybeShow();   // también muestra un aviso de versión nueva que llega con el panel ya abierto
  }
  return {init, onStatus, open};
})();
SDR.modules.welcome = Welcome;
