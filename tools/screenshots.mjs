// Regenerates the documentation screenshots from the demo server.
//
//   python3 files/sdrkit_server.py --demo --port 8080 &      (SDRKIT_LANG=en for English example memories)
//   node tools/screenshots.mjs http://127.0.0.1:8080 docs/media/screenshots
//
// Needs Playwright (`npm i playwright && npx playwright install chromium`, or PLAYWRIGHT_MODULE=/path/to/playwright).
// Phone shots use a Pixel 7 viewport (412×915 CSS px at DPR 2.625 → 1080×2400 px).
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.argv[2] || "http://127.0.0.1:8080";
const out = process.argv[3] || "docs/media/screenshots";
const only = process.argv[4] ? new Set(process.argv[4].split(",")) : null;
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const errors = [];

async function phone(lang = "en") {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], locale: lang === "en" ? "en-US" : "es-ES" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${lang}: ${e.message}`));
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Demo" : undefined));
  await page.goto(`${base}/?lang=${lang}`);
  await page.waitForTimeout(2500);
  return page;
}
const want = (name) => !only || only.has(name);
const shot = async (page, name) => {
  if (!want(name)) return;
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log("✔", name);
};
const top = (page) => page.evaluate(() => window.scrollTo(0, 0));
const at = (page, sel, dy = -70) =>
  page.evaluate(([s, d]) => { document.querySelector(s).scrollIntoView({ block: "start" }); window.scrollBy(0, d); }, [sel, dy]);
const preset = (page, i) =>
  page.evaluate((i) => { const s = document.querySelector("#preset"); s.value = String(i); s.dispatchEvent(new Event("change")); }, i);
const tab = async (page, t, sub) => {
  await page.click(`.tabbar [data-tab="${t}"]`);
  if (sub) await page.click(t === "dec" ? `#decNav [data-dsub="${sub}"]` : `#moreNav [data-sub="${sub}"]`);
  await page.waitForTimeout(700);
};

// ---------------------------------------------------------------- analyzer
{
  const page = await phone("en");
  await preset(page, 8);                                    // 70 cm band: M17, DMR-like and FM signals
  await page.waitForTimeout(4000);
  for (let i = 0; i < 2; i++) { await page.click("#tnNext"); await page.waitForTimeout(500); }
  await page.waitForTimeout(1500);
  await top(page); await shot(page, "analyzer");

  await page.click("#btnPeak"); await page.waitForTimeout(400);
  await page.click("#mkChips [data-add]"); await page.waitForTimeout(300);
  await page.click("#btnDelta"); await page.click("#tgMax");
  await page.click("#measCard summary"); await page.selectOption("#inMeas", "xdb");
  await page.click('#mkChips [data-m="0"]'); await page.waitForTimeout(3000);
  await at(page, "#mkChips", -330); await shot(page, "analyzer-measurements");
  await page.click("#tgMax"); await page.selectOption("#inMeas", "none");

  await preset(page, 9);                                    // ISM 433: pulsed remote controls
  await page.waitForTimeout(3000);
  await page.click('#anMode [data-m="zspan"]'); await page.waitForTimeout(600);
  await page.fill("#zF", "433.92"); await page.selectOption("#zT", "0.05");
  await page.selectOption("#zTrig", "level"); await page.fill("#zLvl", "-60");
  await page.click("#btnZApply"); await page.selectOption("#inMeas", "pulse"); await page.waitForTimeout(5000);
  await top(page); await shot(page, "zero-span");
  await page.click('#anMode [data-m="sweep"]'); await page.selectOption("#inMeas", "none");

  await page.click(".hbtn"); await page.waitForTimeout(500);
  await shot(page, "help");
  await page.click("#helpClose");
  await page.context().close();
}

// ---------------------------------------------------------------- radio
{
  const page = await phone("en");
  await page.evaluate(() => SDR.openRadio(462562500, "nfm")); await page.waitForTimeout(12000);
  await top(page); await shot(page, "radio");

  await page.evaluate(() => SDR.openRadio(433475000, "dsd", { dsd: "m17" })); await page.waitForTimeout(11000);
  await at(page, "#dsdCard", -260); await shot(page, "digital-voice");

  await tab(page, "more", "canales");
  await page.click('#chServices [data-svc="marina"]'); await page.waitForTimeout(700);
  await page.click('#chDetail [data-act="scan"]'); await page.waitForTimeout(6000);
  await at(page, "#scStatus", -420); await shot(page, "scanner");
  await page.evaluate(() => SDR.api("/api/radio/scan", { action: "stop" }).catch(() => {}));
  await page.context().close();
}

// ---------------------------------------------------------------- decode
{
  const page = await phone("en");
  await tab(page, "dec", "msg");
  await page.selectOption("#dmPreset", "0"); await page.click("#dmStart"); await page.waitForTimeout(26000);
  await at(page, "#dmList", -330); await shot(page, "decode-messages");

  await tab(page, "dec", "ism");
  await page.click("#snStart"); await page.waitForTimeout(15000);
  await top(page); await shot(page, "decode-sensors");

  await tab(page, "dec", "air");
  await page.fill("#adLat", "18.4861"); await page.fill("#adLon", "-69.9312");
  await page.click("#adSaveLoc"); await page.click("#adStart"); await page.waitForTimeout(13000);
  await top(page); await shot(page, "aircraft-radar");
  await page.context().close();
}

// ---------------------------------------------------------------- recordings & more
{
  const page = await phone("en");
  await tab(page, "recs"); await page.waitForTimeout(800);
  await top(page); await shot(page, "recordings");
  await tab(page, "more", "canales");
  await page.click('#chServices [data-svc="frs"]'); await page.waitForTimeout(700);
  await top(page); await shot(page, "channels");
  await tab(page, "more", "ant"); await top(page); await shot(page, "antennas");
  await tab(page, "more", "ref"); await top(page); await shot(page, "frequency-guide");
  await tab(page, "more", "sys");
  await page.click("#btnUpdCheck"); await page.waitForTimeout(1800);
  await at(page, "#updCard", -260); await shot(page, "system");
  await page.context().close();
}

// ---------------------------------------------------------------- Spanish and desktop
{
  const page = await phone("es");
  await preset(page, 0); await page.waitForTimeout(4000);
  await page.click("#tnNext"); await page.waitForTimeout(1500);
  await top(page); await shot(page, "spanish");
  await page.context().close();

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: "en-US" });
  const dp = await ctx.newPage();
  dp.on("pageerror", (e) => errors.push(`desktop: ${e.message}`));
  await dp.goto(`${base}/?lang=en`); await dp.waitForTimeout(2000);
  await preset(dp, 0); await dp.waitForTimeout(4000);
  await dp.click("#tnNext"); await dp.waitForTimeout(1500);
  await shot(dp, "desktop");
  await ctx.close();
}

await browser.close();
if (errors.length) { console.log("JavaScript errors:\n" + errors.join("\n")); process.exit(1); }
console.log("done →", out);
