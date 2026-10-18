/* SDR-Kit · Bienvenida, roadmap, calificar y compartir, versión en la cabecera y aviso de versiones nuevas (opcional, el usuario decide) */
"use strict";
const Welcome = (() => {
  const REPO = "https://github.com/romartak/sdrkit";
  const LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="#ffd400" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 18h3l2-9 3 13 3-17 3 11 2-4h4"/></svg>';
  const W = {steps: [], i: 0, kind: null, started: false, off: false, updFor: null, back: null};
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
  function open(kind, steps, back) {
    W.kind = kind; W.steps = steps; W.i = 0; W.back = back || null;
    if (kind === "welcome") store.set("sdrkit.welcome", "1");   // ya la vio: no vuelve a salir sola
    $("#wSheet").classList.remove("hidden");
    render();
  }
  // abre una hoja encima de la actual (p. ej. el roadmap desde la bienvenida) y «← Volver» regresa a ella
  function push(kind, steps) {
    open(kind, steps, W.kind ? {kind: W.kind, steps: W.steps, i: W.i} : null);
  }
  function pop() {
    const b = W.back; if (!b) return close();
    W.kind = b.kind; W.steps = b.steps; W.i = b.i; W.back = null;
    render();
  }
  function close() {
    $("#wSheet").classList.add("hidden");
    W.kind = null; W.back = null;
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

  // ------------------------------------------------------------ calificar y compartir
  // La calificación se guarda sólo en este navegador: no se envía a ningún servidor.
  const getRating = () => { const n = +store.get("sdrkit.rating"); return n >= 1 && n <= 5 ? n : 0; };
  const shareText = () => _t("SDR-Kit: convierte una Raspberry Pi y un dongle SDR en un laboratorio de radio manejado desde el celular. Gratis y de código abierto.");
  const enc = encodeURIComponent;
  function shareLinks() {
    const t = shareText();
    return [
      ["WhatsApp", "💬", "https://wa.me/?text=" + enc(t + " " + REPO)],
      ["Telegram", "✈️", "https://t.me/share/url?url=" + enc(REPO) + "&text=" + enc(t)],
      ["X", "🐦", "https://twitter.com/intent/tweet?text=" + enc(t) + "&url=" + enc(REPO)],
      ["Facebook", "📘", "https://www.facebook.com/sharer/sharer.php?u=" + enc(REPO)],
      [_t("Correo"), "✉️", "mailto:?subject=" + enc("SDR-Kit") + "&body=" + enc(t + "\n\n" + REPO)],
    ];
  }
  const starsHtml = () => {
    const r = getRating();
    return `<div class="stars" role="group" aria-label="${SDR.esc(_t("Calificar el proyecto"))}">` +
      [1, 2, 3, 4, 5].map(n => `<button type="button" data-rate="${n}" class="${n <= r ? "on" : ""}" aria-label="${SDR.esc(_tn(n, "{n} estrella", "{n} estrellas"))}">★</button>`).join("") + "</div>";
  };
  const ratingNote = () => {
    const r = getRating();
    if (!r) return `<p class="muted small">${_t("Toca las estrellas para calificar SDR-Kit. Tu calificación se guarda sólo en este celular: no se envía a ningún lado.")}</p>`;
    return r >= 4
      ? `<p>${_t("¡Gracias! Si puedes, dale también una ⭐ en GitHub: es lo que más ayuda a que el proyecto crezca.")}</p>
         <p><a class="btn primary" href="${REPO}" target="_blank" rel="noopener">⭐ ${_t("Dar una estrella en GitHub")}</a></p>`
      : `<p>${_t("Gracias por decirlo con franqueza. ¿Qué mejorarías? Cuéntanoslo en GitHub y lo tendremos en cuenta.")}</p>
         <p><a class="btn" href="${REPO}/issues/new/choose" target="_blank" rel="noopener">💬 ${_t("Contar qué mejorar")}</a></p>`;
  };
  const shareBox = () => `<div class="wshare">` +
    (navigator.share ? `<button type="button" class="btn primary" data-native="1">📤 ${_t("Compartir…")}</button>` : "") +
    shareLinks().map(([name, ico, url]) => `<a class="btn" href="${SDR.esc(url)}" target="_blank" rel="noopener">${ico} ${SDR.esc(name)}</a>`).join("") +
    `<button type="button" class="btn" data-copy="1">🔗 ${_t("Copiar el enlace")}</button></div>`;
  async function copyLink() {
    try { await navigator.clipboard.writeText(REPO); SDR.toast(_t("Enlace copiado.")); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = REPO; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); SDR.toast(_t("Enlace copiado.")); } catch (e2) { SDR.toast(REPO); }
      ta.remove();
    }
  }
  async function nativeShare() {
    try { await navigator.share({title: "SDR-Kit", text: shareText(), url: REPO}); } catch (e) { /* canceló */ }
  }

  // ------------------------------------------------------------ roadmap
  const rmItem = (x, hl) => {
    const t = Roadmap.itemText(x);
    return `<li class="rmi ${x[1]}${hl ? " vision" : ""}"><span class="rmic" aria-hidden="true">${hl ? "🌍" : Roadmap.ICON[x[1]]}</span>
      <div><b>${SDR.esc(t.t)}</b><span>${SDR.esc(t.d)}</span></div></li>`;
  };
  const rmBar = () => { const c = Roadmap.counts();
    return `<div class="rmbar" aria-hidden="true"><i style="width:${Math.max(3, Math.round(100 * c.done / c.total))}%"></i></div>
      <p class="muted small" style="margin:6px 0 0">${_tn(c.done, "{n} de {total} funciones lista", "{n} de {total} funciones listas", {total: c.total})}</p>`; };
  function roadmapPreview() {
    const nx = Roadmap.next(), vision = Roadmap.all().find(x => x[0] === 35);
    return `<p>${_t("Esto es lo que quiero construir con SDR-Kit. Una función nueva cada día, todas gratis y de código abierto.")}</p>${rmBar()}
      <h4>${_t("Lo próximo")}</h4><ul class="rmlist">${rmItem(nx)}</ul>
      <h4>${_t("La gran visión")}</h4><ul class="rmlist">${rmItem(vision, true)}</ul>
      <p style="margin-top:12px"><button type="button" class="btn" data-open="roadmap">🗺 ${_t("Ver todo el roadmap")}</button></p>`;
  }
  function roadmapSteps() {
    return [{
      title: _t("Roadmap"),
      body: () => `<p>${_t("Lo que viene en SDR-Kit, en orden. Una función nueva cada día; las que dependen de otras van después.")}</p>${rmBar()}` +
        Roadmap.PHASES.map(p => `<h4>${_t("Fase {n}", {n: p[0]})} · ${SDR.esc(Roadmap.phaseName(p))}</h4><ul class="rmlist">${p[2].map(x => rmItem(x, x[0] === 35)).join("")}</ul>`).join("") +
        `<div class="wnote y">${_t("Todo lo que se agregue seguirá siendo opcional y apagado por defecto cuando necesite internet o cuentas. SDR-Kit sólo recibe; lo único que transmitiría (PTT) será para equipos y bandas con permiso, y compartir audio en la red mundial será siempre una decisión tuya.")}</div>
        <p class="small">${_t("¿Tienes una idea o quieres ayudar?")} <a href="${REPO}/issues/new/choose" target="_blank" rel="noopener">${_t("Cuéntala en GitHub")}</a> · <a href="${REPO}/blob/main/ROADMAP.md" target="_blank" rel="noopener">ROADMAP.md</a></p>`,
      buttons: () => [[W.back ? "back2" : "ok", W.back ? _t("← Volver") : _t("Cerrar"), "primary"]],
    }];
  }
  function shareSteps() {
    return [{
      title: _t("Compartir SDR-Kit"),
      body: () => `<p>${_t("Si SDR-Kit te sirve, cuéntaselo a alguien: así llega a más gente que ama la radio.")}</p>${shareBox()}
        <p class="muted small mono" style="margin-top:12px">${REPO.replace("https://", "")}</p>`,
      buttons: () => [[W.back ? "back2" : "ok", W.back ? _t("← Volver") : _t("Cerrar"), "primary"]],
    }];
  }
  function rateSteps() {
    return [{
      title: _t("Calificar SDR-Kit"),
      body: () => `<div class="whero"><p style="margin-top:0">${_t("¿Qué tal te parece SDR-Kit hasta ahora?")}</p>${starsHtml()}</div>${ratingNote()}`,
      buttons: () => [[W.back ? "back2" : "ok", W.back ? _t("← Volver") : _t("Cerrar"), "primary"]],
    }];
  }

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
    steps.push({title: _t("Hacia dónde va"), body: roadmapPreview});
    if (upd().notify == null) steps.push(stepUpdates);
    steps.push({title: _t("Apoya el proyecto"), body: () => `<div class="whero"><p style="margin-top:0">${_t("SDR-Kit es libre y gratuito. Si te gusta, califícalo, dale una estrella en GitHub o compártelo: eso ayuda a que siga mejorando.")}</p>${starsHtml()}</div>
      ${ratingNote()}<h4>${_t("Compartir")}</h4>${shareBox()}
      <p class="small" style="margin-top:12px"><a href="${REPO}" target="_blank" rel="noopener">⭐ ${_t("Ver el repositorio en GitHub")}</a></p>`});
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
    if (id === "back2") return pop();
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
    $("#wBody").addEventListener("click", ev => {   // calificar, compartir y abrir el roadmap desde dentro de una hoja
      const r = ev.target.closest("[data-rate]"), o = ev.target.closest("[data-open]");
      if (r) { store.set("sdrkit.rating", r.dataset.rate); render(); return; }
      if (o) return push("roadmap", roadmapSteps());
      if (ev.target.closest("[data-copy]")) return copyLink();
      if (ev.target.closest("[data-native]")) return nativeShare();
    });
    $("#btnRoadmap").addEventListener("click", () => open("roadmap", roadmapSteps()));
    $("#btnRate").addEventListener("click", () => open("rate", rateSteps()));
    $("#btnShare").addEventListener("click", () => open("share", shareSteps()));
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
