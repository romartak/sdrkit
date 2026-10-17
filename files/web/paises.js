/* SDR-Kit · Países: qué walkie-talkies, bandas, repetidoras y subtonos corresponden a cada país */
"use strict";
const Paises = (() => {
  const KEY = "sdrkit.pais";
  // Códigos de privacidad de los walkies FRS/PMR: 1–38 = subtonos CTCSS, en el orden que usan Motorola, Cobra, Midland, Uniden…
  // (los códigos 39 en adelante son DCS y su numeración cambia según la marca)
  const CODES = [67.0, 71.9, 74.4, 77.0, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8, 97.4, 100.0, 103.5, 107.2, 110.9, 114.8, 118.8, 123.0, 127.3,
    131.8, 136.5, 141.3, 146.2, 151.4, 156.7, 162.2, 167.9, 173.8, 179.9, 186.2, 192.8, 203.5, 210.7, 218.1, 225.7, 233.6, 241.8, 250.3];
  // segmento de salidas de repetidoras: banda, [desde, hasta] MHz, paso MHz, desplazamiento habitual de la entrada (MHz), nota
  const R = (b, out, step, off, note) => ({b, out, step, off, note: note || ""});
  // Planes base por región UIT. sv = servicios de Canales propios del país (los «*» de Canales valen en todas partes)
  const PLAN = {
    us: {r: "A", itu: 2, sv: ["frs", "gmrsr", "murs", "noaa", "rail", "trunk"], b2: [144, 148], b70: [420, 450],
      rep: [R("2 m", [145.1, 145.5], 0.005, "−0.6"), R("2 m", [146.61, 147.39], 0.005, "±0.6", "por debajo de 147 MHz la entrada está 600 kHz abajo; por encima, 600 kHz arriba"),
        R("70 cm", [442, 445], 0.0125, "+5")],
      tone: "Cada repetidora tiene su propio subtono CTCSS; los más comunes son 100.0, 103.5, 107.2, 110.9, 123.0, 127.3, 141.3 y 146.2 Hz."},
    lat: {r: "A", itu: 2, sv: ["frs"], b2: [144, 148], b70: [430, 440],
      rep: [R("2 m", [146, 148], 0.005, "±0.6"), R("70 cm", [438, 440], 0.0125, "±5")],
      tone: "Varía en cada repetidora: muchas usan un subtono CTCSS (100.0, 103.5, 110.9, 123.0 Hz…) y otras no usan ninguno."},
    eu: {r: "E", itu: 1, sv: ["pmr", "dpmr", "lpd"], b2: [144, 146], b70: [430, 440],
      rep: [R("2 m", [145.575, 145.7875], 0.0125, "−0.6"), R("70 cm", [438.65, 439.425], 0.0125, "−7.6")],
      tone: "Muchas repetidoras se abren con un subtono CTCSS (a menudo 71.9, 77.0, 88.5 o 123.0 Hz) o con el tono de 1750 Hz."},
    r1: {r: "E", itu: 1, sv: ["pmr", "dpmr"], b2: [144, 146], b70: [430, 440],
      rep: [R("2 m", [145.575, 145.7875], 0.0125, "−0.6"), R("70 cm", [438.65, 439.425], 0.0125, "−7.6")],
      tone: "Varía en cada repetidora: muchas usan un subtono CTCSS (a menudo 88.5 Hz) o el tono de 1750 Hz."},
    r3: {r: "E", itu: 3, sv: [], b2: [144, 146], b70: [430, 440],
      rep: [R("2 m", [145.0, 146.0], 0.0125, "−0.6"), R("70 cm", [438, 440], 0.0125, "−5")],
      tone: "Varía en cada repetidora: muchas usan un subtono CTCSS (88.5 Hz es frecuente) y otras no usan ninguno."},
  };
  // Todos los países, agrupados por el plan que les corresponde (región UIT y reglas de walkies)
  const GROUPS = {
    lat: "AG AI AR AW BB BL BM BO BQ BR BS BZ CL CO CR CU CW DM DO EC FK GD GF GL GP GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PM PY SR SV SX TC TT UY VC VE VG",
    us: "US PR VI GU AS MP CA",
    eu: "AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM TR UA VA XK",
    r1: "AE AM AO AZ BF BH BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GE GH GM GN GQ GW IL IQ JO KE KG KM KW KZ LB LR LS LY MA MG ML MN MR MU MW MZ " +
      "NA NE NG OM PS QA RE RW SA SC SD SH SL SN SO SS ST SY SZ TD TG TJ TM TN TZ UG UZ YE YT ZA ZM ZW",
    r3: "AF AU BD BN BT CC CK CN CX FJ FM HK ID IN IO IR JP KH KI KP KR LA LK MH MM MO MV MY NC NF NP NR NU NZ PF PG PH PK PN PW SB SG TH TK TL TO TV TW VN VU WF WS",
  };
  // Datos propios de cada país: regulador, prefijos de radioaficionado, asociación nacional y cambios al plan base
  const X = {
    // América
    US: {reg: "FCC", pre: "K, W, N, AA–AL", org: "ARRL"},
    PR: {reg: "FCC", pre: "KP3, KP4, NP3, NP4, WP3, WP4", org: "ARRL"},
    VI: {reg: "FCC", pre: "KP2, NP2, WP2", org: "ARRL"},
    GU: {reg: "FCC", pre: "KH2", org: "ARRL"},
    CA: {reg: "ISED", pre: "VA, VE, VO, VY", org: "Radio Amateurs of Canada (RAC)", sv: ["frs", "noaa", "rail"], b70: [430, 450],
      note: "Las emisoras del tiempo de Environment Canada transmiten en los mismos canales que NOAA (162.400–162.550)."},
    MX: {reg: "IFT", pre: "XE, XF", org: "Federación Mexicana de Radioexperimentadores (FMRE)"},
    DO: {reg: "INDOTEL", pre: "HI", org: "Radio Club Dominicano",
      note: "Los walkies FRS de 22 canales son los más comunes. Empresas, seguridad y transporte usan VHF y UHF comercial (FM y DMR): escanea «VHF servicios» y «UHF servicios»."},
    CU: {reg: "MINCOM", pre: "CL, CM, CO", org: "Federación de Radioaficionados de Cuba (FRC)"},
    HT: {reg: "CONATEL", pre: "HH", org: "Radio Club d'Haïti"},
    JM: {reg: "SMA", pre: "6Y", org: "Jamaica Amateur Radio Association"},
    TT: {reg: "TATT", pre: "9Y, 9Z", org: "Trinidad and Tobago Amateur Radio Society"},
    GT: {reg: "SIT", pre: "TG", org: "Club de Radioaficionados de Guatemala"},
    SV: {reg: "SIGET", pre: "YS", org: "Club de Radioaficionados de El Salvador (CRAS)"},
    HN: {reg: "CONATEL", pre: "HR", org: "Radio Club de Honduras"},
    NI: {reg: "TELCOR", pre: "YN", org: "Club de Radioexperimentadores de Nicaragua"},
    CR: {reg: "MICITT / SUTEL", pre: "TI", org: "Radio Club de Costa Rica"},
    PA: {reg: "ASEP", pre: "HO, HP", org: "Liga Panameña de Radioaficionados"},
    CO: {reg: "MinTIC / ANE", pre: "HJ, HK", org: "Liga Colombiana de Radioaficionados"},
    VE: {reg: "CONATEL", pre: "YV, YY", org: "Radio Club Venezolano"},
    EC: {reg: "ARCOTEL", pre: "HC, HD", org: "Guayaquil Radio Club"},
    PE: {reg: "MTC", pre: "OA, OC", org: "Radio Club Peruano"},
    BO: {reg: "ATT", pre: "CP", org: "Radio Club de Bolivia"},
    CL: {reg: "SUBTEL", pre: "CA, CE", org: "Radio Club de Chile"},
    AR: {reg: "ENACOM", pre: "LU, LW", org: "Radio Club Argentino"},
    UY: {reg: "URSEC", pre: "CV, CX", org: "Radio Club del Uruguay"},
    PY: {reg: "CONATEL", pre: "ZP", org: "Radio Club Paraguayo"},
    BR: {reg: "Anatel", pre: "PP, PT, PU, PY", org: "LABRE"},
    // Europa
    ES: {reg: "Ministerio para la Transformación Digital", pre: "EA, EB, EC", org: "Unión de Radioaficionados Españoles (URE)"},
    PT: {reg: "ANACOM", pre: "CS, CT", org: "Rede dos Emissores Portugueses (REP)"},
    GB: {reg: "Ofcom", pre: "G, M, 2E", org: "RSGB", sv: ["pmr", "dpmr"],
      rep: [R("2 m", [145.575, 145.7875], 0.0125, "−0.6"), R("70 cm", [433.0, 433.375], 0.0125, "+1.6")]},
    IE: {reg: "ComReg", pre: "EI, EJ", org: "IRTS"},
    FR: {reg: "ANFR / ARCEP", pre: "F", org: "REF"},
    DE: {reg: "Bundesnetzagentur", pre: "DA–DR", org: "DARC"},
    IT: {reg: "MIMIT", pre: "I", org: "ARI"},
    NL: {reg: "RDI", pre: "PA–PI", org: "VERON"},
    BE: {reg: "BIPT", pre: "ON, OO", org: "UBA"},
    CH: {reg: "OFCOM / BAKOM", pre: "HB9", org: "USKA"},
    AT: {pre: "OE", org: "ÖVSV"},
    PL: {reg: "UKE", pre: "SN–SR", org: "PZK"},
    SE: {reg: "PTS", pre: "SA–SM", org: "SSA"},
    NO: {reg: "Nkom", pre: "LA–LN", org: "NRRL"},
    DK: {pre: "OU–OZ", org: "EDR"},
    FI: {reg: "Traficom", pre: "OF–OJ", org: "SRAL"},
    GR: {reg: "EETT", pre: "SV–SZ", org: "RAAG"},
    RU: {pre: "R, UA–UI", org: "SRR"},
    UA: {pre: "UR–UZ, EM–EO", org: "UARL"},
    TR: {reg: "BTK", pre: "TA–TC, YM", org: "TRAC"},
    // África y Oriente Medio
    ZA: {reg: "ICASA", pre: "ZR–ZU", org: "SARL"},
    EG: {reg: "NTRA", pre: "SU"},
    MA: {reg: "ANRT", pre: "CN"},
    NG: {reg: "NCC", pre: "5N"},
    KE: {reg: "Communications Authority", pre: "5Y, 5Z", org: "ARSK"},
    IL: {pre: "4X, 4Z", org: "IARC"},
    SA: {reg: "CST", pre: "HZ, 7Z"},
    AE: {reg: "TDRA", pre: "A6", org: "EARS"},
    // Asia y Pacífico
    JP: {reg: "MIC (総務省)", pre: "JA–JS, 7J–7N", org: "JARL", b2: [144, 146], b70: [430, 440],
      rep: [R("70 cm", [439.0, 440.0], 0.02, "−5")],
      tone: "Las repetidoras japonesas usan el subtono CTCSS de 88.5 Hz (estándar de JARL).",
      note: "Los walkies sin licencia de Japón (特定小電力) usan 422.05–422.30 MHz y los pares 421.575–421.800 / 440.250–440.500 MHz; el simple digital (デジタル簡易無線) está en 351 MHz."},
    AU: {reg: "ACMA", pre: "VK", org: "WIA", r: "A", sv: ["uhfcb"], b2: [144, 148], b70: [420, 450],
      rep: [R("2 m", [146.625, 147.375], 0.0125, "±0.6"), R("70 cm", [438.0, 439.5], 0.0125, "−5")],
      note: "La UHF CB (476–477 MHz, 80 canales) es la radio sin licencia de todos los días: canales 5/35 = emergencias, 40 = carreteras."},
    NZ: {reg: "RSM", pre: "ZL, ZM", org: "NZART", r: "A", sv: ["uhfcb"], b2: [144, 148],
      rep: [R("2 m", [146.6, 147.4], 0.0125, "±0.6"), R("70 cm", [438.0, 440.0], 0.0125, "+5")],
      note: "Como en Australia, la UHF CB (476–477 MHz) es la radio sin licencia más usada."},
    CN: {reg: "MIIT", pre: "BA–BZ", org: "CRAC", sv: ["cn409"], b2: [144, 148],
      note: "Los walkies públicos sin licencia (公众对讲机) usan 20 canales en 409.7500–409.9875 MHz."},
    TW: {pre: "BM–BQ, BV, BX", org: "CTARL"},
    HK: {reg: "OFCA", pre: "VR2", org: "HARTS"},
    KR: {reg: "MSIT", pre: "DS, DT, HL", org: "KARL"},
    PH: {reg: "NTC", pre: "DU–DZ, 4D–4I", org: "PARA", b2: [144, 148]},
    IN: {reg: "WPC", pre: "AT–AW, VU", org: "ARSI"},
    ID: {pre: "YB–YH", org: "ORARI"},
    MY: {reg: "MCMC", pre: "9M, 9W", org: "MARTS", sv: ["pmr"]},
    SG: {reg: "IMDA", pre: "9V", org: "SARTS", sv: ["pmr"]},
    TH: {reg: "NBTC", pre: "E2, HS", org: "RAST"},
  };
  const P = {};
  for (const [plan, codes] of Object.entries(GROUPS)) for (const c of codes.split(/\s+/)) P[c] = Object.assign({id: c}, PLAN[plan], {plan}, X[c] || {});
  const ALL = Object.keys(P);

  const S = {sel: null};
  try { S.sel = localStorage.getItem(KEY) || null; } catch (e) { /* storage blocked */ }
  if (!P[S.sel]) {
    // primera vez: el país del idioma del navegador (es-DO → República Dominicana)
    S.sel = null;
    for (const l of navigator.languages || [navigator.language || ""]) {
      const m = /^[a-z]{2,3}-([A-Z]{2})\b/.exec(l || "");
      if (m && P[m[1]]) { S.sel = m[1]; break; }
    }
  }

  let names = null, namesLang = "";
  function name(id) {
    if (namesLang !== I18N.lang) {
      namesLang = I18N.lang;
      try { names = new Intl.DisplayNames([I18N.lang], {type: "region"}); } catch (e) { names = null; }
    }
    try { return (names && names.of(id)) || id; } catch (e) { return id; }
  }
  const flag = (id) => String.fromCodePoint(...[...id].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65));
  const fmt = (f) => f.toFixed(f * 1000 % 1 ? 4 : 3);
  const cur = () => (S.sel && P[S.sel]) || null;
  const group = (id) => "Repetidoras " + id;
  function code(tone) {
    const i = CODES.findIndex(t => Math.abs(t - tone) < 0.05);
    return i < 0 ? null : i + 1;
  }
  const esc = (s) => SDR.esc(s);

  function mems() {
    const p = cur(), r = SDR.modules.radio;
    return p && r && r.mems ? r.mems().filter(m => m.group === group(p.id)) : [];
  }
  // sin tildes ni mayúsculas: «republica dom» encuentra «República Dominicana»
  const plain = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // lista de países, filtrada por lo escrito en el buscador
  function fillSelect() {
    const sel = $("#paisSel"), q = plain(($("#paisQ") && $("#paisQ").value || "").trim());
    const coll = new Intl.Collator(I18N.lang);
    const opts = ALL.map(id => [id, name(id)]).sort((a, b) => coll.compare(a[1], b[1]))
      .filter(([id, n]) => !q || plain(n).includes(q) || id.toLowerCase() === q || id === S.sel);
    sel.setAttribute("translate", "no");  // los nombres ya vienen en el idioma del panel (Intl.DisplayNames)
    sel.innerHTML = `<option value="">${esc(q ? _tn(opts.filter(o => o[0] !== S.sel).length, "— {n} país encontrado —", "— {n} países encontrados —") : _t("— Elige tu país —"))}</option>` +
      opts.map(([id, n]) => `<option value="${id}"${id === S.sel ? " selected" : ""}>${flag(id)} ${esc(n)}</option>`).join("");
    return opts;
  }
  function choose(id) {
    S.sel = id || null;
    try { if (S.sel) localStorage.setItem(KEY, S.sel); else localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
    render();
    if (SDR.modules.canales) SDR.modules.canales.onShow();
  }
  function render() {
    const sel = $("#paisSel"), box = $("#paisInfo");
    if (!sel) return;
    fillSelect();
    const p = cur();
    if (!p) { box.innerHTML = `<p class="muted small" style="margin:0">${esc(_t("Elige tu país para ver sus walkie-talkies, bandas de radioaficionado, repetidoras y subtonos."))}</p>`; return; }
    const facts = [];
    if (p.reg) facts.push(_t("Regulador: {r}", {r: p.reg}));
    if (p.pre) facts.push(_t("Indicativos de radioaficionado: {p}", {p: p.pre}));
    if (p.org) facts.push(_t("Asociación: {o}", {o: p.org}));
    facts.push(_t("Región UIT {n}", {n: p.itu}));
    const svcs = (typeof Canales !== "undefined" ? Canales.services : []).filter(s => p.sv.includes(s.id));
    const mine = mems();
    const offs = [...new Set(p.rep.map(x => x.off))];
    box.innerHTML = `<h3 style="margin:10px 0 4px">${flag(p.id)} ${esc(name(p.id))}</h3>
      <p class="muted small" style="margin:0 0 8px">${esc(facts.join(" · "))}</p>
      ${p.note ? `<p class="small">${esc(_t(p.note))}</p>` : ""}
      <h4>${esc(_t("Walkie-talkies sin licencia"))}</h4>
      ${svcs.length ? `<div class="chiprow">${svcs.map(s => `<button data-svc="${s.id}">${s.ico} ${esc(_t(s.name))}</button>`).join("")}</div>` :
        `<p class="muted small">${esc(_t("No hay un servicio de walkies sin licencia en la lista para este país. La banda ciudadana CB (27 MHz) es casi universal."))}</p>`}
      <h4>${esc(_t("Repetidoras de radioaficionados"))}</h4>
      <p class="muted small" style="margin:0 0 6px">${esc(_t("Bandas: 2 m {a}–{b} MHz · 70 cm {c}–{d} MHz", {a: p.b2[0], b: p.b2[1], c: p.b70[0], d: p.b70[1]}))}</p>
      <ul class="list">${p.rep.map((x, k) => `<li><div class="grow"><div><b>${x.b}</b> · <span class="mono">${fmt(x.out[0])}–${fmt(x.out[1])} MHz</span></div>` +
        `<div class="muted small" style="white-space:normal">${esc(_t("salidas (lo que escuchas) · entrada {o} MHz", {o: x.off}))}</div>${x.note ? `<div class="muted small" style="white-space:normal">${esc(_t(x.note))}</div>` : ""}</div>` +
        `<button class="btn sm" data-rep="${k}">${esc(_t("📡 Buscar"))}</button></li>`).join("")}</ul>
      <p class="small" style="margin:8px 0 4px"><b>${esc(_t("Subtono:"))}</b> ${esc(_t(p.tone))}</p>
      <p class="muted small" style="margin:0">${esc(_t("Al escuchar una repetidora, el radio mide su subtono CTCSS o código DCS y te dice el código de walkie que le corresponde. Las bandas y los desplazamientos son los habituales: confírmalos con el regulador o la asociación de tu país."))}</p>
      <h4>${esc(_t("Mis repetidoras en {p}", {p: name(p.id)}))}</h4>
      ${mine.length ? `<ul class="list" id="paisMine">${mine.map(m => `<li data-id="${esc(m.id)}"><div class="grow"><b>${esc(m.name)}</b>` +
        `<div class="muted small mono" style="white-space:normal">${esc(_t("sale {o} · entra {i} MHz", {o: fmt(m.freq / 1e6), i: fmt((m.freq + (m.offset || 0) * 1e3) / 1e6)}))}${m.tone ? " · " + esc(toneText(m.tone)) : ""}</div></div>` +
        `<button class="btn sm" data-listen="${esc(m.id)}" aria-label="${esc(_t("Escuchar"))}">🎧</button> <button class="btn sm" data-del="${esc(m.id)}" aria-label="${esc(_t("Borrar"))}">🗑</button></li>`).join("")}</ul>
        <div class="row" style="margin:6px 0"><button class="btn" data-act="scanmine">${esc(_tn(mine.length, "📡 Escanear mi repetidora", "📡 Escanear mis {n} repetidoras"))}</button></div>` :
        `<p class="muted small">${esc(_t("Aún no guardaste repetidoras de este país. Cuando encuentres una con «Buscar», anótala aquí con su subtono."))}</p>`}
      <div class="grid2">
        <label class="f">${esc(_t("Nombre"))}<input id="repName" type="text" maxlength="40" placeholder="${esc(_t("ej. Repetidora del cerro"))}"></label>
        <label class="f">${esc(_t("Salida (MHz)"))}<input id="repOut" type="number" step="any" inputmode="decimal" placeholder="146.940"></label>
        <label class="f">${esc(_t("Desplazamiento (MHz)"))}<input id="repOff" type="text" list="repOffs" inputmode="decimal" value="${offs[0].replace(/^[±]/, "−").replace("−", "-")}"></label>
        <label class="f">${esc(_t("Subtono (Hz, código o DCS)"))}<input id="repTone" type="text" list="repTones" placeholder="${esc(_t("ej. 100.0, 12 o D023N"))}"></label>
      </div>
      <datalist id="repOffs">${["0", "-0.6", "+0.6", "-5", "+5", "-7.6", "+1.6", "-1.6", "+9.4", "-9.4"].map(o => `<option value="${o}">`).join("")}</datalist>
      <datalist id="repTones">${CODES.map((t, i) => `<option value="${t.toFixed(1)}">${esc(_t("código {n}", {n: i + 1}))}</option>`).join("")}</datalist>
      <div class="row" style="margin-top:8px"><button class="btn primary" data-act="addrep">${esc(_t("★ Guardar repetidora"))}</button></div>
      <details style="margin-top:12px"><summary>${esc(_t("Códigos de subtono de los walkies (1–38)"))}</summary>
        <p class="muted small">${esc(_t("Los walkies FRS y PMR llaman «código» o «privacidad» al subtono. Los códigos 1–38 son iguales en casi todas las marcas; del 39 en adelante son DCS y cambian según el fabricante."))}</p>
        <div class="tonegrid">${CODES.map((t, i) => `<div>${t.toFixed(1)}<small>${esc(_t("código {n}", {n: i + 1}))}</small></div>`).join("")}</div>
      </details>`;
  }
  // "100.0" → 100.0 Hz · "12" → código 12 = 100.0 Hz · "D23", "023" o "D023I" → DCS. "" = sin subtono, null = no válido
  function parseTone(v) {
    v = String(v || "").trim().toUpperCase().replace(",", ".").replace(/\s+/g, "");
    if (!v) return "";
    const d = /^(?:D([0-7]{1,3})|(0[0-7]{2}))([NI])?$/.exec(v);
    if (d) return "D" + (d[1] || d[2]).padStart(3, "0") + (d[3] || "N");
    if (!/^\d+(\.\d+)?$/.test(v)) return null;
    const n = parseFloat(v);
    if (!v.includes(".") && n >= 1 && n <= 38) return CODES[n - 1].toFixed(1);
    return n >= 60 && n <= 260 ? n.toFixed(1) : null;
  }
  function toneText(t) {
    if (/^D/.test(t)) return "DCS " + t;
    const c = code(+t);
    return c ? _t("CTCSS {t} Hz (código {n})", {t, n: c}) : _t("CTCSS {t} Hz", {t});
  }
  async function act(a, el) {
    const p = cur(); if (!p) return;
    try {
      if (a === "addrep") {
        const out = parseFloat($("#repOut").value), off = parseFloat(String($("#repOff").value).replace("−", "-").replace("+", "")) || 0;
        const tone = parseTone($("#repTone").value);
        if (!(out > 1 && out < 1766)) throw new Error(_t("Escribe la frecuencia de salida en MHz."));
        if (tone === null) throw new Error(_t("Subtono no válido: escribe los Hz (ej. 100.0), el código de walkie (1–38) o un DCS (ej. D023N)."));
        const nm = $("#repName").value.trim() || fmt(out) + " MHz";
        await SDR.api("/api/memories", {freq: Math.round(out * 1e6), mod: "nfm", name: nm, group: group(p.id), tone, offset: Math.round(off * 1000)});
        SDR.toast(_t("Repetidora «{n}» guardada.", {n: nm}));
        await SDR.modules.radio.loadMemories(); render();
      } else if (a === "scanmine") {
        const ms = mems();
        await SDR.api("/api/radio/scan", {channels: ms.map(m => ({freq: m.freq, mod: "nfm", name: m.name}))});
        SDR.toast(_tn(ms.length, "Escaneando {n} repetidora.", "Escaneando {n} repetidoras.")); SDR.showTab("radio");
      } else if (a === "rep") {
        const x = p.rep[+el.dataset.rep];
        await SDR.api("/api/radio/scan", {range: {start: x.out[0] * 1e6, stop: x.out[1] * 1e6, step: x.step * 1e6, mod: "nfm"}});
        SDR.toast(_t("Buscando repetidoras de {b} en {a}–{z} MHz.", {b: x.b, a: fmt(x.out[0]), z: fmt(x.out[1])})); SDR.showTab("radio");
      }
    } catch (e) { SDR.toast(e.message, true); }
  }
  // ------------------------------------------------------------ decodificador de subtono (tarjeta propia en Más → Canales)
  // el radio sólo procesa mientras alguien escucha sus eventos: la tarjeta abre su propio flujo mientras se ve
  const D = {timer: null, last: null, live: null, es: null};
  function decVisible() { const c = $("#toneDec"); return !!(c && c.offsetParent !== null && !document.hidden); }
  function decTick() {
    const on = decVisible() && SDR.status && SDR.status.mode === "radio";
    if (on && !D.es) {
      D.es = new EventSource("/api/radio/stream");
      D.es.addEventListener("radio", ev => {
        const d = JSON.parse(ev.data);
        D.live = d;
        if (d.ctcss || d.dcs) D.last = {t: Date.now(), freq: d.freq, ctcss: d.ctcss, dcs: d.dcs};
      });
    } else if (!on && D.es) { D.es.close(); D.es = null; D.live = null; }
    if (decVisible()) decRender(on);
  }
  function decRender(on) {
    const box = $("#toneOut"); if (!box) return;
    const l = D.live || {}, f = l.freq || null;
    let head;
    if (!on || !f) head = `<p class="muted small" style="margin:0">${esc(_t("El decodificador funciona con el radio encendido. Escribe una frecuencia y pulsa «Escuchar y detectar», o usa «Buscar» en las repetidoras."))}</p>`;
    else head = `<p class="small" style="margin:0">${esc(_t("Escuchando {f} MHz", {f: fmt(f / 1e6)}))} · ${l.sq ? `<b style="color:var(--ok)">${esc(_t("hay señal"))}</b>` : esc(_t("en silencio"))}</p>`;
    const hit = on && (l.ctcss || l.dcs) ? {t: Date.now(), freq: f, ctcss: l.ctcss, dcs: l.dcs} : D.last;
    let tone = `<div class="tonebig muted">—</div>`;
    if (hit) {
      const live = hit.t > Date.now() - 1500;
      const what = hit.ctcss ? "CTCSS " + hit.ctcss.tone.toFixed(1) + " Hz" : "DCS " + hit.dcs.text.split(" ≡ ")[0];
      const c = hit.ctcss ? code(hit.ctcss.tone) : null;
      const s = Math.round((Date.now() - hit.t) / 1000);
      tone = `<div class="tonebig${live ? "" : " muted"}">${esc(what)}</div><p class="muted small" style="margin:0">` +
        esc([c ? _t("código walkie {n}", {n: c}) : "", _t("en {f} MHz", {f: fmt(hit.freq / 1e6)}), live ? _t("ahora") : (s < 60 ? _t("hace {n} s", {n: s}) : _t("hace {n} min", {n: Math.round(s / 60)}))].filter(Boolean).join(" · ")) +
        `</p><div class="row" style="margin-top:6px"><button class="btn sm" data-dec="use">${esc(_t("★ Usar en «Mis repetidoras»"))}</button></div>`;
    }
    box.innerHTML = head + tone;
  }
  function initDecoder() {
    const card = $("#toneDec"); if (!card) return;
    card.addEventListener("click", async ev => {
      const b = ev.target.closest("[data-dec]"); if (!b) return;
      if (b.dataset.dec === "listen") {
        const f = parseFloat($("#toneF").value);
        if (!(f > 1 && f < 1766)) { SDR.toast(_t("Escribe la frecuencia en MHz."), true); return; }
        try {
          D.last = null;
          await SDR.api("/api/radio/scan", {action: "stop"}).catch(() => {});
          await SDR.api("/api/radio", {freq: Math.round(f * 1e6), mod: "nfm"});
          if (!SDR.status || SDR.status.mode !== "radio") await SDR.api("/api/mode", {mode: "radio"});
          setTimeout(SDR.pollStatus, 400);
          SDR.toast(_t("Detectando el subtono en {f} MHz…", {f: fmt(f)}));
        } catch (e) { SDR.toast(e.message, true); }
      } else if (b.dataset.dec === "use" && D.last) {
        const h = D.last;
        if ($("#repOut")) {
          $("#repOut").value = fmt(h.freq / 1e6);
          $("#repTone").value = h.ctcss ? h.ctcss.tone.toFixed(1) : h.dcs.text.split(" ≡ ")[0].replace(/^DCS\s*/, "");
          $("#repName").focus(); $("#repName").scrollIntoView({behavior: "smooth", block: "center"});
        } else SDR.toast(_t("Elige primero tu país."), true);
      }
    });
    clearInterval(D.timer);
    D.timer = setInterval(decTick, 1000);
    decRender(false);
  }
  function init() {
    const sel = $("#paisSel"), box = $("#paisInfo");
    if (!sel) return;
    sel.addEventListener("change", () => choose(sel.value));
    const q = $("#paisQ");
    // escribir filtra la lista; si sólo queda un país (o se pulsa Enter) se elige solo
    q.addEventListener("input", () => {
      const opts = fillSelect().filter(o => o[0] !== S.sel), t = plain(q.value.trim());
      const exact = opts.find(o => plain(o[1]) === t);
      if (t && (opts.length === 1 || exact)) { choose((exact || opts[0])[0]); q.blur(); }
    });
    q.addEventListener("keydown", ev => {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      const o = fillSelect().find(x => x[0] !== S.sel) || fillSelect()[0];
      if (o) { choose(o[0]); q.blur(); }
    });
    initDecoder();
    box.addEventListener("click", async ev => {
      const svc = ev.target.closest("[data-svc]"), rep = ev.target.closest("[data-rep]"), a = ev.target.closest("[data-act]");
      const li = ev.target.closest("[data-listen]"), del = ev.target.closest("[data-del]");
      if (svc && SDR.modules.canales) SDR.modules.canales.select(svc.dataset.svc);
      if (rep) act("rep", rep);
      if (a) act(a.dataset.act, a);
      if (li) { const m = mems().find(x => x.id === li.dataset.listen); if (m) SDR.openRadio(m.freq, "nfm"); }
      if (del) {
        const m = mems().find(x => x.id === del.dataset.del);
        if (m && confirm(_t("¿Borrar la memoria «{name}»?", {name: m.name}))) {
          try { await SDR.api("/api/memories/delete", {ids: [m.id]}); await SDR.modules.radio.loadMemories(); render(); } catch (e) { SDR.toast(e.message, true); }
        }
      }
    });
  }
  return {
    init, render, code, parseTone, toneText, countries: P,
    current: cur,
    // región "A" (América) o "E" (Europa y resto) del país elegido, o null si no hay país
    region() { const p = cur(); return p ? p.r : null; },
    // ¿el servicio de Canales es propio del país elegido?
    native(s) { const p = cur(); return !p ? null : s.reg === "*" || p.sv.includes(s.id); },
  };
})();
SDR.modules.paises = Paises;
