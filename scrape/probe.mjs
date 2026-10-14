// One-time check of candidate communities: one page each.
// Records whether the site allows automated visitors, whether it blocks them anyway,
// which website platform it uses, and the lowest 2-bedroom price it shows.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import { CANDIDATES } from "./candidates.mjs";
import { robotsAllows } from "./robots.mjs";
import { flat, num } from "./parse.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PLATFORMS = [
  ["jonah", /jonahdigital|Jonah Systems/i],
  ["rentcafe", /rentcafe|securecafe|Yardi/i],
  ["entrata", /entrata/i],
  ["leaseleads", /leaseleads/i],
  ["repli360", /repli360/i],
  ["g5", /g5search|g5marketingcloud|g5-/i],
  ["realpage", /realpage|onlineleasing|leasestar/i],
  ["greystar", /greystar\.com/i],
  ["windsor", /windsorcommunities/i],
  ["gables", /gables\.com/i],
  ["simpson", /simpsonpropertygroup/i],
  ["sightmap", /sightmap/i],
  ["wordpress", /wp-content/i],
];

function twoBedPrices(t) {
  const out = [];
  for (const m of t.matchAll(/(2\s*(?:Bed|BD|Bedroom)s?|Two\s+Bedrooms?)([\s\S]{0,220}?)\$([\d,]{4,6}(?:\.\d{2})?)/gi)) out.push(num(m[3]));
  return out.filter((n) => n > 900 && n < 30000);
}

async function main() {
  await fs.mkdir("debug-probe", { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", locale: "en-US", timezoneId: "America/Chicago" });
  const results = [];
  for (const c of CANDIDATES) {
    const r = { id: c.id, name: c.name, area: c.area, url: c.url };
    try {
      if (!(await robotsAllows(c.url))) {
        r.status = "robots";
        r.note = "Site asks automated programs not to visit this page";
      } else {
        const page = await ctx.newPage();
        const resp = await page.goto(c.url, { waitUntil: "domcontentloaded", timeout: 45000 });
        try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch {}
        await page.evaluate(async () => { for (let i = 0; i < 8; i++) { window.scrollBy(0, 1800); await new Promise((r) => setTimeout(r, 200)); } });
        await sleep(2500);
        const html = await page.content();
        const text = flat(await page.evaluate(() => document.body.innerText || ""));
        await fs.writeFile(`debug-probe/${c.id}.txt`, `URL ${page.url()}\nHTTP ${resp ? resp.status() : "?"}\n\n` + (await page.evaluate(() => document.body.innerText || "")).slice(0, 200000));
        r.finalUrl = page.url();
        r.http = resp ? resp.status() : null;
        r.platform = (PLATFORMS.find(([, re]) => re.test(html)) || ["unknown"])[0];
        const prices = [...text.matchAll(/\$([\d,]{4,6})(?:\.\d{2})?/g)].map((m) => num(m[1])).filter((n) => n > 900 && n < 30000);
        const twoBed = twoBedPrices(text);
        if (/verify you are (not a bot|human)|security verification|access denied|unusual activity/i.test(text) || (r.http && r.http >= 403 && r.http < 500)) {
          r.status = "blocked";
          r.note = "Site blocks automated visitors";
        } else if (prices.length) {
          r.status = "readable";
          r.priceCount = prices.length;
          r.twoBedFrom = twoBed.length ? Math.min(...twoBed) : null;
          r.note = "Prices visible";
        } else {
          r.status = "no-prices";
          r.note = "Page loads but shows no prices here";
        }
        await page.close();
      }
    } catch (e) {
      r.status = "error";
      r.note = String(e.message || e).split("\n")[0].slice(0, 160);
    }
    console.log(`${r.status.padEnd(9)} ${c.name}${r.platform ? " [" + r.platform + "]" : ""}${r.twoBedFrom ? " 2BR from $" + r.twoBedFrom : ""}`);
    results.push(r);
    await sleep(3000);
  }
  await browser.close();
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile("data/probe.json", JSON.stringify({ checked: new Date().toISOString(), results }, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
