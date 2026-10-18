/* SDR-Kit · Radio: escuchar, decodificar subtonos, grabar, escanear, memorias y modo cazador */
"use strict";
const Radio = (() => {
  const MODES = [["nfm", "FM"], ["nfmw", "FM ancha"], ["wfm", "WFM"], ["am", "AM"], ["usb", "USB"], ["lsb", "LSB"], ["dsd", "Digital"]];
  const DSD = [["auto", "Auto (DMR · P25 · D-Star · YSF)"], ["dmr", "DMR"], ["p25", "P25"], ["dstar", "D-Star"], ["ysf", "Fusion"],
    ["nxdn48", "NXDN 6.25"], ["nxdn96", "NXDN 12.5"], ["dpmr", "dPMR"], ["m17", "M17"], ["provoice", "ProVoice"]];
  const R = {params: null, live: null, info: null, mems: [], group: "", lastCtcss: null, lastDcs: null, scanSrc: "group",
    panRows: [], es: null, sqDragging: false};

  // ------------------------------------------------------------ audio (Web Audio)
  const P = {ctx: null, gain: null, analyser: null, nextT: 0, ctrl: null, playing: false};
  function ensureCtx() {
    if (!P.ctx) {
      P.ctx = new (window.AudioContext || window.webkitAudioContext)();
      P.gain = P.ctx.createGain();
      P.analyser = P.ctx.createAnalyser();
      P.analyser.fftSize = 1024;
      P.gain.connect(P.analyser);
      P.analyser.connect(P.ctx.destination);
      P.gain.gain.value = (+$("#rVol").value) / 100;
    }
    if (P.ctx.state === "suspended") P.ctx.resume();
    return P.ctx;
  }
  async function play() {
    ensureCtx();
    if (P.playing) return;
    P.playing = true; P.nextT = 0;
    $("#rPlay").textContent = _t("■ Dejar de escuchar"); $("#rPlay").classList.remove("primary");
    updateStream();
    drawViz();
    while (P.playing) {
      try {
        P.ctrl = new AbortController();
        const r = await fetch("/api/radio/audio", {signal: P.ctrl.signal, cache: "no-store"});
        if (r.status === 401) { location.href = "/login"; return; }
        const rate = +(r.headers.get("X-Audio-Rate") || 24000);
        const reader = r.body.getReader();
        let carry = null;
        while (P.playing) {
          const {value, done} = await reader.read();
          if (done) break;
          let bytes = value;
          if (carry) { const m = new Uint8Array(carry.length + value.length); m.set(carry); m.set(value, carry.length); bytes = m; carry = null; }
          const n = bytes.length >> 1;
          if (bytes.length & 1) carry = bytes.slice(n * 2);
          if (!n) continue;
          const dv = new DataView(bytes.buffer, bytes.byteOffset, n * 2);
          const f32 = new Float32Array(n);
          for (let i = 0; i < n; i++) f32[i] = dv.getInt16(i * 2, true) / 32768;
          schedule(f32, rate);
        }
      } catch (e) { if (!P.playing) break; }
      if (P.playing) await SDR.sleep(1000);  // reconexión automática
    }
  }
  function schedule(f32, rate) {
    if (RP.src) return;  // mientras suena la repetición, el audio en vivo se calla
    const ctx = P.ctx;
    const buf = ctx.createBuffer(1, f32.length, rate);
    buf.getChannelData(0).set(f32);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(P.gain);
    const now = ctx.currentTime;
    if (P.nextT < now + 0.04 || P.nextT > now + 1.5) P.nextT = now + 0.3;  // colchón de 300 ms contra cortes del WiFi
    src.start(P.nextT);
    P.nextT += buf.duration;
  }
  function stop() {
    P.playing = false;
    if (P.ctrl) P.ctrl.abort();
    $("#rPlay").textContent = _t("▶ Escuchar en este celular"); $("#rPlay").classList.add("primary");
    updateStream();
  }
  function drawViz() {
    const c = $("#audioViz"); const ctx2 = c.getContext("2d");
    const loop = () => {
      if (!P.playing && !Hunter.open && !RP.src) { ctx2.clearRect(0, 0, c.width, c.height); return; }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const data = new Uint8Array(P.analyser.frequencyBinCount);
      P.analyser.getByteFrequencyData(data);
      ctx2.clearRect(0, 0, w, h);
      const bars = 48, use = Math.floor(data.length * 0.33);  // hasta ~8 kHz
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        let m = 0; const a = Math.floor(i * use / bars), b = Math.floor((i + 1) * use / bars);
        for (let k = a; k < Math.max(b, a + 1); k++) m = Math.max(m, data[k]);
        const bh = (m / 255) * h;
        ctx2.fillStyle = `hsl(${50 - i * 0.6},100%,${45 + (m / 255) * 15}%)`;
        ctx2.fillRect(i * bw + 1, h - bh, bw - 2, bh);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ repetición instantánea «⏪ ¿qué dijo?»
  // El servidor guarda en RAM lo último que se oyó; aquí se baja como WAV y suena por el mismo volumen que el radio.
  const RP = {src: null, id: 0, secs: 0, tx: 0, busy: false};
  async function replay() {
    if (RP.src) { stopReplay(); return; }
    if (RP.busy) return;
    RP.busy = true;
    const ctx = ensureCtx();
    try {
      const r = await fetch("/api/radio/replay.wav", {cache: "no-store"});
      if (r.status === 401) { location.href = "/login"; return; }
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || r.statusText); }
      RP.id = +r.headers.get("X-Replay-Id") || 0;
      RP.secs = +r.headers.get("X-Replay-Secs") || 0;
      RP.tx = +r.headers.get("X-Replay-Tx") || 0;
      const ab = await r.arrayBuffer();
      const buf = await new Promise((ok, ko) => ctx.decodeAudioData(ab, ok, ko));
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(P.gain);
      src.onended = () => { if (RP.src === src) { RP.src = null; renderReplay(); } };
      RP.src = src;
      src.start();
      if (!P.playing && !Hunter.open) drawViz();
      $("#rReplaySave").disabled = false;
      renderReplay();
    } catch (e) { SDR.toast(e.message, true); }
    finally { RP.busy = false; }
  }
  function stopReplay() {
    const src = RP.src; RP.src = null;
    if (src) try { src.stop(); } catch (e) { /* ya terminó */ }
    renderReplay();
  }
  async function saveReplay() {
    try {
      const r = await SDR.api("/api/radio/replay", {id: RP.id});
      if (r.saved) SDR.toast(_t("Repetición guardada en Grabaciones ({d} s).", {d: r.saved.duration}));
    } catch (e) { SDR.toast(e.message, true); }
  }
  function renderReplay() {
    const live = R.live && R.live.replay;
    $("#rReplay").textContent = RP.src ? _t("■ Parar repetición") : live ? _t("⏪ ¿Qué dijo? · {s} s", {s: Math.round(live)}) : _t("⏪ ¿Qué dijo?");
    $("#rReplay").classList.toggle("recon", !!RP.src);
    $("#rReplayInfo").textContent = RP.src
      ? _tn(RP.tx, "Repitiendo {s} s · {n} transmisión. «Guardar» la deja en Grabaciones.", "Repitiendo {s} s · {n} transmisiones. «Guardar» las deja en Grabaciones.", {s: RP.secs})
      : _t("El radio guarda siempre lo último que se oyó. Si no entendiste, tócalo y se repite.");
  }

  // ------------------------------------------------------------ eventos en vivo
  function wantStream() {
    const st = SDR.status;
    return !document.hidden && st && st.mode === "radio" && (SDR.tab === "radio" || P.playing || Hunter.open);
  }
  function updateStream() {
    if (wantStream()) {
      if (!R.es) {
        R.es = new EventSource("/api/radio/stream");
        R.es.addEventListener("radio", ev => onLive(JSON.parse(ev.data)));
        R.es.addEventListener("radio_error", ev => { const d = JSON.parse(ev.data); SDR.toast(d.error, true); });
        R.es.addEventListener("radio_note", ev => { const d = JSON.parse(ev.data); SDR.toast(d.msg); });
        R.es.addEventListener("radio_saved", ev => { const d = JSON.parse(ev.data); if (d.saved && d.saved.kind === "manual") SDR.toast(_t("Grabación guardada ({d} s).", {d: d.saved.duration})); });
      }
    } else if (R.es) { R.es.close(); R.es = null; }
  }

  function onLive(d) {
    R.live = d;
    if (!R.params || R.params.freq !== d.freq || R.params.mod !== d.mod || R.params.name !== d.name) {
      R.params = Object.assign({}, R.params || {}, {freq: d.freq, mod: d.mod, name: d.name});
      renderFreq();
    }
    if (!R.sqDragging && R.params.squelch !== d.squelch) { R.params.squelch = d.squelch; renderSq(); }
    // medidor
    const pct = (db) => SDR.clamp((db + 100) / 100 * 100, 0, 100);
    $("#rBar").style.width = pct(d.db) + "%";
    $("#rDb").textContent = d.db.toFixed(1) + " dB";
    $("#rNoise").textContent = _t("ruido {n}", {n: d.noise.toFixed(0)});
    $("#rLed").classList.toggle("on", !!d.sq);
    // decodificación
    const now = Date.now();
    if (d.ctcss) { R.lastCtcss = {v: d.ctcss, t: now}; }
    if (d.dcs) { R.lastDcs = {v: d.dcs, t: now}; }
    renderDecoder(d, now);
    // grabación
    const rec = d.rec;
    SDR.setRecIndicator(!!rec);
    const manual = rec && rec.kind === "manual";
    $("#rRec").textContent = manual ? _t("■ Detener grabación · {t}", {t: SDR.fmtDur(rec.secs)}) : _t("⏺ Grabar ahora");
    $("#rRec").classList.toggle("recon", !!manual);
    $("#rAuto").checked = !!d.autorec;
    if (!RP.src) renderReplay();
    syncInv(d.inv);
    $("#rRecInfo").textContent = rec ? (rec.kind === "auto" ? _t("● Grabando esta transmisión… {f}", {f: rec.file}) : _t("● Grabando… {f}", {f: rec.file}))
      : d.autorec ? _t("Esperando transmisiones para grabarlas (se activa cuando se abre el squelch).") : _t("Se guardan en carpetas por fecha. Míralas en la pestaña Grabaciones.");
    // escáner
    const sc = d.scan;
    if (sc) {
      const hits = _tn(sc.hits, "{n} hallazgo", "{n} hallazgos");
      $("#scStatus").innerHTML = sc.state === "listen" && sc.lock
        ? `<b style="color:var(--ok)">${SDR.esc(_t("● Detenido en {name}", {name: sc.lock.name ? _t(sc.lock.name) : (sc.lock.freq / 1e6).toFixed(4) + " MHz"}))}</b> · ${hits}`
        : [_t("Buscando {r}", {r: sc.range ? (sc.range[0] / 1e6).toFixed(4) + "–" + (sc.range[1] / 1e6).toFixed(4) + " MHz" : ""}),
          _tn(sc.channels, "{n} canal", "{n} canales")].concat(sc.cycle_ms != null ? [_t("vuelta completa {ms} ms", {ms: sc.cycle_ms})] : [], [hits]).join(" · ");
      $("#scStart").classList.add("on");
    } else {
      $("#scStart").classList.remove("on");
    }
    if (d.spec) drawPan(d.spec, d.spec_span);
    renderData(d);
    renderDigital(d);
    Hunter.update(d);
  }

  // ------------------------------------------------------------ voz digital y detector de modo
  function digitalSuggestion(g) {
    const k = g.kind;
    if (k === "4fsk4800") return [["auto", _t("🔊 Decodificar voz (DMR/P25/YSF)")], ["m17", _t("Probar M17")]];
    if (k === "4fsk2400") return [["nxdn48", _t("🔊 Decodificar NXDN")], ["dpmr", _t("Probar dPMR")]];
    if (k === "2fsk4800") return [["dstar", _t("🔊 Decodificar D-Star")]];
    if (k === "4fsk6000") return [["p25", _t("P25 fase 2 (sólo con canal de control)")]];
    if (k === "2fsk1200" || k === "2fsk2400" || k === "2fsk512") return [["data:pocsag", _t("✉ Leer mensajes POCSAG")]];
    if (k === "2fsk1600" || k === "4fsk1600") return [["data:flex", _t("✉ Leer mensajes FLEX")]];
    if (k === "afsk1200") return [["data:aprs", _t("✉ Leer APRS / packet")]];
    return [];
  }
  function renderDigital(d) {
    const g = d.digital, fresh = g && Date.now() / 1000 - g.t < 10, ban = $("#digBanner");
    const isD = d.mod === "dsd";
    if (fresh && !isD) {
      const sug = digitalSuggestion(g);
      ban.innerHTML = _t("📡 <b>Señal digital detectada:</b> {g}", {g: SDR.esc(_t(g.guess))}) +
        (g.dev ? ` <span class="muted small">· ${SDR.esc(_t("desviación ≈ {d} Hz", {d: g.dev}))}</span>` : "") +
        (sug.length ? '<div class="row">' + sug.map(([k, t]) => `<button class="btn sm" data-dig="${k}">${SDR.esc(t)}</button>`).join("") + "</div>" : "");
      ban.classList.remove("hidden");
    } else if (!isD) ban.classList.add("hidden");
    else ban.classList.add("hidden");
    $("#dsdCard").classList.toggle("hidden", !isD);
    if (!isD) return;
    const cur = (R.params && R.params.dsd) || "auto";
    if ($("#dsdModes").dataset.cur !== cur) {
      $("#dsdModes").dataset.cur = cur;
      $("#dsdModes").innerHTML = DSD.map(([k, n]) => `<button data-dsd="${k}" class="${k === cur ? "active" : ""}">${n}</button>`).join("");
    }
    const st = d.dsd || {}, m = st.meta || {}, recent = m.t && Date.now() / 1000 - m.t < 4;
    $("#dsdSync").textContent = m.sync || "—"; $("#dsdSync").className = recent ? "live" : m.sync ? "last" : "";
    $("#dsdSyncSub").textContent = recent ? _t("recibiendo") : m.sync ? _t("último detectado") : (g && fresh ? _t(g.guess).split(":")[0] : _t("esperando señal"));
    $("#dsdTg").textContent = m.tg || "—"; $("#dsdSrc").textContent = m.src || "—";
    $("#dsdCc").textContent = m.cc ? "Color code " + m.cc : m.nac ? "NAC " + m.nac : " ";
    $("#dsdAlias").textContent = m.alias || " ";
    let note = "";
    if (st.error) note = "⚠ " + _t(st.error);
    else if (m.enc) note = _t("🔒 Llamada cifrada: la voz no se puede escuchar (con ningún receptor) sin la clave del sistema.");
    else if (recent) note = _t("✅ Decodificando {sync}: la voz sale por el audio y se puede grabar.", {sync: m.sync});
    else if (fresh && g) note = _t("Tipo detectado por la forma de la señal: {g}. Si no aparece voz, prueba otro sistema arriba.", {g: _t(g.guess)});
    else note = _t("Sintoniza un canal digital (repetidora DMR, radio de empresa, D-Star, Fusion, M17…). La voz aparece sola cuando hay una llamada sin cifrar.");
    $("#dsdNote").textContent = note;
    $("#dsdLog").textContent = (st.lines || []).join("\n");
  }
  async function seek(dir) {
    if (!R.params) return;
    const st = +$("#rStep").value, f = R.params.freq, span = 10e6;
    const range = dir > 0 ? {start: f + st, stop: Math.min(1766e6, f + span), step: st, mod: R.params.mod === "dsd" ? "nfm" : R.params.mod}
      : {start: Math.max(0.5e6, f - span), stop: f - st, step: st, mod: R.params.mod === "dsd" ? "nfm" : R.params.mod};
    try {
      await SDR.api("/api/radio/scan", {range, once: true, down: dir < 0});
      SDR.toast(dir > 0 ? _t("Buscando la próxima señal hacia arriba…") : _t("Buscando la próxima señal hacia abajo…"));
    } catch (e) { SDR.toast(e.message, true); }
  }

  // ------------------------------------------------------------ datos digitales (multimon-ng)
  const DATA_KINDS = {pocsag: "POCSAG", flex: "FLEX", aprs: "APRS", eas: "EAS", selcall: "Selcall", cw: "Morse", fms: "FMS"};
  function renderDataChips() {
    const on = (R.params && R.params.data) || [];
    $("#rData").innerHTML = Object.entries(DATA_KINDS).map(([k, n]) =>
      `<button data-k="${k}" class="${on.includes(k) ? "active" : ""}">${n}</button>`).join("");
  }
  let lastDecId = null;
  function renderData(d) {
    const on = d.data || [];
    if (R.params && JSON.stringify(R.params.data || []) !== JSON.stringify(on)) { R.params.data = on; renderDataChips(); }
    $("#rDataInfo").textContent = d.data_error ? "⚠ " + _t(d.data_error)
      : on.length ? _t("Decodificando {k} · funciona con el squelch cerrado.", {k: on.map(k => DATA_KINDS[k]).join(", ")}) : _t("Funciona aunque nadie escuche y con el squelch cerrado.");
    const items = d.decoded || [];
    const top = items.length ? items[items.length - 1].id : null;
    if (top === lastDecId) return;
    lastDecId = top;
    if (!items.length) return;
    $("#rDecoded").innerHTML = items.slice().reverse().map(x =>
      `<li><span class="badge y">${SDR.esc(x.kind)}</span><span class="muted small">${new Date(x.t * 1000).toLocaleTimeString()}</span><div>${SDR.esc(x.text)}</div></li>`).join("");
  }

  function renderDecoder(d, now) {
    const ago = (t) => { const s = Math.round((now - t) / 1000); return s < 60 ? _t("hace {n} s", {n: s}) : _t("hace {n} min", {n: Math.round(s / 60)}); };
    // código de privacidad de walkie FRS/PMR (1–38) que corresponde al subtono
    const walkieCode = (t) => { const n = typeof Paises !== "undefined" && Paises.code(t); return n ? _t("código walkie {n}", {n}) + " · " : ""; };
    const c = $("#dCtcss"), cs = $("#dCtcssSub");
    if (d.ctcss) { c.textContent = d.ctcss.tone.toFixed(1) + " Hz"; c.className = "live"; cs.textContent = walkieCode(d.ctcss.tone) + _t("medido {m} Hz · desviación {d} Hz", {m: d.ctcss.measured, d: d.ctcss.dev}); }
    else if (R.lastCtcss) { c.textContent = R.lastCtcss.v.tone.toFixed(1) + " Hz"; c.className = "last"; cs.textContent = walkieCode(R.lastCtcss.v.tone) + _t("último, {ago}", {ago: ago(R.lastCtcss.t)}); }
    else { c.textContent = "—"; c.className = ""; cs.textContent = d.mod === "nfm" || d.mod === "nfmw" ? _t("sin tono") : _t("sólo en FM"); }
    const k = $("#dDcs"), ks = $("#dDcsSub");
    if (d.dcs) { k.textContent = d.dcs.text.split(" ≡ ")[0]; k.className = "live"; ks.textContent = (d.dcs.text.includes("≡") ? "≡ " + d.dcs.text.split(" ≡ ")[1] + " · " : "") + _t("calidad {q}%", {q: Math.round(d.dcs.quality * 100)}); }
    else if (R.lastDcs) { k.textContent = R.lastDcs.v.text.split(" ≡ ")[0]; k.className = "last"; ks.textContent = _t("último, {ago}", {ago: ago(R.lastDcs.t)}); }
    else { k.textContent = "—"; k.className = ""; ks.textContent = _t("sin código"); }
    const t = $("#dDtmf");
    t.textContent = d.dtmf || "—"; t.className = d.dtmf ? (d.sq ? "live" : "last") : "";
  }

  // ------------------------------------------------------------ dibujo del panorama
  function drawPan(spec, span) {
    const c = $("#pan"), ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    R.panSpan = span;
    $("#panSpan").textContent = "±" + Math.round(span / 2000) + " kHz";
    const sh = Math.round(h * 0.58), wh = h - sh;
    R.panRows.unshift(spec); if (R.panRows.length > 40) R.panRows.pop();
    const sorted = spec.slice().sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.2)] - 6, hi = Math.max(sorted[sorted.length - 1] + 4, lo + 35);
    ctx.fillStyle = "#06090c"; ctx.fillRect(0, 0, w, h);
    // cascada
    const rowH = wh / 40;
    R.panRows.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) {
        const t = SDR.clamp((row[i] - lo) / (hi - lo), 0, 1);
        ctx.fillStyle = `hsl(${240 - t * 200},90%,${8 + t * 50}%)`;
        ctx.fillRect(i * w / row.length, sh + r * rowH, w / row.length + 1, rowH + 1);
      }
    });
    // ancho del canal
    const bw = {nfm: 12500, nfmw: 25000, wfm: 180000, am: 10000, usb: 3000, lsb: 3000, dsd: 12500}[R.params.mod] || 12500;
    const cx = w / 2, bwpx = bw / span * w;
    const left = R.params.mod === "usb" ? cx : R.params.mod === "lsb" ? cx - bwpx : cx - bwpx / 2;
    ctx.fillStyle = "rgba(255,212,0,.12)"; ctx.fillRect(left, 0, bwpx, sh);
    // espectro
    ctx.beginPath();
    for (let i = 0; i < spec.length; i++) {
      const x = (i + 0.5) / spec.length * w, y = sh - SDR.clamp((spec[i] - lo) / (hi - lo), 0, 1) * (sh - 4);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = "#ffd400"; ctx.lineWidth = 1.3 * dpr; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, sh); ctx.stroke();
  }

  // ------------------------------------------------------------ controles
  function renderFreq() {
    const p = R.params; if (!p) return;
    const s = (p.freq / 1e6).toFixed(5);
    const [a, b] = s.split(".");
    $("#rFreq").innerHTML = `${a}.${b.slice(0, 3)}<span style="opacity:.75">${b.slice(3)}</span><small>MHz</small>`;
    $("#rName").textContent = p.name ? _t(p.name) : " ";
    $$("#rModes button").forEach(x => x.classList.toggle("active", x.dataset.mod === p.mod));
    $("#hFreq").textContent = (p.freq / 1e6).toFixed(4) + " MHz";
    $$("#memList li").forEach(li => li.classList.toggle("cur", +li.dataset.freq === p.freq));
  }
  function renderSq() {
    const sq = R.params.squelch;
    $("#rSq").value = sq == null ? -100 : sq;
    $("#rSqTxt").textContent = sq == null ? _t("Squelch abierto (se oye todo, incluso el ruido)") : "Squelch " + Math.round(sq) + " dB";
    $("#rSqm").style.left = (sq == null ? 0 : SDR.clamp((sq + 100), 0, 100)) + "%";
  }
  async function setParams(p, quiet) {
    try {
      const r = await SDR.api("/api/radio", p);
      R.params = r.params; renderFreq(); renderSq();
      return r.params;
    } catch (e) { if (!quiet) SDR.toast(e.message, true); }
  }
  function tune(freq, extra) {
    if (!(freq > 0)) return;
    const p = Object.assign({freq: Math.round(freq)}, extra || {});
    R.params = Object.assign({}, R.params, p); renderFreq();
    setParams(p);
  }
  function renderOverlay() {
    const s = SDR.status; if (!s) return;
    const ov = $("#rxOverlay");
    if (s.switching) { ov.classList.remove("hidden"); $("#rxOverlayMsg").textContent = s.mode_msg ? _t(s.mode_msg) : _t("Cambiando de modo…"); $("#btnUseRadio").classList.add("hidden"); return; }
    $("#btnUseRadio").classList.remove("hidden");
    if (s.mode === "radio") {
      if (s.radio && s.radio.error) { ov.classList.remove("hidden"); $("#rxOverlayMsg").textContent = "⚠ " + _t(s.radio.error); $("#btnUseRadio").classList.add("hidden"); }
      else ov.classList.add("hidden");
      return;
    }
    ov.classList.remove("hidden");
    $("#rxOverlayMsg").textContent = s.mode === "sweep" ? _t("El dongle lo está usando el analizador.") :
      s.mode === "receiver" ? _t("El dongle lo está usando el receptor avanzado (OpenWebRX+).") : _t("El SDR está en reposo.");
  }

  // ------------------------------------------------------------ memorias
  async function loadMemories() {
    try {
      const r = await SDR.api("/api/memories");
      R.mems = r.items;
      const groups = [...new Set(R.mems.map(m => m.group))];
      const sel = $("#memGroup"), cur = R.group;
      const opt = (g) => `<option value="${SDR.esc(g)}">${SDR.esc(_t(g))}</option>`;  // valor = grupo real; texto traducido
      sel.innerHTML = `<option value="">${SDR.esc(_t("Todas las memorias"))}</option>` + groups.map(opt).join("");
      sel.value = groups.includes(cur) ? cur : "";
      const sg = $("#scanGroup"), scur = sg.value;
      sg.innerHTML = groups.map(opt).join("");
      if (groups.includes(scur)) sg.value = scur;
      renderMemories();
    } catch (e) {}
  }
  // selector del desinversor de voz: muestra el valor del servidor aunque no esté en la lista
  function syncInv(v) {
    const sel = $("#rInv"); if (!sel || document.activeElement === sel) return;
    v = String(v || 0);
    if (![...sel.options].some(o => o.value === v)) sel.insertAdjacentHTML("beforeend", `<option value="${v}">${v} Hz</option>`);
    sel.value = v;
  }
  // subtono y desplazamiento de repetidora guardados en la memoria (Más → Canales → Tu país)
  function memExtra(m) {
    let t = "";
    if (m.offset) t += " · " + (m.offset > 0 ? "+" : "−") + (Math.abs(m.offset) / 1000) + " MHz";
    if (m.tone) t += " · " + SDR.esc(typeof Paises !== "undefined" ? Paises.toneText(m.tone) : m.tone);
    return t;
  }
  function renderMemories() {
    const g = $("#memGroup").value; R.group = g;
    const items = R.mems.filter(m => !g || m.group === g);
    const names = Object.fromEntries(MODES);
    $("#memList").innerHTML = items.length ? items.map(m =>
      `<li data-id="${SDR.esc(m.id)}" data-freq="${m.freq}"><div class="grow"><div><b>${SDR.esc(_t(m.name))}</b></div>` +
      `<div class="muted small mono">${(m.freq / 1e6).toFixed(4)} MHz · ${names[m.mod] ? _t(names[m.mod]) : m.mod}${memExtra(m)}${g ? "" : " · " + SDR.esc(_t(m.group))}</div></div>` +
      `<button class="btn sm" data-del="${SDR.esc(m.id)}" aria-label="${SDR.esc(_t("Borrar"))}">✕</button></li>`).join("")
      : `<li class="muted" style="cursor:default">${SDR.esc(_t("No hay memorias en este grupo."))}</li>`;
    renderFreq();
  }

  // ------------------------------------------------------------ modo cazador
  const Hunter = {
    open: false, beep: true, peak: -200, timer: null, level: 0,
    show() {
      ensureCtx();
      Hunter.open = true; Hunter.peak = -200;
      $("#hunter").classList.remove("hidden");
      updateStream(); drawViz();
      Hunter.loop();
    },
    hide() { Hunter.open = false; $("#hunter").classList.add("hidden"); clearTimeout(Hunter.timer); updateStream(); },
    update(d) {
      if (!Hunter.open) return;
      const rel = d.db - d.noise;
      Hunter.level = SDR.clamp(rel / 50, 0, 1);
      Hunter.peak = Math.max(Hunter.peak, d.db);
      $("#hVal").textContent = d.db.toFixed(0);
      $("#hVal").style.color = `hsl(${120 - Hunter.level * 120},90%,55%)`;
      $("#hBar").style.width = (Hunter.level * 100) + "%";
      $("#hPeak").textContent = _t("máximo {p} dB", {p: Hunter.peak.toFixed(1)}) + " · " + (rel > 3 ? _t("señal {r} dB sobre el ruido", {r: rel.toFixed(0)}) : _t("sólo ruido"));
    },
    loop() {
      if (!Hunter.open) return;
      const lv = Hunter.level;
      if (Hunter.beep && lv > 0.06 && P.ctx) {
        const o = P.ctx.createOscillator(), g = P.ctx.createGain();
        o.frequency.value = 350 + lv * 1500;
        g.gain.setValueAtTime(0.0001, P.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.25, P.ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, P.ctx.currentTime + 0.07);
        o.connect(g); g.connect(P.ctx.destination); o.start(); o.stop(P.ctx.currentTime + 0.08);
      }
      Hunter.timer = setTimeout(Hunter.loop, 650 - lv * 580);
    },
  };

  // ------------------------------------------------------------ inicio
  function init() {
    $("#rModes").innerHTML = MODES.map(([k, n]) => `<button data-mod="${k}">${SDR.esc(_t(n))}</button>`).join("");
    $("#rModes").addEventListener("click", ev => { const b = ev.target.closest("[data-mod]"); if (b) tune(R.params.freq, {mod: b.dataset.mod}); });
    $("#rFreq").addEventListener("click", () => {
      const v = prompt(_t("Frecuencia en MHz (ej. 462.5625):"), R.params ? (R.params.freq / 1e6).toFixed(5) : "");
      if (v === null) return;
      const f = parseFloat(String(v).replace(",", ".")) * 1e6;
      if (!(f >= 0.1e6 && f <= 1766e6)) { SDR.toast(_t("Frecuencia fuera de rango (0.1–1766 MHz)."), true); return; }
      tune(f, {mod: SDR.guessMod(f)});
    });
    const step = () => +$("#rStep").value;
    const holdBtn = (btn, dir) => {  // un toque = un paso; mantener pulsado = avanza solo y cada vez más rápido
      let t1 = null, t2 = null, k = 0;
      const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
      const go = (mult) => { if (!R.params) return; const st = step() * mult; tune(Math.round((R.params.freq + dir * st) / st) * st); };
      btn.addEventListener("pointerdown", ev => {
        ev.preventDefault(); btn.setPointerCapture(ev.pointerId); k = 0; go(1);
        t1 = setTimeout(() => { t2 = setInterval(() => { k++; go(k > 25 ? 10 : k > 12 ? 4 : 1); }, 160); }, 450);
      });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(e => btn.addEventListener(e, stop));
    };
    holdBtn($("#rDown"), -1); holdBtn($("#rUp"), 1);
    $("#rSeekDown").addEventListener("click", () => seek(-1));
    $("#rSeekUp").addEventListener("click", () => seek(1));
    $("#dsdModes").addEventListener("click", ev => {
      const b = ev.target.closest("[data-dsd]"); if (!b) return;
      R.params.dsd = b.dataset.dsd; $("#dsdModes").dataset.cur = ""; setParams({dsd: b.dataset.dsd});
    });
    $("#digBanner").addEventListener("click", ev => {
      const b = ev.target.closest("[data-dig]"); if (!b) return;
      const k = b.dataset.dig;
      if (k.startsWith("data:")) {
        const kind = k.slice(5), cur = new Set(R.params.data || []); cur.add(kind);
        R.params.data = [...cur]; renderDataChips(); setParams({data: R.params.data});
        SDR.toast(_t("Decodificando {k}: mira «Datos digitales» más abajo o Decodificar → Mensajes.", {k: kind.toUpperCase()}));
      } else { tune(R.params.freq, {mod: "dsd", dsd: k}); }
    });
    $("#rPlay").addEventListener("click", () => P.playing ? stop() : play());
    $("#rVol").addEventListener("input", ev => { if (P.gain) P.gain.gain.value = ev.target.value / 100; });
    const sq = $("#rSq");
    sq.addEventListener("input", () => { R.sqDragging = true; R.params.squelch = +sq.value; renderSq(); });
    sq.addEventListener("change", () => { R.sqDragging = false; setParams({squelch: +sq.value}); });
    $("#rSqAuto").addEventListener("click", () => {
      if (!R.live) { SDR.toast(_t("Espera a que llegue la señal.")); return; }
      setParams({squelch: Math.round(R.live.noise + 8)}); SDR.toast(_t("Squelch a {n} dB (ruido + 8 dB).", {n: Math.round(R.live.noise + 8)}));
    });
    $("#rSqOff").addEventListener("click", () => setParams({squelch: "off"}));
    $("#rGain").addEventListener("change", ev => setParams({gain: ev.target.value}));
    $("#rHunt").addEventListener("click", () => Hunter.show());
    $("#hClose").addEventListener("click", () => Hunter.hide());
    $("#hReset").addEventListener("click", () => { Hunter.peak = -200; });
    $("#hBeep").addEventListener("click", () => { Hunter.beep = !Hunter.beep; $("#hBeep").classList.toggle("on", Hunter.beep); });
    $("#pan").addEventListener("pointerdown", ev => {
      if (!R.panSpan || !R.params) return;
      const r = ev.currentTarget.getBoundingClientRect();
      const off = ((ev.clientX - r.left) / r.width - 0.5) * R.panSpan;
      const st = step();
      tune(Math.round((R.params.freq + off) / st) * st);
    });
    $("#rRec").addEventListener("click", async () => {
      const on = !(R.live && R.live.rec && R.live.rec.kind === "manual");
      try {
        if (on && SDR.status && SDR.status.mode !== "radio") await SDR.api("/api/mode", {mode: "radio"});
        const r = await SDR.api("/api/radio/record", {on});
        if (!on && r.saved) SDR.toast(_t("Guardada: {f} ({d} s)", {f: r.saved.file, d: r.saved.duration}));
        if (on) SDR.toast(_t("Grabando… pulsa otra vez para detener."));
      } catch (e) { SDR.toast(e.message, true); }
    });
    $("#rReplay").addEventListener("click", replay);
    $("#rReplaySave").addEventListener("click", saveReplay);
    $("#rInv").addEventListener("change", ev => {
      const f = +ev.target.value;
      setParams({inv: f});
      SDR.toast(f ? _t("Desinvirtiendo la voz en {f} Hz. Si aún no se entiende, prueba otro valor.", {f}) : _t("Desinversión de voz apagada."));
    });
    $("#rAuto").addEventListener("change", ev => {
      setParams({autorec: ev.target.checked});
      SDR.toast(ev.target.checked ? _t("Cada transmisión se guardará en su propio archivo.") : _t("Grabación automática desactivada."));
    });
    // escáner
    $("#scanSrc").addEventListener("click", ev => {
      const b = ev.target.closest("[data-src]"); if (!b) return;
      R.scanSrc = b.dataset.src;
      $$("#scanSrc button").forEach(x => x.classList.toggle("active", x === b));
      $("#scanGroupBox").classList.toggle("hidden", R.scanSrc !== "group");
      $("#scanRangeBox").classList.toggle("hidden", R.scanSrc !== "range");
      $("#scanSvcBox").classList.toggle("hidden", R.scanSrc !== "svc");
    });
    if (typeof Canales !== "undefined") $("#scanSvc").innerHTML = Canales.services.map(s => `<option value="${s.id}">${s.ico} ${SDR.esc(_t(s.name))}</option>`).join("");
    $("#scStart").addEventListener("click", async () => {
      const body = {action: "start"};
      if (R.scanSrc === "group") {
        body.group = $("#scanGroup").value;
        if (!body.group) { SDR.toast(_t("Primero guarda memorias en algún grupo."), true); return; }
      } else if (R.scanSrc === "svc") {
        const sv = Canales.services.find(x => x.id === $("#scanSvc").value); if (!sv) return;
        const cs = Canales.chans(sv);
        if (cs.length) body.channels = cs.map(c => ({freq: c.freq, mod: c.mod === "dsd" ? "nfm" : c.mod, name: c.name}));
        else body.range = {start: sv.range.start * 1e6, stop: sv.range.stop * 1e6, step: sv.range.step * 1e6, mod: sv.mod === "dsd" ? "nfm" : sv.mod};
      } else {
        const a = parseFloat($("#scA").value) * 1e6, b = parseFloat($("#scB").value) * 1e6, s = parseFloat($("#scS").value) * 1e3;
        body.range = {start: a, stop: b, step: s, mod: SDR.guessMod((a + b) / 2)};
      }
      try {
        const r = await SDR.api("/api/radio/scan", body);
        SDR.toast(_tn(r.channels, "Escaneando {n} canal.", "Escaneando {n} canales."));
        setTimeout(SDR.pollStatus, 500);
      } catch (e) { SDR.toast(e.message, true); }
    });
    $("#scStop").addEventListener("click", () => SDR.api("/api/radio/scan", {action: "stop"}).then(() => { $("#scStatus").textContent = _t("Escáner detenido."); $("#scStart").classList.remove("on"); }).catch(e => SDR.toast(e.message, true)));
    $("#scSkip").addEventListener("click", () => SDR.api("/api/radio/scan", {action: "skip"}).catch(e => SDR.toast(e.message, true)));
    $("#scLock").addEventListener("click", () => SDR.api("/api/radio/scan", {action: "skip", minutes: 10}).then(() => SDR.toast(_t("Ese canal se ignorará 10 minutos."))).catch(e => SDR.toast(e.message, true)));
    // memorias
    $("#memGroup").addEventListener("change", renderMemories);
    $("#memList").addEventListener("click", async ev => {
      const del = ev.target.closest("[data-del]");
      if (del) {
        ev.stopPropagation();
        const m = R.mems.find(x => x.id === del.dataset.del);
        if (m && confirm(_t("¿Borrar la memoria «{name}»?", {name: _t(m.name)}))) { await SDR.api("/api/memories/delete", {ids: [m.id]}); loadMemories(); }
        return;
      }
      const li = ev.target.closest("li[data-id]"); if (!li) return;
      const m = R.mems.find(x => x.id === li.dataset.id);
      if (m) tune(m.freq, {mod: m.mod, name: m.name});
    });
    $("#memAdd").addEventListener("click", () => { if (R.params) SDR.saveMemory(R.params.freq, R.params.mod, R.params.name, R.group || _t("Favoritos")); });
    $("#memExport").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify({sdrkit_memorias: 1, items: R.mems}, null, 1)], {type: "application/json"});
      SDR.download(_t("memorias-sdrkit.json"), URL.createObjectURL(blob));
    });
    $("#memImport").addEventListener("click", () => $("#memFile").click());
    $("#memFile").addEventListener("change", async ev => {
      const f = ev.target.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        const items = Array.isArray(data) ? data : data.items;
        const replace = confirm(_t("¿Reemplazar todas tus memorias? (Cancelar = agregarlas a las actuales)"));
        const r = await SDR.api("/api/memories/import", {items, replace});
        SDR.toast(_tn(r.count, "Listo: {n} memoria.", "Listo: {n} memorias.")); loadMemories();
      } catch (e) { SDR.toast(_t("Archivo no válido: {e}", {e: _t(e.message)}), true); }
      ev.target.value = "";
    });
    $("#rAnalyze").addEventListener("click", () => { if (R.params) An.show(R.params.freq, 2e6); });
    $("#btnUseRadio").addEventListener("click", () => SDR.useMode("radio"));
    $("#rData").addEventListener("click", ev => {
      const b = ev.target.closest("[data-k]"); if (!b || !R.params) return;
      const cur = new Set(R.params.data || []);
      if (cur.has(b.dataset.k)) cur.delete(b.dataset.k); else cur.add(b.dataset.k);
      R.params.data = [...cur]; renderDataChips();
      setParams({data: R.params.data});
      if (["nfm", "nfmw"].indexOf(R.params.mod) < 0 && cur.size) SDR.toast(_t("Consejo: los datos (POCSAG, APRS…) se reciben en FM."));
    });
    loadRadio();
    loadMemories();
  }
  async function loadRadio() {
    try {
      const r = await SDR.api("/api/radio");
      R.params = r.params; R.info = r.info;
      const g = $("#rGain");
      const gains = r.info.gains && r.info.gains.length ? r.info.gains : [0, 9.7, 19.7, 29.7, 38.6, 49.6];
      g.innerHTML = '<option value="auto">Auto</option>' + gains.map(x => `<option value="${x}">${Number(x).toFixed(1)} dB</option>`).join("");
      g.value = R.params.gain === "auto" ? "auto" : String(R.params.gain);
      if (!g.value && gains.length) { const o = document.createElement("option"); o.value = String(R.params.gain); o.textContent = R.params.gain + " dB"; g.appendChild(o); g.value = o.value; }
      $("#rAuto").checked = !!R.params.autorec;
      syncInv(R.params.inv);
      renderFreq(); renderSq(); renderDataChips();
    } catch (e) {}
  }
  return {
    init, loadMemories, tune, mems: () => R.mems,
    onShow() { renderOverlay(); updateStream(); loadRadio(); loadMemories(); },
    onHide() { updateStream(); },
    onStatus(s) { renderOverlay(); updateStream(); if (s.mode !== "radio") SDR.setRecIndicator(false); },
    onVisibility() { updateStream(); },
  };
})();
SDR.modules.radio = Radio;
