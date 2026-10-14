// Daily refresh: visits each community's own website in a real browser,
// reads available units and prices, and writes data/listings.json.
// If a community fails or returns nothing, its last good data is kept and marked stale,
// so the client page never goes blank because one website changed.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import { COMMUNITIES } from "./communities.mjs";
import * as P from "./parse.mjs";
import { robotsAllows } from "./robots.mjs";
import { geocodeAll } from "./geocode.mjs";

const OUT = "data/listings.json";
const DEBUG_DIR = "debug";
const PAUSE_MS = 2000; // pause between page loads so we never hammer a site
const only = process.argv[2] ? process.argv[2].split(",") : null; // optional: node scrape/run.mjs waller,monarch

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Date();

async function open(page, url) {
  if (!(await robotsAllows(url))) throw new Error("Site asks automated programs not to visit " + new URL(url).pathname);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (e) {
    await sleep(20000); // one gentle retry after a pause
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
  try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch {}
  await page.evaluate(async () => {
    for (let i = 0; i < 8; i++) { window.scrollBy(0, 1800); await new Promise((r) => setTimeout(r, 200)); }
    window.scrollTo(0, 0);
  });
  await sleep(600);
}
const pageText = (page) => page.evaluate(() => document.body.innerText || "");
// All text on the page, including panels that are hidden until clicked (e.g. "Check Availability").
const allText = (page) => page.evaluate(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const parts = [];
  while (w.nextNode()) { const v = w.currentNode.nodeValue.trim(); if (v) parts.push(v); }
  return parts.join("\n");
});

// Anchors matching `selector`, each with the text of the nearest ancestor that contains `mustMatch`.
const cards = (page, selector, mustMatch) =>
  page.$$eval(selector, (as, src) => {
    const re = new RegExp(src, "i");
    return as.map((a) => {
      let el = a;
      for (let i = 0; i < 8 && el.parentElement && !re.test(el.innerText || ""); i++) el = el.parentElement;
      return { href: a.href, text: el.innerText || "" };
    });
  }, mustMatch);

// Best floorplan image on the current page: one whose file name mentions the plan, else one mentioning "floor".
const planImage = (page, key) =>
  page.$$eval("img", (imgs, key) => {
    const srcs = imgs.map((i) => i.currentSrc || i.src || "").filter((s) => /^https?:/.test(s));
    const k = (key || "").toLowerCase().replace(/[^a-z0-9.]/g, "");
    const byName = k && srcs.find((s) => {
      const f = decodeURIComponent(s.toLowerCase().split("?")[0].split("/").pop()).replace(/[^a-z0-9._-]/g, "");
      return f.startsWith(k + "_") || f.startsWith(k + ".") || f.startsWith(k + "-") || f.includes("-" + k + ".") || f.includes("_" + k + "_") || f.includes(k + "_floorplan") || f.includes("-" + k + "-");
    });
    return byName || srcs.find((s) => /floor\s?plan|floorplan|_fp|fp_/i.test(s)) || null;
  }, key);

// ---------------- readers ----------------

async function readJonah(page, c, log) {
  await open(page, c.url);
  const listText = await pageText(page);
  log.push("=== LIST " + c.url + "\n" + listText);
  const special = P.findSpecial(listText);
  const rows = [];
  const seen = new Set();
  for (const card of await cards(page, 'a[href*="/floorplans/"]', "sq\\.?\\s*ft")) {
    const u = new URL(card.href);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "floorplans" || /^unit-|ebrochure/i.test(parts[1]) || seen.has(parts[1])) continue;
    seen.add(parts[1]);
    const info = P.jonahCard(card.text);
    if (!info.price) continue; // "Contact Us" = nothing available right now
    const name = info.name || parts[1].toUpperCase();
    await sleep(PAUSE_MS * 2); // these four sites share one host, so go slower
    await open(page, card.href);
    const detail = await allText(page);
    log.push("=== PLAN " + card.href + "\n" + detail);
    const image = await planImage(page, parts[1]);
    const units = P.jonahUnits(detail, today);
    const lay = info.beds != null ? info : { ...info, ...P.parseLayout(detail) };
    const base = { plan: name, beds: lay.beds, baths: lay.baths ?? info.baths, url: card.href, image, special: info.special || special };
    if (units.length) {
      for (const x of units) rows.push({ ...base, unit: x.unit, sqft: x.sqft || info.sqft, price: x.price, base: x.base, lease: x.lease, available: x.available });
    } else {
      rows.push({ ...base, unit: null, sqft: info.sqft, price: info.price, priceHigh: info.priceHigh, base: info.base, lease: info.lease, available: null, units: info.left });
    }
  }
  return rows;
}

async function readRentCafe(page, c, log) {
  await open(page, c.url);
  const listText = await pageText(page);
  log.push("=== LIST " + c.url + "\n" + listText);
  const special = P.findSpecial(listText);
  const origin = new URL(c.url).origin;
  const slugs = [...new Set((await page.$$eval('a[href*="/floorplans/"]', (as) => as.map((a) => a.href)))
    .map((h) => new URL(h).pathname.split("/").filter(Boolean))
    .filter((p) => p.length === 2 && p[0].toLowerCase() === "floorplans")
    .map((p) => p[1]))];
  const rows = [];
  for (const slug of slugs) {
    const name = decodeURIComponent(slug).toUpperCase();
    const layout = P.rentcafePlanLayout(listText, name) || {};
    const url = `${origin}/floorplans/${slug}`;
    await sleep(PAUSE_MS);
    await open(page, url);
    const detail = await pageText(page);
    log.push("=== PLAN " + url + "\n" + detail);
    const units = P.rentcafeUnits(detail, today);
    if (!units.length) continue;
    const lay = layout.beds != null ? layout : P.parseLayout(detail);
    const image = await planImage(page, slug.replace(/\./g, "-"));
    for (const x of units) rows.push({ plan: name, beds: lay.beds, baths: lay.baths, sqft: x.sqft || lay.sqft, unit: x.unit, price: x.price, available: x.available, url, image, special });
  }
  return rows;
}

async function readLeaseLeads(page, c, log) {
  await open(page, c.url);
  const listText = await pageText(page);
  log.push("=== LIST " + c.url + "\n" + listText);
  const special = P.findSpecial(listText);
  const rows = [];
  const seen = new Set();
  for (const card of await cards(page, 'a[href*="/floor-plan/"]', "sq\\.?\\s*ft")) {
    const slug = new URL(card.href).pathname.split("/").filter(Boolean)[1];
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const t = P.flat(card.text);
    const name = (t.match(/^([A-Z]{1,3}\d{0,2}[A-Z]?)\s/) || [])[1] || slug.replace(/-\d+$/, "").toUpperCase();
    const lay = P.parseLayout(t);
    await sleep(PAUSE_MS);
    await open(page, card.href);
    const detail = await pageText(page);
    log.push("=== PLAN " + card.href + "\n" + detail);
    const units = P.leaseleadsUnits(detail, today);
    const image = await page.$$eval("img", (imgs) => (imgs.map((i) => i.currentSrc || i.src).find((s) => /media\.leaseleads\.co\/image/.test(s)) || null));
    for (const x of units) rows.push({ plan: name, beds: lay.beds, baths: lay.baths, sqft: x.sqft || lay.sqft, unit: x.unit, price: x.price, available: x.available, url: card.href, image, special });
  }
  return rows;
}

async function readAmli(page, c, log) {
  await open(page, c.url);
  const text = await pageText(page);
  log.push("=== LIST " + c.url + "\n" + text);
  const special = P.findSpecial(text);
  const rows = [];
  for (const p of P.amliPlans(text, today)) {
    const image = await planImage(page, p.name.toLowerCase().replace(/[^a-z0-9]/g, ""));
    rows.push({ plan: p.name, beds: p.beds, baths: p.baths, sqft: p.sqft, unit: null, units: p.units, price: p.price, base: p.base, available: p.available, url: c.url, image, special });
  }
  return rows;
}

async function readRepli(page, c, log) {
  await open(page, c.url);
  await sleep(3000);
  const text = await pageText(page);
  log.push("=== LIST " + c.url + "\n" + text);
  const special = P.findSpecial(text);
  return P.repliPlans(text, today).map((p) => ({
    plan: p.name, beds: p.beds, baths: p.baths, sqft: p.sqft, unit: null, units: p.units, price: p.price, base: p.base,
    available: p.available, url: c.url, image: null, special: p.affordable ? "Income-restricted" : special,
  }));
}

async function readGables(page, c, log) {
  await open(page, c.url);
  await sleep(2000);
  const text = await pageText(page);
  log.push("=== LIST " + c.url + "\n" + text);
  return P.gablesBeds(text).map((p) => ({ plan: p.name, beds: p.beds, baths: null, sqft: null, unit: null, price: p.price, available: null, url: c.url, image: null, special: "" }));
}

async function readWindsor(page, c, log) {
  await open(page, c.url);
  // Windsor shows a few homes at a time; press "Load more" while it's there.
  for (let i = 0; i < 8; i++) {
    const more = page.getByRole("button", { name: /load more|show more|view more/i }).first();
    if (!(await more.isVisible().catch(() => false))) break;
    await more.click().catch(() => {});
    await sleep(1500);
  }
  const text = await pageText(page);
  log.push("=== LIST " + c.url + "\n" + text);
  const special = P.findSpecial(text);
  return P.windsorUnits(text, today).map((x) => ({ plan: x.plan, beds: x.beds, baths: x.baths, sqft: x.sqft, unit: x.unit, price: x.price, base: x.base, lease: x.lease, available: x.available, url: c.url, image: null, special }));
}

async function readGreystar(page, c, log) {
  await open(page, c.url);
  const text = await pageText(page);
  log.push("=== LIST " + c.url + "\n" + text);
  const special = P.findSpecial(text);
  return P.greystarPlans(text, today).map((p) => ({ plan: p.name, beds: p.beds, baths: p.baths, sqft: p.sqft, unit: p.unit, units: p.units, price: p.price, base: p.base, lease: p.lease, available: p.available, url: c.url, image: null, special }));
}

async function readG5(page, c, log) {
  await open(page, c.url);
  const all = page.getByText(/view all floor plans/i).first();
  if (await all.isVisible().catch(() => false)) { await all.click().catch(() => {}); await sleep(2500); }
  const text = await pageText(page);
  log.push("=== LIST " + page.url() + "\n" + text);
  const special = P.findSpecial(text);
  return P.g5Plans(text).map((p) => ({ plan: p.name, beds: p.beds, baths: p.baths, sqft: p.sqft, unit: null, units: p.units, price: p.price, base: p.base, lease: 12, available: null, url: c.url, image: null, special }));
}

// Sites that only show listings after their scripts run. First run saves the page text
// so a proper reader can be written for each; until then they return nothing.
async function readGeneric(page, c, log) {
  await open(page, c.url);
  await sleep(4000);
  log.push("=== LIST " + c.url + "\n" + (await pageText(page)));
  return [];
}

const READERS = { jonah: readJonah, rentcafe: readRentCafe, leaseleads: readLeaseLeads, amli: readAmli, repli360: readRepli, gables: readGables, windsor: readWindsor, greystar: readGreystar, g5: readG5, generic: readGeneric };

// ---------------- main ----------------

async function main() {
  let previous = { listings: [], communities: [] };
  try { previous = JSON.parse(await fs.readFile(OUT, "utf8")); } catch {}
  await fs.mkdir(DEBUG_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
    locale: "en-US",
    timezoneId: "America/Chicago",
  });

  const listings = [];
  const communities = [];
  for (const c of COMMUNITIES) {
    const prevRows = previous.listings.filter((r) => r.c === c.id);
    const prevMeta = previous.communities.find((x) => x.id === c.id) || {};
    if (only && !only.includes(c.id)) { listings.push(...prevRows); communities.push(prevMeta.id ? prevMeta : { ...pick(c), status: "pending" }); continue; }
    if (c.manual) {
      // Rachel checks these by hand; they appear on client pages without live prices.
      communities.push({ ...pick(c), status: "manual", note: c.note || "", checked: today.toISOString(), count: 0 });
      continue;
    }
    if (c.blocked) {
      // This site blocks automated visitors. Respect that: don't visit, keep any earlier data until it expires.
      listings.push(...prevRows);
      communities.push({ ...pick(c), status: prevRows.length ? "stale" : "blocked", checked: today.toISOString(), lastGood: prevMeta.lastGood || null, count: prevRows.length, error: "Site blocks automated visitors" });
      console.log(`– ${c.name}: skipped (site blocks automated visitors)`);
      continue;
    }
    const page = await context.newPage();
    const log = [];
    let rows = [];
    let error = "";
    try {
      rows = await READERS[c.reader](page, c, log);
    } catch (e) {
      error = String(e && e.message ? e.message : e).slice(0, 300);
    }
    await page.close();
    await fs.writeFile(`${DEBUG_DIR}/${c.id}.txt`, (error ? "ERROR: " + error + "\n\n" : "") + log.join("\n\n").slice(0, 400000));
    rows = rows.filter((r) => r.price && r.price > 200 && r.price < 60000);
    if (rows.length) {
      rows.forEach((r) => listings.push({ c: c.id, ...r }));
      communities.push({ ...pick(c), status: "ok", checked: today.toISOString(), lastGood: today.toISOString(), count: rows.length });
      console.log(`✓ ${c.name}: ${rows.length} listings`);
    } else {
      listings.push(...prevRows);
      communities.push({ ...pick(c), status: prevRows.length ? "stale" : "pending", checked: today.toISOString(), lastGood: prevMeta.lastGood || null, count: prevRows.length, error });
      console.log(`✗ ${c.name}: nothing read${error ? " (" + error + ")" : ""}; ${prevRows.length ? "kept previous data" : "no data yet"}`);
    }
    await sleep(PAUSE_MS);
  }
  await browser.close();

  const geo = await geocodeAll(COMMUNITIES);
  for (const m of communities) if (geo[m.id]) { m.lat = geo[m.id].lat; m.lng = geo[m.id].lng; }

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(OUT, JSON.stringify({ updated: today.toISOString(), communities, listings }, null, 1));
  console.log(`Saved ${listings.length} listings across ${communities.filter((x) => x.count).length} communities.`);
}

function pick(c) {
  return { id: c.id, name: c.name, area: c.area, priceType: c.priceType, url: c.url, ...(c.note ? { note: c.note } : {}) };
}

main().catch((e) => { console.error(e); process.exit(1); });
