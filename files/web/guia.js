/* SDR-Kit · Guía de frecuencias y tablas de tonos */
"use strict";
const Ref = (() => {
  // [categoría, nombre, MHz, modo, región (A=Américas, E=Europa, *=todo), nota]
  const F = [
    ["Radio", "FM comercial (banda completa)", 98.0, "wfm", "*", "87.5–108 MHz"],
    ["Radio", "Onda media AM (V4)", 1.0, "am", "*", "530–1700 kHz"],
    ["Radio", "Onda corta 49 m (V4)", 6.0, "am", "*", "emisoras internacionales de noche"],
    ["Radio", "Onda corta 31 m (V4)", 9.65, "am", "*", "emisoras internacionales"],
    ["Aviación", "Emergencia aérea internacional", 121.5, "am", "*", "guardia 24 h"],
    ["Aviación", "Aire-aire", 123.45, "am", "*", "charla entre pilotos"],
    ["Aviación", "Planeadores / ultraligeros", 122.75, "am", "*", ""],
    ["Aviación", "Torre / aproximación (busca la de tu aeropuerto)", 118.1, "am", "*", "118–137 MHz"],
    ["Aviación", "ACARS (datos de aviones)", 131.55, "am", "*", "decodifica en el receptor avanzado"],
    ["Aviación", "ADS-B (posición de aviones)", 1090.0, "nfm", "*", "ver mapa en el receptor avanzado"],
    ["Marina", "Canal 16 · socorro y llamada", 156.8, "nfm", "*", ""],
    ["Marina", "Canal 06 · seguridad entre barcos", 156.3, "nfm", "*", ""],
    ["Marina", "Canal 09 · llamada recreativa", 156.45, "nfm", "*", ""],
    ["Marina", "Canal 13 · puente a puente", 156.65, "nfm", "*", ""],
    ["Marina", "AIS A (posición de barcos)", 161.975, "nfm", "*", "datos"],
    ["Marina", "AIS B", 162.025, "nfm", "*", "datos"],
    ["Walkie-talkies", "FRS/GMRS canal 1", 462.5625, "nfm", "A", "walkies de juguete y familiares"],
    ["Walkie-talkies", "FRS/GMRS canal 3", 462.6125, "nfm", "A", ""],
    ["Walkie-talkies", "FRS/GMRS canal 8", 467.5625, "nfm", "A", "baja potencia"],
    ["Walkie-talkies", "FRS/GMRS canal 15", 462.55, "nfm", "A", ""],
    ["Walkie-talkies", "FRS/GMRS canal 20", 462.675, "nfm", "A", "a veces usado para emergencias"],
    ["Walkie-talkies", "PMR446 canal 1", 446.00625, "nfm", "E", "walkies sin licencia (Europa)"],
    ["Walkie-talkies", "PMR446 canal 8", 446.09375, "nfm", "E", ""],
    ["Walkie-talkies", "MURS 1 (EE. UU.)", 151.82, "nfm", "A", ""],
    ["Radioafición", "2 m llamada FM", 146.52, "nfm", "A", ""],
    ["Radioafición", "2 m llamada FM", 145.5, "nfm", "E", ""],
    ["Radioafición", "2 m repetidoras", 146.94, "nfm", "A", "146–148 MHz (busca las locales)"],
    ["Radioafición", "70 cm llamada FM", 446.0, "nfm", "A", ""],
    ["Radioafición", "70 cm llamada FM", 433.5, "nfm", "E", ""],
    ["Radioafición", "APRS (posiciones)", 144.39, "nfm", "A", "datos: receptor avanzado"],
    ["Radioafición", "APRS (posiciones)", 144.8, "nfm", "E", "datos: receptor avanzado"],
    ["Radioafición", "40 m voz (V4)", 7.15, "lsb", "*", "LSB"],
    ["Radioafición", "20 m voz (V4)", 14.2, "usb", "*", "USB"],
    ["Satélites", "Estación Espacial ISS · voz", 145.8, "nfm", "*", "cuando pasa por encima"],
    ["Satélites", "ISS · APRS / repetidor", 145.825, "nfm", "*", ""],
    ["Satélites", "Meteor-M (imágenes del clima)", 137.9, "wfm", "*", "LRPT · 137.1 o 137.9 según el satélite"],
    ["Satélites", "GPS L1", 1575.42, "nfm", "*", "requiere LNA; sólo se ve en el analizador"],
    ["Clima", "NOAA Weather Radio WX1", 162.4, "nfm", "A", "EE. UU. y Canadá"],
    ["Clima", "NOAA Weather Radio WX2", 162.425, "nfm", "A", "EE. UU. y Canadá"],
    ["Clima", "NOAA Weather Radio WX7", 162.55, "nfm", "A", "EE. UU. y Canadá"],
    ["Clima", "Radiosondas meteorológicas", 403.0, "nfm", "*", "400–406 MHz · globos sonda"],
    ["CB", "CB canal 9 · emergencia", 27.065, "am", "*", ""],
    ["CB", "CB canal 19 · carretera", 27.185, "am", "*", ""],
    ["ISM / IoT", "ISM 433.92 (controles, estaciones meteo)", 433.92, "nfm", "*", "decodifica con rtl_433 en el receptor avanzado"],
    ["ISM / IoT", "Llaves de carro / portones", 315.0, "nfm", "A", ""],
    ["ISM / IoT", "LoRa / Meshtastic", 915.0, "nfm", "A", "902–928 MHz"],
    ["ISM / IoT", "LoRa / Meshtastic", 868.1, "nfm", "E", "863–870 MHz"],
    ["ISM / IoT", "Buscapersonas POCSAG", 929.5, "nfm", "A", "varía por país"],
    ["Celular / TV", "TV digital UHF", 521.0, "wfm", "*", "sólo en el analizador (señal de 6–8 MHz)"],
    ["Celular / TV", "Celular banda 850 (bajada)", 881.0, "nfm", "A", "sólo en el analizador · cifrado"],
  ];
  const CTCSS = [67.0, 69.3, 71.9, 74.4, 77.0, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8, 97.4, 100.0, 103.5, 107.2, 110.9, 114.8, 118.8, 123.0,
    127.3, 131.8, 136.5, 141.3, 146.2, 151.4, 156.7, 159.8, 162.2, 165.5, 167.9, 171.3, 173.8, 177.3, 179.9, 183.5, 186.2, 189.9, 192.8,
    196.6, 199.5, 203.5, 206.5, 210.7, 218.1, 225.7, 229.1, 233.6, 241.8, 250.3, 254.1];
  const DCS = [0o23, 0o25, 0o26, 0o31, 0o32, 0o36, 0o43, 0o47, 0o51, 0o53, 0o54, 0o65, 0o71, 0o72, 0o73, 0o74, 0o114, 0o115, 0o116, 0o122,
    0o125, 0o131, 0o132, 0o134, 0o143, 0o145, 0o152, 0o155, 0o156, 0o162, 0o165, 0o172, 0o174, 0o205, 0o212, 0o223, 0o225, 0o226, 0o243,
    0o244, 0o245, 0o246, 0o251, 0o252, 0o255, 0o261, 0o263, 0o265, 0o266, 0o271, 0o274, 0o306, 0o311, 0o315, 0o325, 0o331, 0o332, 0o343,
    0o346, 0o351, 0o356, 0o364, 0o365, 0o371, 0o411, 0o412, 0o413, 0o423, 0o431, 0o432, 0o445, 0o446, 0o452, 0o454, 0o455, 0o462, 0o464,
    0o465, 0o466, 0o503, 0o506, 0o516, 0o523, 0o526, 0o532, 0o546, 0o565, 0o606, 0o612, 0o624, 0o627, 0o631, 0o632, 0o654, 0o662, 0o664,
    0o703, 0o712, 0o723, 0o731, 0o732, 0o734, 0o743, 0o754];
  // misma palabra Golay(23,12) que usa el servidor (y el firmware abierto del Quansheng UV-K5)
  function dcsWord(code) {
    const data = code | 0x800; let w = data;
    for (let i = 0; i < 12; i++) { w <<= 1; if (w & 0x1000) w ^= 0x08EA; }
    return (data | ((w & 0x0FFE) << 11)) >>> 0;
  }
  function rotations(w) { const s = new Set(); for (let r = 0; r < 23; r++) s.add((((w >>> r) | (w << (23 - r))) & 0x7FFFFF) >>> 0); return s; }
  let cat = "Todas", built = false;
  // English names/notes live in lang-en-help.js (I18N.data.guia, keyed by the Spanish text)
  const EN = () => (I18N.lang === "en" && I18N.data.guia) || null;
  const tr = (s) => { const e = EN(); return (e && e[s] != null) ? e[s] : _t(s); };

  function region() {
    const p = typeof Paises !== "undefined" && Paises.region();  // el país elegido en Más → Canales manda sobre la región del equipo
    if (p) return p;
    const r = (SDR.status && SDR.status.region) || "americas"; return String(r).toLowerCase().startsWith("eu") ? "E" : "A";
  }
  function render() {
    const q = $("#refSearch").value.trim().toLowerCase(), reg = region();
    const rows = F.filter(x => (x[4] === "*" || x[4] === reg) && (cat === "Todas" || x[0] === cat) &&
      (!q || (x[0] + " " + x[1] + " " + x[2] + " " + x[5] + (EN() ? " " + tr(x[0]) + " " + tr(x[1]) + " " + (x[5] ? tr(x[5]) : "") : ""))
        .toLowerCase().includes(q)));
    const MOD = {nfm: "FM", wfm: "WFM", am: "AM", usb: "USB", lsb: "LSB"};
    $("#refTable").innerHTML = `<thead><tr><th>${_t("Qué")}</th><th>MHz</th><th></th></tr></thead><tbody>` + (rows.length ? rows.map(x =>
      `<tr><td><b>${SDR.esc(tr(x[1]))}</b><div class="muted small">${SDR.esc(tr(x[0]))} · ${MOD[x[3]]}${x[5] ? " · " + SDR.esc(tr(x[5])) : ""}</div></td>` +
      `<td class="mono">${x[2].toFixed(x[2] < 30 ? 3 : 4)}</td><td class="r"><button class="btn sm" data-l="${x[2]}" data-m="${x[3]}" aria-label="${_t("Escuchar")}">🎧</button> ` +
      `<button class="btn sm" data-a="${x[2]}" aria-label="${_t("Analizador")}">📈</button></td></tr>`).join("") :
      `<tr><td class="muted" colspan="3">${_t("Nada coincide.")}</td></tr>`) + "</tbody>";
  }
  function build() {
    if (built) return; built = true;
    const cats = ["Todas", ...new Set(F.map(x => x[0]))];
    $("#refCats").innerHTML = cats.map(c => `<button data-c="${c}" class="${c === cat ? "active" : ""}">${c === "Todas" ? _t("Todas") : tr(c)}</button>`).join("");
    $("#refCats").addEventListener("click", ev => {
      const b = ev.target.closest("[data-c]"); if (!b) return;
      cat = b.dataset.c; $$("#refCats button").forEach(x => x.classList.toggle("active", x === b)); render();
    });
    $("#refSearch").addEventListener("input", render);
    $("#refTable").addEventListener("click", ev => {
      const l = ev.target.closest("[data-l]"), a = ev.target.closest("[data-a]");
      if (l) SDR.openRadio(+l.dataset.l * 1e6, l.dataset.m);
      if (a) { const f = +a.dataset.a * 1e6; An.show(f, f < 30e6 ? 1e6 : f > 400e6 ? 4e6 : 2e6); }
    });
    $("#ctcssGrid").innerHTML = CTCSS.map((t, i) => `<div>${t.toFixed(1)}<small>#${i + 1}</small></div>`).join("");
    const words = Object.fromEntries(DCS.map(c => [c, dcsWord(c)]));
    $("#dcsGrid").innerHTML = DCS.map(c => {
      const inv = rotations(~words[c] & 0x7FFFFF);
      const eq = DCS.find(y => inv.has(words[y]));
      const o = (n) => n.toString(8).padStart(3, "0");
      return `<div>D${o(c)}N<small>${eq !== undefined ? "≡ D" + o(eq) + "I" : "&nbsp;"}</small></div>`;
    }).join("");
  }
  return {onShow() { build(); render(); }};
})();
SDR.modules.ref = Ref;
