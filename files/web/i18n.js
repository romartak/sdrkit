/* SDR-Kit · i18n (English / Español)
 *
 * The panel was written in Spanish, so Spanish strings are the source ("msgid")
 * and the lang-en-*.js catalogs map them to English.
 *
 *   _t("Guardada en «{g}».", {g: name})   → translated + interpolated text
 *   _tn(n, "1 señal", "{n} señales")       → plural form, then _t()
 *   I18N.lang                              → "es" | "en"
 *
 * Catalog files register entries with:
 *   I18N.add({"Texto": "Text", …})                    exact strings (whitespace-normalized)
 *   I18N.addPatterns([[/^Hay (\d+) señales$/, "$1 signals"], …])   anchored regexes for
 *                                                     composed/server messages; the
 *                                                     replacement may be a function
 *   I18N.addHtml({"Toca <b>Iniciar</b>.": "Tap <b>Start</b>."})   whole innerHTML of
 *                                                     static rich elements in index.html
 *
 * In English mode I18N.start() translates the static page once (before the panel
 * scripts run) and a MutationObserver translates text that is added later, which
 * covers server messages and anything a module did not wrap in _t().
 * Debug: open the panel with ?i18n=debug and read I18N.missing in the console.
 */
"use strict";
const I18N = (() => {
  const KEY = "sdrkit.lang";
  const LANGS = {es: "Español", en: "English"};
  let lang = "";
  try { lang = localStorage.getItem(KEY) || ""; } catch (e) { /* storage blocked */ }
  const q = new URLSearchParams(location.search);
  if (LANGS[q.get("lang")]) {
    lang = q.get("lang");
    try { localStorage.setItem(KEY, lang); } catch (e) { /* storage blocked */ }
  }
  if (!LANGS[lang]) {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    lang = /^es\b/i.test(nav) ? "es" : "en";
  }
  let debug = q.get("i18n") === "debug";
  try { debug = debug || localStorage.getItem("sdrkit.i18nDebug") === "1"; } catch (e) { /* storage blocked */ }
  document.documentElement.lang = lang;

  const dict = new Map();     // es → en
  const pats = [];            // [RegExp, replacement]
  const html = new Map();     // innerHTML es → en
  const cache = new Map();    // results of pattern lookups (and misses)
  const missing = new Set();
  const ATTRS = ["title", "placeholder", "aria-label", "alt", "label"];
  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "KBD", "SAMP"]);
  const INLINE = new Set(["B", "I", "EM", "STRONG", "A", "CODE", "SMALL", "BR", "SPAN", "KBD", "SUP", "SUB", "U", "MARK", "ABBR"]);
  const SPANISH = /[áéíóúñ¿¡]|\b(el|la|los|las|del|que|para|con|una|sin|por|más|está|hay|toca|elige|señal|aquí|también|puede|activa|escuchar|grabar|buscar|guardar|abrir|cerrar|apagado|encendido|nada|todavía)\b/i;

  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  const fill = (s, vars) => vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars && vars[k] != null) ? vars[k] : m) : String(s);
  const hasLetters = (s) => /[A-Za-zÀ-ÿ]{2}/.test(s);

  function remember(k, v) {
    if (cache.size > 5000) cache.clear();
    cache.set(k, v);
  }

  // English for a whole Spanish string, or null when there is none.
  function lookup(s) {
    if (lang === "es" || !s) return null;
    let r = dict.get(s);
    if (r !== undefined) return r;
    const n = norm(s);
    if (n !== s) { r = dict.get(n); if (r !== undefined) return r; }
    if (cache.has(n)) return cache.get(n);
    r = null;
    for (const [re, rep] of pats) {
      re.lastIndex = 0;
      if (re.test(n)) { re.lastIndex = 0; r = n.replace(re, rep); break; }
    }
    remember(n, r);
    if (r !== null) remember(norm(r), null);    // our own output never needs another pass
    else if (debug && hasLetters(n) && SPANISH.test(n)) missing.add(n);
    return r;
  }

  function _t(s, vars) {
    if (s == null) return "";
    if (lang === "es") return fill(s, vars);
    const r = lookup(String(s));
    return fill(r === null ? s : r, vars);
  }

  function _tn(n, one, many, vars) {
    return _t(n === 1 ? one : many, Object.assign({n}, vars || {}));
  }

  // ---------------------------------------------------------------- DOM
  function trText(node) {
    const v = node.nodeValue;
    if (!v || !hasLetters(v)) return;
    const core = norm(v);
    const r = lookup(core);
    if (r === null || r === core) return;
    const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
    node.nodeValue = lead + r + trail;
  }

  function trAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v || !hasLetters(v)) continue;
      const r = lookup(norm(v));
      if (r !== null && r !== v) el.setAttribute(a, r);
    }
  }

  function skipped(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (SKIP.has(e.tagName) || e.getAttribute("translate") === "no") return true;
    }
    return false;
  }

  // Mixed text + inline tags: translate the whole element when the catalog has it.
  function trRich(el) {
    let text = false, inline = false;
    for (const c of el.childNodes) {
      if (c.nodeType === 3 && c.nodeValue.trim()) text = true;
      else if (c.nodeType === 1) { if (!INLINE.has(c.tagName)) return false; inline = true; }
    }
    if (!text || !inline) return false;
    const r = html.get(norm(el.innerHTML));
    if (r === undefined) return false;
    el.innerHTML = r;
    return true;
  }

  function translateTree(root, rich) {
    if (lang === "es" || !root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentElement)) trText(root); return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    const walk = (el) => {
      if (SKIP.has(el.tagName) || el.getAttribute("translate") === "no") return;
      trAttrs(el);
      if (rich && html.size && trRich(el)) return;
      for (let c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) trText(c);
        else if (c.nodeType === 1) walk(c);
      }
    };
    walk(root);
  }

  let observer = null;
  function observe() {
    if (observer || lang === "es") return;
    observer = new MutationObserver((records) => {
      for (const m of records) {
        if (m.type === "characterData") {
          if (!skipped(m.target.parentElement)) trText(m.target);
        } else if (m.type === "attributes") {
          if (!skipped(m.target)) trAttrs(m.target);
        } else {
          for (const n of m.addedNodes) translateTree(n, false);
        }
      }
    });
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS,
    });
  }

  // ---------------------------------------------------------------- language switch
  function set(l) {
    if (!LANGS[l]) return;
    try { localStorage.setItem(KEY, l); } catch (e) { /* storage blocked */ }
    const u = new URL(location.href);
    u.searchParams.delete("lang");
    location.replace(u.toString());
  }

  function bindSwitches() {
    document.querySelectorAll("[data-lang-switch]").forEach((b) => {
      b.textContent = lang.toUpperCase();
      b.setAttribute("title", lang === "es" ? "Idioma: Español · Switch to English" : "Language: English · Cambiar a español");
      b.addEventListener("click", () => set(lang === "es" ? "en" : "es"));
    });
    document.querySelectorAll("select[data-lang-select]").forEach((s) => {
      s.innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
      s.value = lang;
      s.addEventListener("change", () => set(s.value));
    });
  }

  // Called at the end of <body>, before the panel scripts: translate, then reveal.
  function start() {
    try {
      bindSwitches();
      translateTree(document.body, true);
      observe();
    } finally {
      document.documentElement.classList.remove("i18n-wait");
    }
  }

  if (lang !== "es") {
    // keep the Spanish page hidden until start() has translated it (fail-safe after 2 s)
    document.documentElement.classList.add("i18n-wait");
    setTimeout(() => document.documentElement.classList.remove("i18n-wait"), 2000);
  }

  return {
    get lang() { return lang; },
    get locale() { return lang === "es" ? "es" : "en-US"; },
    langs: LANGS,
    missing,
    data: {},               // per-module English data (help texts, guides…) registered by catalogs
    add(obj) { for (const k in obj) dict.set(norm(k), obj[k]); },
    addPatterns(list) { for (const p of list) pats.push(p); cache.clear(); },
    addHtml(obj) { for (const k in obj) html.set(norm(k), obj[k]); },
    t: _t,
    tn: _tn,
    lookup,
    translate: (root) => translateTree(root, true),
    set,
    start,
    stats: () => ({lang, exact: dict.size, patterns: pats.length, html: html.size, missing: missing.size}),
  };
})();
const _t = I18N.t;
const _tn = I18N.tn;
