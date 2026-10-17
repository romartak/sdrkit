/* SDR-Kit · Analizador de espectro (estilo tinySA + funciones de analizadores de banco) */
"use strict";
const An = (() => {
  const S = {
    params: null, info: null, cal: null,
    f0: 0, f1: 0, n: 0, zmode: false, zf: null, trig: false,
    live: null, maxh: null, minh: null, avg: null, avgN: 0,
    show: {max: false, min: false, avg: false, peaks: true, persist: false, ref: false},
    ref: null, norm: false,
    paused: false, single: false, auto: true, refMin: -100, refMax: -10,
    markers: [], active: 0, peaks: [], cands: [], peakCursor: -1,
    sweepMs: null, rbw: null, kind: null, pos: 1, gain: null, det: "peak", lastFrameAt: 0,
    unit: "dBFS", offset: 0,
    meas: "none", chbw: 12500, spacing: 25000,
    limit: {upper: null, lower: null, beep: false}, fail: null, lastBeep: 0,
  };
  const PRESETS = [
    ["FM comercial", 87.5, 108.5],
    ["Aviación (AM)", 118, 137],
    ["Radioaficionados 2 m", 144, 148],
    ["Satélites meteorológicos 137 MHz", 136.9, 138.1],
    ["VHF servicios 148–174 MHz", 148, 174],
    ["Marina VHF", 155.5, 163],
    ["Buscapersonas VHF 152–159 MHz", 152, 159],
    ["Radiosondas 400–406 MHz", 400, 406],
    ["Radioaficionados 70 cm", 420, 450],
    ["ISM 433 MHz (controles, sensores)", 432.8, 435.0],
    ["PMR446 walkie-talkies (Europa)", 445.9, 446.3],
    ["UHF servicios 450–470 MHz", 450, 470],
    ["FRS/GMRS walkie-talkies (Américas)", 462.4, 467.9],
    ["TV digital UHF", 470, 698],
    ["Celular 700 MHz", 728, 806],
    ["Trunking 800 MHz / P25", 806, 824],
    ["Celular 850 (bajada)", 869, 894],
    ["ISM 902–928 / LoRa (Américas)", 902, 928],
    ["ISM 868 / LoRa (Europa)", 863, 870],
    ["Celular 900 (bajada)", 925, 960],
    ["ADS-B aviones 1090 MHz", 1084, 1096],
    ["GPS L1 (requiere LNA)", 1570, 1581],
    ["CB 27 MHz (V4)", 26.9, 27.5],
    ["Onda media AM (V4)", 0.5, 1.75],
    ["Onda corta 49 m (V4)", 5.8, 6.3],
    ["HF completo 0.5–30 MHz (V4)", 0.5, 30],
    ["VHF completo 30–300 MHz", 30, 300],
    ["UHF 300–1000 MHz", 300, 1000],
    ["Barrido total 24–1766 MHz", 24, 1766, "fast"],
    ["HackRF: WiFi 2.4 GHz", 2400, 2500],
    ["HackRF: drones / WiFi 5.8 GHz", 5650, 5950],
    ["HackRF: 1–6000 MHz", 1, 6000, "fast"],
  ];
  // Identificación de bandas (MHz). Se muestra la más angosta que contiene la frecuencia.
  const BANDS = [
    [0.1485, 0.2835, "Onda larga"], [0.5265, 1.7055, "Onda media AM"], [1.8, 2.0, "Radioafición 160 m"],
    [2.3, 2.495, "Onda corta 120 m (tropical)"], [3.2, 3.4, "Onda corta 90 m"], [3.5, 4.0, "Radioafición 80 m"],
    [4.75, 5.06, "Onda corta 60 m"], [5.9, 6.2, "Onda corta 49 m"], [7.0, 7.3, "Radioafición 40 m"],
    [7.3, 7.45, "Onda corta 41 m"], [9.4, 9.9, "Onda corta 31 m"], [10.1, 10.15, "Radioafición 30 m"],
    [11.6, 12.1, "Onda corta 25 m"], [13.553, 13.567, "ISM 13.56 MHz (NFC / RFID)"], [13.57, 13.87, "Onda corta 22 m"],
    [14.0, 14.35, "Radioafición 20 m"], [15.1, 15.8, "Onda corta 19 m"], [17.48, 17.9, "Onda corta 16 m"],
    [18.068, 18.168, "Radioafición 17 m"], [21.0, 21.45, "Radioafición 15 m"], [24.89, 24.99, "Radioafición 12 m"],
    [26.965, 27.405, "Banda ciudadana CB"], [28.0, 29.7, "Radioafición 10 m"], [50, 54, "Radioafición 6 m"],
    [54, 88, "TV VHF baja / servicios"], [87.5, 108, "FM comercial"], [108, 117.975, "Radionavegación aérea VOR / ILS"],
    [118, 137, "Banda aérea VHF (voz AM)"], [137, 138, "Satélites meteorológicos NOAA / Meteor"],
    [144, 148, "Radioafición 2 m"], [148, 174, "VHF servicios: seguridad, empresas, buscapersonas"],
    [156, 162.025, "Marina VHF"], [161.96, 162.04, "AIS (posición de barcos)"], [162.4, 162.55, "NOAA Weather Radio"],
    [174, 216, "TV VHF alta / DAB+ (Europa)"], [225, 400, "Aviación militar UHF"], [400, 406, "Radiosondas meteorológicas"],
    [406, 406.1, "Radiobalizas de socorro 406 MHz"], [420, 450, "Radioafición 70 cm"],
    [433.05, 434.79, "ISM 433 MHz: controles, sensores, LoRa"], [446, 446.2, "PMR446 (Europa)"],
    [450, 470, "UHF servicios: seguridad, empresas, DMR, trunking"], [462.55, 467.725, "FRS / GMRS walkie-talkies"],
    [470, 698, "TV digital UHF"], [698, 806, "Celular 700 MHz (LTE)"], [806, 824, "Trunking 800 MHz / P25"],
    [824, 849, "Celular 850 subida (teléfonos)"], [863, 870, "ISM 868 MHz (Europa): LoRa, sensores"],
    [869, 894, "Celular 850 bajada (antenas)"], [902, 928, "ISM 915 MHz (Américas): LoRa, medidores"],
    [925, 960, "Celular 900 bajada"], [960, 1215, "Navegación aérea DME / TACAN"], [1087, 1093, "ADS-B / Modo S (aviones)"],
    [1164, 1215, "GNSS L5 / E5"], [1215, 1300, "Radar / radioafición 23 cm / GNSS L2"], [1525, 1559, "Satélites Inmarsat"],
    [1559, 1610, "GPS L1 / Galileo / GLONASS"], [1610, 1626.5, "Iridium"], [1670, 1710, "Satélites meteorológicos HRPT / GOES"],
    [1710, 1785, "Celular AWS / 1800 subida"], [1805, 1880, "Celular 1800 bajada"], [1850, 1990, "Celular PCS 1900"],
    [2400, 2483.5, "WiFi 2.4 GHz / Bluetooth / microondas"], [5150, 5850, "WiFi 5 GHz"], [5725, 5875, "ISM 5.8 GHz: drones FPV"],
  ];
  const UNITS = {dBFS: "dBFS", dBm: "dBm", dBuV: "dBµV", dBmV: "dBmV"};
  const MEAS = {
    none: "Ninguna", chpower: "Potencia de canal", obw: "Ancho ocupado (OBW 99 %)", xdb: "Ancho a −3/−6/−20/−26 dB",
    acpr: "Potencia de canal adyacente (ACPR)", snr: "SNR y densidad de ruido", counter: "Contador de frecuencia",
    harm: "Armónicos y THD", pulse: "Pulsos (span cero)",
  };
  const T = {step: 12500, mod: "auto", thr: 10, sigs: [], zTimer: null};
  let es = null;

  // ------------------------------------------------------------------ preferencias
  function savePrefs() {
    try {
      localStorage.setItem("sdrkit.an", JSON.stringify({show: S.show, unit: S.unit, offset: S.offset, meas: S.meas,
        chbw: S.chbw, spacing: S.spacing, limit: S.limit, auto: S.auto, refMin: S.refMin, refMax: S.refMax,
        tuner: {step: T.step, mod: T.mod, thr: T.thr}}));
    } catch (e) {}
  }
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem("sdrkit.an") || "null");
      if (!p) return;
      Object.assign(S.show, p.show || {});
      if (UNITS[p.unit]) S.unit = p.unit;
      S.offset = +p.offset || 0;
      if (MEAS[p.meas]) S.meas = p.meas;
      S.chbw = +p.chbw || 12500; S.spacing = +p.spacing || 25000;
      Object.assign(S.limit, p.limit || {}); S.limit.beep = false;
      if (p.auto === false) { S.auto = false; S.refMin = +p.refMin; S.refMax = +p.refMax; }
      if (p.tuner) { T.step = +p.tuner.step || 12500; T.mod = p.tuner.mod || "auto"; T.thr = +p.tuner.thr || 10; }
    } catch (e) {}
  }

  // ------------------------------------------------------------------ unidades y ejes
  function U() {
    const k = S.cal ? S.cal.k : 0;
    return S.unit === "dBm" ? k : S.unit === "dBuV" ? k + 107 : S.unit === "dBmV" ? k + 47 : 0;
  }
  const refOK = () => !!(S.ref && S.ref.f0 === S.f0 && S.ref.f1 === S.f1 && S.ref.n === S.n && S.ref.z === S.zmode);
  const normOn = () => S.norm && refOK();
  const unitLabel = () => normOn() ? "dB" : UNITS[S.unit];
  function view(arr) {  // dBFS crudos → unidades de pantalla (o relativo a la referencia)
    if (!arr) return null;
    const out = new Float32Array(arr.length);
    if (normOn()) { const r = S.ref.data; for (let i = 0; i < arr.length; i++) out[i] = arr[i] - r[i]; }
    else { const u = U(); for (let i = 0; i < arr.length; i++) out[i] = arr[i] + u; }
    return out;
  }
  const vAt = (i) => normOn() ? S.live[i] - S.ref.data[i] : S.live[i] + U();
  const idxToX = (i) => S.f0 + (i + 0.5) * (S.f1 - S.f0) / S.n;  // Hz crudos (o segundos en span cero)
  const xToIdx = (x) => (x < S.f0 || x > S.f1) ? null : SDR.clamp(Math.floor((x - S.f0) / (S.f1 - S.f0) * S.n), 0, S.n - 1);
  const dHz = (raw) => raw + S.offset;  // frecuencia mostrada (con convertidor)
  function fmtX(x, prec) {
    if (S.zmode) return (x * 1000).toFixed(x < 0.01 ? 3 : x < 0.1 ? 2 : 1) + " ms";
    return SDR.fmtMHz(dHz(x), prec || (S.f1 - S.f0));
  }
  const fmtLv = (v) => isFinite(v) ? v.toFixed(1) + " " + unitLabel() : "—";
  function bandName(rawHz) {
    const f = dHz(rawHz) / 1e6; let best = null;
    for (const b of BANDS) if (f >= b[0] && f <= b[1] && (!best || b[1] - b[0] < best[1] - best[0])) best = b;
    return best ? _t(best[2]) : "";
  }

  // ------------------------------------------------------------------ flujo de datos
  function wantStream() {
    const st = SDR.status;
    return SDR.tab === "an" && !document.hidden && st && st.mode === "sweep" && !st.switching;
  }
  function updateStream() {
    if (wantStream()) {
      if (!es) {
        es = new EventSource("/api/stream");
        es.addEventListener("frame", ev => onFrame(JSON.parse(ev.data)));
        es.addEventListener("status", ev => { const st = JSON.parse(ev.data); setStatusLine(st.msg, st.level === "error" ? "err" : st.level === "ok" ? "ok" : ""); });
        es.onerror = () => setStatusLine(_t("Reconectando con la Raspberry…"), "err");
      }
    } else if (es) { es.close(); es = null; }
  }
  function setStatusLine(msg, cls) { const el = $("#statusLine"); el.textContent = msg; el.className = "statusline " + (cls || ""); }

  function resetTraces(fr, z) {
    const oldBin = S.n ? (S.f1 - S.f0) / S.n : 0, zChanged = z !== S.zmode;
    S.f0 = fr.f0; S.f1 = fr.f1; S.n = fr.n; S.zmode = z;
    S.live = new Float32Array(fr.n).fill(NaN);
    S.maxh = new Float32Array(fr.n).fill(NaN);
    S.minh = new Float32Array(fr.n).fill(NaN);
    S.avg = new Float32Array(fr.n).fill(NaN);
    S.avgN = 0; S.peaks = []; S.cands = []; S.peakCursor = -1;
    if (zChanged) { S.markers = []; S.active = 0; }
    else S.markers.forEach(m => { m.snap = m.exact ? 0 : oldBin; });
    wfReset(fr.n); persistReset();
    $("#peaksCard").classList.toggle("hidden", z);
    $("#mkZspan").textContent = z ? _t("↩ Barrido") : _t("⏱ Span cero");
    renderReadout(); renderMarkers(); renderPeaks(); renderModeUi(); renderTuner();
  }
  function onFrame(fr) {
    S.lastFrameAt = Date.now();
    if (S.paused) return;
    const z = fr.mode === "zspan";
    if (fr.f0 !== S.f0 || fr.f1 !== S.f1 || fr.n !== S.n || z !== S.zmode) resetTraces(fr, z);
    const d = fr.db, live = S.live;
    for (let i = 0; i < d.length; i++) live[i] = d[i] === null ? NaN : d[i];
    S.pos = fr.pos; S.kind = fr.kind; S.rbw = fr.rbw; S.gain = fr.gain; S.det = fr.det || "peak";
    S.zf = fr.zf || null; S.trig = !!fr.trig;
    if (fr.complete) {
      S.sweepMs = fr.sweep_ms;
      const a = 1 / Math.min(S.avgN + 1, 16); S.avgN++;
      for (let i = 0; i < live.length; i++) {
        const v = live[i]; if (!isFinite(v)) continue;
        if (!(S.maxh[i] >= v)) S.maxh[i] = v;
        if (!(S.minh[i] <= v)) S.minh[i] = v;
        S.avg[i] = isFinite(S.avg[i]) ? S.avg[i] + (v - S.avg[i]) * a : v;
      }
      if (S.auto) autoScale();
      findPeaks(); trackMarkers();
      wfAddRow(); persistAdd(); renderPeaks(); checkLimits(); measure(); renderTuner();
      if (S.single) { S.single = false; S.paused = true; renderPauseBtns(); }
    }
    renderReadout(); renderMarkers();
    const st = SDR.status;
    if (st && st.mode === "sweep") {
      const zf = z ? SDR.fmtMHz(dHz(S.zf || 0), 1e5) : "";
      const msg = z ? (S.trig ? _t("Span cero en {f} · disparo por nivel", {f: zf}) : _t("Span cero en {f} · libre", {f: zf}))
        : fr.kind === "hop" && !fr.complete ? _t("Barriendo… {p}%", {p: Math.round(fr.pos * 100)})
        : _t("En vivo · {dev}", {dev: _t(st.sweep.device || "")});
      setStatusLine(S.paused ? _t("En pausa (barrido único)") : msg, "ok");
    }
    drawSoon();
  }
  function autoScale() {
    const v = Array.from(view(S.live)).filter(isFinite).sort((a, b) => a - b);
    if (v.length < 8) return;
    const lo = v[Math.floor(v.length * 0.1)], hi = v[v.length - 1];
    let mn = Math.floor((lo - 10) / 10) * 10, mx = Math.ceil((hi + 6) / 10) * 10;
    if (mx - mn < 40) mn = mx - 40;
    S.refMin = mn; S.refMax = mx;
    $("#inRefMin").value = mn; $("#inRefMax").value = mx;
  }
  function findPeaks() {
    const v = S.live, n = v.length; if (!n) return;
    const finite = Array.from(v).filter(isFinite).sort((a, b) => a - b);
    if (!finite.length) return;
    const thr = finite[Math.floor(finite.length / 2)] + 8, sep = Math.max(2, Math.floor(n / 60));
    const cand = [];
    for (let i = 1; i < n - 1; i++) { const x = v[i]; if (x > thr && x >= v[i - 1] && x >= v[i + 1]) cand.push([i, x]); }
    S.cands = cand.map(c => c[0]);
    cand.sort((a, b) => b[1] - a[1]);
    const out = [];
    for (const c of cand) { if (out.every(o => Math.abs(o[0] - c[0]) >= sep)) out.push(c); if (out.length >= 10) break; }
    S.peaks = out;
  }
  function globalMax() {
    let best = -1, bv = -Infinity;
    for (let i = 0; i < S.n; i++) if (S.live[i] > bv) { bv = S.live[i]; best = i; }
    return best;
  }
  function localMax(i, w) {
    let best = i;
    for (let k = Math.max(0, i - w); k <= Math.min(S.n - 1, i + w); k++) if (S.live[k] > S.live[best]) best = k;
    return best;
  }

  // ------------------------------------------------------------------ marcadores
  const mIdx = (m) => m ? xToIdx(m.x) : null;
  function curMarker() { return S.markers[S.active] || null; }
  function addMarker(i) {
    if (S.markers.length >= 4) { SDR.toast(_t("Máximo 4 marcadores.")); return; }
    const m = {x: idxToX(i), delta: false, track: false, snap: 0, exact: false};
    S.markers.push(m); S.active = S.markers.length - 1;
    renderMarkers(); measure(); drawSoon();
  }
  function moveMarker(i) {
    if (!S.markers.length) { addMarker(i); return; }
    const m = curMarker(); m.x = idxToX(i); m.snap = 0; m.exact = false;
    renderMarkers(true); renderTuner(); measure(); drawSoon();
  }
  function trackMarkers() {
    const binX = (S.f1 - S.f0) / S.n;
    S.markers.forEach((m, k) => {
      const i = mIdx(m); if (i == null) return;
      if (m.track) {
        const j = k === 0 ? globalMax() : localMax(i, Math.max(2, Math.round(S.n * 0.03)));
        if (j >= 0) { m.x = idxToX(j); m.exact = false; }
      } else if (m.snap) {
        m.x = idxToX(localMax(i, Math.max(1, Math.ceil(m.snap / binX))));
      }
      m.snap = 0;
    });
  }
  // Ancho ocupado alrededor del marcador y tipo de señal probable
  function occupiedBw(i) {
    const v = S.live; if (!isFinite(v[i]) || S.zmode) return null;
    const finite = Array.from(v).filter(isFinite).sort((a, b) => a - b);
    const floor = finite[Math.floor(finite.length * 0.3)];
    if (v[i] - floor < 10) return null;
    const lvl = Math.max(v[i] - 20, floor + 3);
    let a = i, b = i;
    while (a > 0 && v[a - 1] > lvl) a--;
    while (b < S.n - 1 && v[b + 1] > lvl) b++;
    const bin = (S.f1 - S.f0) / S.n, bw = (b - a + 1) * bin;
    if (bw < 2.5 * Math.max(bin, S.rbw || 0)) return {bw, guess: _t("señal estrecha (portadora, CW o datos)")};
    const f = dHz(idxToX(i)) / 1e6;
    let g = "";
    if (bw < 4e3) g = _t("estrecha: CW, datos o AM de voz");
    else if (bw < 9e3) g = (f > 108 && f < 137) ? _t("AM de aviación") : _t("AM / FM muy estrecha (6.25 kHz)");
    else if (bw < 22e3) g = _t("FM estrecha: walkie-talkie, repetidora o digital (DMR)");
    else if (bw < 60e3) g = _t("FM ancha / datos");
    else if (bw < 300e3) g = (f >= 87.5 && f <= 108) ? _t("FM comercial (estéreo)") : _t("señal ancha (FM comercial, video)");
    else if (bw < 3e6) g = _t("digital ancha (ADS-B, LTE estrecho, DAB)");
    else g = _t("muy ancha: TV digital, LTE, WiFi");
    return {bw, guess: g};
  }
  let bwTick = 0;
  function renderMarkers(forceBw) {
    const chips = S.markers.map((m, k) =>
      `<button class="mkc${k === S.active ? " active" : ""}" data-m="${k}">M${k + 1}${m.delta && k ? " Δ" : ""}${m.track ? " ⟳" : ""}</button>`).join("");
    $("#mkChips").innerHTML = chips + (S.markers.length < 4 ? '<button class="mkc add" data-add="1">' + _t("＋ Marcador") + '</button>' : "") +
      (S.markers.length ? '<button class="mkc del" data-del="1">' + _t("✕ Quitar") + '</button>' : "");
    $("#btnTrack").classList.toggle("on", !!(curMarker() && curMarker().track));
    $("#btnDelta").classList.toggle("on", !!(curMarker() && curMarker().delta));
    const el = $("#mkText");
    if (!S.markers.length || !S.n) {
      el.innerHTML = '<i>M1</i>' + _t("Toca el espectro para poner un marcador"); $("#mkBw").textContent = ""; return;
    }
    const m1 = S.markers[0], i1 = mIdx(m1);
    el.innerHTML = S.markers.map((m, k) => {
      const i = mIdx(m);
      if (i == null) return `<div class="mkl"><i>M${k + 1}</i><span class="muted">${_t("fuera de pantalla ({x})", {x: SDR.esc(fmtX(m.x))})}</span></div>`;
      const v = vAt(i);
      if (m.delta && k && i1 != null) {
        const dx = m.x - m1.x, dv = v - vAt(i1);
        const dxs = S.zmode ? (dx * 1000).toFixed(3) + " ms" : (dx >= 0 ? "+" : "−") + SDR.fmtHz(Math.abs(dx));
        return `<div class="mkl${k === S.active ? " act" : ""}"><i>M${k + 1}</i>Δ ${SDR.esc(dxs)} · ${isFinite(dv) ? (dv >= 0 ? "+" : "") + dv.toFixed(1) + " dB" : "—"}</div>`;
      }
      return `<div class="mkl${k === S.active ? " act" : ""}"><i>M${k + 1}</i>${SDR.esc(fmtX(m.x))} · ${SDR.esc(fmtLv(v))}</div>`;
    }).join("");
    if (forceBw || ++bwTick % 3 === 0 || !$("#mkBw").textContent) {
      const m = curMarker(), i = mIdx(m);
      if (i == null || S.zmode) { $("#mkBw").textContent = ""; return; }
      const o = occupiedBw(i), band = bandName(idxToX(i));
      $("#mkBw").textContent = [o ? _t("Ancho ≈ {bw} · {guess}", {bw: SDR.fmtHz(o.bw), guess: o.guess}) : "", band ? _t("Banda: {b}", {b: band}) : ""].filter(Boolean).join("  ·  ");
    }
  }
  function renderPeaks() {
    const tb = $("#peakRows");
    if (!S.peaks.length) { tb.innerHTML = '<tr><td colspan="4" class="muted">' + _t("Sin picos destacados todavía.") + '</td></tr>'; return; }
    tb.innerHTML = S.peaks.map((p, k) =>
      `<tr><td>${k + 1}</td><td><a href="#" data-i="${p[0]}" style="color:inherit">${(dHz(idxToX(p[0])) / 1e6).toFixed(4)} MHz</a></td>` +
      `<td>${SDR.esc(fmtLv(vAt(p[0])))}</td><td><button class="btn sm" data-listen="${idxToX(p[0])}" aria-label="${_t("Escuchar")}">🎧</button></td></tr>`).join("");
  }
  function renderReadout() {
    const span = S.f1 - S.f0;
    if (S.zmode) {
      $("#roStart").textContent = "0 ms";
      $("#roCenter").textContent = S.zf ? SDR.fmtMHz(dHz(S.zf), 1e5) : "—";
      $("#roStop").textContent = (S.f1 * 1000).toFixed(S.f1 < 0.01 ? 1 : 0) + " ms";
      $("#roSpan").textContent = "0 Hz";
    } else {
      $("#roStart").textContent = S.n ? SDR.fmtMHz(dHz(S.f0), span) : "—";
      $("#roStop").textContent = S.n ? SDR.fmtMHz(dHz(S.f1), span) : "—";
      $("#roCenter").textContent = S.n ? SDR.fmtMHz(dHz((S.f0 + S.f1) / 2), span) : "—";
      $("#roSpan").textContent = S.n ? SDR.fmtHz(span) : "—";
    }
    $("#roRbw").textContent = SDR.fmtHz(S.rbw);
    $("#roSweep").textContent = S.sweepMs == null ? "—" : S.sweepMs < 1500 ? Math.round(S.sweepMs) + " ms" : (S.sweepMs / 1000).toFixed(1) + " s";
    $("#roGain").textContent = S.gain == null ? "—" : S.gain === "auto" ? _t("Auto") : Number(S.gain).toFixed(1) + " dB";
    const g = S.n ? globalMax() : -1;
    $("#roPeak").textContent = g >= 0 && isFinite(S.live[g]) ? (S.zmode ? "" : (dHz(idxToX(g)) / 1e6).toFixed(3) + " · ") + vAt(g).toFixed(0) : "—";
  }

  // ------------------------------------------------------------------ mediciones
  const lin = (db) => Math.pow(10, db / 10);
  const dB = (p) => p > 0 ? 10 * Math.log10(p) : -Infinity;
  function chPower(v, fa, fb) {  // integra la densidad: Σ p·Δf/RBW (exacto con detector «Promedio»)
    const bin = (S.f1 - S.f0) / S.n, rbw = Math.max(S.rbw || bin, 1);
    let p = 0, cnt = 0;
    for (let i = 0; i < S.n; i++) {
      const x = idxToX(i);
      if (x < fa || x > fb || !isFinite(v[i])) continue;
      p += lin(v[i]) * bin / rbw; cnt++;
    }
    return cnt ? p : null;
  }
  function xdbBw(v, i, x) {
    const L = v[i] - x; let a = i, b = i;
    while (a > 0 && v[a - 1] > L) a--;
    while (b < S.n - 1 && v[b + 1] > L) b++;
    if (a === 0 || b === S.n - 1) return null;
    const fr = (j0, j1) => { const t = (v[j0] - L) / (v[j0] - v[j1] || 1); return idxToX(j0) + t * (idxToX(j1) - idxToX(j0)); };
    return fr(b, b + 1) - fr(a, a - 1);
  }
  function refIdx() {  // marcador activo, o el pico más alto
    const i = mIdx(curMarker());
    return i != null ? i : globalMax();
  }
  function measure() {
    const out = $("#measOut");
    if (S.meas === "none" || !S.n) { out.classList.add("hidden"); return; }
    out.classList.remove("hidden");
    const v = view(S.live), u = unitLabel(), bin = (S.f1 - S.f0) / S.n, rbw = Math.max(S.rbw || bin, 1);
    const rows = [];
    const row = (k, val) => rows.push(`<div><b>${SDR.esc(k)}</b><span>${SDR.esc(val)}</span></div>`);
    const note = (t) => rows.push(`<p class="muted small">${SDR.esc(t)}</p>`);
    if (S.zmode && S.meas !== "pulse") { note(_t("En span cero usa la medición «Pulsos». Las demás se calculan sobre un barrido.")); }
    else if (S.meas === "pulse") {
      if (!S.zmode) note(_t("Pulsos: cambia a Span cero (botón ⏱ junto a los marcadores) sobre la señal."));
      else {
        const fin = Array.from(v).filter(isFinite).sort((a, b) => a - b);
        const lo = fin[Math.floor(fin.length * 0.2)], hi = fin[fin.length - 1], thr = (lo + hi) / 2, dt = (S.f1 - S.f0) / S.n;
        const rise = [], fall = [];
        for (let i = 1; i < S.n; i++) {
          if (v[i - 1] < thr && v[i] >= thr) rise.push(i);
          if (v[i - 1] >= thr && v[i] < thr && rise.length) fall.push(i);
        }
        const widths = [];
        rise.forEach(r => { const f = fall.find(x => x > r); if (f) widths.push((f - r) * dt); });
        const periods = rise.slice(1).map((r, k) => (r - rise[k]) * dt);
        const avgA = (a) => a.reduce((s, x) => s + x, 0) / a.length;
        if (hi - lo < 6) note(_t("No hay pulsos claros (la señal no supera el ruido por 6 dB)."));
        else {
          row(_t("Pulsos en pantalla"), String(rise.length));
          if (widths.length) row(_t("Ancho medio"), (avgA(widths) * 1e6).toFixed(0) + " µs");
          if (periods.length) {
            const per = avgA(periods);
            row(_t("Período"), (per * 1e3).toFixed(3) + " ms (" + (1 / per).toFixed(1) + " Hz)");
            if (widths.length) row(_t("Ciclo de trabajo"), (100 * avgA(widths) / per).toFixed(0) + " %");
          }
          row(_t("Nivel encendido / apagado"), hi.toFixed(1) + " / " + lo.toFixed(1) + " " + u);
          note(_t("Útil para controles remotos (OOK), radares y datos: cada fila de la cascada es una captura."));
        }
      }
    } else if (S.meas === "chpower") {
      const i = refIdx(), c = idxToX(i), p = chPower(v, c - S.chbw / 2, c + S.chbw / 2);
      row(_t("Centro"), fmtX(c)); row(_t("Ancho del canal"), SDR.fmtHz(S.chbw));
      row(_t("Potencia en el canal"), p == null ? "—" : dB(p).toFixed(1) + " " + u);
      row(_t("Potencia en todo el span"), dB(chPower(v, S.f0, S.f1) || 0).toFixed(1) + " " + u);
      if (S.chbw < bin * 3) note(_t("El canal mide menos de 3 puntos: acerca el zoom para más precisión."));
    } else if (S.meas === "obw") {
      let tot = 0; const cum = new Float64Array(S.n);
      for (let i = 0; i < S.n; i++) { tot += isFinite(v[i]) ? lin(v[i]) : 0; cum[i] = tot; }
      let a = 0, b = S.n - 1;
      while (a < S.n - 1 && cum[a] < 0.005 * tot) a++;
      while (b > 0 && cum[b] > 0.995 * tot) b--;
      row("OBW 99 %", SDR.fmtHz(idxToX(b) - idxToX(a) + bin));
      row(_t("Desde – hasta"), fmtX(idxToX(a)) + " – " + fmtX(idxToX(b)));
      row(_t("Centro de la señal"), fmtX((idxToX(a) + idxToX(b)) / 2));
      row(_t("Potencia total"), dB(tot * bin / rbw).toFixed(1) + " " + u);
      note(_t("Calcula sobre todo el span: encuadra sólo la señal que quieres medir."));
    } else if (S.meas === "xdb") {
      const i = refIdx();
      row(_t("Señal"), fmtX(idxToX(i)) + " · " + fmtLv(v[i]));
      for (const x of [3, 6, 20, 26]) { const w = xdbBw(v, i, x); row(_t("Ancho a −{x} dB", {x}), w == null ? _t("fuera del span") : SDR.fmtHz(w)); }
      if (S.rbw && S.rbw > bin * 4) note(_t("RBW grande: el ancho medido no puede ser menor que la RBW ({rbw}).", {rbw: SDR.fmtHz(S.rbw)}));
    } else if (S.meas === "acpr") {
      const i = refIdx(), c = idxToX(i), h = S.chbw / 2;
      const pm = chPower(v, c - h, c + h), pl = chPower(v, c - S.spacing - h, c - S.spacing + h), pu = chPower(v, c + S.spacing - h, c + S.spacing + h);
      row(_t("Canal principal"), pm == null ? "—" : dB(pm).toFixed(1) + " " + u + " @ " + fmtX(c));
      row(_t("Adyacente inferior"), pl == null || !pm ? _t("fuera del span") : (dB(pl) - dB(pm)).toFixed(1) + " dBc");
      row(_t("Adyacente superior"), pu == null || !pm ? _t("fuera del span") : (dB(pu) - dB(pm)).toFixed(1) + " dBc");
      note(_t("Canal {bw}, separación {sp}. Detector «Promedio» recomendado.", {bw: SDR.fmtHz(S.chbw), sp: SDR.fmtHz(S.spacing)}));
    } else if (S.meas === "snr") {
      const i = refIdx(), fin = Array.from(v).filter(isFinite).sort((a, b) => a - b), floor = fin[Math.floor(fin.length / 2)];
      row(_t("Señal"), fmtLv(v[i]) + " @ " + fmtX(idxToX(i)));
      row(_t("Piso de ruido (en RBW {rbw})", {rbw: SDR.fmtHz(rbw)}), floor.toFixed(1) + " " + u);
      row("SNR", (v[i] - floor).toFixed(1) + " dB");
      row(_t("Densidad de ruido"), (floor - 10 * Math.log10(rbw)).toFixed(1) + " " + u + "/Hz");
      row("C/N₀", (v[i] - floor + 10 * Math.log10(rbw)).toFixed(1) + " dB·Hz");
    } else if (S.meas === "counter") {
      const i = refIdx();
      let d = 0;
      if (i > 0 && i < S.n - 1 && isFinite(v[i - 1]) && isFinite(v[i + 1])) {
        const den = v[i - 1] - 2 * v[i] + v[i + 1];
        if (den < 0) d = SDR.clamp(0.5 * (v[i - 1] - v[i + 1]) / den, -0.5, 0.5);
      }
      const f = idxToX(i + d), hz = dHz(f);
      row(_t("Frecuencia"), (hz / 1e6).toFixed(bin < 100 ? 6 : 5) + " MHz");
      row(_t("Resolución"), "≈ " + SDR.fmtHz(Math.max(bin / 10, 1)));
      row(_t("Error del oscilador (±1 ppm)"), "± " + SDR.fmtHz(hz / 1e6));
      note(_t("Para máxima precisión: haz zoom sobre la portadora (span pequeño, detalle «Fino»)."));
    } else if (S.meas === "harm") {
      const i = refIdx(), f = idxToX(i), p1 = lin(v[i]);
      row(_t("Fundamental"), fmtX(f) + " · " + fmtLv(v[i]));
      let sum = 0, miss = 0;
      for (let h = 2; h <= 5; h++) {
        const j = xToIdx(f * h);
        const hn = _t(["2º armónico", "3º armónico", "4º armónico", "5º armónico"][h - 2]);
        if (j == null) { row(hn, _t("fuera del span")); miss++; continue; }
        const k = localMax(j, 2); sum += lin(v[k]);
        row(hn, (v[k] - v[i]).toFixed(1) + " dBc @ " + fmtX(idxToX(k)));
      }
      if (sum) row(_t("THD (aprox.)"), (100 * Math.sqrt(sum / p1)).toFixed(2) + " %");
      if (miss) rows.push(`<button class="btn sm" id="btnHarmSpan">${_t("Ajustar el span para ver 5 armónicos")}</button>`);
      note(_t("Ojo: el propio dongle genera armónicos si la señal es muy fuerte. Baja la ganancia para confirmar."));
    }
    out.innerHTML = `<h4>${SDR.esc(_t(MEAS[S.meas]))}</h4><div class="mgrid">${rows.join("")}</div>`;
  }

  // ------------------------------------------------------------------ sintonizador (sin tocar el gráfico)
  function activeSignals() {  // zonas contiguas sobre el piso de ruido + umbral → una señal por zona
    if (!S.n || S.zmode) return [];
    const v = S.live, fin = Array.from(v).filter(isFinite).sort((a, b) => a - b);
    if (fin.length < 8) return [];
    const thr = fin[Math.floor(fin.length * 0.3)] + T.thr, out = [];
    let i = 0;
    while (i < S.n) {
      if (!(v[i] > thr)) { i++; continue; }
      let j = i, pk = i;
      while (j < S.n && (v[j] > thr || (j + 1 < S.n && v[j + 1] > thr))) { if (v[j] > v[pk]) pk = j; j++; }
      out.push({i: pk, a: i, b: j - 1});
      i = j + 1;
    }
    return out;
  }
  const snapStep = (f) => Math.round(f / T.step) * T.step;
  function tunerFreq() {
    if (S.zmode) return S.params ? S.params.zf : S.zf;
    const m = curMarker(); return m ? m.x : (S.n ? snapStep((S.f0 + S.f1) / 2) : null);
  }
  function setTunerFreq(raw) {
    if (!(raw > 0)) return;
    if (S.zmode || (S.params && S.params.mode === "zspan")) {  // en span cero mueve la frecuencia observada
      if (S.params) S.params.zf = raw;
      renderTuner();
      clearTimeout(T.zTimer); T.zTimer = setTimeout(() => applyZspan(raw), 350);
      return;
    }
    if (!S.markers.length) { S.markers.push({x: raw, delta: false, track: false, snap: 0, exact: true}); S.active = 0; }
    const m = curMarker(); m.x = raw; m.snap = 0; m.exact = true; m.track = false;
    if (S.n && (raw < S.f0 || raw > S.f1)) {  // fuera de la pantalla: la vista viaja con la frecuencia
      const span = curSpan(); applyParams({start: Math.max(0, raw - span / 2), stop: raw + span / 2});
    }
    renderMarkers(true); renderTuner(); measure(); drawSoon();
  }
  function stepTuner(dir, mult) {
    const f = tunerFreq(); if (f == null) return;
    const st = T.step * (mult || 1);
    setTunerFreq(Math.max(st, Math.round((f + dir * st) / st) * st));
  }
  function jumpSignal(dir) {
    const sigs = activeSignals(), f = tunerFreq();
    if (f == null || !S.n) return;
    const i = xToIdx(f);
    const cand = dir > 0 ? sigs.find(g => g.a > (i == null ? -1 : i))
      : sigs.slice().reverse().find(g => g.b < (i == null ? S.n : i));
    if (cand) { setTunerFreq(idxToX(cand.i)); return; }
    const span = curSpan(), maxHz = (S.info && S.info.max_hz) || 1766e6;
    if (dir > 0 && S.f1 + 1 < maxHz) { SDR.toast(_t("No hay más señales a la derecha en pantalla: muevo la vista →")); applyParams({start: S.f1, stop: Math.min(maxHz, S.f1 + span)}); }
    else if (dir < 0 && S.f0 > 1e5) { SDR.toast(_t("No hay más señales a la izquierda en pantalla: muevo la vista ←")); applyParams({start: Math.max(0, S.f0 - span), stop: S.f0}); }
  }
  function renderTuner() {
    const f = tunerFreq(), inp = $("#tnFreq"), sl = $("#tnSlider");
    if (f != null && document.activeElement !== inp) inp.value = (dHz(f) / 1e6).toFixed(T.step < 1e4 ? 5 : 4);
    sl.classList.toggle("hidden", S.zmode);
    $("#tnPrev").disabled = $("#tnNext").disabled = S.zmode;
    if (S.n && !S.zmode) {
      sl.min = S.f0; sl.max = S.f1; sl.step = Math.max(1, Math.min(T.step, (S.f1 - S.f0) / 50));
      if (f != null && !sliding) sl.value = f;
    }
    const i = f == null || S.zmode ? null : xToIdx(f);
    T.sigs = activeSignals();
    if (S.zmode) {
      $("#tnLevel").textContent = _t("Span cero"); $("#tnWhat").textContent = _t("Los botones mueven la frecuencia observada");
    } else if (i == null) {
      $("#tnLevel").textContent = "—"; $("#tnWhat").textContent = _t("Fuera de la pantalla: la vista se moverá");
    } else {
      const inSig = T.sigs.find(g => i >= g.a - 1 && i <= g.b + 1);
      $("#tnLevel").textContent = fmtLv(vAt(i));
      const o = inSig ? occupiedBw(inSig.i) : null, band = bandName(f);
      $("#tnWhat").textContent = inSig ? (o ? o.guess : _t("señal")) + (band ? " · " + band : "") : _t("sin señal (ruido)") + (band ? " · " + band : "");
    }
    const box = $("#tnSigs");
    if (S.zmode || !T.sigs.length) { box.innerHTML = S.zmode ? "" : '<span class="lbl">' + _t("Sin señales activas en pantalla (prueba «+6 dB»).") + '</span>'; return; }
    const cur = i == null ? -1 : T.sigs.findIndex(g => i >= g.a - 1 && i <= g.b + 1);
    box.innerHTML = `<span class="lbl">${_t("{n} activas:", {n: T.sigs.length})}</span>` + T.sigs.slice(0, 60).map((g, k) =>
      `<button data-sig="${idxToX(g.i)}" class="${k === cur ? "cur" : ""}">${(dHz(idxToX(g.i)) / 1e6).toFixed(S.f1 - S.f0 < 2e6 ? 4 : 3)}<small>${vAt(g.i).toFixed(0)} ${SDR.esc(unitLabel())}</small></button>`).join("");
  }
  let sliding = false;
  function initTuner() {
    $("#tnStep").value = String(T.step); $("#tnMod").value = T.mod; $("#tnThr").value = String(T.thr);
    if (!$("#tnStep").value) $("#tnStep").value = "12500";
    const hold = (btn, dir) => {
      let t1 = null, t2 = null, k = 0;
      const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
      btn.addEventListener("pointerdown", ev => {
        ev.preventDefault(); btn.setPointerCapture(ev.pointerId); k = 0; stepTuner(dir);
        t1 = setTimeout(() => { t2 = setInterval(() => { k++; stepTuner(dir, k > 25 ? 10 : k > 12 ? 4 : 1); }, 90); }, 420);
      });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(e => btn.addEventListener(e, stop));
    };
    hold($("#tnDown"), -1); hold($("#tnUp"), 1);
    const sl = $("#tnSlider");
    sl.addEventListener("input", () => { sliding = true; setTunerFreq(snapStep(+sl.value)); });
    sl.addEventListener("change", () => { sliding = false; renderTuner(); });
    $("#tnFreq").addEventListener("keydown", ev => { if (ev.key === "Enter") ev.target.blur(); });
    $("#tnFreq").addEventListener("change", ev => {
      const v = parseFloat(ev.target.value);
      if (v > 0) setTunerFreq(v * 1e6 - S.offset); else renderTuner();
    });
    $("#tnPrev").addEventListener("click", () => jumpSignal(-1));
    $("#tnNext").addEventListener("click", () => jumpSignal(1));
    $("#tnSigs").addEventListener("click", ev => { const b = ev.target.closest("[data-sig]"); if (b) setTunerFreq(+b.dataset.sig); });
    $("#tnStep").addEventListener("change", ev => { T.step = +ev.target.value; savePrefs(); renderTuner(); });
    $("#tnMod").addEventListener("change", ev => { T.mod = ev.target.value; savePrefs(); });
    $("#tnThr").addEventListener("change", ev => { T.thr = +ev.target.value; savePrefs(); renderTuner(); });
    $("#tnListen").addEventListener("click", () => {
      const f = tunerFreq(); if (f == null) { SDR.toast(_t("Espera a que llegue el primer barrido.")); return; }
      SDR.openRadio(f, T.mod === "auto" ? SDR.guessMod(dHz(f)) : T.mod);
    });
    document.addEventListener("keydown", ev => {  // en computadora: flechas para sintonizar
      if (SDR.tab !== "an" || /INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || "")) return;
      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        const dir = ev.key === "ArrowRight" ? 1 : -1;
        if (ev.shiftKey) jumpSignal(dir); else stepTuner(dir, ev.altKey ? 10 : 1);
        ev.preventDefault();
      } else if (ev.key === "Enter") $("#tnListen").click();
    });
  }

  // ------------------------------------------------------------------ límites (pasa / falla)
  let beepCtx = null;
  function beep() {
    try {
      if (!beepCtx) return;
      const o = beepCtx.createOscillator(), g = beepCtx.createGain();
      o.frequency.value = 1400; g.gain.value = 0.15; o.connect(g); g.connect(beepCtx.destination);
      o.start(); o.stop(beepCtx.currentTime + 0.12);
    } catch (e) {}
  }
  function checkLimits() {
    const L = S.limit, badge = $("#anBadge");
    if (L.upper == null && L.lower == null) { S.fail = null; badge.classList.add("hidden"); return; }
    const v = view(S.live); let fail = null;
    for (let i = 0; i < S.n; i++) {
      if (!isFinite(v[i])) continue;
      if ((L.upper != null && v[i] > L.upper) || (L.lower != null && v[i] < L.lower)) { fail = i; break; }
    }
    S.fail = fail;
    badge.className = "anbadge " + (fail == null ? "pass" : "fail");
    badge.style.top = (spec.offsetHeight + 6) + "px";
    badge.textContent = fail == null ? _t("PASA") : _t("FALLA · {x} {v}", {x: fmtX(idxToX(fail)), v: v[fail].toFixed(1)});
    if (fail != null && L.beep && Date.now() - S.lastBeep > 1500) { S.lastBeep = Date.now(); beep(); }
  }

  // ------------------------------------------------------------------ dibujo
  const spec = $("#spec"), wf = $("#wf");
  const sctx = spec.getContext("2d"), wctx = wf.getContext("2d");
  let dpr = 1, drawPending = false;
  const M = {l: 40, r: 8, t: 10, b: 22};
  const wfOff = document.createElement("canvas"), wfOffCtx = wfOff.getContext("2d");
  const WF_ROWS = 240;
  let wfRow = null;
  const LUT = (() => {
    const stops = [[0, 0, 0, 0], [0.15, 0, 0, 90], [0.35, 0, 90, 220], [0.55, 0, 210, 220], [0.7, 120, 240, 60], [0.82, 255, 220, 0], [0.93, 255, 70, 0], [1, 255, 255, 255]];
    const lut = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255; let k = 0; while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const a = stops[k], b = stops[k + 1], u = (t - a[0]) / (b[0] - a[0]);
      for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * u;
    }
    return lut;
  })();
  function wfReset(n) {
    wfOff.width = Math.max(1, n); wfOff.height = WF_ROWS;
    wfOffCtx.fillStyle = "#000"; wfOffCtx.fillRect(0, 0, wfOff.width, WF_ROWS);
    wfRow = wfOffCtx.createImageData(Math.max(1, n), 1);
  }
  function wfAddRow() {
    if (!wfRow || wfRow.width !== S.n) wfReset(S.n);
    const d = wfRow.data, mn = S.refMin, rng = Math.max(1, S.refMax - S.refMin), v = view(S.live);
    for (let i = 0; i < S.n; i++) {
      const k = isFinite(v[i]) ? SDR.clamp(Math.round((v[i] - mn) / rng * 255), 0, 255) : 0;
      d[i * 4] = LUT[k * 3]; d[i * 4 + 1] = LUT[k * 3 + 1]; d[i * 4 + 2] = LUT[k * 3 + 2]; d[i * 4 + 3] = 255;
    }
    wfOffCtx.drawImage(wfOff, 0, 0, wfOff.width, WF_ROWS - 1, 0, 1, wfOff.width, WF_ROWS - 1);
    wfOffCtx.putImageData(wfRow, 0, 0);
  }
  // Persistencia: acumula dónde cae la traza y lo desvanece (como la «persistencia» de los analizadores en tiempo real)
  const PER = {c: document.createElement("canvas"), buf: null, w: 0, h: 0, img: null};
  function persistReset() { PER.buf = null; }
  function persistAdd() {
    if (!S.show.persist) return;
    const A = plotArea(), w = SDR.clamp(Math.floor(A.w / dpr), 60, 900), h = SDR.clamp(Math.floor(A.h / dpr / 1.5), 40, 300);
    if (!PER.buf || PER.w !== w || PER.h !== h) {
      PER.w = w; PER.h = h; PER.buf = new Float32Array(w * h); PER.c.width = w; PER.c.height = h;
      PER.img = PER.c.getContext("2d").createImageData(w, h);
    }
    const b = PER.buf, v = view(S.live), rng = S.refMax - S.refMin;
    for (let i = 0; i < b.length; i++) b[i] *= 0.93;
    let prev = null;
    for (let c = 0; c < w; c++) {
      const a0 = Math.floor(c * S.n / w), a1 = Math.max(a0 + 1, Math.floor((c + 1) * S.n / w));
      let m = -Infinity; for (let i = a0; i < a1; i++) if (v[i] > m) m = v[i];
      if (!isFinite(m)) { prev = null; continue; }
      const r = SDR.clamp(Math.round((S.refMax - m) / rng * (h - 1)), 0, h - 1);
      const r0 = prev == null ? r : Math.min(prev, r), r1 = prev == null ? r : Math.max(prev, r);
      for (let y = r0; y <= r1; y++) b[y * w + c] = Math.min(12, b[y * w + c] + (y === r ? 1 : 0.5));
      prev = r;
    }
    const d = PER.img.data;
    for (let i = 0; i < b.length; i++) {
      const k = SDR.clamp(Math.round(Math.sqrt(b[i] / 12) * 255), 0, 255);
      d[i * 4] = LUT[k * 3]; d[i * 4 + 1] = LUT[k * 3 + 1]; d[i * 4 + 2] = LUT[k * 3 + 2]; d[i * 4 + 3] = k ? 255 : 0;
    }
    PER.c.getContext("2d").putImageData(PER.img, 0, 0);
  }
  function resizeCanvases() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (const c of [spec, wf]) {
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
      if (w && h && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; }
    }
    persistReset(); drawSoon();
  }
  function drawSoon() { if (!drawPending) { drawPending = true; requestAnimationFrame(draw); } }
  function plotArea() { const W = spec.width, H = spec.height; return {x: M.l * dpr, y: M.t * dpr, w: W - (M.l + M.r) * dpr, h: H - (M.t + M.b) * dpr}; }
  function columnize(arr, cols) {
    const n = arr.length; if (n <= cols) return null;
    const out = new Float32Array(cols);
    for (let c = 0; c < cols; c++) {
      const a = Math.floor(c * n / cols), b = Math.max(a + 1, Math.floor((c + 1) * n / cols));
      let m = -Infinity; for (let i = a; i < b; i++) if (arr[i] > m) m = arr[i];
      out[c] = m === -Infinity ? NaN : m;
    }
    return out;
  }
  function drawTrace(arr, color, width, fill) {
    if (!arr || !S.n) return;
    const A = plotArea(), data = columnize(arr, Math.floor(A.w)) || arr, n = data.length;
    const ys = (v) => A.y + SDR.clamp((S.refMax - v) / (S.refMax - S.refMin), 0, 1) * A.h;
    const xs = (i) => A.x + (i + 0.5) / n * A.w;
    sctx.beginPath(); let pen = false, firstX = 0, lastX = 0;
    for (let i = 0; i < n; i++) {
      const v = data[i];
      if (!isFinite(v)) { pen = false; continue; }
      const x = xs(i), y = ys(v);
      if (!pen) { sctx.moveTo(x, y); pen = true; if (!firstX) firstX = x; } else sctx.lineTo(x, y);
      lastX = x;
    }
    sctx.strokeStyle = color; sctx.lineWidth = width * dpr; sctx.lineJoin = "round"; sctx.stroke();
    if (fill && firstX) {
      sctx.lineTo(lastX, A.y + A.h); sctx.lineTo(firstX, A.y + A.h); sctx.closePath();
      const g = sctx.createLinearGradient(0, A.y, 0, A.y + A.h);
      g.addColorStop(0, "rgba(255,212,0,0.20)"); g.addColorStop(1, "rgba(255,212,0,0.0)");
      sctx.fillStyle = g; sctx.fill();
    }
  }
  function draw() {
    drawPending = false;
    const W = spec.width, H = spec.height; if (!W || !H) return;
    const A = plotArea();
    sctx.fillStyle = "#06090c"; sctx.fillRect(0, 0, W, H);
    sctx.strokeStyle = "#1a2430"; sctx.lineWidth = 1;
    sctx.font = `${11 * dpr}px ui-monospace,monospace`; sctx.fillStyle = "#7f8ea3";
    const rng = S.refMax - S.refMin, stepDb = rng > 120 ? 20 : rng > 50 ? 10 : 5;
    sctx.textAlign = "right"; sctx.textBaseline = "middle";
    for (let v = Math.ceil(S.refMin / stepDb) * stepDb; v <= S.refMax; v += stepDb) {
      const y = Math.round(A.y + (S.refMax - v) / rng * A.h) + 0.5;
      sctx.beginPath(); sctx.moveTo(A.x, y); sctx.lineTo(A.x + A.w, y); sctx.stroke();
      sctx.fillText(String(v), A.x - 5 * dpr, y);
    }
    sctx.textAlign = "left"; sctx.textBaseline = "top"; sctx.fillStyle = "#56657a";
    sctx.fillText(unitLabel(), 3 * dpr, A.y + A.h + 5 * dpr);
    sctx.fillStyle = "#7f8ea3"; sctx.textBaseline = "top";
    const divs = 10, labelEvery = W / dpr < 520 ? 5 : 2;
    for (let k = 0; k <= divs; k++) {
      const x = Math.round(A.x + k / divs * A.w) + 0.5;
      sctx.beginPath(); sctx.moveTo(x, A.y); sctx.lineTo(x, A.y + A.h); sctx.stroke();
      if (S.n && k % labelEvery === 0) {
        const xv = S.f0 + k / divs * (S.f1 - S.f0);
        sctx.textAlign = k === 0 ? "left" : k === divs ? "right" : "center";
        const lab = S.zmode ? (xv * 1000).toFixed(S.f1 < 0.02 ? 1 : 0) + (k === divs ? " ms" : "")
          : (dHz(xv) / 1e6).toFixed(S.f1 - S.f0 < 2e6 ? 3 : S.f1 - S.f0 < 5e7 ? 2 : 1);
        sctx.fillText(lab, x, A.y + A.h + 5 * dpr);
      }
    }
    const yOf = v => A.y + SDR.clamp((S.refMax - v) / rng, 0, 1) * A.h;
    if (!S.n) {
      sctx.textAlign = "center"; sctx.textBaseline = "middle"; sctx.fillStyle = "#56657a";
      sctx.font = `${14 * dpr}px system-ui,sans-serif`; sctx.fillText(_t("Esperando datos del SDR…"), A.x + A.w / 2, A.y + A.h / 2);
    } else {
      sctx.save(); sctx.beginPath(); sctx.rect(A.x, A.y, A.w, A.h); sctx.clip();
      if (S.show.persist && PER.buf) { sctx.imageSmoothingEnabled = true; sctx.globalAlpha = 0.9; sctx.drawImage(PER.c, A.x, A.y, A.w, A.h); sctx.globalAlpha = 1; }
      // canales de la medición
      if (!S.zmode && (S.meas === "chpower" || S.meas === "acpr")) {
        const i = refIdx(), c = idxToX(i), h = S.chbw / 2, xs = (x) => A.x + (x - S.f0) / (S.f1 - S.f0) * A.w;
        const chans = S.meas === "acpr" ? [[c - S.spacing, "rgba(60,200,245,.12)"], [c, "rgba(255,212,0,.14)"], [c + S.spacing, "rgba(60,200,245,.12)"]] : [[c, "rgba(255,212,0,.14)"]];
        for (const [cc, col] of chans) { sctx.fillStyle = col; const x0 = xs(cc - h), x1 = xs(cc + h); sctx.fillRect(x0, A.y, Math.max(1, x1 - x0), A.h); }
      }
      if (S.show.ref && refOK() && !normOn()) drawTrace(view(S.ref.data), "#b388ff", 1.2, false);
      if (S.show.avg) drawTrace(view(S.avg), "#3cc8f5", 1.4, false);
      if (S.show.min) drawTrace(view(S.minh), "#3ddc84", 1.2, false);
      if (S.show.max) drawTrace(view(S.maxh), "#ff6262", 1.2, false);
      drawTrace(view(S.live), "#ffd400", 1.4, !S.show.persist);
      // límites
      sctx.setLineDash([6 * dpr, 4 * dpr]); sctx.lineWidth = 1.5 * dpr;
      for (const [lv, col] of [[S.limit.upper, "#ff5c5c"], [S.limit.lower, "#ff9f43"]]) {
        if (lv == null) continue;
        sctx.strokeStyle = col; const y = Math.round(yOf(lv)) + 0.5;
        sctx.beginPath(); sctx.moveTo(A.x, y); sctx.lineTo(A.x + A.w, y); sctx.stroke();
      }
      if (S.zmode && S.trig && S.params) {
        const lv = (S.params.zlevel || -40) + U(); sctx.strokeStyle = "#3cc8f5"; const y = Math.round(yOf(lv)) + 0.5;
        sctx.beginPath(); sctx.moveTo(A.x, y); sctx.lineTo(A.x + A.w, y); sctx.stroke();
        const xt = A.x + 0.1 * A.w; sctx.beginPath(); sctx.moveTo(xt, A.y); sctx.lineTo(xt, A.y + A.h); sctx.stroke();
      }
      sctx.setLineDash([]);
      if (S.kind === "hop" && S.pos < 1) {
        const x = A.x + S.pos * A.w;
        sctx.strokeStyle = "rgba(255,255,255,.35)"; sctx.setLineDash([4 * dpr, 4 * dpr]);
        sctx.beginPath(); sctx.moveTo(x, A.y); sctx.lineTo(x, A.y + A.h); sctx.stroke(); sctx.setLineDash([]);
      }
      if (S.show.peaks && !S.zmode) {
        sctx.font = `bold ${10 * dpr}px system-ui,sans-serif`; sctx.textAlign = "center"; sctx.textBaseline = "bottom";
        const near = (i) => S.markers.some(m => { const j = mIdx(m); return j != null && Math.abs(j - i) <= Math.max(2, S.n / 100); });
        S.peaks.slice(0, 8).forEach((p, k) => {
          if (near(p[0])) return;
          const x = A.x + (p[0] + 0.5) / S.n * A.w, y = yOf(vAt(p[0])) - 4 * dpr;
          sctx.fillStyle = "#c9d6e6"; sctx.fillText(String(k + 1), x, Math.max(A.y + 12 * dpr, y));
        });
      }
      S.markers.forEach((m, k) => {
        const i = mIdx(m); if (i == null) return;
        const v = vAt(i), x = A.x + (i + 0.5) / S.n * A.w, act = k === S.active;
        sctx.strokeStyle = act ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.22)"; sctx.lineWidth = 1;
        sctx.beginPath(); sctx.moveTo(x, A.y); sctx.lineTo(x, A.y + A.h); sctx.stroke();
        if (!isFinite(v)) return;
        const y = yOf(v), s = 6 * dpr;
        sctx.fillStyle = act ? "#ffffff" : "#9fb3c8"; sctx.beginPath();
        sctx.moveTo(x, y - 2 * dpr); sctx.lineTo(x - s, y - s - 5 * dpr); sctx.lineTo(x + s, y - s - 5 * dpr); sctx.closePath(); sctx.fill();
        sctx.font = `bold ${10 * dpr}px system-ui,sans-serif`; sctx.textAlign = "center"; sctx.textBaseline = "bottom";
        sctx.fillText("M" + (k + 1), x, y - s - 6 * dpr);
        if (act) {
          const label = (S.zmode ? fmtX(m.x) : (dHz(m.x) / 1e6).toFixed(4) + " MHz") + "  " + v.toFixed(1) + " " + unitLabel();
          sctx.font = `bold ${11 * dpr}px ui-monospace,monospace`;
          const tw = sctx.measureText(label).width + 10 * dpr, th = 18 * dpr;
          const bx = SDR.clamp(x - tw / 2, A.x + 2, A.x + A.w - tw - 2), by = Math.max(A.y + 2, y - s - 22 * dpr - th);
          sctx.fillStyle = "rgba(0,0,0,.75)"; sctx.fillRect(bx, by, tw, th);
          sctx.fillStyle = "#fff"; sctx.textAlign = "left"; sctx.textBaseline = "middle"; sctx.fillText(label, bx + 5 * dpr, by + th / 2);
        }
      });
      sctx.restore();
    }
    if (S.paused) {
      sctx.fillStyle = "rgba(255,176,32,.9)"; sctx.font = `bold ${12 * dpr}px system-ui,sans-serif`;
      sctx.textAlign = "right"; sctx.textBaseline = "top"; sctx.fillText(_t("EN PAUSA"), A.x + A.w - 6 * dpr, A.y + 6 * dpr);
    }
    const WW = wf.width, WH = wf.height;
    wctx.fillStyle = "#000"; wctx.fillRect(0, 0, WW, WH);
    if (S.n && wfOff.width > 1) {
      wctx.imageSmoothingEnabled = S.n < A.w;
      wctx.drawImage(wfOff, 0, 0, wfOff.width, WF_ROWS, A.x, 0, A.w, WH);
      S.markers.forEach((m, k) => {
        const i = mIdx(m); if (i == null) return;
        const x = A.x + (i + 0.5) / S.n * A.w;
        wctx.strokeStyle = k === S.active ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.2)";
        wctx.beginPath(); wctx.moveTo(x, 0); wctx.lineTo(x, WH); wctx.stroke();
      });
    }
  }

  // ------------------------------------------------------------------ tocar el espectro
  let dragging = false, lastTap = 0;
  function idxFromEvent(ev, canvas) {
    const r = canvas.getBoundingClientRect(), A = plotArea();
    const x = (ev.clientX - r.left) * dpr;
    const i = SDR.clamp(Math.floor((x - A.x) / A.w * S.n), 0, S.n - 1);
    return S.zmode ? i : localMax(i, Math.max(1, Math.round(S.n * 0.015)));
  }

  // ------------------------------------------------------------------ parámetros
  function fillInputs(p) {
    if (!p) return;
    const a = dHz(p.start) / 1e6, b = dHz(p.stop) / 1e6;
    $("#inStart").value = +a.toFixed(6); $("#inStop").value = +b.toFixed(6);
    $("#inCenter").value = +((a + b) / 2).toFixed(6); $("#inSpan").value = +(b - a).toFixed(6);
    $("#inAvg").value = p.avg; $("#inPoints").value = String(p.points); $("#inDet").value = p.det || "peak";
    const g = $("#inGain"); const gv = p.gain === "auto" ? "auto" : String(p.gain);
    if (![...g.options].some(o => o.value === gv)) { const o = document.createElement("option"); o.value = gv; o.textContent = gv + " dB"; g.appendChild(o); }
    g.value = gv;
    $("#zF").value = +(dHz(p.zf) / 1e6).toFixed(6); $("#zRbw").value = String(p.zrbw); $("#zT").value = String(p.zt);
    $("#zTrig").value = p.ztrig; $("#zLvl").value = Math.round(p.zlevel + U());
    renderModeUi();
  }
  function renderModeUi() {
    const z = S.params ? S.params.mode === "zspan" : S.zmode;
    $$("#anMode button").forEach(b => b.classList.toggle("active", (b.dataset.m === "zspan") === z));
    $("#sweepBox").classList.toggle("hidden", z);
    $("#zBox").classList.toggle("hidden", !z);
  }
  function fillGains(sel, list) {
    const cur = sel.value;
    const gains = (list && list.length ? list : [0, 9.7, 19.7, 29.7, 38.6, 49.6]);
    sel.innerHTML = '<option value="auto">' + _t("Auto") + '</option>' + gains.map(x => `<option value="${x}">${Number(x).toFixed(1)} dB</option>`).join("");
    if (cur) sel.value = cur;
  }
  function fillPresets() {
    const maxHz = (S.info && S.info.max_hz) || 1766e6;
    $("#preset").innerHTML = '<option value="">' + _t("— Elige una banda —") + '</option>' + PRESETS
      .filter(p => (p[2] * 1e6 - S.offset) <= maxHz + 1).map((p) => `<option value="${PRESETS.indexOf(p)}">${SDR.esc(_t(p[0]))}</option>`).join("");
  }
  async function loadSweep() {
    try {
      const r = await SDR.api("/api/sweep");
      S.params = r.params; S.info = r.info; S.cal = r.cal || null;
      fillGains($("#inGain"), r.info.gains); fillPresets(); fillInputs(r.params); renderCal();
    } catch (e) {}
  }
  async function applyParams(p) {
    try {
      const r = await SDR.api("/api/sweep", p);
      S.params = r.params; fillInputs(r.params); renderCal();
      if (window.innerWidth < 960 && window.scrollY > 120) window.scrollTo({top: 0, behavior: "smooth"});
      if (r.params.mode === "zspan") setStatusLine(_t("Span cero en {f}…", {f: SDR.fmtMHz(dHz(r.params.zf), 1e5)}));
      else setStatusLine(_t("Aplicando {a} – {b}…", {a: SDR.fmtMHz(dHz(r.params.start), r.params.stop - r.params.start), b: SDR.fmtMHz(dHz(r.params.stop), r.params.stop - r.params.start)}));
      if (S.paused && !S.single) { S.paused = false; renderPauseBtns(); }
      const st = SDR.status;
      if (st && st.mode !== "sweep") {
        if (st.mode === "radio" && st.radio && st.radio.monitoring &&
            !confirm(_t("El radio está grabando, escaneando o decodificando. ¿Pasar al analizador de todos modos?"))) return;
        SDR.useMode("sweep");
      }
    } catch (e) { SDR.toast(e.message, true); }
  }
  let lastEdited = "range";
  function applyFromInputs() {
    let a = parseFloat($("#inStart").value), b = parseFloat($("#inStop").value);
    if (lastEdited === "center") {
      const c = parseFloat($("#inCenter").value), s = parseFloat($("#inSpan").value);
      if (isFinite(c) && isFinite(s) && s > 0) { a = c - s / 2; b = c + s / 2; }
    }
    if (!isFinite(a) || !isFinite(b) || b <= a) { SDR.toast(_t("Revisa las frecuencias: el fin debe ser mayor que el inicio."), true); return; }
    applyParams({mode: "sweep", start: a * 1e6 - S.offset, stop: b * 1e6 - S.offset});
  }
  function applyZspan(freqRaw) {
    const f = freqRaw != null ? freqRaw : parseFloat($("#zF").value) * 1e6 - S.offset;
    if (!(f > 0)) { SDR.toast(_t("Escribe la frecuencia para el span cero."), true); return; }
    applyParams({mode: "zspan", zf: f, zrbw: +$("#zRbw").value, zt: +$("#zT").value, ztrig: $("#zTrig").value,
      zlevel: parseFloat($("#zLvl").value) - U()});
  }
  const curSpan = () => S.params ? S.params.stop - S.params.start : S.f1 - S.f0;
  const curCenter = () => S.params ? (S.params.start + S.params.stop) / 2 : (S.f0 + S.f1) / 2;
  const markerFreq = () => { const m = curMarker(); return m && mIdx(m) != null ? m.x : null; };
  function zoom(f) {
    if (S.zmode) return;
    const c = markerFreq() || curCenter();
    const span = Math.max(20e3, curSpan() * f);
    applyParams({start: Math.max(0, c - span / 2), stop: c + span / 2});
  }
  function renderOverlay() {
    const s = SDR.status; if (!s) return;
    const ov = $("#anOverlay");
    if (s.switching) { ov.classList.remove("hidden"); $("#anOverlayMsg").textContent = s.mode_msg || _t("Cambiando de modo…"); $("#btnUseAnalyzer").classList.add("hidden"); return; }
    $("#btnUseAnalyzer").classList.remove("hidden");
    if (s.mode === "sweep") { ov.classList.add("hidden"); return; }
    ov.classList.remove("hidden");
    const busy = {
      radio: () => _t("El dongle lo está usando el radio. Puedes cambiar al analizador."),
      receiver: () => _t("El dongle lo está usando el receptor avanzado (OpenWebRX+). Puedes cambiar al analizador."),
      sensors: () => _t("El dongle lo está usando el decodificador de sensores (rtl_433). Puedes cambiar al analizador."),
      adsb: () => _t("El dongle lo está usando el radar de aviones (dump1090). Puedes cambiar al analizador."),
    }[s.mode];
    let msg = busy ? busy() : _t("El SDR está en reposo.");
    if (s.radio && s.radio.monitoring && s.mode === "radio") msg += " " + _t("Ojo: el radio está grabando, escaneando o decodificando; se pausará.");
    $("#anOverlayMsg").textContent = msg;
  }
  function renderPauseBtns() {
    $("#btnHold").textContent = S.paused ? _t("▶ Seguir") : _t("⏸ Pausa");
    $("#btnHold").classList.toggle("on", S.paused);
    $("#btnSingle").classList.toggle("on", S.single);
  }

  // ------------------------------------------------------------------ calibración / unidades / convertidor
  function renderCal() {
    $("#inUnit").value = S.unit; $("#inOffset").value = S.offset ? +(S.offset / 1e6).toFixed(6) : "";
    const c = S.cal, el = $("#calState");
    if (!c) { el.innerHTML = _t("Sin calibrar: dBm/dBµV/dBmV se muestran <b>sin corregir</b> (igual que dBFS)."); return; }
    const g = S.params ? S.params.gain : null;
    const warn = c.gain != null && g != null && String(c.gain) !== String(g)
      ? ` <b style="color:var(--warn)">${_t("⚠ Se calibró con ganancia {a}; ahora es {b}: vuelve a esa ganancia o recalibra.", {a: SDR.esc(c.gain), b: SDR.esc(g)})}</b>` : "";
    el.innerHTML = _t("Calibrado: dBm = dBFS {k} dB · {date}", {k: (c.k >= 0 ? "+" : "−") + " " + Math.abs(c.k).toFixed(1),
      date: new Date(c.t * 1000).toLocaleDateString(I18N.locale)}) + warn;
  }
  async function calibrate() {
    const i = mIdx(curMarker());
    if (i == null || !isFinite(S.live[i])) { SDR.toast(_t("Pon el marcador sobre la señal de nivel conocido."), true); return; }
    const real = parseFloat($("#calLevel").value);
    if (!isFinite(real)) { SDR.toast(_t("Escribe el nivel real de la señal en dBm."), true); return; }
    try {
      const r = await SDR.api("/api/sweep/cal", {k: real - S.live[i], gain: S.params ? S.params.gain : null});
      S.cal = r.cal; if (S.unit === "dBFS") S.unit = "dBm";
      savePrefs(); renderCal(); SDR.toast(_t("Calibrado. Ahora el marcador marca {v} dBm.", {v: real.toFixed(1)})); drawSoon();
    } catch (e) { SDR.toast(e.message, true); }
  }

  // ------------------------------------------------------------------ vigilancia en la Raspberry (24/7)
  const Mon = {
    data: null, timer: null,
    async load() {
      try {
        const r = await SDR.api("/api/monitor");
        Mon.data = r; const c = r.config;
        $("#monOn").checked = !!c.enabled; $("#monNotify").checked = !!c.notify;
        if (document.activeElement !== $("#monLimit")) $("#monLimit").value = c.limit == null ? "" : Math.round(c.limit + U());
        if (document.activeElement !== $("#monFmin")) $("#monFmin").value = c.fmin ? +(dHz(c.fmin) / 1e6).toFixed(4) : "";
        if (document.activeElement !== $("#monFmax")) $("#monFmax").value = c.fmax ? +(dHz(c.fmax) / 1e6).toFixed(4) : "";
        $("#monEvery").value = String(c.every);
        $("#monNtfyNote").classList.toggle("hidden", !!r.ntfy);
        const al = r.alarms || [];
        $("#monAlarms").innerHTML = al.length ? al.slice(0, 30).map(a =>
          `<li><div class="grow"><div><b>${(dHz(a.freq) / 1e6).toFixed(4)} MHz</b> · ${(a.level + U()).toFixed(1)} ${UNITS[S.unit]}</div><div class="muted small">${new Date(a.t * 1000).toLocaleString(I18N.locale)}</div></div></li>`).join("")
          : '<li class="muted">' + _t("Sin alarmas.") + '</li>';
        $("#monRows").textContent = r.rows ? _tn(r.rows, "{n} registro de ocupación", "{n} registros de ocupación") + (r.meta ? " · " + (dHz(r.meta[0]) / 1e6).toFixed(3) + "–" + (dHz(r.meta[1]) / 1e6).toFixed(3) + " MHz" : "") : _t("Aún sin registros (se guarda uno por intervalo).");
        Mon.heat();
      } catch (e) {}
    },
    async save() {
      const lim = parseFloat($("#monLimit").value), a = parseFloat($("#monFmin").value), b = parseFloat($("#monFmax").value);
      const body = {
        enabled: $("#monOn").checked, notify: $("#monNotify").checked, every: +$("#monEvery").value,
        limit: isFinite(lim) ? lim - U() : null,
        fmin: isFinite(a) ? a * 1e6 - S.offset : null, fmax: isFinite(b) ? b * 1e6 - S.offset : null,
      };
      try {
        await SDR.api("/api/monitor", body);
        SDR.toast(body.enabled ? _t("Vigilancia activa: la Raspberry sigue midiendo aunque cierres el panel.") : _t("Vigilancia detenida."));
        Mon.load();
      } catch (e) { SDR.toast(e.message, true); }
    },
    async heat() {
      const c = $("#heat"); if (!c.clientWidth) return;
      const W = Math.min(400, Math.round(c.clientWidth)), ctx = c.getContext("2d");
      let r;
      try { r = await SDR.api("/api/monitor/data?cols=" + W); } catch (e) { return; }
      const rows = (r.rows || []).slice(-120), byOcc = $("#heatMode").value === "occ";
      c.width = W; c.height = Math.max(40, rows.length * 3);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
      if (!rows.length) return;
      const n = (rows[0].occ || []).length, img = ctx.createImageData(n, rows.length);
      let mn = Infinity, mx = -Infinity;
      if (!byOcc) rows.forEach(row => row.max.forEach(v => { if (v != null) { mn = Math.min(mn, v); mx = Math.max(mx, v); } }));
      rows.slice().reverse().forEach((row, y) => {
        for (let x = 0; x < n; x++) {
          const val = byOcc ? row.occ[x] / 100 : (row.max[x] == null ? 0 : (row.max[x] - mn) / Math.max(1, mx - mn));
          const k = SDR.clamp(Math.round(val * 255), 0, 255), o = (y * n + x) * 4;
          img.data[o] = LUT[k * 3]; img.data[o + 1] = LUT[k * 3 + 1]; img.data[o + 2] = LUT[k * 3 + 2]; img.data[o + 3] = 255;
        }
      });
      const tmp = document.createElement("canvas"); tmp.width = n; tmp.height = rows.length;
      tmp.getContext("2d").putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, c.width, c.height);
      const m = r.meta;
      $("#heatAxis").textContent = m ? _t("{a} MHz ← arriba lo más reciente ({t}) → {b} MHz", {a: (dHz(m.f0) / 1e6).toFixed(3),
        t: new Date(rows[rows.length - 1].t * 1000).toLocaleTimeString(I18N.locale), b: (dHz(m.f1) / 1e6).toFixed(3)}) : "";
    },
    tick() {
      clearInterval(Mon.timer); Mon.timer = null;
      if ($("#monCard").open && SDR.tab === "an") { Mon.load(); Mon.timer = setInterval(() => { if (!document.hidden) Mon.load(); }, 8000); }
    },
  };

  // ------------------------------------------------------------------ estados guardados
  const STATE_KEYS = ["start", "stop", "gain", "avg", "points", "det", "mode", "zf", "zrbw", "zt", "ztrig", "zlevel"];
  function statesGet() { try { return JSON.parse(localStorage.getItem("sdrkit.states") || "[]"); } catch (e) { return []; } }
  function statesPut(list) { try { localStorage.setItem("sdrkit.states", JSON.stringify(list)); } catch (e) { SDR.toast(_t("No se pudo guardar en este navegador."), true); } }
  function renderStates() {
    const list = statesGet();
    $("#stList").innerHTML = list.length ? list.map((s, k) =>
      `<li><div class="grow"><div><b>${SDR.esc(s.name)}</b></div><div class="muted small">${s.p.mode === "zspan" ? _t("Span cero {f}", {f: (dHz(s.p.zf) / 1e6).toFixed(4) + " MHz"})
        : (s.p.start / 1e6).toFixed(3) + "–" + (s.p.stop / 1e6).toFixed(3) + " MHz"} · ${SDR.esc(UNITS[s.ui.unit] || "")}${s.ui.meas !== "none" ? " · " + SDR.esc(_t(MEAS[s.ui.meas] || "")) : ""}</div></div>` +
      `<button class="btn sm" data-st-load="${k}">${_t("Cargar")}</button><button class="btn sm danger" data-st-del="${k}" aria-label="${_t("Borrar")}">🗑</button></li>`).join("")
      : '<li class="muted">' + _t("Guarda aquí tus configuraciones favoritas (banda, unidades, mediciones, límites).") + '</li>';
  }
  function applyUi() {
    for (const [k, id] of [["max", "#tgMax"], ["min", "#tgMin"], ["avg", "#tgAvg"], ["peaks", "#tgPeaks"], ["persist", "#tgPersist"], ["ref", "#tgRef"]])
      $(id).classList.toggle("on", !!S.show[k]);
    $("#lgMax").classList.toggle("hidden", !S.show.max); $("#lgMin").classList.toggle("hidden", !S.show.min);
    $("#lgAvg").classList.toggle("hidden", !S.show.avg); $("#lgRef").classList.toggle("hidden", !S.show.ref);
    $("#lgLim").classList.toggle("hidden", S.limit.upper == null && S.limit.lower == null);
    $("#tgAuto").classList.toggle("on", S.auto); $("#tgNorm").classList.toggle("on", S.norm);
    $("#inMeas").value = S.meas; $("#inChBw").value = S.chbw / 1e3; $("#inSpacing").value = S.spacing / 1e3;
    $("#chBox").classList.toggle("hidden", !["chpower", "acpr"].includes(S.meas));
    $("#limUp").value = S.limit.upper == null ? "" : S.limit.upper; $("#limLo").value = S.limit.lower == null ? "" : S.limit.lower;
    $("#limBeep").checked = !!S.limit.beep;
    $("#inRefMin").value = S.refMin; $("#inRefMax").value = S.refMax;
    renderCal();
  }

  // ------------------------------------------------------------------ inicio
  function init() {
    loadPrefs();
    fillGains($("#inGain"), null); fillPresets(); wfReset(1);
    $("#inMeas").innerHTML = Object.entries(MEAS).map(([k, v]) => `<option value="${k}">${SDR.esc(_t(v))}</option>`).join("");
    applyUi(); renderStates(); renderMarkers(); initTuner();
    new ResizeObserver(resizeCanvases).observe($("#scope"));
    window.addEventListener("resize", resizeCanvases);
    for (const c of [spec, wf]) {
      c.addEventListener("pointerdown", ev => {
        if (!S.n) return;
        dragging = true; c.setPointerCapture(ev.pointerId); moveMarker(idxFromEvent(ev, c));
        const now = Date.now(); if (now - lastTap < 320) zoom(0.25); lastTap = now;
      });
      c.addEventListener("pointermove", ev => { if (dragging && S.n) moveMarker(idxFromEvent(ev, c)); });
      c.addEventListener("pointerup", () => dragging = false);
      c.addEventListener("pointercancel", () => dragging = false);
    }
    $("#mkChips").addEventListener("click", ev => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.add) { const p = S.peaks.find(p => !S.markers.some(m => mIdx(m) === p[0])); addMarker(p ? p[0] : Math.floor(S.n / 2)); return; }
      if (b.dataset.del) { S.markers.splice(S.active, 1); S.active = Math.max(0, Math.min(S.active, S.markers.length - 1)); renderMarkers(); measure(); drawSoon(); return; }
      if (b.dataset.m != null) { S.active = +b.dataset.m; renderMarkers(true); measure(); drawSoon(); }
    });
    $("#peakRows").addEventListener("click", ev => {
      const a = ev.target.closest("[data-i]"), b = ev.target.closest("[data-listen]");
      if (a) { ev.preventDefault(); moveMarker(+a.dataset.i); }
      if (b) SDR.openRadio(+b.dataset.listen);
    });
    $("#measOut").addEventListener("click", ev => {
      if (ev.target.id !== "btnHarmSpan") return;
      const f = markerFreq() || idxToX(globalMax()), maxHz = (S.info && S.info.max_hz) || 1766e6;
      applyParams({start: Math.max(0, f * 0.5), stop: Math.min(maxHz, f * 5.5)});
    });
    ["#inStart", "#inStop"].forEach(s => $(s).addEventListener("input", () => lastEdited = "range"));
    ["#inCenter", "#inSpan"].forEach(s => $(s).addEventListener("input", () => lastEdited = "center"));
    $("#btnApply").addEventListener("click", applyFromInputs);
    $("#btnZApply").addEventListener("click", () => applyZspan());
    $$("#sweepBox input[type=number]").forEach(i => i.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.target.blur(); applyFromInputs(); } }));
    $$("#zBox input[type=number]").forEach(i => i.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.target.blur(); applyZspan(); } }));
    $$("#anMode button").forEach(b => b.addEventListener("click", () => {
      if (b.dataset.m === "zspan") applyZspan(markerFreq() || (S.params && S.params.zf) || null);
      else applyParams({mode: "sweep"});
    }));
    $("#preset").addEventListener("change", ev => {
      const p = PRESETS[+ev.target.value]; if (!p) return;
      const q = {mode: "sweep", start: p[1] * 1e6 - S.offset, stop: p[2] * 1e6 - S.offset}; if (p[3]) q.avg = p[3];
      applyParams(q); ev.target.value = "";
    });
    $("#inGain").addEventListener("change", ev => applyParams({gain: ev.target.value}));
    $("#inAvg").addEventListener("change", ev => applyParams({avg: ev.target.value}));
    $("#inPoints").addEventListener("change", ev => applyParams({points: +ev.target.value}));
    $("#inDet").addEventListener("change", ev => applyParams({det: ev.target.value}));
    $("#btnZoomIn").addEventListener("click", () => zoom(0.25));
    $("#btnZoomOut").addEventListener("click", () => zoom(4));
    $("#btnLeft").addEventListener("click", () => { if (S.zmode) return; const s = curSpan(), c = curCenter() - s / 2; applyParams({start: Math.max(0, c - s / 2), stop: Math.max(s, c + s / 2)}); });
    $("#btnRight").addEventListener("click", () => { if (S.zmode) return; const s = curSpan(), c = curCenter() + s / 2; applyParams({start: c - s / 2, stop: c + s / 2}); });
    $("#btnCenter").addEventListener("click", () => {
      const c = markerFreq();
      if (c == null || S.zmode) { SDR.toast(_t("Primero toca el espectro para poner el marcador.")); return; }
      const s = curSpan(); applyParams({start: Math.max(0, c - s / 2), stop: c + s / 2});
    });
    $("#btnPeak").addEventListener("click", () => { if (!S.n) return; const g = globalMax(); if (g >= 0) { moveMarker(g); S.peakCursor = 0; } });
    $("#btnNextPeak").addEventListener("click", () => {
      if (!S.peaks.length) return;
      S.peakCursor = (S.peakCursor + 1) % S.peaks.length; moveMarker(S.peaks[S.peakCursor][0]);
    });
    const peakSide = (dir) => {
      const i = mIdx(curMarker()); if (i == null) { $("#btnPeak").click(); return; }
      const c = dir < 0 ? S.cands.filter(k => k < i - 1).pop() : S.cands.find(k => k > i + 1);
      if (c != null) moveMarker(c); else SDR.toast(dir < 0 ? _t("No hay más picos hacia la izquierda.") : _t("No hay más picos hacia la derecha."));
    };
    $("#btnPeakL").addEventListener("click", () => peakSide(-1));
    $("#btnPeakR").addEventListener("click", () => peakSide(1));
    $("#btnTrack").addEventListener("click", () => {
      if (!S.markers.length) addMarker(Math.max(0, globalMax()));
      const m = curMarker(); m.track = !m.track; renderMarkers(); drawSoon();
      SDR.toast(m.track ? (S.active === 0 ? _t("M1 seguirá al pico más alto.") : _t("M{n} seguirá a la señal cercana.", {n: S.active + 1})) : _t("Seguimiento desactivado."));
    });
    $("#btnDelta").addEventListener("click", () => {
      if (S.markers.length < 2 || S.active === 0) { SDR.toast(_t("Δ mide contra M1: agrega un segundo marcador y selecciónalo.")); return; }
      const m = curMarker(); m.delta = !m.delta; renderMarkers(); drawSoon();
    });
    $("#mkZspan").addEventListener("click", () => {
      if (S.zmode || (S.params && S.params.mode === "zspan")) { applyParams({mode: "sweep"}); return; }
      const f = markerFreq(); if (f == null) { SDR.toast(_t("Pon el marcador sobre una señal para verla en el tiempo.")); return; }
      applyZspan(f);
    });
    $("#btnListen").addEventListener("click", () => {
      const f = S.zmode ? S.zf : markerFreq();
      if (f == null) { SDR.toast(_t("Toca una señal en el espectro y luego pulsa Escuchar.")); return; }
      SDR.openRadio(f);
    });
    $("#btnSaveMarker").addEventListener("click", () => {
      const f = S.zmode ? S.zf : markerFreq();
      if (f == null) { SDR.toast(_t("Primero pon el marcador sobre una señal.")); return; }
      SDR.saveMemory(f, SDR.guessMod(f));
    });
    const toggleShow = (id, key) => $(id).addEventListener("click", () => {
      S.show[key] = !S.show[key]; if (key === "persist") persistReset();
      if (key === "ref" && S.show.ref && !S.ref) { S.show.ref = false; SDR.toast(_t("Primero guarda una referencia (botón «Guardar ref.»).")); }
      applyUi(); savePrefs(); drawSoon();
    });
    toggleShow("#tgMax", "max"); toggleShow("#tgMin", "min"); toggleShow("#tgAvg", "avg");
    toggleShow("#tgPeaks", "peaks"); toggleShow("#tgPersist", "persist"); toggleShow("#tgRef", "ref");
    $("#btnRefSave").addEventListener("click", () => {
      if (!S.n) return;
      const src = S.avgN > 3 ? S.avg : S.live;
      S.ref = {f0: S.f0, f1: S.f1, n: S.n, z: S.zmode, data: Float32Array.from(src)};
      S.show.ref = true; applyUi(); drawSoon();
      SDR.toast(S.avgN > 3 ? _t("Referencia guardada (promedio). «Normalizar» resta la referencia.")
        : _t("Referencia guardada (traza en vivo). «Normalizar» resta la referencia."));
    });
    $("#tgNorm").addEventListener("click", () => {
      if (!S.norm && !refOK()) { SDR.toast(_t("Guarda una referencia con el mismo rango primero."), true); return; }
      S.norm = !S.norm; if (S.norm) { S.auto = true; } applyUi(); if (S.auto) autoScale(); persistReset(); wfReset(S.n); measure(); drawSoon();
    });
    $("#tgAuto").addEventListener("click", () => { S.auto = !S.auto; if (S.auto) autoScale(); applyUi(); savePrefs(); drawSoon(); });
    $("#btnHold").addEventListener("click", () => { S.paused = !S.paused; S.single = false; renderPauseBtns(); drawSoon(); });
    $("#btnSingle").addEventListener("click", () => { S.single = true; S.paused = false; renderPauseBtns(); setStatusLine(_t("Barrido único: esperando un barrido completo…")); });
    $("#btnClear").addEventListener("click", () => {
      if (!S.n) return; S.maxh.fill(NaN); S.minh.fill(NaN); S.avg.fill(NaN); S.avgN = 0; wfReset(S.n); persistReset(); drawSoon();
    });
    ["#inRefMax", "#inRefMin"].forEach(id => $(id).addEventListener("change", () => {
      const mx = parseFloat($("#inRefMax").value), mn = parseFloat($("#inRefMin").value);
      if (isFinite(mx) && isFinite(mn) && mx > mn) { S.refMax = mx; S.refMin = mn; S.auto = false; applyUi(); savePrefs(); persistReset(); drawSoon(); }
    }));
    $("#inMeas").addEventListener("change", ev => { S.meas = ev.target.value; applyUi(); savePrefs(); measure(); drawSoon(); });
    ["#inChBw", "#inSpacing"].forEach(id => $(id).addEventListener("change", () => {
      const a = parseFloat($("#inChBw").value), b = parseFloat($("#inSpacing").value);
      if (a > 0) S.chbw = a * 1e3; if (b > 0) S.spacing = b * 1e3; savePrefs(); measure(); drawSoon();
    }));
    $$("#chPresets button").forEach(b => b.addEventListener("click", () => {
      const [bw, sp] = b.dataset.ch.split(",").map(Number); S.chbw = bw; S.spacing = sp; applyUi(); savePrefs(); measure(); drawSoon();
    }));
    $("#inUnit").addEventListener("change", ev => {
      S.unit = ev.target.value; if (S.unit !== "dBFS" && !S.cal) SDR.toast(_t("Sin calibrar: el valor es aproximado. Calibra con una señal conocida para medir de verdad."));
      if (S.auto) autoScale(); savePrefs(); persistReset(); wfReset(S.n); renderCal(); renderMarkers(); renderPeaks(); measure(); drawSoon();
    });
    $("#inOffset").addEventListener("change", ev => {
      const v = parseFloat(ev.target.value); S.offset = isFinite(v) ? v * 1e6 : 0;
      savePrefs(); fillInputs(S.params); fillPresets(); renderReadout(); renderMarkers(); renderPeaks(); drawSoon();
    });
    $("#btnCal").addEventListener("click", calibrate);
    $("#btnCalClear").addEventListener("click", async () => {
      try { await SDR.api("/api/sweep/cal", {k: null}); S.cal = null; renderCal(); drawSoon(); SDR.toast(_t("Calibración borrada.")); } catch (e) { SDR.toast(e.message, true); }
    });
    ["#limUp", "#limLo"].forEach(id => $(id).addEventListener("change", () => {
      const up = parseFloat($("#limUp").value), lo = parseFloat($("#limLo").value);
      S.limit.upper = isFinite(up) ? up : null; S.limit.lower = isFinite(lo) ? lo : null;
      applyUi(); savePrefs(); checkLimits(); drawSoon();
    }));
    $("#limBeep").addEventListener("change", ev => {
      S.limit.beep = ev.target.checked;
      if (S.limit.beep && !beepCtx) { try { beepCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      if (beepCtx && beepCtx.state === "suspended") beepCtx.resume();
    });
    $("#limFromMarker").addEventListener("click", () => {
      const i = mIdx(curMarker()); if (i == null) { SDR.toast(_t("Pon un marcador sobre el nivel deseado.")); return; }
      S.limit.upper = Math.round(vAt(i) + 3); applyUi(); savePrefs(); checkLimits(); drawSoon();
    });
    $("#limToServer").addEventListener("click", () => {
      if (S.limit.upper == null) { SDR.toast(_t("Primero define el límite superior."), true); return; }
      if (normOn()) { SDR.toast(_t("Desactiva «Normalizar»: la vigilancia usa niveles absolutos."), true); return; }
      $("#monLimit").value = S.limit.upper; $("#monCard").open = true; $("#monOn").checked = true; Mon.save();
      $("#monCard").scrollIntoView({behavior: "smooth", block: "start"});
    });
    $("#monCard").addEventListener("toggle", Mon.tick);
    $("#monSave").addEventListener("click", Mon.save);
    $("#monOn").addEventListener("change", Mon.save);
    $("#heatMode").addEventListener("change", Mon.heat);
    $("#monClear").addEventListener("click", async () => {
      if (!confirm(_t("¿Borrar las alarmas y la ocupación registradas en memoria?"))) return;
      try { await SDR.api("/api/monitor/clear", {}); Mon.load(); } catch (e) { SDR.toast(e.message, true); }
    });
    $("#stSave").addEventListener("click", () => {
      if (!S.params) return;
      const name = prompt(_t("Nombre para esta configuración:"), S.params.mode === "zspan" ? _t("Span cero {f}", {f: (dHz(S.params.zf) / 1e6).toFixed(3)})
        : bandName((S.params.start + S.params.stop) / 2) || _t("Mi banda"));
      if (!name) return;
      const p = {}; STATE_KEYS.forEach(k => p[k] = S.params[k]);
      const list = statesGet(); list.unshift({name, t: Date.now(), p, ui: {unit: S.unit, offset: S.offset, meas: S.meas, chbw: S.chbw, spacing: S.spacing, limit: S.limit, show: S.show}});
      statesPut(list.slice(0, 40)); renderStates(); SDR.toast(_t("Configuración guardada en este celular."));
    });
    $("#stList").addEventListener("click", ev => {
      const l = ev.target.closest("[data-st-load]"), d = ev.target.closest("[data-st-del]"), list = statesGet();
      if (l) {
        const s = list[+l.dataset.stLoad]; if (!s) return;
        Object.assign(S, {unit: s.ui.unit || "dBFS", offset: s.ui.offset || 0, meas: s.ui.meas || "none", chbw: s.ui.chbw || 12500, spacing: s.ui.spacing || 25000});
        S.limit = Object.assign({upper: null, lower: null, beep: false}, s.ui.limit || {}); Object.assign(S.show, s.ui.show || {});
        applyUi(); savePrefs(); applyParams(s.p); SDR.toast(_t("Cargado: {name}", {name: s.name}));
      }
      if (d && confirm(_t("¿Borrar «{name}»?", {name: String((list[+d.dataset.stDel] || {}).name)}))) { list.splice(+d.dataset.stDel, 1); statesPut(list); renderStates(); }
    });
    $("#btnPng").addEventListener("click", () => {
      const c = document.createElement("canvas"); c.width = spec.width; c.height = spec.height + wf.height;
      const x = c.getContext("2d"); x.drawImage(spec, 0, 0); x.drawImage(wf, 0, spec.height);
      SDR.download("espectro-" + SDR.stamp() + ".png", c.toDataURL("image/png"));
    });
    $("#btnCsv").addEventListener("click", () => {
      if (!S.n) return;
      const f = (v) => isFinite(v) ? v.toFixed(2) : "", u = unitLabel();
      const V = [view(S.live), view(S.maxh), view(S.minh), view(S.avg)];
      let out = (S.zmode ? "tiempo_s" : "frecuencia_hz") + `,en_vivo_${u},max_${u},min_${u},promedio_${u}\n`;
      for (let i = 0; i < S.n; i++) out += (S.zmode ? idxToX(i).toFixed(6) : Math.round(dHz(idxToX(i)))) + "," + V.map(a => f(a[i])).join(",") + "\n";
      SDR.download("espectro-" + SDR.stamp() + ".csv", URL.createObjectURL(new Blob(["﻿" + out], {type: "text/csv"})));
    });
    $("#btnUseAnalyzer").addEventListener("click", () => SDR.useMode("sweep"));
    loadSweep();
    setInterval(() => {
      if (SDR.tab === "an" && SDR.status && SDR.status.mode === "sweep" && Date.now() - S.lastFrameAt > 15000 && es) { es.close(); es = null; updateStream(); }
    }, 5000);
  }
  return {
    init,
    onShow() { requestAnimationFrame(resizeCanvases); updateStream(); Mon.tick(); },
    onHide() { updateStream(); Mon.tick(); },
    onStatus() { renderOverlay(); updateStream(); },
    onVisibility() { updateStream(); },
    // muestra una frecuencia en el analizador (±span/2)
    show(freq, span) {
      SDR.showTab("an");
      applyParams({mode: "sweep", start: Math.max(0, freq - span / 2), stop: freq + span / 2});
      S.markers = [{x: freq, delta: false, track: false, snap: span / 400}]; S.active = 0;
    },
  };
})();
SDR.modules.an = An;
