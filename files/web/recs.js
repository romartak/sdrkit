/* SDR-Kit · Grabaciones y registro de actividad */
"use strict";
const Recs = (() => {
  let items = [], sel = new Set(), timer = null;
  const MOD = {nfm: "FM", nfmw: "FM ancha", wfm: "WFM", am: "AM", usb: "USB", lsb: "LSB"};
  const modName = (k) => MOD[k] ? _t(MOD[k]) : undefined;
  const fileUrl = (f, dl) => "/api/recordings/file?f=" + encodeURIComponent(f) + (dl ? "&dl=1" : "");

  async function load() {
    try {
      const r = await SDR.api("/api/recordings");
      items = r.items;
      const u = r.usage;
      $("#recUsage").textContent = _tn(u.count, "{n} grabación · {used} de {max} · libre en la microSD: {free}", "{n} grabaciones · {used} de {max} · libre en la microSD: {free}",
        {used: SDR.fmtBytes(u.bytes), max: SDR.fmtBytes(u.max_bytes), free: SDR.fmtBytes(u.disk_free)});
      $("#recUsageBar").style.width = Math.min(100, u.bytes / u.max_bytes * 100) + "%";
      render();
    } catch (e) { SDR.toast(e.message, true); }
  }
  function render() {
    const q = $("#recSearch").value.trim().toLowerCase();
    const list = items.filter(m => !q || [m.file, m.name, m.name ? _t(m.name) : null, (m.freq / 1e6).toFixed(4), m.ctcss, m.dcs, m.dtmf, modName(m.mod)]
      .some(v => v != null && String(v).toLowerCase().includes(q)));
    if (!list.length) {
      $("#recList").innerHTML = `<div class="card muted">${SDR.esc(items.length ? _t("Nada coincide con la búsqueda.") :
        _t("Todavía no hay grabaciones. En la pestaña Radio pulsa «Grabar ahora» o activa «Grabar automáticamente cada transmisión»."))}</div>`;
      return;
    }
    let html = "", day = "";
    for (const m of list) {
      const d = new Date((m.start || 0) * 1000);
      const dstr = d.toLocaleDateString(I18N.locale, {weekday: "long", day: "numeric", month: "long"});
      if (dstr !== day) { day = dstr; html += `<div class="recday">${SDR.esc(dstr)}</div>`; }
      const hora = d.toLocaleTimeString(I18N.locale, {hour: "2-digit", minute: "2-digit", second: "2-digit"});
      const badges = [
        m.kind === "auto" ? '<span class="badge">auto</span>' : m.kind === "manual" ? '<span class="badge">manual</span>' :
          m.kind === "replay" ? `<span class="badge">${SDR.esc(_t("⏪ repetición"))}</span>` : "",
        m.ctcss ? `<span class="badge g">CTCSS ${SDR.esc(m.ctcss)}</span>` : "",
        m.dcs ? `<span class="badge g">${SDR.esc(String(m.dcs).split(" ≡ ")[0])}</span>` : "",
        m.dtmf ? `<span class="badge y">DTMF ${SDR.esc(m.dtmf)}</span>` : "",
      ].join("");
      html += `<div class="recitem" data-f="${SDR.esc(m.file)}"><div class="top1">
        <input type="checkbox" data-sel="${SDR.esc(m.file)}" ${sel.has(m.file) ? "checked" : ""} aria-label="${SDR.esc(_t("Seleccionar"))}">
        <div class="grow"><div><b class="mono">${m.freq ? (m.freq / 1e6).toFixed(4) + " MHz" : SDR.esc(m.file)}</b> ${m.name ? "· " + SDR.esc(_t(m.name)) : ""}</div>
        <div class="muted small">${hora} · ${modName(m.mod) || ""} · ${SDR.fmtDur(m.duration)} · ${SDR.fmtBytes(m.size)}</div><div>${badges}</div></div>
        <button class="btn sm" data-play aria-label="${SDR.esc(_t("Reproducir"))}">▶</button>
        <a class="btn sm" href="${fileUrl(m.file, true)}" aria-label="${SDR.esc(_t("Descargar"))}">⬇</a>
        <button class="btn sm" data-more aria-label="${SDR.esc(_t("Más"))}">⋯</button></div></div>`;
    }
    $("#recList").innerHTML = html;
  }
  async function del(files) {
    if (!files.length) { SDR.toast(_t("Selecciona grabaciones primero.")); return; }
    if (!confirm(_t("¿Borrar {n} grabación(es)? No se puede deshacer.", {n: files.length}))) return;
    try { const r = await SDR.api("/api/recordings/delete", {files}); SDR.toast(_t("{n} borrada(s).", {n: r.deleted})); files.forEach(f => sel.delete(f)); load(); }
    catch (e) { SDR.toast(e.message, true); }
  }

  async function loadActivity() {
    try {
      const r = await SDR.api("/api/activity?n=200");
      const t = $("#actTable");
      if (!r.items.length) { t.innerHTML = `<tr><td class="muted">${SDR.esc(_t("Sin actividad todavía. Aparece cuando el radio escucha transmisiones (squelch abierto)."))}</td></tr>`; return; }
      t.innerHTML = `<thead><tr><th>${_t("Hora")}</th><th>${_t("Frecuencia")}</th><th>${_t("Dur.")}</th><th>${_t("Tono")}</th><th></th></tr></thead><tbody>` + r.items.map(a => {
        const d = new Date(a.t * 1000);
        const when = d.toLocaleDateString(I18N.locale, {day: "2-digit", month: "2-digit"}) + " " + d.toLocaleTimeString(I18N.locale, {hour: "2-digit", minute: "2-digit", second: "2-digit"});
        const tone = a.ctcss ? a.ctcss + " Hz" : a.dcs ? String(a.dcs).split(" ≡ ")[0] : "—";
        return `<tr><td class="mono">${when}</td><td class="mono">${(a.freq / 1e6).toFixed(4)}<div class="muted small" style="font-family:system-ui">${SDR.esc(a.name ? _t(a.name) : modName(a.mod) || "")}${a.dtmf ? " · DTMF " + SDR.esc(a.dtmf) : ""}</div></td>` +
          `<td>${a.dur} s</td><td>${SDR.esc(tone)}</td><td class="r"><button class="btn sm" data-tune="${a.freq}" data-mod="${a.mod}" aria-label="${SDR.esc(_t("Escuchar"))}">🎧</button>` +
          (a.file ? ` <button class="btn sm" data-goto="${SDR.esc(a.file)}" aria-label="${SDR.esc(_t("Ver grabación"))}">▶</button>` : "") + "</td></tr>";
      }).join("") + "</tbody>";
    } catch (e) {}
  }

  function init() {
    $("#recSearch").addEventListener("input", render);
    $("#recRefresh").addEventListener("click", () => { load(); loadActivity(); });
    $("#recList").addEventListener("click", ev => {
      const card = ev.target.closest(".recitem"); if (!card) return;
      const f = card.dataset.f;
      const cb = ev.target.closest("[data-sel]");
      if (cb) { cb.checked ? sel.add(f) : sel.delete(f); return; }
      if (ev.target.closest("[data-play]")) {
        let au = card.querySelector("audio");
        if (au) { au.paused ? au.play() : au.pause(); return; }
        $$("#recList audio").forEach(a => { a.pause(); a.remove(); });
        au = document.createElement("audio");
        au.controls = true; au.preload = "auto"; au.src = fileUrl(f);
        card.appendChild(au); au.play().catch(() => {});
        return;
      }
      if (ev.target.closest("[data-more]")) {
        const m = items.find(x => x.file === f); if (!m) return;
        const what = prompt(_t("Escribe el número:\n1 = Escuchar esa frecuencia en vivo\n2 = Guardar la frecuencia en memorias\n3 = Borrar esta grabación"), "1");
        if (what === "1" && m.freq) SDR.openRadio(m.freq, m.mod);
        if (what === "2" && m.freq) SDR.saveMemory(m.freq, m.mod, m.name);
        if (what === "3") del([f]);
      }
    });
    $("#recSelAll").addEventListener("click", () => {
      const all = items.every(m => sel.has(m.file));
      sel = all ? new Set() : new Set(items.map(m => m.file));
      render();
    });
    $("#recDel").addEventListener("click", () => del([...sel]));
    $("#recZip").addEventListener("click", () => {
      const files = [...sel];
      const url = "/api/recordings/zip" + (files.length ? "?" + files.map(f => "f=" + encodeURIComponent(f)).join("&") : "");
      if (!files.length && !confirm(_t("No seleccionaste ninguna: ¿descargar TODAS las grabaciones en un ZIP?"))) return;
      location.href = url;
    });
    $("#actTable").addEventListener("click", ev => {
      const t = ev.target.closest("[data-tune]"), g = ev.target.closest("[data-goto]");
      if (t) SDR.openRadio(+t.dataset.tune, t.dataset.mod);
      if (g) {
        $("#recSearch").value = ""; render();
        const card = document.querySelector(`.recitem[data-f="${CSS.escape(g.dataset.goto)}"]`);
        if (card) { card.scrollIntoView({behavior: "smooth", block: "center"}); card.querySelector("[data-play]").click(); }
        else SDR.toast(_t("Esa transmisión no quedó grabada (era muy corta o se borró)."));
      }
    });
    $("#actClear").addEventListener("click", async () => {
      if (!confirm(_t("¿Borrar todo el registro de actividad? (las grabaciones no se borran)"))) return;
      await SDR.api("/api/activity/clear", {}); loadActivity();
    });
  }
  return {
    init,
    onShow() { load(); loadActivity(); clearInterval(timer); timer = setInterval(() => { if (!document.hidden && SDR.tab === "recs") loadActivity(); }, 10000); },
    onHide() { clearInterval(timer); $$("#recList audio").forEach(a => a.pause()); },
  };
})();
SDR.modules.recs = Recs;
