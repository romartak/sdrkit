/* SDR-Kit · núcleo + analizador + receptor avanzado + WiFi + sistema */
"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const SDR = {
  status: null,
  tab: "an",
  sub: "canales",
  modules: {},

  async api(path, body) {
    const opt = body === undefined ? {} : {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)};
    const r = await fetch(path, opt);
    if (r.status === 401) { location.href = "/login"; throw new Error(_t("Sesión expirada")); }
    const ct = r.headers.get("content-type") || "";
    const data = ct.includes("json") ? await r.json() : await r.text();
    if (!r.ok) throw new Error((data && data.error) || r.statusText);
    return data;
  },
  toast(msg, err) {
    const t = $("#toast");
    t.textContent = msg; t.className = "show" + (err ? " err" : "");
    clearTimeout(SDR._tt); SDR._tt = setTimeout(() => t.className = "", err ? 6000 : 3200);
  },
  // Log text goes into a <pre>, which is never auto-translated: translate it line by line so
  // known server messages (demo notices…) come out in English; real log lines stay as they are.
  trLog(text) { return String(text == null ? "" : text).split("\n").map(l => l.trim() ? _t(l) : l).join("\n"); },
  esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])); },
  fmtMHz(hz, span) {
    const s = span || 1e6;
    const dec = s < 2e5 ? 5 : s < 2e6 ? 4 : s < 5e7 ? 3 : 2;
    return (hz / 1e6).toFixed(dec) + " MHz";
  },
  fmtHz(hz) {
    if (hz == null || !isFinite(hz)) return "—";
    if (hz >= 1e6) return (hz / 1e6).toFixed(hz >= 1e7 ? 1 : 2) + " MHz";
    if (hz >= 1e3) return (hz / 1e3).toFixed(hz >= 1e4 ? 1 : 2) + " kHz";
    return hz.toFixed(0) + " Hz";
  },
  fmtBytes(b) { if (!b) return "0 B"; const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; while (b >= 1024 && i < 4) { b /= 1024; i++; } return b.toFixed(i ? 1 : 0) + " " + u[i]; },
  fmtDur(s) { s = Math.round(s || 0); return s < 60 ? s + " s" : Math.floor(s / 60) + " min " + (s % 60) + " s"; },
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
  download(name, url) { const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); },
  stamp() { return new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19); },

  // Modulación sugerida según la banda
  guessMod(hz) {
    const f = hz / 1e6;
    if (f >= 87.5 && f <= 108) return "wfm";
    if ((f > 108 && f < 137) || f < 1.8 || (f >= 26.9 && f <= 27.5) || (f >= 2.3 && f <= 26.1)) return "am";
    if (f >= 1.8 && f < 30) return f > 10 ? "usb" : "lsb";
    return "nfm";
  },

  // Abre el radio propio en una frecuencia (desde el analizador, la guía, el registro…)
  async openRadio(freq, mod, extra) {
    try {
      if (freq) await SDR.api("/api/radio", Object.assign({freq: Math.round(freq), mod: mod || SDR.guessMod(freq)}, extra || {}));
      if (!SDR.status || SDR.status.mode !== "radio") await SDR.api("/api/mode", {mode: "radio"});
      SDR.showTab("radio");
      setTimeout(SDR.pollStatus, 400);
      setTimeout(SDR.pollStatus, 1500);
    } catch (e) { SDR.toast(e.message, true); }
  },
  async useMode(mode) {
    try { await SDR.api("/api/mode", {mode}); setTimeout(SDR.pollStatus, 300); setTimeout(SDR.pollStatus, 1500); }
    catch (e) { SDR.toast(e.message, true); }
  },
  async saveMemory(freq, mod, name, group) {
    const n = prompt(_t("Nombre para {f} MHz:", {f: (freq / 1e6).toFixed(4)}), name || "");
    if (n === null) return null;
    const g = prompt(_t("Grupo (ej. Favoritos, Walkies, Repetidoras):"), group || "Favoritos");
    if (g === null) return null;
    try {
      const r = await SDR.api("/api/memories", {freq: Math.round(freq), mod: mod || SDR.guessMod(freq), name: n, group: g});
      SDR.toast(_t("Guardada en «{g}».", {g: _t(r.item.group)}));
      if (SDR.modules.radio) SDR.modules.radio.loadMemories();
      return r.item;
    } catch (e) { SDR.toast(e.message, true); return null; }
  },

  // ---------------------------------------------------------- pestañas
  showTab(name, sub) {
    const prev = SDR.tab;
    SDR.tab = name;
    $$(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + name));
    $$(".tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    if (sub) SDR.showSub(sub);
    try { localStorage.setItem("sdrkit.tab", name); } catch (e) {}
    for (const [k, m] of Object.entries(SDR.modules)) {
      if (k === prev && k !== name && m.onHide) m.onHide();
    }
    const m = SDR.modules[name];
    if (m && m.onShow) m.onShow();
    if (name === "more") SDR.showSub(SDR.sub);
    window.scrollTo(0, 0);
  },
  showSub(sub) {
    SDR.sub = sub;
    $$("#moreNav button").forEach(b => b.classList.toggle("active", b.dataset.sub === sub));
    $$("#tab-more .sub").forEach(s => s.classList.toggle("hidden", s.id !== "more-" + sub));
    if (sub === "wifi") Wifi.load();
    if (sub === "sys") Sys.render();
    if (sub === "rx") Owrx.render();
    if (sub === "ref" && SDR.modules.ref) SDR.modules.ref.onShow();
    if (sub === "ant" && SDR.modules.ant && SDR.modules.ant.onShow) SDR.modules.ant.onShow();
    if (sub === "canales" && SDR.modules.canales) SDR.modules.canales.onShow();
  },

  // ---------------------------------------------------------- estado general
  async pollStatus() {
    try {
      const s = await SDR.api("/api/status");
      SDR.status = s;
      SDR.renderChips();
      for (const m of Object.values(SDR.modules)) if (m.onStatus) m.onStatus(s);
      if (SDR.tab === "more") { if (SDR.sub === "sys") Sys.render(); if (SDR.sub === "rx") Owrx.render(); }
    } catch (e) { /* sin conexión */ }
  },
  renderChips() {
    const s = SDR.status; if (!s) return;
    const cm = $("#chipMode");
    const names = {sweep: _t("Analizador"), radio: _t("Radio"), sensors: _t("Sensores"), adsb: _t("Aviones"), ais: _t("Barcos"), receiver: _t("Receptor avanzado"), idle: _t("En reposo")};
    const label = s.switching ? _t("Cambiando…") : names[s.mode] || s.mode;
    cm.className = "chip on " + (s.switching ? "busy" : s.mode === "idle" ? "" : "ok");
    cm.innerHTML = '<span class="dot"></span>' + label;
    const n = s.net || {};
    $("#chipNet").textContent = n.mode === "hotspot" ? "📡 Hotspot" + (n.stations ? " · " + n.stations : "")
      : n.mode === "client" ? "📶 " + (n.ssid || "WiFi") : n.mode === "connecting" ? _t("📶 conectando…") : _t("Sin red");
    const t = s.sys && s.sys.temp;
    $("#chipTemp").textContent = t == null ? "—" : "🌡 " + t.toFixed(0) + "°C";
    const th = s.sys && s.sys.throttled;
    $("#chipWarn").classList.toggle("hidden", !(th && th.undervoltage_now));
  },
  setRecIndicator(on) {
    $("#chipRec").classList.toggle("hidden", !on);
    $("#tabRecDot").classList.toggle("on", !!on);
  },

  async init() {
    $$(".tabbar button").forEach(b => b.addEventListener("click", () => SDR.showTab(b.dataset.tab)));
    $$("#moreNav button").forEach(b => b.addEventListener("click", () => SDR.showSub(b.dataset.sub)));
    // un módulo con un error no debe dejar el panel entero sin arrancar
    for (const [name, m] of Object.entries(SDR.modules)) {
      if (!m.init) continue;
      try { m.init(); } catch (e) { console.error("SDR-Kit: module " + name + " failed to start", e); }
    }
    let tab = "an";
    try { tab = localStorage.getItem("sdrkit.tab") || "an"; } catch (e) {}
    await SDR.pollStatus();
    SDR.showTab(["an", "radio", "dec", "recs", "more"].includes(tab) ? tab : "an");
    setInterval(() => { if (!document.hidden) SDR.pollStatus(); }, 3000);
    document.addEventListener("visibilitychange", () => {
      for (const m of Object.values(SDR.modules)) if (m.onVisibility) m.onVisibility(!document.hidden);
      if (!document.hidden) SDR.pollStatus();
    });
  },
};

let busyAbort = false;
function showBusy(msg) { busyAbort = false; $("#busyText").textContent = msg; $("#busy").classList.remove("hidden"); }
function hideBusy() { $("#busy").classList.add("hidden"); }
$("#busyCancel").addEventListener("click", () => { busyAbort = true; hideBusy(); });

/* ======================================================================
   RECEPTOR AVANZADO (OpenWebRX+)
   ====================================================================== */
const Owrx = {
  url(freq, mod) {
    const port = (SDR.status && SDR.status.owrx.port) || 8073;
    const hash = freq ? "#freq=" + Math.round(freq) + (mod ? ",mod=" + mod : "") : "";
    return location.protocol + "//" + location.hostname + ":" + port + "/" + hash;
  },
  render() {
    const s = SDR.status; if (!s) return;
    const o = s.owrx;
    const modeName = {sweep: _t("analizador"), radio: _t("radio"), sensors: _t("sensores"), adsb: _t("aviones"), ais: _t("barcos")}[s.mode] || _t("reposo");
    $("#owrxState").textContent = !o.installed && !s.demo ? _t("OpenWebRX+ no está instalado.")
      : s.mode === "receiver" ? (o.ready ? _t("✅ Receptor encendido y listo.") : _t("⏳ Receptor iniciando…"))
      : _t("⏸ Apagado (el dongle está en modo {m}).", {m: modeName});
    $("#rxSettings").href = Owrx.url().replace(/\/$/, "") + "/settings";
  },
  async open(freq) {
    const s = SDR.status;
    if (s && s.demo) { SDR.toast(_t("En el modo demo no hay OpenWebRX+: en la Raspberry se abrirá aquí.")); return; }
    if (s && !s.owrx.installed) { SDR.toast(_t("OpenWebRX+ no está instalado. Revisa la guía de instalación."), true); return; }
    const mod = freq ? SDR.guessMod(freq) : null;
    if (!freq && s && s.mode === "receiver" && s.owrx.ready && !s.switching) { location.href = Owrx.url(); return; }
    showBusy(_t("Iniciando el receptor avanzado…"));
    try { await SDR.api("/api/mode", {mode: "receiver", freq: freq || null, mod}); }
    catch (e) { hideBusy(); SDR.toast(e.message, true); return; }
    const t0 = Date.now();
    await SDR.sleep(1500);
    while (!busyAbort && Date.now() - t0 < 120000) {
      try {
        const st = await SDR.api("/api/status"); SDR.status = st;
        if (st.mode === "receiver" && !st.switching && st.owrx.ready) {
          $("#busyText").textContent = _t("¡Listo! Abriendo…"); await SDR.sleep(1200);
          location.href = Owrx.url(freq, mod); return;
        }
        if (st.mode_msg) $("#busyText").textContent = st.mode_msg;
      } catch (e) {}
      await SDR.sleep(1000);
    }
    hideBusy();
    if (!busyAbort) SDR.toast(_t("El receptor tarda en responder. Prueba de nuevo en unos segundos."), true);
  },
};
$("#btnRxOpen").addEventListener("click", () => Owrx.open(null));

/* ======================================================================
   WIFI
   ====================================================================== */
const Wifi = {
  async load() {
    try {
      const r = await SDR.api("/api/wifi");
      const st = r.status, s = SDR.status || {};
      const ips = (s.net && s.net.ips || []).map(x => x.ip).join(", ");
      if (st.mode === "hotspot") {
        $("#netIco").textContent = "📡";
        $("#netTitle").textContent = _t("Hotspot propio «{s}» activo", {s: r.hotspot_ssid || ""});
        const hv = {n: st.stations || 0, ip: r.hotspot_ip || "192.168.4.1"};
        $("#netSub").textContent = st.forced === "hotspot"
          ? _t("{n} dispositivo(s) conectados · panel en http://{ip} · fijo (no busca otras redes)", hv)
          : _t("{n} dispositivo(s) conectados · panel en http://{ip} · buscará tus redes conocidas si nadie lo usa", hv);
      } else if (st.mode === "client") {
        $("#netIco").textContent = "📶";
        $("#netTitle").textContent = _t("Conectada a «{s}»", {s: st.ssid || st.connection});
        $("#netSub").textContent = "IP: " + (ips || "—") + (s.net && s.net.tailscale ? " · Tailscale: " + s.net.tailscale : "");
      } else {
        $("#netIco").textContent = "⏳";
        $("#netTitle").textContent = st.mode === "connecting" ? _t("Conectando…") : _t("Sin red");
        $("#netSub").textContent = _t("Si no encuentra una red conocida, la Raspberry crea su hotspot sola.");
      }
      const ul = $("#savedList");
      ul.innerHTML = !r.saved.length ? '<li class="muted">' + _t("No hay redes guardadas.") + '</li>' : r.saved.map(c =>
        `<li><div class="grow"><div><b>${SDR.esc(c.ssid)}</b></div><div class="muted small">${c.autoconnect ? _t("conexión automática") : _t("manual")} · ${_t("prioridad {p}", {p: c.priority})}</div></div>` +
        `<button class="btn sm" data-con="${SDR.esc(c.uuid)}">${_t("Conectar")}</button><button class="btn sm danger" data-del="${SDR.esc(c.uuid)}" data-name="${SDR.esc(c.ssid)}">${_t("Olvidar")}</button></li>`).join("");
    } catch (e) { SDR.toast(e.message, true); }
  },
  async save(connect) {
    const ssid = $("#wfSsid").value.trim(), password = $("#wfPass").value;
    if (!ssid) { SDR.toast(_t("Escribe el nombre de la red."), true); return; }
    if (connect && !confirm(_t("La Raspberry intentará conectarse a «{s}». Si lo logra, tu celular perderá la conexión actual. ¿Continuar?", {s: ssid}))) return;
    try {
      await SDR.api("/api/wifi/add", {ssid, password, hidden: $("#wfHidden").checked, connect});
      $("#wfPass").value = "";
      SDR.toast(connect ? _t("Conectando a «{s}»… si falla, el hotspot vuelve solo.", {s: ssid}) : _t("Red «{s}» guardada.", {s: ssid}));
      Wifi.load();
    } catch (e) { SDR.toast(e.message, true); }
  },
};
$("#savedList").addEventListener("click", async ev => {
  const c = ev.target.closest("[data-con]"), d = ev.target.closest("[data-del]");
  try {
    if (c) {
      if (!confirm(_t("La Raspberry se cambiará a esa red y tu celular perderá la conexión actual. ¿Continuar?"))) return;
      await SDR.api("/api/wifi/connect", {uuid: c.dataset.con}); SDR.toast(_t("Cambiando de red… vuelve a conectarte en un minuto."));
    }
    if (d) {
      if (!confirm(_t("¿Olvidar la red «{s}»?", {s: d.dataset.name}))) return;
      await SDR.api("/api/wifi/delete", {uuid: d.dataset.del}); Wifi.load();
    }
  } catch (e) { SDR.toast(e.message, true); }
});
$("#btnScan").addEventListener("click", async () => {
  const b = $("#btnScan"); b.disabled = true; b.textContent = "…";
  try {
    const r = await SDR.api("/api/wifi/scan", {});
    $("#ssidList").innerHTML = r.networks.map(n => `<option value="${SDR.esc(n.ssid)}">${n.signal}% · ${SDR.esc(n.security)}</option>`).join("");
    SDR.toast(r.networks.length ? _tn(r.networks.length, "{n} red encontrada: toca el campo del nombre para elegir.", "{n} redes encontradas: toca el campo del nombre para elegir.") : _t("No se encontraron redes."));
    $("#wfSsid").focus();
  } catch (e) { SDR.toast(e.message, true); }
  b.disabled = false; b.textContent = _t("Buscar");
});
$("#btnShowPass").addEventListener("click", () => { const p = $("#wfPass"); p.type = p.type === "password" ? "text" : "password"; });
$("#btnWifiSave").addEventListener("click", () => Wifi.save(false));
$("#btnWifiConnect").addEventListener("click", () => Wifi.save(true));
$("#btnHotspot").addEventListener("click", async () => {
  if (!confirm(_t("La Raspberry encenderá su propio hotspot «{s}» y dejará la red actual. ¿Continuar?", {s: (SDR.status && SDR.status.net.hotspot_ssid) || "SDR-Pi"}))) return;
  try { await SDR.api("/api/wifi/mode", {mode: "hotspot"}); SDR.toast(_t("Encendiendo hotspot… conéctate a él en unos segundos.")); } catch (e) { SDR.toast(e.message, true); }
});
$("#btnAuto").addEventListener("click", async () => {
  try { await SDR.api("/api/wifi/mode", {mode: "auto"}); SDR.toast(_t("Buscando redes conocidas… si no hay ninguna, el hotspot vuelve solo.")); } catch (e) { SDR.toast(e.message, true); }
});

/* ======================================================================
   SISTEMA
   ====================================================================== */
const Sys = {
  tile(label, value, sub, cls) { return `<div class="tile ${cls || ""}"><b>${SDR.esc(label)}</b><span>${SDR.esc(value)}</span>${sub ? `<small>${SDR.esc(sub)}</small>` : ""}</div>`; },
  render() {
    const s = SDR.status; if (!s) return;
    const y = s.sys, th = y.throttled;
    let power = _t("Sin datos"), pcls = "", psub = "";
    if (th) {
      if (th.undervoltage_now) { power = _t("BAJO VOLTAJE"); pcls = "bad"; psub = _t("Usa mejor cable/batería"); }
      else if (th.undervoltage_past) { power = _t("Hubo cortes"); pcls = "bad"; psub = _t("Bajo voltaje desde el arranque"); }
      else { power = "OK"; pcls = "good"; psub = th.throttled_now ? _t("CPU limitada por temperatura") : _t("Sin bajo voltaje"); }
    }
    const sdr = (s.usb || []).map(u => u.product || u.name).join(", ") || _t("No detectado");
    const up = (x) => { const d = Math.floor(x / 86400), h = Math.floor(x % 86400 / 3600), m = Math.floor(x % 3600 / 60); return (d ? d + "d " : "") + (h ? h + "h " : "") + m + "m"; };
    $("#tiles").innerHTML =
      Sys.tile(_t("Temperatura"), y.temp == null ? "—" : y.temp.toFixed(1) + " °C", y.temp > 75 ? _t("¡Caliente! Agrega disipador") : "", y.temp > 75 ? "bad" : "") +
      Sys.tile("CPU", y.cpu.toFixed(0) + " %", _t("carga {l}", {l: y.load.join(" / ")})) +
      Sys.tile(_t("Memoria"), SDR.fmtBytes(y.mem_used), _t("de {t}", {t: SDR.fmtBytes(y.mem_total)})) +
      Sys.tile(_t("Disco"), SDR.fmtBytes(y.disk_used), _t("de {t}", {t: SDR.fmtBytes(y.disk_total)})) +
      Sys.tile(_t("Energía"), power, psub, pcls) +
      Sys.tile(_t("Encendida hace"), up(y.uptime), s.hostname) +
      Sys.tile("SDR", sdr, _t("motor: {e}", {e: s.sweep.engine || "—"}), (s.usb || []).length ? "good" : "bad") +
      Sys.tile(_t("Versión"), "SDR-Kit " + s.version, s.demo ? _t("modo demo") : "");
    const port = s.owrx.port, host = s.hostname;
    const ips = (s.net.ips || []).map(x => x.ip);
    if (s.net.tailscale) ips.push(s.net.tailscale);
    const rows = [[_t("Panel (mismo WiFi, iPhone/PC)"), "http://" + host + ".local/"]];
    ips.forEach(ip => rows.push([_t("Panel vía {ip}", {ip}), "http://" + ip + "/"]));
    ips.forEach(ip => rows.push([_t("Receptor avanzado vía {ip}", {ip}), "http://" + ip + ":" + port + "/"]));
    $("#urlList").innerHTML = rows.map(r => `<li><div class="grow"><div class="muted small">${SDR.esc(r[0])}</div><div><a href="${SDR.esc(r[1])}">${SDR.esc(r[1])}</a></div></div></li>`).join("");
    $("#btnLogout").classList.toggle("hidden", !s.auth);
    if (typeof Upd !== "undefined") Upd.render();
  },
};
/* ======================================================================
   ACTUALIZACIONES (desde GitHub)
   ====================================================================== */
const Upd = {
  timer: null, startVer: null, startCommit: null,
  render() {
    const s = SDR.status; if (!s) return;
    $("#updVer").innerHTML = _t("Versión instalada: <b>{v}</b>", {v: SDR.esc(s.version)}) + `${s.commit ? ` <span class="muted">(${SDR.esc(s.commit)})</span>` : ""}`;
  },
  async check() {
    const b = $("#btnUpdCheck"); b.disabled = true; b.textContent = _t("Buscando…");
    $("#updInfo").textContent = _t("Consultando GitHub (hasta 30 s)…"); $("#btnUpdApply").classList.add("hidden");
    try {
      const r = await SDR.api("/api/system/update");
      if (!r.ok) {
        $("#updInfo").innerHTML = (r.online === false ? "📵 " : "⚠ ") + SDR.esc(r.error ? _t(r.error) : _t("No se pudo consultar."));
      } else if (r.demo) {
        $("#updInfo").textContent = _t("Modo demo: en la Raspberry aquí verás si hay una versión nueva y sus cambios.");
      } else if (!r.behind) {
        $("#updInfo").innerHTML = _t("✅ Estás al día (versión {v}).", {v: SDR.esc(r.current)});
      } else {
        $("#updInfo").innerHTML = _t("<b>Hay una versión nueva: {a} → {b}</b> · {n} cambio(s)", {a: SDR.esc(r.current), b: SDR.esc(r.latest), n: r.behind}) +
          (r.full ? '<br><span style="color:var(--warn)">' + _t("Necesita instalación completa (más lenta, al final se reinicia).") + '</span>' : "") +
          (r.changes && r.changes.length ? "<ul class=\"tips\">" + r.changes.slice(0, 12).map(c => `<li>${SDR.esc(c)}</li>`).join("") + "</ul>" : "");
        $("#btnUpdApply").classList.remove("hidden");
      }
    } catch (e) { $("#updInfo").textContent = "⚠ " + _t(e.message); }
    b.disabled = false; b.textContent = _t("🔎 Buscar actualizaciones");
    SDR.pollStatus();   // el punto de color junto a la versión refleja esta consulta
  },
  async apply(confirmed) {
    if (confirmed !== true && !confirm(_t("¿Actualizar ahora? El panel se reiniciará (≈1 minuto). Tu configuración y tus grabaciones se conservan."))) return;
    try {
      const r = await SDR.api("/api/system/update", {});
      if (r.demo) { SDR.toast(_t("Modo demo: no se actualiza nada.")); return; }
      Upd.startVer = SDR.status && SDR.status.version; Upd.startCommit = SDR.status && SDR.status.commit;
      $("#btnUpdApply").classList.add("hidden"); $("#updLog").classList.remove("hidden");
      $("#updInfo").textContent = _t("Actualizando… no apagues la Raspberry.");
      clearInterval(Upd.timer); Upd.timer = setInterval(Upd.poll, 2500);
    } catch (e) { SDR.toast(e.message, true); }
  },
  async poll() {
    try {
      const t = await SDR.api("/api/system/update/log");
      const raw = t.split("=== Actualización").pop();
      const pre = $("#updLog"); pre.textContent = SDR.trLog(raw); pre.scrollTop = pre.scrollHeight;
      if (/✔ Actualizado|↩ Volví|✖|Ya tienes la última/.test(raw)) {
        clearInterval(Upd.timer); Upd.timer = null;
        await SDR.pollStatus(); Upd.render();
        const okUpd = /✔ Actualizado/.test(raw);
        $("#updInfo").innerHTML = okUpd ? _t("✅ Actualizado. Recargando el panel…") : _t("Revisa el registro de abajo.");
        if (okUpd) setTimeout(() => location.reload(), 2500);
      }
    } catch (e) { $("#updInfo").textContent = _t("El panel se está reiniciando…"); }
  },
};
$("#btnUpdCheck").addEventListener("click", Upd.check);
$("#btnUpdApply").addEventListener("click", () => Upd.apply());

$("#btnLogs").addEventListener("click", async () => {
  const pre = $("#logs");
  if (!pre.classList.contains("hidden")) { pre.classList.add("hidden"); return; }
  try { pre.textContent = SDR.trLog(await SDR.api("/api/logs")); pre.classList.remove("hidden"); pre.scrollTop = pre.scrollHeight; } catch (e) { SDR.toast(e.message, true); }
});
$("#btnReboot").addEventListener("click", async () => {
  if (!confirm(_t("¿Reiniciar la Raspberry? Tarda ~1 minuto en volver."))) return;
  try { await SDR.api("/api/system/reboot", {}); SDR.toast(_t("Reiniciando… vuelve a abrir el panel en un minuto.")); } catch (e) { SDR.toast(e.message, true); }
});
$("#btnOff").addEventListener("click", async () => {
  if (!confirm(_t("¿Apagar la Raspberry? Para volver a encenderla tendrás que desconectar y conectar la batería."))) return;
  try { await SDR.api("/api/system/poweroff", {}); SDR.toast(_t("Apagando… espera 20 segundos antes de desconectar la batería.")); } catch (e) { SDR.toast(e.message, true); }
});
