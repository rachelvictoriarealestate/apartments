// Pure text parsers. Each takes the visible text of a page and returns plain objects.
// Kept separate from the browser code so they can be tested on saved page text.

export const flat = (s) => String(s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
export const num = (s) => {
  if (s == null) return null;
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const MONTHS = "janfebmaraprmayjunjulaugsepoctnovdec";

// "Now" | "11/12/2026" | "Nov 26" | "November 7th, 2026" -> "now" | "YYYY-MM-DD" | null
export function parseDate(s, today = new Date()) {
  if (!s) return null;
  s = String(s).trim();
  if (/\b(now|today|immediate)/i.test(s)) return "now";
  let m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i);
  if (m) {
    const mo = MONTHS.indexOf(m[1].toLowerCase()) / 3 + 1;
    let y = m[3] ? +m[3] : today.getFullYear();
    // A month well before this one with no year written means next year (e.g. "Jan 5" seen in October).
    if (!m[3] && mo < today.getMonth() + 1 - 1) y += 1;
    return `${y}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

export function parseLayout(t) {
  t = flat(t);
  let beds = null;
  if (/\bstudio\b/i.test(t)) beds = 0;
  else {
    const b = t.match(/(\d)\s*(?:bed|br\b|bedroom)/i);
    if (b) beds = +b[1];
  }
  const ba = t.match(/(\d(?:\.\d)?)\s*(?:bath|ba\b)/i);
  const sf = t.match(/([\d,]{3,6})\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i);
  return { beds, baths: ba ? +ba[1] : null, sqft: sf ? num(sf[1]) : null };
}

// Leasing specials mentioned anywhere on the page, e.g. "8 weeks free", "save up to $1,000".
export function findSpecial(t) {
  t = flat(t);
  const m = t.match(/(?:up to\s+)?\d+\s+(?:weeks?|months?)\s+free|save up to \$[\d,]+|\$[\d,]+\s+off\b/i);
  return m ? m[0].replace(/^./, (c) => c.toUpperCase()) : "";
}

// ---------- Jonah Digital sites (Alexan Waterloo, 700 River, The Bowie, The Quincy) ----------
// Floorplan detail pages list units like:
//   "#1208 Building 1 Floor 12 382 sq. ft. $1,648 /mo* 15 months$1,485 Base Rent Available Nov 26"
//   "#3506 1092 sq. ft. Starting at $3,899 Available Nov 13"
export function jonahUnits(text, today) {
  const t = flat(text);
  const re = /#\s?([A-Z0-9][\w-]{0,9})\s+(?:Building\s+\w+\s+)?(?:Floor\s+\d+\s+)?([\d,]{3,6})\s*sq\.?\s*ft\.?\s+(?:Starting\s+at\s+)?\$([\d,]+(?:\.\d+)?)(?:\s*-\s*\$[\d,]+(?:\.\d+)?)?\s*(?:\/\s*mo\.?\*?)?\s*(?:(\d{1,2})\s*months?\s*\$([\d,]+(?:\.\d+)?)\s*Base\s*Rent)?\s*(?:View on Map\s*)?Available\s+(Now|Today|[A-Z][a-z]{2,8}\.?\s+\d{1,2}(?:,?\s*\d{4})?)/gi;
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(re)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ unit: m[1], sqft: num(m[2]), price: num(m[3]), lease: m[4] ? +m[4] : null, base: num(m[5]), available: parseDate(m[6], today) });
  }
  return out;
}

// Floorplan card text on the Jonah list page, e.g.
// "View Floor Plan S1 Studio 1 bath 382 sq. ft. $1,743 /mo* Only 1 left! 15 months $1,580 Base Rent"
export function jonahCard(text) {
  const t = flat(text);
  const nameM = t.match(/View Floor\s?plan\s+(.+?)\s+(?:Studio|\d\s*bed)/i);
  const prices = [...t.matchAll(/\$([\d,]+(?:\.\d+)?)/g)].map((m) => num(m[1]));
  const base = t.match(/\$([\d,]+(?:\.\d+)?)(?:\s*-\s*\$[\d,]+(?:\.\d+)?)?\s*Base\s*Rent/i);
  const lease = t.match(/(\d{1,2})\s*months/i);
  const left = t.match(/only\s+(\d+)\s+left/i);
  return {
    name: nameM ? nameM[1].trim() : null,
    ...parseLayout(t),
    price: prices[0] || null,
    priceHigh: /\$[\d,.]+\s*-\s*\$/.test(t) ? prices[1] || null : null,
    base: base ? num(base[1]) : null,
    lease: lease ? +lease[1] : null,
    left: left ? +left[1] : null,
    special: /\d+\s+weeks?\s+free/i.test(t) ? (t.match(/\d+\s+weeks?\s+free/i) || [""])[0] : "",
  };
}

// ---------- RentCafe / Yardi (Skyline at Barton Creek) ----------
// "Apartment: # 14-365 Date Available: 11/12/2026 Starting at: $1,234.00"
export function rentcafeUnits(text, today) {
  const t = flat(text);
  const re = /Apartment:?\s*#\s*([\w-]+)\s+(?:Sq\.?\s*Ft\.?:?\s*([\d,]+)\s+)?Date Available:?\s*(Available Now|Now|Today|\d{1,2}\/\d{1,2}\/\d{4})\s+(?:Starting at:?|Rent:?)\s*\$([\d,]+(?:\.\d+)?)/gi;
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(re)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ unit: m[1], sqft: num(m[2]), price: num(m[4]), available: parseDate(m[3], today) });
  }
  return out;
}

// Plan heading on the RentCafe list page: "A1 1 Bed 1 Bath 540 Sq. Ft."
export function rentcafePlanLayout(text, name) {
  const t = flat(text);
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = t.match(new RegExp(`(?:^|\\s)${esc}\\s+(Studio|\\d\\s*Beds?)\\s+(\\d(?:\\.\\d)?)\\s*Baths?\\s+([\\d,]+)\\s*Sq\\.?\\s*Ft`, "i"));
  if (!m) return null;
  return { beds: /studio/i.test(m[1]) ? 0 : +m[1].match(/\d/)[0], baths: +m[2], sqft: num(m[3]) };
}

// ---------- LeaseLeads (415 Colorado) ----------
// "Unit 4021 Starting From $5,559 /month Available November 7th, 2026 Size 1,255 Sq. Ft."
export function leaseleadsUnits(text, today) {
  const t = flat(text);
  const re = /Unit\s+([\w-]{2,10})\s+Starting\s+From\s+\$([\d,]+(?:\.\d+)?)\s*\/\s*month\s+Available\s+(Now|Today|Immediately|[A-Z][a-z]{2,8}\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)(?:\s+Size\s+([\d,]+)\s*Sq)?/gi;
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(re)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ unit: m[1], price: num(m[2]), available: parseDate(m[3], today), sqft: num(m[4]) });
  }
  return out;
}

// ---------- AMLI (floorplan level; AMLI's own site doesn't list unit numbers) ----------
// "Virtual Tours Benson 5 Available Units Bed 1 Bath 1 SQFT 626 Available Now
//  Total Monthly Price Starting at $2,751.49/mo. (Base Rent $2,689)"
export function amliPlans(text, today) {
  const t = flat(text);
  const re = /([A-Z][A-Za-z0-9' -]{0,40}?)\s+(?:Den\/Office\s+|Townhome\s+)?(\d+)\s+Available\s+Units?\s+Bed\s+(Studio|\d+)\s+Bath\s+([\d.]+)\s+SQFT\s+(\d{3,5})(?:\s+(\d{3,5}))?\s+Available\s+(Now|\d{1,2}\/\d{1,2}\/\d{4})\s+Total\s+Monthly\s+Price\s+Starting\s+at\s+\$([\d,]+(?:\.\d+)?)\s*\/mo\.?\s*\(Base\s+Rent\s+\$([\d,]+(?:\.\d+)?)\)/g;
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(re)) {
    const name = m[1].replace(/^.*?Virtual Tours\s+/i, "").trim();
    if (!name || seen.has(name) || +m[2] === 0) continue;
    seen.add(name);
    out.push({
      name,
      units: +m[2],
      beds: /studio/i.test(m[3]) ? 0 : +m[3],
      baths: +m[4],
      sqft: num(m[5]),
      sqftHigh: num(m[6]),
      available: parseDate(m[7], today),
      price: num(m[8]),
      base: num(m[9]),
    });
  }
  return out;
}
