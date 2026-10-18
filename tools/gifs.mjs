// Records short animated demos of the panel (frames → GIF) from the demo server.
//
//   python3 files/sdrkit_server.py --demo --port 8080 &
//   node tools/gifs.mjs http://127.0.0.1:8080 /tmp/sdrkit-frames
//   python3 tools/make_gifs.py /tmp/sdrkit-frames docs/media/gifs
//
// Needs Playwright (`npm i playwright && npx playwright install chromium`, or PLAYWRIGHT_MODULE=/path/to/playwright).
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.argv[2] || "http://127.0.0.1:8080";
const out = process.argv[3] || "/tmp/sdrkit-frames";
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

async function phone() {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], deviceScaleFactor: 1.5, locale: "en-US" });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss());
  await page.goto(`${base}/?lang=en&nointro=1`);
  await page.waitForTimeout(2500);
  return page;
}
// one screenshot every `every` ms for `ms` ms; `during` runs in parallel (clicks while recording)
async function record(page, name, ms, every = 200, during = null) {
  const dir = `${out}/${name}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const job = during ? during() : Promise.resolve();
  for (let i = 0; Date.now() - t0 < ms; i++) {
    const t = Date.now();
    await page.screenshot({ path: `${dir}/${String(i).padStart(4, "0")}.png` });
    await page.waitForTimeout(Math.max(0, every - (Date.now() - t)));
  }
  await job;
  console.log("✔", name);
}
const preset = (page, i) =>
  page.evaluate((i) => { const s = document.querySelector("#preset"); s.value = String(i); s.dispatchEvent(new Event("change")); }, i);
const tab = async (page, t, sub) => {
  await page.click(`.tabbar [data-tab="${t}"]`);
  if (sub) await page.click(`#decNav [data-dsub="${sub}"]`);
  await page.waitForTimeout(700);
};

{ // spectrum analyzer: sweep the FM broadcast band, then jump between stations with the tuner
  const page = await phone();
  await page.evaluate(() => SDR.api("/api/mode", { mode: "sweep" }));   // free the dongle if a decoder was left running
  await page.waitForTimeout(3000);
  await preset(page, 0); await page.waitForTimeout(4000);
  await record(page, "analyzer", 9000, 200, async () => {
    for (let i = 0; i < 3; i++) { await page.waitForTimeout(2200); await page.click("#tnNext"); }
  });
  await page.context().close();
}
{ // radio: tune and listen (spectrum + waterfall + audio level)
  const page = await phone();
  await page.evaluate(() => SDR.openRadio(462562500, "nfm")); await page.waitForTimeout(6000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await record(page, "radio", 7000);
  await page.context().close();
}
{ // aircraft radar (ADS-B)
  const page = await phone();
  await tab(page, "dec", "air");
  await page.fill("#adLat", "18.4861"); await page.fill("#adLon", "-69.9312");
  await page.click("#adSaveLoc"); await page.click("#adStart"); await page.waitForTimeout(4000);
  await record(page, "radar", 9000, 300);
  await page.context().close();
}
{ // pager messages (POCSAG) arriving
  const page = await phone();
  await tab(page, "dec", "msg");
  await page.selectOption("#dmPreset", "4"); await page.click("#dmStart"); await page.waitForTimeout(12000);
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));   // message list is at the bottom
  await record(page, "pagers", 18000, 400);
  await page.context().close();
}
await browser.close();
