// Opens a live page, clicks the first map pin, and saves screenshots + a short report to debug/.
import { chromium } from "playwright";
import fs from "node:fs/promises";
const url = process.argv[2] || "https://rachelvictoriarealestate.github.io/apartments/c/claudia/";
const b = await chromium.launch();
const out = [];
for (const [w, name] of [[1280, "desk"], [390, "phone"]]) {
  const pg = await b.newPage({ viewport: { width: w, height: 1100 } });
  const errs = [];
  pg.on("pageerror", (e) => errs.push(String(e)));
  await pg.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await pg.waitForTimeout(2500);
  const pins = await pg.locator(".pin span").allInnerTexts();
  let popup = "";
  if (pins.length) { await pg.locator(".pin").first().click(); await pg.waitForTimeout(600); popup = await pg.locator(".leaflet-popup-content").innerText().catch(() => ""); }
  await pg.screenshot({ path: `debug/check-${name}.png` });
  out.push({ name, leaflet: await pg.evaluate(() => !!window.L), pins, popup, count: await pg.locator("#count").innerText(), scrollWidth: await pg.evaluate(() => document.documentElement.scrollWidth), errors: errs });
  await pg.close();
}
await b.close();
await fs.writeFile("debug/check-page.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
