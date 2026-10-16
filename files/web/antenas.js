/* SDR-Kit · Antenas: calculadora con diagramas y pérdidas de cable */
"use strict";
const Ant = (() => {
  const C = 299.792458;  // velocidad de la luz en m·MHz
  const CHIPS = [["FM", 100], ["Aviación", 125], ["Satélites", 137.5], ["2 m", 146], ["Marina", 157], ["433 MHz", 433.9],
    ["PMR446", 446], ["FRS/GMRS", 462.6], ["ADS-B", 1090], ["GPS", 1575.4]];
  // pérdida típica en dB cada 100 m (aprox. de hojas de datos)
  const CABLES = {
    "RG-174 (delgado)": [[30, 17], [50, 21], [100, 29], [150, 35], [200, 40], [450, 60], [900, 85], [1500, 115]],
    "RG-58": [[30, 8], [50, 11], [100, 16], [150, 20], [200, 23], [450, 37], [900, 54], [1500, 72]],
    "RG-8X (mini-8)": [[30, 6.2], [50, 8], [100, 12], [150, 15], [200, 17.5], [450, 28], [900, 41], [1500, 55]],
    "RG-6 (cable de TV, sirve para recibir)": [[30, 3.6], [50, 4.6], [100, 6.6], [150, 8.2], [200, 9.5], [450, 15], [900, 20], [1500, 27]],
    "LMR-240": [[30, 4.3], [50, 5.6], [100, 7.9], [150, 9.8], [200, 11.6], [450, 17.4], [900, 24.9], [1500, 32.5]],
    "LMR-400": [[30, 2.2], [50, 2.9], [100, 4.1], [150, 4.9], [200, 5.8], [450, 8.9], [900, 12.8], [1500, 16.7]],
  };
  const USES = [
    ["FM comercial", "Telescópica o dipolo (~71 cm por brazo)", "Cualquiera; mejor horizontal"],
    ["Aviación 118–137 MHz", "Vertical λ/4 con plano de tierra o dipolo vertical", "Vertical, afuera y alta"],
    ["Walkie-talkies y repetidoras", "J-Pole o vertical λ/4", "Vertical"],
    ["Satélites meteorológicos 137 MHz", "V-dipolo horizontal a 120° (o QFH)", "Horizontal, cielo despejado"],
    ["Aviones ADS-B 1090 MHz", "Vertical λ/4 de 6.5 cm con 4 radiales, cable corto", "Vertical, lo más alto posible"],
    ["Escuchar «de todo» (escáner)", "Discone (cubre ~10× su frecuencia mínima)", "Vertical, en el techo"],
    ["Cazar un transmisor", "Yagi de 3 elementos + modo cazador", "Gírala hasta el máximo"],
    ["Sensores 433 / 868 MHz", "Látigo λ/4 (16.4 cm / 8.2 cm)", "Vertical"],
    ["Onda corta / HF (V4)", "Alambre largo 10–20 m + unun 9:1", "Lo más alto y largo posible"],
  ];

  const fmtLen = (m) => m >= 1 ? m.toFixed(2) + " m" : m >= 0.1 ? (m * 100).toFixed(1) + " cm" : (m * 1000).toFixed(0) + " mm";
  const T = (x, y, s, cls, anchor) => `<text x="${x}" y="${y}" class="${cls || ""}" text-anchor="${anchor || "middle"}">${s}</text>`;
  const dimH = (x1, x2, y, label) => `<path class="dim" d="M${x1} ${y}H${x2}M${x1} ${y - 5}v10M${x2} ${y - 5}v10"/>` + T((x1 + x2) / 2, y - 7, label, "k");
  const dimV = (x, y1, y2, label, side) => `<path class="dim" d="M${x} ${y1}V${y2}M${x - 5} ${y1}h10M${x - 5} ${y2}h10"/>` + T(x + (side === "l" ? -8 : 8), (y1 + y2) / 2 + 4, label, "k", side === "l" ? "end" : "start");

  function designs(f, k) {
    const lam = C / f;
    return [
      {
        id: "dipole", name: "Dipolo λ/2", meta: "Fácil y bueno para todo · ganancia ~2.1 dBi · bidireccional",
        svg: `<svg viewBox="0 0 320 150">${dimH(30, 154, 40, "A")}${dimH(166, 290, 40, "A")}
          <path class="el" d="M30 70H154M166 70H290"/><path class="coax" d="M157 72v62M163 72v62"/>${T(160, 148, "coaxial al dongle")}</svg>`,
        dims: [["A", fmtLen(k * lam / 4), "cada brazo"], ["Total", fmtLen(k * lam / 2), "punta a punta"]],
        how: "Vivo del coaxial a un brazo, malla al otro. Para ondas verticales (walkies, aviación) ponlo de pie.",
      },
      {
        id: "gp", name: "Vertical λ/4 con plano de tierra", meta: "Omnidireccional · ~2 dBi · ideal para aviación, ADS-B y walkies",
        svg: `<svg viewBox="0 0 320 170"><path class="el" d="M160 20V96"/><path class="el2" d="M160 98L95 150M160 98L225 150"/>
          <path class="coax" d="M160 100V165"/>${dimV(186, 20, 96, "A")}${T(92, 138, "B", "k", "end")}${T(232, 138, "B", "k", "start")}
          ${T(160, 12, "radiador", "", "middle")}</svg>`,
        dims: [["A", fmtLen(k * lam / 4), "radiador vertical"], ["B", fmtLen(1.05 * k * lam / 4), "4 radiales a 45° hacia abajo"]],
        how: "El radiador va al vivo; los 4 radiales, a la malla. Con los radiales a 45° la impedancia queda cerca de 50 Ω.",
      },
      {
        id: "jpole", name: "J-Pole", meta: "Sin radiales · ~2.5 dBi · clásica de VHF/UHF, se hace con tubo o cinta",
        svg: `<svg viewBox="0 0 320 190"><path class="el" d="M150 15V170M150 170H180V112"/>
          <path class="coax" d="M150 152H120M180 152H210"/>${dimV(115, 15, 170, "A", "l")}${dimV(205, 112, 170, "B")}
          ${dimH(150, 180, 186, "C")}${T(225, 156, "D: punto de", "", "start")}${T(225, 170, "alimentación", "", "start")}</svg>`,
        dims: [["A", fmtLen(0.75 * k * lam), "elemento largo"], ["B", fmtLen(0.25 * k * lam), "elemento corto (stub)"],
          ["C", fmtLen(0.02 * lam), "separación entre ambos"], ["D", "≈ " + fmtLen(0.035 * lam), "desde abajo (ajusta probando)"]],
        how: "Vivo al elemento largo y malla al corto, a la altura D. Sube o baja el punto D hasta que la señal sea máxima.",
      },
      {
        id: "yagi", name: "Yagi 3 elementos (direccional)", meta: "~7 dBi · apunta hacia la señal · perfecta para el modo cazador",
        svg: `<svg viewBox="0 0 320 170"><path class="el2" d="M30 85H290"/>
          <path class="el" d="M60 25V145M150 32V138M240 40V130"/>
          ${T(60, 160, "R", "k")}${T(150, 160, "E", "k")}${T(240, 160, "D", "k")}
          ${dimH(60, 150, 15, "S1")}${dimH(150, 240, 15, "S2")}${T(300, 90, "→", "k", "end")}</svg>`,
        dims: [["R", fmtLen(0.495 * lam), "reflector (atrás)"], ["E", fmtLen(0.473 * lam), "excitado: dipolo partido al centro, va al coaxial"],
          ["D", fmtLen(0.440 * lam), "director (adelante)"], ["S1", fmtLen(0.20 * lam), "reflector ↔ excitado"], ["S2", fmtLen(0.15 * lam), "excitado ↔ director"]],
        how: "Apunta el director hacia el transmisor. El boom puede ser de madera o PVC. Para cazar, gírala buscando el máximo.",
      },
      {
        id: "vdip", name: "V-dipolo para satélites", meta: "Para satélites meteorológicos (Meteor-M 137 MHz) · horizontal",
        svg: `<svg viewBox="0 0 320 150"><path class="el" d="M154 75L60 30M166 75L260 30"/><path class="coax" d="M157 78v60M163 78v60"/>
          ${T(95, 70, "A", "k")}${T(225, 70, "A", "k")}${T(160, 40, "120°", "k")}</svg>`,
        dims: [["A", fmtLen(k * lam / 4), "cada brazo"], ["Ángulo", "120°", "entre brazos, en horizontal"]],
        how: "Acostada en horizontal, con los brazos apuntando a norte y sur. Necesita cielo despejado.",
      },
      {
        id: "discone", name: "Discone (banda ancha)", meta: `Cubre desde ${f} MHz hasta ~${Math.round(f * 10)} MHz · ideal para escáner`,
        svg: `<svg viewBox="0 0 320 170"><path class="el" d="M95 30H225"/><path class="el2" d="M160 40L100 140M160 40L220 140M100 140H220"/>
          <path class="coax" d="M160 34V165"/>${dimH(95, 225, 18, "D")}${T(112, 92, "L", "k", "end")}${dimH(100, 220, 156, "Base")}</svg>`,
        dims: [["L", fmtLen(0.25 * lam), "lado del cono (para la frecuencia mínima)"], ["Base", fmtLen(0.25 * lam), "diámetro base (cono de 60°)"],
          ["D", fmtLen(0.7 * 0.25 * lam), "diámetro del disco"], ["Separación", "1–2 cm", "entre disco y punta del cono"]],
        how: "Disco al vivo, cono a la malla. Puede hacerse con varillas (8+ por elemento) en vez de chapa.",
      },
      {
        id: "whip", name: "Látigo telescópico (la del kit)", meta: "Ajusta la antena telescópica del dongle a la banda",
        svg: `<svg viewBox="0 0 320 150"><path class="el" d="M160 15V110"/><rect x="140" y="110" width="40" height="22" rx="4" fill="#2b3644"/>
          ${T(160, 145, "dongle / base")}${dimV(190, 15, 110, "A")}</svg>`,
        dims: [["A", fmtLen(k * lam / 4), "largo de la varilla (λ/4)"], ["Mejor aún", fmtLen(k * lam / 2), "dipolo: dos varillas de A"]],
        how: "Sobre una superficie metálica (base magnética en el techo del carro) funciona mucho mejor.",
      },
    ];
  }

  function render() {
    const f = parseFloat($("#antF").value), k = parseFloat($("#antK").value) || 0.95;
    $$("#antChips button").forEach(b => b.classList.toggle("active", +b.dataset.f === f));
    if (!(f > 0.1 && f < 6000)) { $("#antCards").innerHTML = '<div class="card muted">Escribe una frecuencia entre 0.1 y 6000 MHz.</div>'; return; }
    $("#antLambda").textContent = fmtLen(C / f) + " a " + f + " MHz";
    $("#antCards").innerHTML = designs(f, k).map(d => `<div class="card ant"><h3>${d.name}</h3><p class="meta">${d.meta}</p>${d.svg}
      <dl>${d.dims.map(x => `<dt>${x[0]}</dt><dd><b>${x[1]}</b> <span class="muted">· ${x[2]}</span></dd>`).join("")}</dl>
      <p class="muted small" style="margin:8px 0 0">${d.how}</p></div>`).join("");
  }
  function cable() {
    const tab = CABLES[$("#cabT").value], L = parseFloat($("#cabL").value), f = parseFloat($("#cabF").value);
    if (!tab || !(L >= 0) || !(f > 0)) { $("#cabOut").textContent = ""; return; }
    let per;
    if (f <= tab[0][0]) per = tab[0][1] * Math.sqrt(f / tab[0][0]);
    else if (f >= tab[tab.length - 1][0]) per = tab[tab.length - 1][1] * Math.sqrt(f / tab[tab.length - 1][0]);
    else {
      let i = 0; while (tab[i + 1][0] < f) i++;
      const [f1, a1] = tab[i], [f2, a2] = tab[i + 1];
      per = Math.exp(Math.log(a1) + (Math.log(a2) - Math.log(a1)) * (Math.log(f) - Math.log(f1)) / (Math.log(f2) - Math.log(f1)));
    }
    const db = per * L / 100, pct = 100 * Math.pow(10, -db / 10);
    const verdict = db < 1 ? "✅ Excelente." : db < 3 ? "👍 Aceptable." : db < 6 ? "⚠ Pierdes bastante: acorta el cable o usa uno más grueso." :
      "❌ Demasiado: lleva el dongle junto a la antena y usa una extensión USB.";
    $("#cabOut").innerHTML = `<div style="font:700 26px var(--mono)">${db.toFixed(1)} dB</div>
      <div class="muted small">Llega el ${pct.toFixed(0)}% de la señal · ${per.toFixed(1)} dB cada 100 m a ${f} MHz</div><p style="margin:6px 0 0">${verdict}</p>`;
  }
  function init() {
    $("#antChips").innerHTML = CHIPS.map(([n, f]) => `<button data-f="${f}">${n} · ${f}</button>`).join("");
    $("#antChips").addEventListener("click", ev => { const b = ev.target.closest("[data-f]"); if (b) { $("#antF").value = b.dataset.f; render(); } });
    $("#antF").addEventListener("input", render);
    $("#antK").addEventListener("change", render);
    $("#cabT").innerHTML = Object.keys(CABLES).map(n => `<option>${n}</option>`).join("");
    $("#cabT").value = "RG-58";
    ["#cabT", "#cabL", "#cabF"].forEach(id => $(id).addEventListener("input", cable));
    $("#antUse").innerHTML = "<thead><tr><th>Para</th><th>Antena</th><th>Posición</th></tr></thead><tbody>" +
      USES.map(u => `<tr><td><b>${u[0]}</b></td><td>${u[1]}</td><td class="muted">${u[2]}</td></tr>`).join("") + "</tbody>";
    render(); cable();
  }
  return {init};
})();
SDR.modules.ant = Ant;
