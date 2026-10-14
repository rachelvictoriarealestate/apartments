// Opens a live page, clicks the first map pin, and saves screenshots + a short report to debug/.
import { chromium } from "playwright";
import fs from "node:fs/promises";
const url = process.argv[2] || "https://rachelvictoriarealestate.github.io/apartments/c/claudia/";
const out = [];
await fs.mkdir("debug", { recursive: true });
const b = await chromium.launch();
for (const [w, name] of [[1280, "desk"], [390, "phone"]]) {
  const r = { name, steps: [] };
  const pg = await b.newPage({ viewport: { width: w, height: 1100 } });
  const errs = [];
  pg.on("pageerror", (e) => errs.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
  const step = async (label, fn) => { try { const v = await fn(); r.steps.push(label + ": ok"); return v; } catch (e) { r.steps.push(label + ": " + String(e.message || e).split("\n")[0]); } };
  await step("load", () => pg.goto(url, { waitUntil: "load", timeout: 60000 }));
  await pg.waitForTimeout(4000);
  r.leaflet = await step("leaflet", () => pg.evaluate(() => !!window.L));
  r.pins = (await step("pins", () => pg.locator(".pin span").allInnerTexts())) || [];
  r.count = await step("count", () => pg.locator("#count").innerText());
  if (r.pins.length) {
    await step("click pin", () => pg.locator(".pin").first().click({ force: true, timeout: 5000 }));
    await pg.waitForTimeout(800);
    r.popup = await step("popup", () => pg.locator(".leaflet-popup-content").innerText({ timeout: 3000 }));
  }
  if (process.env.SEND_TEST === "1" && name === "desk") {
    await step("save pick", () => pg.locator("#list .heart").first().click({ timeout: 5000 }));
    await step("open send", () => pg.click("#openSend"));
    await step("fill form", async () => {
      await pg.fill("#fname", "Test from Claude");
      await pg.fill("#femail", "rachelvictoriarealestate@gmail.com");
      await pg.fill("#fnote", "Test pick to confirm Send my picks works. No action needed.");
    });
    await step("send", () => pg.click("#sendBtn"));
    await pg.waitForTimeout(8000);
    r.sendStatus = await step("status", () => pg.locator("#status").innerText());
  }
  r.scrollWidth = await step("width", () => pg.evaluate(() => document.documentElement.scrollWidth));
  await step("shot", () => pg.screenshot({ path: `debug/check-${name}.png` }));
  r.errors = errs;
  out.push(r);
  await pg.close();
}
await b.close();
await fs.writeFile("debug/check-page.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
