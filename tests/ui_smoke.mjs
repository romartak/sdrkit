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

  // first visit: the welcome tour (and, the first time, the question about new-version notices)
  try {
    await page.waitForSelector("#wSheet:not(.hidden)", { timeout: 5000 });
    for (let i = 0; i < 6 && !(await page.$('[data-w="done"]')); i++) {
      await page.click('[data-w="next"], [data-w="yes"]', { timeout: 3000 });
      await page.waitForTimeout(300);
    }
    await page.click('[data-w="done"]', { timeout: 3000 });
    await page.waitForSelector("#wSheet.hidden", { state: "attached", timeout: 3000 });
    const ver = await page.textContent("#verTxt");
    if (!/^v\d+\.\d+\.\d+$/.test(ver)) fail(`${lang}: version chip shows "${ver}"`);
    await page.click("#verChip"); await page.waitForTimeout(300); await page.click("#wClose");
    // About card: roadmap (all 32 features, the unified server last), rating and sharing
    await page.click('.tabbar [data-tab="more"]'); await page.click('#moreNav [data-sub="sys"]');
    await page.click("#btnIntro"); await page.click('[data-w="next"]'); await page.click('[data-w="next"]');
    await page.click('[data-open="roadmap"]');
    if (!(await page.$('[data-w="back2"]'))) fail(`${lang}: roadmap opened from the tour has no Back button`);
    await page.click('[data-w="back2"]'); await page.waitForSelector('[data-open="roadmap"]', { timeout: 3000 });
    await page.click("#wClose");
    await page.click("#btnRoadmap"); await page.waitForTimeout(300);
    const n = await page.locator("#wBody .rmi").count();
    if (n !== 32) fail(`${lang}: roadmap shows ${n} features, expected 32`);
    if (!(await page.locator("#wBody .rmi.vision").innerText()).match(/Network|SDR-Kit/)) fail(`${lang}: roadmap vision item missing`);
    await page.click("#wClose");
    await page.click("#btnRate"); await page.click('[data-rate="5"]'); await page.waitForTimeout(200);
    if ((await page.locator("#wBody .stars button.on").count()) !== 5) fail(`${lang}: rating not shown`);
    await page.click("#wClose");
    await page.click("#btnShare"); await page.waitForTimeout(200);
    if ((await page.locator("#wBody .wshare a").count()) < 4) fail(`${lang}: share links missing`);
    await page.click("#wClose");
    await page.click('.tabbar [data-tab="an"]');
  } catch (e) { fail(`${lang}: welcome tour: ${e.message.split("\n")[0]}`); }

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
  // instant replay: listen on the demo walkie-talkie, then "⏪ What did they say?" plays it back and "💾 Save" keeps it
  try {
    await page.evaluate(() => SDR.api("/api/radio", {freq: 462562500, mod: "nfm", squelch: -45, activate: true}));
    await page.click('.tabbar [data-tab="radio"]');
    await page.waitForFunction(() => Radio && document.querySelector("#rReplay").textContent.includes("· "), null, { timeout: 20000 });
    await page.click("#rReplay");
    await page.waitForFunction(() => !document.querySelector("#rReplaySave").disabled, null, { timeout: 10000 });
    await page.click("#rReplaySave");
    await page.waitForFunction(() => /Grabaciones|Recordings/.test(document.querySelector("#toast").textContent), null, { timeout: 10000 });
    await page.click("#rReplay");
    await page.click('.tabbar [data-tab="an"]');
  } catch (e) { fail(`${lang}: instant replay: ${e.message.split("\n")[0]}`); }

  // business panel: charts drawn from the activity log (demo data)
  try {
    await page.click('.tabbar [data-tab="recs"]');
    await page.waitForFunction(() => document.querySelectorAll("#bizBody .biz-chart i").length >= 24, null, { timeout: 10000 });
    await page.click('#bizDays [data-d="30"]');
    await page.waitForFunction(() => document.querySelectorAll("#bizBody .biz-chart").length === 2, null, { timeout: 10000 });
    await page.click('.tabbar [data-tab="an"]');
  } catch (e) { fail(`${lang}: business panel: ${e.message.split("\n")[0]}`); }

  // ship map (AIS): start it in demo mode and wait for ships in the table
  try {
    await page.click('.tabbar [data-tab="dec"]');
    await page.click('#decNav [data-dsub="ais"]');
    await page.click("#aiStart");
    await page.waitForFunction(() => document.querySelectorAll("#aiTable tbody tr[data-mmsi]").length >= 6, null, { timeout: 25000 });
    await page.click('.tabbar [data-tab="an"]');
    await page.waitForFunction(() => SDR.status && SDR.status.mode === "ais" && !SDR.status.switching, null, { timeout: 15000 });
    await page.evaluate(() => SDR.api("/api/mode", {mode: "sweep"}));
  } catch (e) { fail(`${lang}: ship map: ${e.message.split("\n")[0]}`); }

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
