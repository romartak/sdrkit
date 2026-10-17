/* SDR-Kit · Servicios y canales: planes completos para escuchar o escanear todo un servicio con un toque */
"use strict";
const Canales = (() => {
  const r = (start, n, step, prefix, first) => Array.from({length: n}, (_, k) => ({n: (first || 1) + k, f: +(start + k * step).toFixed(6), name: (prefix || "Canal ") + ((first || 1) + k)}));
  const list = (pairs, prefix) => pairs.map(([n, f]) => ({n, f, name: (prefix || "Canal ") + n}));
  // Marina VHF internacional: frecuencia que se escucha (simplex = la del barco; dúplex = la de la estación costera)
  const MARINE_SIMPLEX = new Set([6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 67, 68, 69, 71, 72, 73, 74, 77]);
  const marine = [];
  for (const n of [...Array(28).keys()].map(k => k + 1).concat([...Array(29).keys()].map(k => k + 60))) {
    if (n === 70) continue;  // canal 70 = DSC (datos)
    const ship = n <= 28 ? 156.0 + 0.05 * n : 156.025 + 0.05 * (n - 60);
    marine.push({n, f: +(MARINE_SIMPLEX.has(n) ? ship : ship + 4.6).toFixed(4),
      name: "Canal " + String(n).padStart(2, "0") + (n === 16 ? " · socorro" : n === 9 ? " · llamada" : n === 6 ? " · seguridad" : n === 13 ? " · puente" : "")});
  }
  marine.sort((a, b) => a.f - b.f);
  const CB = [26.965, 26.975, 26.985, 27.005, 27.015, 27.025, 27.035, 27.055, 27.065, 27.075, 27.085, 27.105, 27.115, 27.125,
    27.135, 27.155, 27.165, 27.175, 27.185, 27.205, 27.215, 27.225, 27.255, 27.235, 27.245, 27.265, 27.275, 27.285, 27.295,
    27.305, 27.315, 27.325, 27.335, 27.345, 27.355, 27.365, 27.375, 27.385, 27.395, 27.405];
  const frs = [...r(462.5625, 7, 0.025, "FRS ", 1), ...r(467.5625, 7, 0.025, "FRS ", 8), ...r(462.55, 8, 0.025, "FRS/GMRS ", 15)];
  // [id, icono, nombre, región, modo, descripción, canales | rango]
  const S = [
    {id: "pmr", ico: "📻", name: "PMR446 (walkie-talkies sin licencia)", reg: "E", mod: "nfm",
      info: "Los walkie-talkies baratos que se venden en tiendas (Motorola T-series, Cobra, Baofeng configurados en PMR). Uso libre en Europa y en muchos países de Latinoamérica. Escucharás familias, obras, eventos, cazadores, airsoft. Suelen usar subtono: el panel te lo muestra.",
      ch: r(446.00625, 16, 0.0125, "PMR ")},
    {id: "dpmr", ico: "🔢", name: "dPMR446 y DMR446 (walkie-talkies digitales)", reg: "E", mod: "dsd", dsd: "dpmr",
      info: "La versión digital de PMR446: dPMR (6.25 kHz) y DMR Tier I (12.5 kHz). Se escuchan en modo «Digital» (requiere DSD-FME). DMR446 usa los mismos canales de 12.5 kHz que PMR446 analógico.",
      ch: r(446.003125, 32, 0.00625, "dPMR ")},
    {id: "frs", ico: "📻", name: "FRS / GMRS (walkie-talkies de América)", reg: "A", mod: "nfm",
      info: "Los walkies familiares de 22 canales (Motorola Talkabout, Midland, Cobra). Muy usados en América: familias, comercios, eventos, construcción. GMRS además permite repetidoras: sus salidas están en los canales 15–22.",
      ch: frs},
    {id: "gmrsr", ico: "📡", name: "Repetidoras GMRS (entradas)", reg: "A", mod: "nfm",
      info: "Lo que los radios GMRS transmiten HACIA la repetidora (467.550–467.725). Útil para oír al radio que llama aunque la repetidora quede lejos.",
      ch: r(467.55, 8, 0.025, "GMRS 15R+", 15).map(c => Object.assign(c, {name: "Entrada repetidora " + c.n + "R"}))},
    {id: "murs", ico: "📻", name: "MURS (EE. UU.)", reg: "A", mod: "nfm",
      info: "5 canales de VHF sin licencia en EE. UU.: comercios, granjas, alarmas de entrada de vehículos (Dakota Alert) y radios de uso general.",
      ch: [{n: 1, f: 151.82, name: "MURS 1"}, {n: 2, f: 151.88, name: "MURS 2"}, {n: 3, f: 151.94, name: "MURS 3"},
        {n: 4, f: 154.57, name: "MURS 4 (azul)", mod: "nfmw"}, {n: 5, f: 154.6, name: "MURS 5 (verde)", mod: "nfmw"}]},
    {id: "lpd", ico: "📻", name: "LPD433 (69 canales de 433 MHz)", reg: "E", mod: "nfm",
      info: "Walkies de muy baja potencia en la banda de 433 MHz (Europa). Comparten espacio con controles remotos y sensores, que suenan como ráfagas cortas.",
      ch: r(433.075, 69, 0.025, "LPD ")},
    {id: "uhfcb", ico: "📻", name: "UHF CB 477 MHz (Australia y Nueva Zelanda)", reg: "O", where: "Australia y Nueva Zelanda", mod: "nfm",
      info: "La radio sin licencia de Australia y Nueva Zelanda: 80 canales en 476–477 MHz. Canales 5 y 35 = emergencias, 40 = carreteras (camiones), 1–8 = salidas de repetidoras (entran por el 31–38). Mucho uso en el campo, caravanas y 4×4.",
      ch: Array.from({length: 80}, (_, k) => {
        const n = k + 1, f = +(476.425 + (n <= 40 ? (n - 1) * 0.025 : (n - 41) * 0.025 + 0.0125)).toFixed(4);
        return {n, f, name: "UHF CB " + n + (n === 5 || n === 35 ? " · emergencias" : n === 40 ? " · carreteras" : n <= 8 ? " · repetidora" : "")};
      })},
    {id: "cn409", ico: "📻", name: "Walkies públicos 409 MHz (China)", reg: "O", where: "China", mod: "nfm",
      info: "Los walkie-talkies sin licencia de China (公众对讲机): 20 canales de 12.5 kHz en 409.7500–409.9875 MHz.",
      ch: r(409.75, 20, 0.0125, "409 · ")},
    {id: "cb", ico: "🚚", name: "Banda ciudadana CB 27 MHz (40 canales)", reg: "*", mod: "am",
      info: "Camioneros, taxis, aficionados. En América se usa AM (canal 19 = carreteras, 9 = emergencias); en Europa también FM. Necesita el RTL-SDR Blog V4 (o modo directo del V3) y una antena larga (≈2.6 m).",
      ch: CB.map((f, k) => ({n: k + 1, f, name: "CB " + (k + 1) + (k + 1 === 9 ? " · emergencias" : k + 1 === 19 ? " · carreteras" : "")}))},
    {id: "marina", ico: "⚓", name: "Marina VHF (internacional)", reg: "*", mod: "nfm",
      info: "Barcos, puertos, guardacostas, pesca y deportivos. Canal 16 = socorro y llamada (siempre vigilado), 13 = entre puentes, 9 = llamada recreativa. Los canales dúplex se escuchan en la frecuencia de la estación costera.",
      ch: marine},
    {id: "ais", ico: "🚢", name: "AIS y DSC (datos de barcos)", reg: "*", mod: "nfm",
      info: "Datos digitales de posición de barcos (AIS) y llamadas selectivas digitales de socorro (DSC, canal 70). Se decodifican en el receptor avanzado (OpenWebRX+).",
      ch: [{n: 1, f: 161.975, name: "AIS 1 (87B)"}, {n: 2, f: 162.025, name: "AIS 2 (88B)"}, {n: 70, f: 156.525, name: "DSC canal 70"}]},
    {id: "aero", ico: "✈", name: "Aviación civil VHF (AM)", reg: "*", mod: "am",
      info: "Pilotos, torres de control, aproximación y ATIS. Las frecuencias de torre son locales: escanea la banda completa para descubrirlas. 121.5 = emergencia (siempre vigilada). Europa usa canales de 8.33 kHz.",
      ch: [{n: 1, f: 121.5, name: "Emergencia internacional"}, {n: 2, f: 123.45, name: "Aire-aire (océanos)"}, {n: 3, f: 122.75, name: "Aire-aire privado"},
        {n: 4, f: 123.025, name: "Helicópteros (EE. UU.)"}, {n: 5, f: 122.8, name: "UNICOM"}, {n: 6, f: 122.9, name: "MULTICOM"}, {n: 7, f: 123.0, name: "UNICOM"},
        {n: 8, f: 131.55, name: "ACARS (datos)"}, {n: 9, f: 136.9, name: "VDL modo 2 (datos)"}],
      range: {start: 118, stop: 136.975, step: 0.025, label: "toda la banda aérea 118–137 MHz"}},
    {id: "milair", ico: "🛩", name: "Aviación militar UHF (AM)", reg: "*", mod: "am",
      info: "Banda militar 225–400 MHz. 243.0 MHz es la emergencia militar (guardia). La actividad depende mucho de la zona.",
      ch: [{n: 1, f: 243.0, name: "Guardia militar (emergencia)"}, {n: 2, f: 282.8, name: "Búsqueda y rescate (OTAN)"}],
      range: {start: 225, stop: 400, step: 0.025, label: "banda UHF militar 225–400 MHz"}},
    {id: "noaa", ico: "🌦", name: "NOAA Weather Radio (EE. UU. / Canadá)", reg: "A", mod: "nfm",
      info: "Boletines meteorológicos continuos y alertas de emergencia (EAS). Decodifica las alertas en Decodificar → Mensajes → EAS.",
      ch: r(162.4, 7, 0.025, "WX ")},
    {id: "ham2", ico: "🎙", name: "Radioaficionados 2 m (VHF)", reg: "*", mod: "nfm",
      info: "Radioaficionados con licencia: conversaciones, redes, emergencias. Las repetidoras amplían el alcance. En América: llamada 146.520; en Europa: 145.500.",
      ch: [{n: 1, f: 146.52, name: "Llamada FM (América)"}, {n: 2, f: 145.5, name: "Llamada FM (Europa)"}, {n: 3, f: 144.39, name: "APRS (América)"},
        {n: 4, f: 144.8, name: "APRS (Europa)"}, {n: 5, f: 145.8, name: "ISS voz"}, {n: 6, f: 145.825, name: "ISS APRS"}, {n: 7, f: 144.2, name: "SSB llamada", mod: "usb"},
        {n: 8, f: 145.375, name: "D-Star llamada (Europa)", mod: "dsd", dsd: "dstar"}],
      range: {start: 144, stop: 148, step: 0.0125, label: "toda la banda de 2 m"}},
    {id: "ham70", ico: "🎙", name: "Radioaficionados 70 cm (UHF)", reg: "*", mod: "nfm",
      info: "Repetidoras FM y digitales (DMR, Fusion, D-Star, M17). Llamada FM: 446.000 (América) / 433.500 (Europa). M17 suele usar 433.475.",
      ch: [{n: 1, f: 446.0, name: "Llamada FM (América)"}, {n: 2, f: 433.5, name: "Llamada FM (Europa)"}, {n: 3, f: 441.0, name: "DMR simplex", mod: "dsd", dsd: "dmr"},
        {n: 4, f: 433.45, name: "DMR simplex (Europa)", mod: "dsd", dsd: "dmr"}, {n: 5, f: 433.475, name: "M17 llamada", mod: "dsd", dsd: "m17"},
        {n: 6, f: 432.1, name: "SSB llamada", mod: "usb"}, {n: 7, f: 436.795, name: "Satélite SO-50"}],
      range: {start: 420, stop: 450, step: 0.0125, label: "toda la banda de 70 cm"}},
    {id: "sat", ico: "🛰", name: "Satélites", reg: "*", mod: "nfmw",
      info: "Satélites meteorológicos (NOAA APT analógicos y Meteor LRPT digitales), la Estación Espacial y satélites de aficionados. Sólo se oyen cuando pasan por encima (usa una app de pases como «Heavens-Above»).",
      ch: [{n: 1, f: 137.62, name: "NOAA 15 (APT)"}, {n: 2, f: 137.9125, name: "NOAA 18 (APT)"}, {n: 3, f: 137.1, name: "NOAA 19 (APT)"},
        {n: 4, f: 137.9, name: "Meteor-M (LRPT)"}, {n: 5, f: 145.8, name: "ISS voz", mod: "nfm"}, {n: 6, f: 145.825, name: "ISS APRS", mod: "nfm"},
        {n: 7, f: 437.8, name: "ISS repetidor bajada", mod: "nfm"}, {n: 8, f: 436.795, name: "SO-50", mod: "nfm"}]},
    {id: "rail", ico: "🚆", name: "Ferrocarril AAR (EE. UU. / Canadá)", reg: "A", mod: "nfm",
      info: "Canales de los trenes de carga y pasajeros en Norteamérica (160.215–161.565 MHz). Muchas líneas pasaron a NXDN digital: usa el modo «Digital» si oyes «ruido de datos».",
      range: {start: 160.215, stop: 161.565, step: 0.015, label: "91 canales AAR"}},
    {id: "vhfb", ico: "🚓", name: "VHF servicios (148–174 MHz)", reg: "*", mod: "nfm",
      info: "Empresas, seguridad privada, bomberos, ambulancias, municipios, taxis, buscapersonas. Muchos ya son digitales (DMR, NXDN, P25) y algunos cifrados (ésos no se pueden oír).",
      range: {start: 148, stop: 174, step: 0.0125, label: "148–174 MHz"}},
    {id: "uhfb", ico: "🏢", name: "UHF servicios (450–470 MHz)", reg: "*", mod: "nfm",
      info: "Comercios, fábricas, hoteles, seguridad, transporte. Mezcla de FM analógico y digital (DMR, NXDN).",
      range: {start: 450, stop: 470, step: 0.0125, label: "450–470 MHz"}},
    {id: "trunk", ico: "🛡", name: "Trunking 800 MHz / P25 (EE. UU.)", reg: "A", mod: "dsd", dsd: "p25",
      info: "Sistemas troncalizados de seguridad pública. Los canales de voz cambian en cada llamada: para seguirlos se necesita un decodificador de trunking (el panel decodifica P25 en un canal fijo). Mucho tráfico policial está cifrado.",
      range: {start: 851, stop: 869, step: 0.0125, label: "851–869 MHz (bajada)"}},
    {id: "pager", ico: "✉", name: "Buscapersonas (POCSAG / FLEX)", reg: "*", mod: "nfm",
      info: "Hospitales, bomberos, técnicos y alarmas. Se leen como texto en Decodificar → Mensajes. Las frecuencias son locales: busca ráfagas que suenan como «brrrrt» rítmico.",
      ch: [{n: 1, f: 929.6125, name: "929.6125 (América)"}, {n: 2, f: 931.9375, name: "931.9375 (América)"}, {n: 3, f: 152.84, name: "152.840 (VHF)"},
        {n: 4, f: 466.075, name: "466.075 (Europa)"}, {n: 5, f: 169.65, name: "169.650 (Europa)"}],
      range: {start: 929, stop: 932, step: 0.0125, label: "929–932 MHz"}},
    {id: "fm", ico: "🎵", name: "Radio FM comercial", reg: "*", mod: "wfm",
      info: "Emisoras de FM (con RDS: nombre de la emisora y canción en el receptor avanzado).",
      range: {start: 87.5, stop: 108, step: 0.1, label: "87.5–108 MHz"}},
    {id: "am", ico: "📻", name: "Radio AM (onda media)", reg: "*", mod: "am",
      info: "Emisoras de AM (530–1700 kHz). Requiere el RTL-SDR Blog V4 y una antena de cable largo; de noche se oyen emisoras lejanas.",
      range: {start: 0.53, stop: 1.7, step: 0.01, label: "530–1700 kHz (paso 10 kHz)"}},
    {id: "sw", ico: "🌍", name: "Onda corta internacional", reg: "*", mod: "am",
      info: "Emisoras de todo el mundo (49 m, 41 m, 31 m, 25 m…). Requiere el V4 y una antena de cable de 10 m o más. Mejor de noche en las bandas bajas y de día en las altas.",
      ch: [{n: 49, f: 6.0, name: "49 m (5.9–6.2 MHz)"}, {n: 41, f: 7.3, name: "41 m"}, {n: 31, f: 9.6, name: "31 m"}, {n: 25, f: 11.8, name: "25 m"}, {n: 19, f: 15.3, name: "19 m"}],
      range: {start: 5.9, stop: 6.2, step: 0.005, label: "banda de 49 m"}},
  ];
  const C = {sel: null};

  function region() {
    const p = typeof Paises !== "undefined" && Paises.region();
    return p || ((SDR.status && String(SDR.status.region || "").startsWith("eu")) ? "E" : "A");
  }
  // ¿el servicio corresponde al país elegido (Más → Canales → Tu país) o, sin país, a la región del equipo?
  function native(s) {
    const n = typeof Paises !== "undefined" ? Paises.native(s) : null;
    return n === null ? s.reg === "*" || s.reg === region() : n;
  }
  function chans(s) {
    if (s.ch) return s.ch.map(c => ({freq: Math.round(c.f * 1e6), mod: c.mod || s.mod, name: c.name, dsd: c.dsd || s.dsd}));
    return [];
  }
  function render() {
    if (typeof Paises !== "undefined") Paises.render();
    const order = S.slice().sort((a, b) => !native(a) - !native(b));
    $("#chServices").innerHTML = order.map(s =>
      `<button data-svc="${s.id}" class="${C.sel === s.id ? "active" : ""}${native(s) ? "" : " other"}">${s.ico} ${SDR.esc(_t(s.name))}</button>`).join("");
    const s = S.find(x => x.id === C.sel);
    const box = $("#chDetail");
    if (!s) { box.innerHTML = `<p class="muted">${SDR.esc(_t("Elige un servicio para ver todos sus canales, escucharlos o escanearlos completos."))}</p>`; return; }
    const cs = chans(s), modName = _t({nfm: "FM", nfmw: "FM ancha", wfm: "WFM", am: "AM", usb: "USB", lsb: "LSB", dsd: "Digital"}[s.mod]);
    const regTxt = s.reg === "A" ? _t("América") : s.reg === "E" ? _t("Europa / otros países") : s.reg === "O" ? _t(s.where) : _t("todo el mundo");
    const label = s.range ? _t(s.range.label) : "";
    const facts = [_t("Región: {r}", {r: regTxt}), _t("modo {m}", {m: modName})]
      .concat(cs.length ? [_tn(cs.length, "{n} canal", "{n} canales")] : [], s.range ? [_t("rango: {r}", {r: label})] : []);
    box.innerHTML = `<h3 style="margin-top:4px">${s.ico} ${SDR.esc(_t(s.name))}</h3>
      <p class="small">${SDR.esc(_t(s.info))}</p>
      <p class="muted small">${SDR.esc(facts.join(" · "))}</p>
      <div class="row" style="margin-bottom:10px">
        ${cs.length ? `<button class="btn primary" data-act="scan">${SDR.esc(_tn(cs.length, "📡 Escanear el canal", "📡 Escanear los {n} canales"))}</button>` : ""}
        ${s.range ? `<button class="btn${cs.length ? "" : " primary"}" data-act="range">${SDR.esc(_t("📡 Escanear {r}", {r: label}))}</button>` : ""}
        ${cs.length ? `<button class="btn" data-act="mem">${SDR.esc(_t("★ Guardar como grupo"))}</button>` : ""}
        ${s.range ? `<button class="btn" data-act="an">${SDR.esc(_t("📈 Ver en el analizador"))}</button>` : ""}
      </div>
      ${cs.length ? `<div class="chgrid">${cs.map((c, k) => `<button data-k="${k}"><b>${SDR.esc(_t(c.name))}</b><span>${(c.freq / 1e6).toFixed(c.freq % 1000 ? 5 : 4)}</span>${c.mod !== s.mod ? `<small>${SDR.esc(c.mod === "dsd" ? _t("Digital") : c.mod.toUpperCase())}</small>` : ""}</button>`).join("")}</div>` : ""}
      <p class="muted small" style="margin:8px 0 0">${SDR.esc(_t("Toca un canal para escucharlo. El escáner se detiene solo cuando alguien habla y sigue buscando cuando termina."))}</p>`;
  }
  async function act(a) {
    const s = S.find(x => x.id === C.sel); if (!s) return;
    const cs = chans(s);
    try {
      if (a === "scan") {
        await SDR.api("/api/radio/scan", {channels: cs.map(c => ({freq: c.freq, mod: c.mod === "dsd" ? "nfm" : c.mod, name: c.name}))});
        SDR.toast(_tn(cs.length, "Escaneando {n} canal de {s}.", "Escaneando {n} canales de {s}.", {s: _t(s.name)})); SDR.showTab("radio");
      } else if (a === "range") {
        const g = s.range;
        await SDR.api("/api/radio/scan", {range: {start: g.start * 1e6, stop: g.stop * 1e6, step: g.step * 1e6, mod: s.mod === "dsd" ? "nfm" : s.mod}});
        SDR.toast(_t("Escaneando {r}.", {r: _t(g.label)})); SDR.showTab("radio");
      } else if (a === "mem") {
        await SDR.api("/api/memories/import", {items: cs.map(c => ({freq: c.freq, mod: c.mod, name: c.name, group: s.name.split(" (")[0]}))});
        SDR.toast(_tn(cs.length, "Guardado {n} canal en el grupo «{g}».", "Guardados {n} canales en el grupo «{g}».", {g: _t(s.name.split(" (")[0])})); if (SDR.modules.radio) SDR.modules.radio.loadMemories();
      } else if (a === "an") {
        const g = s.range; An.show((g.start + g.stop) / 2 * 1e6, (g.stop - g.start) * 1e6 * 1.04);
      }
    } catch (e) { SDR.toast(e.message, true); }
  }
  function select(id) {
    C.sel = id; render(); $("#chDetail").scrollIntoView({behavior: "smooth", block: "start"});
  }
  function init() {
    $("#chServices").addEventListener("click", ev => { const b = ev.target.closest("[data-svc]"); if (b) select(b.dataset.svc); });
    $("#chDetail").addEventListener("click", ev => {
      const a = ev.target.closest("[data-act]"), k = ev.target.closest("[data-k]");
      if (a) act(a.dataset.act);
      if (k) {
        const s = S.find(x => x.id === C.sel), c = chans(s)[+k.dataset.k];
        SDR.openRadio(c.freq, c.mod, c.mod === "dsd" ? {dsd: c.dsd || "auto"} : null);
      }
    });
  }
  return {init, select, onShow() { render(); }, services: S, chans};
})();
SDR.modules.canales = Canales;
