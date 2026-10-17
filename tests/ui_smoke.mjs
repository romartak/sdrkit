// Browser smoke test of the panel in English and Spanish (phone viewport).
// usage: node tests/ui_smoke.mjs http://127.0.0.1:8080
// Needs Playwright: `npm i playwright && npx playwright install chromium`
// (or set PLAYWRIGHT_MODULE to an existing installation).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.argv[2] || "http://127.0.0.1:8080";

const EXPECT = {
  en: ["Analyzer", "Radio", "Decode", "Recordings", "More"],
  es: ["Analizador", "Radio", "Decodificar", "Grabaciones", "Más"],
};
let failed = 0;
const fail = (msg) => { failed++; console.log("✖ " + msg); };

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const lang of ["en", "es"]) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("dialog", (d) => d.dismiss());
  await page.goto(`${base}/?lang=${lang}&i18n=debug`);
  await page.waitForTimeout(1500);

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  if (htmlLang !== lang) fail(`${lang}: <html lang> is "${htmlLang}"`);
  const tabs = (await page.locator(".tabbar button").allInnerTexts()).map((t) => t.trim());
  for (const label of EXPECT[lang]) if (!tabs.includes(label)) fail(`${lang}: tab "${label}" not found in [${tabs.join(", ")}]`);

  const steps = [
    ['.tabbar [data-tab="radio"]'], ['.tabbar [data-tab="dec"]'],
    ['[data-dsub="msg"]'], ['[data-dsub="ism"]'], ['[data-dsub="air"]'], ['[data-dsub="all"]'],
    ['.tabbar [data-tab="recs"]'], ['.tabbar [data-tab="more"]'],
    ...["canales", "ref", "ant", "rx", "wifi", "sys"].map((s) => [`#moreNav [data-sub="${s}"]`]),
    ['.tabbar [data-tab="an"]'], ['.hbtn[data-info="inicio"]'], ["#helpClose"],
  ];
  for (const [sel] of steps) {
    try { await page.click(sel, { timeout: 3000 }); await page.waitForTimeout(400); }
    catch (e) { fail(`${lang}: cannot click ${sel}`); }
  }
  const missing = await page.evaluate(() => Array.from(I18N.missing));
  if (lang === "en" && missing.length) {
    console.log(`  note: ${missing.length} Spanish-looking string(s) without English (often live demo data):`);
    for (const m of missing.slice(0, 15)) console.log("    · " + m.slice(0, 120));
  }
  for (const e of errors) fail(`${lang}: JavaScript error: ${e}`);
  console.log(`${lang}: visited ${steps.length} screens, ${errors.length} error(s)`);
  await ctx.close();
}
await browser.close();
if (failed) { console.log(`\n${failed} problem(s)`); process.exit(1); }
console.log("✔ panel works in English and Spanish");
