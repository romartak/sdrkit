/* SDR-Kit · Decodificar: mensajes (multimon-ng), sensores (rtl_433), aviones (dump1090) y catálogo */
"use strict";
const Dec = (() => {
  const D = {sub: "msg", timer: null, slow: null, decoded: [], sensors: null, adsb: null, catalog: null,
    trails: {}, sel: null, loc: null, aprs: []};
  const KINDS = {pocsag: "POCSAG", flex: "FLEX", aprs: "APRS", eas: "EAS", selcall: "Selcall", cw: "Morse", fms: "FMS"};
  // [nombre, MHz, modo, decodificadores]
  const MSG_PRESETS = [
    ["APRS · Américas 144.390", 144.39, "nfm", ["aprs"]],
    ["APRS · Europa 144.800", 144.8, "nfm", ["aprs"]],
    ["APRS · Estación Espacial ISS 145.825", 145.825, "nfm", ["aprs"]],
    ["APRS · Japón 144.640 / Australia 145.175", 144.64, "nfm", ["aprs"]],
    ["Buscapersonas VHF (busca la frecuencia local: 152–159 MHz)", 152.84, "nfm", ["pocsag", "flex"]],
    ["Buscapersonas 929–931 MHz (América)", 929.6125, "nfm", ["pocsag", "flex"]],
    ["Buscapersonas 466 MHz (Europa)", 466.075, "nfm", ["pocsag"]],
    ["NOAA Weather Radio · alertas EAS 162.550", 162.55, "nfm", ["eas"]],
    ["NOAA Weather Radio · alertas EAS 162.400", 162.4, "nfm", ["eas"]],
    ["Selcall / FMS (servicios, flotas)", 0, "nfm", ["selcall", "fms"]],
    ["Morse en VHF/UHF (balizas)", 0, "usb", ["cw"]],
  ];
  const OWRX_FREQ = {ais: 161.975e6, acars: 131.55e6, uat: 978e6, sonde: 403e6, lora: 433.775e6, rds: 98.1e6, ft8: 14.074e6,
    js8: 7.078e6, wxsat: 137.1e6, freedv: 14.236e6};
  const PANEL_GO = {pocsag: ["dec", "msg"], aprs: ["dec", "msg"], eas: ["dec", "msg"], selcall: ["dec", "msg"], cw: ["dec", "msg"],
    sensors: ["dec", "ism"], adsb: ["dec", "air"], ctcss: ["radio"], dsd: ["radio"], digid: ["radio"]};
  const GAINS = [0, 0.9, 1.4, 2.7, 3.7, 7.7, 8.7, 12.5, 14.4, 15.7, 16.6, 19.7, 20.7, 22.9, 25.4, 28.0, 29.7, 32.8, 33.8, 36.4,
    37.2, 38.6, 40.2, 42.1, 43.4, 43.9, 44.5, 48.0, 49.6];
  const ago = (t) => { const s = Math.max(0, Math.round(Date.now() / 1000 - t)); return s < 60 ? "hace " + s + " s" : s < 3600 ? "hace " + Math.round(s / 60) + " min" : "hace " + (s / 3600).toFixed(1) + " h"; };

  // ------------------------------------------------------------------ navegación
  function showSub(sub) {
    D.sub = sub;
    $$("#decNav button").forEach(b => b.classList.toggle("active", b.dataset.dsub === sub));
    $$("#tab-dec .dsub").forEach(s => s.classList.toggle("hidden", s.id !== "dec-" + sub));
    try { localStorage.setItem("sdrkit.dsub", sub); } catch (e) {}
    restart();
  }
  function restart() {
    clearInterval(D.timer); clearInterval(D.slow); D.timer = D.slow = null;
    if (SDR.tab !== "dec" || document.hidden) return;
    const s = D.sub;
    if (s === "msg") { loadDecoded(); D.timer = setInterval(loadDecoded, 2000); }
    if (s === "ism") { loadSensors(); D.timer = setInterval(loadSensors, 2000); }
    if (s === "air") { loadAdsb(); loadAprs(); D.timer = setInterval(loadAdsb, 1000); D.slow = setInterval(loadAprs, 5000); }
    if (s === "all") loadCatalog();
    renderStates();
  }
  function goto(tab, sub) {
    if (tab === "dec") { SDR.showTab("dec"); showSub(sub); } else SDR.showTab(tab);
  }

  // ------------------------------------------------------------------ estados comunes
  function renderStates() {
    const s = SDR.status; if (!s) return;
    const rp = s.radio && s.radio.params, on = rp && rp.data && rp.data.length && s.mode === "radio";
    $("#dmState").innerHTML = s.switching ? "Cambiando de modo…"
      : on ? `<b style="color:var(--ok)">● Decodificando ${SDR.esc(rp.data.map(k => KINDS[k] || k).join(", "))}</b> en ${(rp.freq / 1e6).toFixed(4)} MHz` +
        (s.radio.error ? " · ⚠ " + SDR.esc(s.radio.error) : "")
      : s.mode === "radio" ? "El radio está encendido sin decodificadores: elige qué decodificar y pulsa ▶."
      : "Al pulsar ▶ el dongle pasa al radio (se pausa " + ({sweep: "el analizador", sensors: "la búsqueda de sensores", adsb: "el radar de aviones", receiver: "el receptor avanzado"}[s.mode] || "lo demás") + ").";
    const sn = s.sensors || {};
    $("#snState").innerHTML = s.mode === "sensors"
      ? (sn.error ? "⚠ " + SDR.esc(sn.error) : sn.running ? '<b style="color:var(--ok)">● Escuchando sensores</b>' : "Iniciando rtl_433…")
      : "Detenido. Al iniciar, el dongle se dedica sólo a los sensores.";
    $("#snStart").classList.toggle("on", s.mode === "sensors");
    const ad = s.adsb || {};
    if (s.mode !== "adsb") $("#adState").textContent = "Radar apagado. Al encenderlo, el dongle se dedica sólo a 1090 MHz.";
    else if (ad.error) $("#adState").textContent = "⚠ " + ad.error;
    $("#adStart").classList.toggle("on", s.mode === "adsb");
  }

  // ------------------------------------------------------------------ mensajes
  function selectedKinds() { return $$("#dmKinds button.active").map(b => b.dataset.k); }
  function setKinds(list) { $$("#dmKinds button").forEach(b => b.classList.toggle("active", list.includes(b.dataset.k))); }
  async function loadDecoded() {
    try { const r = await SDR.api("/api/decoded"); D.decoded = r.items || []; renderDecoded(); } catch (e) {}
  }
  function renderDecoded() {
    const q = $("#dmSearch").value.trim().toLowerCase(), f = $("#dmFilter").value;
    const rows = D.decoded.filter(x => {
      if (f === "other" ? ["POCSAG", "FLEX", "APRS", "EAS"].some(k => x.kind.startsWith(k)) : f && !x.kind.startsWith(f)) return false;
      return !q || (x.text + " " + (x.address || "") + " " + (x.from || "")).toLowerCase().includes(q);
    }).slice(0, 300);
    $("#dmList").innerHTML = rows.length ? rows.map(x => {
      const pos = x.lat != null ? ` <a href="#" data-pos="${x.lat},${x.lon}" class="small">📍 en el radar</a>` : "";
      return `<li><span class="badge y">${SDR.esc(x.kind)}</span><span class="muted small">${new Date(x.t * 1000).toLocaleString()} · ${(x.freq / 1e6).toFixed(4)} MHz</span>` +
        `<div>${SDR.esc(x.text)}${pos}</div></li>`;
    }).join("") : '<li class="muted">Todavía no hay mensajes' + (q || f ? " con ese filtro" : "") + ".</li>";
  }
  async function startMsg() {
    const f = parseFloat($("#dmFreq").value), kinds = selectedKinds();
    if (!(f > 0)) { SDR.toast("Escribe la frecuencia en MHz.", true); return; }
    if (!kinds.length) { SDR.toast("Elige al menos un tipo de mensaje.", true); return; }
    try {
      await SDR.api("/api/radio", {freq: Math.round(f * 1e6), mod: $("#dmMod").value, data: kinds, activate: true, name: ""});
      SDR.toast("Decodificando en " + f.toFixed(4) + " MHz. Los mensajes aparecen a la derecha.");
      setTimeout(SDR.pollStatus, 500); setTimeout(SDR.pollStatus, 2000);
    } catch (e) { SDR.toast(e.message, true); }
  }

  // ------------------------------------------------------------------ sensores
  const FIELD = {
    temperature_C: ["🌡", (v) => v.toFixed(1) + " °C"], temperature_F: ["🌡", (v) => ((v - 32) / 1.8).toFixed(1) + " °C"],
    humidity: ["💧", (v) => v + " %"], pressure_kPa: ["🛞", (v) => v.toFixed(0) + " kPa (" + (v * 0.145038).toFixed(1) + " PSI)"],
    pressure_PSI: ["🛞", (v) => v.toFixed(1) + " PSI"], pressure_hPa: ["⏲", (v) => v.toFixed(1) + " hPa"],
    battery_ok: ["🔋", (v) => v ? "batería OK" : "batería BAJA"], wind_avg_km_h: ["🌬", (v) => v.toFixed(1) + " km/h"],
    wind_max_km_h: ["🌬", (v) => "ráfaga " + v.toFixed(1) + " km/h"], wind_avg_m_s: ["🌬", (v) => (v * 3.6).toFixed(1) + " km/h"],
    wind_dir_deg: ["🧭", (v) => v + "°"], rain_mm: ["🌧", (v) => v.toFixed(1) + " mm"], rain_in: ["🌧", (v) => (v * 25.4).toFixed(1) + " mm"],
    uv: ["☀", (v) => "UV " + v], light_lux: ["💡", (v) => v + " lux"], moisture: ["🌱", (v) => v + " %"],
    power_W: ["⚡", (v) => v + " W"], energy_kWh: ["⚡", (v) => v + " kWh"], state: ["🔔", (v) => v], event: ["🔔", (v) => v],
    button: ["🔘", (v) => "botón " + v], cmd: ["🔘", (v) => "cmd " + v], code: ["🔢", (v) => v], type: ["🏷", (v) => v],
  };
  function fieldChips(fields, plain) {
    const list = Object.entries(fields || {}).filter(([k, v]) => v !== null && v !== "" && typeof v !== "object").map(([k, v]) => {
      const f = FIELD[k];
      return [k, v, f ? f[0] + " " + f[1](v) : k + ": " + v];
    });
    if (plain) return list.map(([k, v, t]) => SDR.esc(t)).join(" · ");
    return list.map(([k, v, t]) => `<span class="fchip${k === "battery_ok" && !v ? " bad" : ""}">${SDR.esc(t)}</span>`).join("");
  }
  async function loadSensors() {
    try {
      const r = await SDR.api("/api/sensors"); D.sensors = r;
      if (!$("#snPreset").options.length) {
        const names = {"433": "433.92 MHz (lo más común)", "315": "315 MHz (América: llantas, alarmas)", "868": "868 MHz (Europa)",
          "915": "915 MHz (América)", "345": "345 MHz (alarmas Honeywell)", "433+868": "433 + 868 MHz", "433+315": "433 + 315 MHz", "433+915": "433 + 915 MHz"};
        $("#snPreset").innerHTML = r.presets.map(p => `<option value="${p}">${SDR.esc(names[p] || p)}</option>`).join("");
      }
      if (document.activeElement !== $("#snPreset")) $("#snPreset").value = r.params.preset;
      if (document.activeElement !== $("#snHop")) $("#snHop").value = String(r.params.hop);
      if (document.activeElement !== $("#snGain")) $("#snGain").value = String(r.params.gain);
      const devs = r.devices || [];
      $("#snDevices").innerHTML = devs.length ? devs.map(d => {
        const sig = d.rssi != null ? `${Number(d.rssi).toFixed(1)} dB` + (d.snr != null ? ` · SNR ${Number(d.snr).toFixed(0)}` : "") : "";
        return `<div class="card sncard"><div class="snh"><b>${SDR.esc(d.model)}</b><span class="muted small">${SDR.esc(ago(d.last))}</span></div>` +
          `<div class="muted small">ID ${SDR.esc(d.id == null ? "—" : d.id)}${d.channel != null ? " · canal " + SDR.esc(d.channel) : ""}${d.freq ? " · " + Number(d.freq).toFixed(2) + " MHz" : ""} · ${d.count} ${d.count === 1 ? "lectura" : "lecturas"}${sig ? " · " + sig : ""}</div>` +
          `<div class="fchips">${fieldChips(d.fields)}</div></div>`;
      }).join("") : '<div class="card muted">Aún no se detectan sensores. Tip: en una zona residencial suelen aparecer en minutos (termómetros, llantas de autos que pasan).</div>';
      const ev = (r.events || []).slice(0, 60);
      $("#snEvents").innerHTML = "<thead><tr><th>Hora</th><th>Modelo</th><th>ID</th><th>Datos</th></tr></thead><tbody>" +
        (ev.length ? ev.map(e => `<tr><td class="mono">${new Date(e.t * 1000).toLocaleTimeString()}</td><td>${SDR.esc(e.model)}</td><td class="mono">${SDR.esc(e.id == null ? "" : e.id)}</td><td class="small">${fieldChips(e.fields, true)}</td></tr>`).join("")
          : '<tr><td colspan="4" class="muted">—</td></tr>') + "</tbody>";
    } catch (e) {}
  }

  // ------------------------------------------------------------------ aviones
  async function loadAdsb() {
    try {
      const r = await SDR.api("/api/adsb"); D.adsb = r;
      const loc = r.location;
      if (loc && loc.source === "manual" && document.activeElement !== $("#adLat") && document.activeElement !== $("#adLon") && !$("#adLat").value) {
        $("#adLat").value = loc.lat; $("#adLon").value = loc.lon;
      }
      $("#adLocNote").textContent = loc ? (loc.source === "manual" ? "Ubicación guardada: " + loc.lat.toFixed(4) + ", " + loc.lon.toFixed(4)
        : "Ubicación estimada con los aviones recibidos (guarda la tuya para distancias exactas).") : "Sin ubicación, el radar usa el centro de los aviones recibidos.";
      if (document.activeElement !== $("#adGain") && r.params) $("#adGain").value = String(r.params.gain);
      const s = SDR.status;
      if (s && s.mode === "adsb" && !(r.info && r.info.error)) {
        const n = (r.aircraft || []).length, pos = (r.aircraft || []).filter(a => a.lat != null).length;
        $("#adState").innerHTML = `<b style="color:var(--ok)">● Radar encendido</b> · ${n} aviones (${pos} con posición) · ${r.messages || 0} mensajes · ${r.today || 0} distintos hoy`;
      }
      const now = Date.now();
      for (const a of r.aircraft || []) {
        if (a.lat == null) continue;
        const t = D.trails[a.hex] || (D.trails[a.hex] = []);
        const last = t[t.length - 1];
        if (!last || last[0] !== a.lat || last[1] !== a.lon) t.push([a.lat, a.lon, now]);
        if (t.length > 40) t.shift();
      }
      for (const k of Object.keys(D.trails)) { const t = D.trails[k]; if (now - t[t.length - 1][2] > 300000) delete D.trails[k]; }
      renderPlanes(); drawRadar();
    } catch (e) {}
  }
  async function loadAprs() {
    if (!$("#adAprs").checked) { D.aprs = []; return; }
    try {
      const r = await SDR.api("/api/decoded");
      const seen = {};
      for (const x of r.items || []) if (x.kind === "APRS" && x.lat != null && !seen[x.from]) seen[x.from] = x;
      D.aprs = Object.values(seen);
    } catch (e) {}
  }
  function center() {
    const loc = D.adsb && D.adsb.location;
    if (loc && loc.lat != null) return loc;
    const pts = ((D.adsb && D.adsb.aircraft) || []).filter(a => a.lat != null).concat(D.aprs);
    if (!pts.length) return null;
    return {lat: pts.reduce((s, a) => s + a.lat, 0) / pts.length, lon: pts.reduce((s, a) => s + a.lon, 0) / pts.length};
  }
  function km(c, lat, lon) {
    const x = (lon - c.lon) * Math.cos(c.lat * Math.PI / 180) * 111.32, y = (lat - c.lat) * 110.57;
    return [x, y];
  }
  function renderPlanes() {
    const list = ((D.adsb && D.adsb.aircraft) || []).slice().sort((a, b) => (a.dist_km == null) - (b.dist_km == null) || (a.dist_km || 0) - (b.dist_km || 0));
    const emerg = {"7700": "EMERG.", "7600": "SIN RADIO", "7500": "SECUESTRO"};
    $("#adTable").innerHTML = "<thead><tr><th>Vuelo</th><th>Altitud</th><th>Velocidad</th><th>Distancia</th><th>Squawk</th></tr></thead><tbody>" +
      (list.length ? list.map(a => {
        const alt = a.alt_baro == null ? "—" : a.alt_baro === "ground" ? "en tierra" : Math.round(a.alt_baro).toLocaleString("es") + " ft<br><span class='muted'>" + Math.round(a.alt_baro * 0.3048).toLocaleString("es") + " m</span>";
        const em = emerg[a.squawk];
        return `<tr data-hex="${SDR.esc(a.hex)}" class="${D.sel === a.hex ? "sel" : ""}${em ? " emerg" : ""}"><td><b>${SDR.esc((a.flight || "").trim() || "—")}</b><br><span class="muted mono">${SDR.esc(a.hex)}</span></td>` +
          `<td>${alt}</td><td>${a.gs == null ? "—" : Math.round(a.gs * 1.852) + " km/h"}${a.track == null ? "" : "<br><span class='muted'>rumbo " + Math.round(a.track) + "°</span>"}</td>` +
          `<td>${a.dist_km == null ? "—" : a.dist_km.toFixed(0) + " km" + (a.bearing != null ? "<br><span class='muted'>hacia " + a.bearing + "°</span>" : "")}</td>` +
          `<td class="mono">${SDR.esc(a.squawk || "—")}${em ? "<br><b class='small'>" + em + "</b>" : ""}</td></tr>`;
      }).join("") : '<tr><td colspan="6" class="muted">Sin aviones todavía.</td></tr>') + "</tbody>";
  }
  function drawRadar() {
    const c = $("#radar"); if (!c.clientWidth) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5), W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const ctx = c.getContext("2d"), R = Math.min(W, H) / 2 - 14 * dpr, cx = W / 2, cy = H / 2, range = +$("#adRange").value;
    ctx.fillStyle = "#04120a"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#164a2c"; ctx.fillStyle = "#3a8a5c"; ctx.lineWidth = 1; ctx.font = `${10 * dpr}px ui-monospace,monospace`;
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath(); ctx.arc(cx, cy, R * k / 4, 0, 2 * Math.PI); ctx.stroke();
      ctx.textAlign = "left"; ctx.fillText((range * k / 4) + " km", cx + 3 * dpr, cy - R * k / 4 + 11 * dpr);
    }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `bold ${11 * dpr}px system-ui,sans-serif`;
    [["N", 0, -1], ["S", 0, 1], ["E", 1, 0], ["O", -1, 0]].forEach(([t, x, y]) => ctx.fillText(t, cx + x * (R + 8 * dpr), cy + y * (R + 8 * dpr)));
    const ctr = center();
    if (!ctr) {
      ctx.fillStyle = "#3a8a5c"; ctx.font = `${13 * dpr}px system-ui,sans-serif`;
      ctx.fillText(SDR.status && SDR.status.mode === "adsb" ? "Esperando aviones…" : "Radar apagado", cx, cy + R / 2); return;
    }
    const P = (lat, lon) => { const [x, y] = km(ctr, lat, lon); return [cx + x / range * R, cy - y / range * R]; };
    if (!(SDR.status && SDR.status.mode === "adsb") && D.adsb && (D.adsb.aircraft || []).length) {
      ctx.fillStyle = "#ffb020"; ctx.font = `bold ${11 * dpr}px system-ui,sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("Radar apagado · última imagen" + (D.adsb.now ? " de las " + new Date(D.adsb.now * 1000).toLocaleTimeString() : ""), 8 * dpr, 8 * dpr);
      ctx.globalAlpha = 0.45;
    }
    ctx.fillStyle = "#3ddc84"; ctx.beginPath(); ctx.arc(cx, cy, 3 * dpr, 0, 2 * Math.PI); ctx.fill();
    for (const [hex, t] of Object.entries(D.trails)) {
      if (t.length < 2) continue;
      ctx.strokeStyle = hex === D.sel ? "rgba(255,212,0,.6)" : "rgba(61,220,132,.35)"; ctx.beginPath();
      t.forEach((p, i) => { const [x, y] = P(p[0], p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    }
    ctx.font = `${10 * dpr}px ui-monospace,monospace`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (const s of D.aprs) {
      const [x, y] = P(s.lat, s.lon); if (Math.hypot(x - cx, y - cy) > R + 20 * dpr) continue;
      ctx.fillStyle = "#3cc8f5"; ctx.beginPath(); ctx.moveTo(x, y - 5 * dpr); ctx.lineTo(x + 5 * dpr, y); ctx.lineTo(x, y + 5 * dpr); ctx.lineTo(x - 5 * dpr, y); ctx.closePath(); ctx.fill();
      ctx.fillText(s.from, x + 7 * dpr, y);
    }
    for (const a of (D.adsb && D.adsb.aircraft) || []) {
      if (a.lat == null) continue;
      const [x, y] = P(a.lat, a.lon); if (Math.hypot(x - cx, y - cy) > R + 20 * dpr) continue;
      const em = ["7700", "7600", "7500"].includes(a.squawk), sel = a.hex === D.sel;
      ctx.save(); ctx.translate(x, y); ctx.rotate(((a.track || 0) * Math.PI) / 180);
      ctx.fillStyle = em ? "#ff5c5c" : sel ? "#ffd400" : "#e6edf3";
      const s = 6 * dpr; ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(s, s); ctx.lineTo(0, s * 0.5); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = em ? "#ff9b9b" : "#cfe8d8";
      const fl = a.alt_baro == null || a.alt_baro === "ground" ? "" : " " + Math.round(a.alt_baro / 100).toString().padStart(3, "0");
      ctx.fillText(((a.flight || a.hex).trim()) + fl, x + 9 * dpr, y);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ catálogo
  async function loadCatalog() {
    try {
      const r = await SDR.api("/api/decoders"); D.catalog = r;
      const group = (where, title) => {
        const items = r.items.filter(i => i.where === where);
        return `<h3 style="margin-top:12px">${title}</h3><ul class="list">` + items.map(i => {
          const ok = i.available || (SDR.status && SDR.status.demo && where === "panel");
          const act = where === "panel" ? (PANEL_GO[i.key] ? `<button class="btn sm" data-go="${i.key}">Abrir</button>` : "")
            : `<button class="btn sm" data-owrx="${i.key}">Abrir</button>`;
          return `<li><div class="grow"><div><b>${SDR.esc(i.name)}</b></div><div class="muted small">${SDR.esc(i.note || "")}${!ok && i.needs.length ? " · falta: " + SDR.esc(i.needs.join(", ")) : ""}</div></div>` +
            `<span class="badge ${ok ? "g" : "r"}">${ok ? "listo" : "no instalado"}</span>${act}</li>`;
        }).join("") + "</ul>";
      };
      $("#allList").innerHTML = group("panel", "En este panel (funcionan sin internet)") + group("owrx", "En el receptor avanzado (OpenWebRX+)");
      $("#allNote").textContent = r.openwebrx ? "OpenWebRX+ instalado: sus decodificadores se abren en la página del receptor avanzado."
        : SDR.status && SDR.status.demo ? "Modo demo: en la Raspberry verás aquí qué quedó instalado." : "OpenWebRX+ no está instalado: sólo funcionan los del panel.";
      $("#ambeState").innerHTML = r.ambe ? '<b style="color:var(--ok)">✅ Códec AMBE configurado: DMR, D-Star, YSF, NXDN y P25 suenan en el receptor avanzado.</b>'
        : '<b style="color:var(--warn)">Sin códec AMBE.</b> Se ven y se identifican las señales (y sus datos: ID de radio, grupo, talker alias), pero la voz no se escucha.';
    } catch (e) {}
  }

  // ------------------------------------------------------------------ inicio
  function init() {
    $$("#decNav button").forEach(b => b.addEventListener("click", () => showSub(b.dataset.dsub)));
    $("#dmPreset").innerHTML = '<option value="">— Elige qué escuchar —</option>' + MSG_PRESETS.map((p, i) => `<option value="${i}">${SDR.esc(p[0])}</option>`).join("");
    $("#dmKinds").innerHTML = Object.entries(KINDS).map(([k, n]) => `<button data-k="${k}">${n}</button>`).join("");
    $("#dmKinds").addEventListener("click", ev => { const b = ev.target.closest("[data-k]"); if (b) b.classList.toggle("active"); });
    $("#dmPreset").addEventListener("change", ev => {
      const p = MSG_PRESETS[+ev.target.value]; if (!p) return;
      if (p[1]) $("#dmFreq").value = p[1]; $("#dmMod").value = p[2]; setKinds(p[3]);
      if (!p[1]) SDR.toast("Escribe la frecuencia: búscala con el analizador.");
    });
    setKinds(["aprs"]); $("#dmFreq").value = 144.39;
    $("#dmStart").addEventListener("click", startMsg);
    $("#dmStop").addEventListener("click", async () => { try { await SDR.api("/api/radio", {data: []}); SDR.toast("Decodificadores apagados."); SDR.pollStatus(); } catch (e) { SDR.toast(e.message, true); } });
    $("#dmListen").addEventListener("click", () => { const f = parseFloat($("#dmFreq").value); SDR.openRadio(f > 0 ? f * 1e6 : null, $("#dmMod").value); });
    $("#dmSearch").addEventListener("input", renderDecoded);
    $("#dmFilter").addEventListener("change", renderDecoded);
    $("#dmClear").addEventListener("click", async () => {
      if (!confirm("¿Borrar todos los mensajes decodificados?")) return;
      try { await SDR.api("/api/decoded/clear", {}); D.decoded = []; renderDecoded(); } catch (e) { SDR.toast(e.message, true); }
    });
    $("#dmList").addEventListener("click", ev => {
      const a = ev.target.closest("[data-pos]"); if (!a) return;
      ev.preventDefault(); $("#adAprs").checked = true; showSub("air");
    });
    const gainOpts = '<option value="auto">Auto</option>' + GAINS.map(g => `<option value="${g}">${g.toFixed(1)} dB</option>`).join("");
    $("#snGain").innerHTML = gainOpts; $("#adGain").innerHTML = gainOpts.replace('<option value="auto">Auto</option>', "");
    const snParams = () => ({preset: $("#snPreset").value || "433", hop: +$("#snHop").value, gain: $("#snGain").value});
    $("#snStart").addEventListener("click", async () => {
      try { await SDR.api("/api/sensors", Object.assign(snParams(), {activate: true})); SDR.toast("Buscando sensores… deja la antena vertical."); setTimeout(SDR.pollStatus, 800); }
      catch (e) { SDR.toast(e.message, true); }
    });
    ["#snPreset", "#snHop", "#snGain"].forEach(id => $(id).addEventListener("change", async () => {
      try { await SDR.api("/api/sensors", snParams()); } catch (e) { SDR.toast(e.message, true); }
    }));
    $("#snStop").addEventListener("click", () => SDR.useMode("sweep"));
    $("#snClear").addEventListener("click", async () => { try { await SDR.api("/api/sensors/clear", {}); loadSensors(); } catch (e) {} });
    $("#adStart").addEventListener("click", async () => {
      try { await SDR.api("/api/adsb", {activate: true}); SDR.toast("Radar encendido: los aviones aparecen en 10–60 s."); setTimeout(SDR.pollStatus, 800); }
      catch (e) { SDR.toast(e.message, true); }
    });
    $("#adStop").addEventListener("click", () => SDR.useMode("sweep"));
    $("#adGain").addEventListener("change", async ev => { try { await SDR.api("/api/adsb", {gain: ev.target.value}); } catch (e) { SDR.toast(e.message, true); } });
    $("#adRange").addEventListener("change", drawRadar);
    $("#adAprs").addEventListener("change", () => { loadAprs().then(drawRadar); });
    $("#adSaveLoc").addEventListener("click", async () => {
      const lat = parseFloat($("#adLat").value), lon = parseFloat($("#adLon").value);
      if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) { SDR.toast("Escribe latitud y longitud en grados decimales (ej. 18.4861, -69.9312).", true); return; }
      try { await SDR.api("/api/location", {lat, lon}); SDR.toast("Ubicación guardada."); loadAdsb(); } catch (e) { SDR.toast(e.message, true); }
    });
    $("#adGeo").addEventListener("click", () => {
      if (!navigator.geolocation || !window.isSecureContext) {
        SDR.toast("El navegador sólo da el GPS en páginas https. Copia tus coordenadas de Google Maps (mantén pulsado tu punto) y escríbelas.", true); return;
      }
      navigator.geolocation.getCurrentPosition(p => {
        $("#adLat").value = p.coords.latitude.toFixed(5); $("#adLon").value = p.coords.longitude.toFixed(5); $("#adSaveLoc").click();
      }, () => SDR.toast("No se pudo leer el GPS. Escribe las coordenadas a mano.", true), {timeout: 10000});
    });
    $("#adTable").addEventListener("click", ev => {
      const tr = ev.target.closest("[data-hex]"); if (!tr) return;
      D.sel = D.sel === tr.dataset.hex ? null : tr.dataset.hex; renderPlanes(); drawRadar();
    });
    $("#allList").addEventListener("click", ev => {
      const g = ev.target.closest("[data-go]"), o = ev.target.closest("[data-owrx]");
      if (g) { const t = PANEL_GO[g.dataset.go]; goto(t[0], t[1]); }
      if (o) Owrx.open(OWRX_FREQ[o.dataset.owrx] || null);
    });
    new ResizeObserver(drawRadar).observe($("#radar"));
    try { const s = localStorage.getItem("sdrkit.dsub"); if (["msg", "ism", "air", "all"].includes(s)) D.sub = s; } catch (e) {}
    $$("#decNav button").forEach(b => b.classList.toggle("active", b.dataset.dsub === D.sub));
    $$("#tab-dec .dsub").forEach(s => s.classList.toggle("hidden", s.id !== "dec-" + D.sub));
  }
  return {
    init, showSub,
    onShow() { restart(); },
    onHide() { restart(); },
    onStatus() { renderStates(); },
    onVisibility() { restart(); },
  };
})();
SDR.modules.dec = Dec;
