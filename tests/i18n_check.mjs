// Translation catalog check — run with: node tests/i18n_check.mjs
//
// 1. Every literal msgid passed to _t() / _tn() in files/web/*.js has an English entry.
// 2. Every catalog entry keeps the same {placeholders}, HTML tags and element ids as its Spanish source.
// 3. Patterns are anchored regular expressions; _t() never receives an interpolated template literal.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "files", "web");
const norm = (s) => String(s).replace(/\s+/g, " ").trim();

const exact = new Map(), html = new Map(), patterns = [];
const where = new Map();
const errors = [], warnings = [];

// ---------------------------------------------------------------- load catalogs
const catalogs = fs.readdirSync(WEB).filter((f) => /^lang-en-.*\.js$/.test(f)).sort();
for (const file of catalogs) {
  const I18N = {
    lang: "en", locale: "en-US", data: {},
    add(o) { for (const k in o) { exact.set(norm(k), o[k]); where.set(norm(k), file); } },
    addHtml(o) { for (const k in o) html.set(norm(k), [o[k], file]); },
    addPatterns(list) { for (const p of list) patterns.push([p, file]); },
  };
  const ctx = vm.createContext({ I18N, _t: (s) => s, _tn: (n, a, b) => (n === 1 ? a : b), console });
  try {
    vm.runInContext(fs.readFileSync(path.join(WEB, file), "utf8"), ctx, { filename: file });
  } catch (e) {
    errors.push(`${file}: does not load: ${e.message}`);
  }
}

// ---------------------------------------------------------------- consistency of entries
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const tags = (s) => [...String(s).matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b/g)].map((m) => m[0].toLowerCase()).sort().join(" ");
const ids = (s) => [...String(s).matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]).sort().join(",");

for (const [k, v] of exact) {
  const f = where.get(k);
  if (typeof v !== "string") { errors.push(`${f}: value for "${k}" is not a string`); continue; }
  if (!v.trim()) errors.push(`${f}: empty translation for "${k}"`);
  if (placeholders(k) !== placeholders(v)) errors.push(`${f}: placeholders differ: "${k}" → "${v}"`);
  if (tags(k) !== tags(v)) errors.push(`${f}: HTML tags differ: "${k}" → "${v}"`);
}
for (const [k, [v, f]] of html) {
  if (tags(k) !== tags(v)) errors.push(`${f}: HTML tags differ in addHtml entry "${k.slice(0, 80)}…"`);
  if (ids(k) !== ids(v)) errors.push(`${f}: element ids differ in addHtml entry "${k.slice(0, 80)}…"`);
}
for (const [p, f] of patterns) {
  if (!Array.isArray(p) || !(p[0] instanceof RegExp) && Object.prototype.toString.call(p[0]) !== "[object RegExp]") {
    errors.push(`${f}: pattern is not [RegExp, replacement]: ${String(p)}`);
    continue;
  }
  const src = p[0].source;
  if (!src.startsWith("^") || !src.endsWith("$")) errors.push(`${f}: pattern must be anchored with ^…$: /${src}/`);
}

// ---------------------------------------------------------------- msgids used in the code
const sources = fs.readdirSync(WEB).filter((f) => f.endsWith(".js") && f !== "i18n.js" && !f.startsWith("lang-"));
const STR = String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`;
const reT = new RegExp(String.raw`(?<![\w$.])_t\(\s*` + STR, "g");
const reTn = new RegExp(String.raw`(?<![\w$.])_tn\([^,()]*(?:\([^()]*\))?[^,()]*,\s*` + STR + String.raw`\s*,\s*` + STR, "g");
const reTpl = /(?<![\w$.])_tn?\(\s*(?:[^,()]*,\s*)?`[^`]*\$\{/g;
const lit = (s) => vm.runInNewContext(s);
let used = 0;
const missing = [];
for (const file of sources) {
  const code = fs.readFileSync(path.join(WEB, file), "utf8");
  const check = (raw, at) => {
    used++;
    const s = norm(lit(raw));
    if (!exact.has(s)) missing.push(`${file}:${code.slice(0, at).split("\n").length}: ${s}`);
  };
  for (const m of code.matchAll(reT)) check(m[1], m.index);
  for (const m of code.matchAll(reTn)) { check(m[1], m.index); check(m[2], m.index); }
  for (const m of code.matchAll(reTpl)) {
    errors.push(`${file}:${code.slice(0, m.index).split("\n").length}: _t() gets an interpolated template literal — use {placeholders}`);
  }
}
for (const m of missing) errors.push(`missing English for ${m}`);

console.log(`catalogs: ${catalogs.length} · exact: ${exact.size} · html: ${html.size} · patterns: ${patterns.length} · msgids in code: ${used}`);
for (const w of warnings) console.log("warning: " + w);
if (errors.length) {
  for (const e of errors) console.log("✖ " + e);
  console.log(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log("✔ translations are complete and consistent");
