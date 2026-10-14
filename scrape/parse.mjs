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
  if (/studio/i.test(t)) beds = 0;
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
  const re = /([A-Z][A-Za-z0-9' -]{0,40}?)\s+(?:Den\/Office\s+|Townhome\s+)?(\d+)\s+Available\s+Units?\s+Bed\s+(Studio|\d+)\s+Bath\s+([\d.]+)\s+SQFT\s+(\d{3,5})(?:\s+(\d{3,5}))?\s+Available\s+(Now|\d{1,2}\/\d{1,2}\/\d{4})\s+Total\s+Monthly\s+Price\s+Starting\s+at\s+\$([\d,]+(?:\.\d+)?)\s*\/mo\.?\s*\(Base\s+Rent\s+\$([\d,]+(?:\.\d+)?)\)/gi;
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(re)) {
    const name = m[1].replace(/^.*?Virtual Tours\s+/i, "").replace(/^(?:Get Pricing|Contact Office)\s+/i, "").trim();
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

// ---------- Repli360 (The Clark) ----------
// "1C ONE BEDROOM | 1 BATH | 641 - 671 SQFT | 3 UNITS AVAILABLE Starting $2,657 * Wednesday October 21 2026
//  *Includes all required monthly fees Base Rent Starting From $2,580"
const WORD_BEDS = { STUDIO: 0, ONE: 1, TWO: 2, THREE: 3, FOUR: 4 };
export function repliPlans(text, today) {
  const t = flat(text);
  const re = /(?:^|\s)([0-9A-Z][\w]{0,5}(?:\s*-\s*AFFORDABLE)?)\s+(STUDIO|ONE BEDROOMS?|TWO BEDROOMS?|THREE BEDROOMS?|FOUR BEDROOMS?)\s*\|\s*([\d.]+)\s*BATHS?\s*\|\s*([\d,]+)(?:\s*-\s*([\d,]+))?\s*SQFT\s*\|\s*(\d+)\s*UNITS?\s*AVAILABLE\s+Starting\s+\$([\d,]+(?:\.\d+)?)\s*\*?\s*(.*?)\s*\*Includes[^$]*?Base Rent Starting From\s*\$([\d,]+(?:\.\d+)?)/g;
  const out = [];
  for (const m of t.matchAll(re)) {
    const affordable = /AFFORDABLE/i.test(m[1]);
    out.push({
      name: m[1].replace(/\s*-\s*AFFORDABLE/i, "").trim(),
      affordable,
      beds: WORD_BEDS[m[2].split(" ")[0].toUpperCase()],
      baths: +m[3],
      sqft: num(m[4]),
      sqftHigh: num(m[5]),
      units: +m[6],
      price: num(m[7]),
      available: parseDate(m[8], today),
      base: num(m[9]),
    });
  }
  return out;
}

// ---------- Gables (bedroom-level "starting from" only) ----------
// "1 Bedroom Total Monthly Cost of Rental Starting From: $2,237.75*"
export function gablesBeds(text) {
  const t = flat(text);
  const re = /(Studio|\d\s*Bedroom)\s+Total Monthly Cost of Rental Starting From:?\s*\$([\d,]+(?:\.\d+)?)/gi;
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(re)) {
    const beds = /studio/i.test(m[1]) ? 0 : +m[1].match(/\d/)[0];
    if (seen.has(beds)) continue;
    seen.add(beds);
    out.push({ name: beds === 0 ? "Studio" : beds + " Bedroom", beds, price: num(m[2]) });
  }
  return out;
}

// ---------- Windsor Communities (Monarch, Windsor on the Lake) ----------
// "Unit 911 B2F 2 Bed 2 Bath 1,400 ft2 Avail. Now $3,984.14 /mo $3,646 Base Rent 14 Mo."
export function windsorUnits(text, today) {
  const t = flat(text);
  const re = /Unit\s+([\w-]{1,8})\s+([A-Z0-9][\w-]{0,8})\s+(Studio|\d)\s*(?:Bed)?s?\s+([\d.]+)\s*Baths?\s+([\d,]{3,6})\s*ft2\s+Avail\.?\s+(Now|[A-Z][a-z]{2}\.?\s+\d{1,2}(?:,?\s*\d{4})?)\s+\$([\d,]+(?:\.\d+)?)\s*\/\s*mo\s+\$([\d,]+(?:\.\d+)?)\s*Base\s+Rent\s+(\d{1,2})\s*Mo/gi;
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(re)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ unit: m[1], plan: m[2], beds: /studio/i.test(m[3]) ? 0 : +m[3], baths: +m[4], sqft: num(m[5]), available: parseDate(m[6], today), price: num(m[7]), base: num(m[8]), lease: +m[9] });
  }
  return out;
}

// ---------- Greystar (The Waller) ----------
// "T-11 373 sq. ft. Studio 1 $1,950 – $2,095 Base rent from $1,745 Unit 1911 Available November 7th, 2026
//  13 month leasefrom$1,950 Base rent from $1,745 Show 10 available"
export function greystarPlans(text, today) {
  const t = flat(text);
  const re = /([A-Z][\w-]{0,8})\s+([\d,]{3,5})\s*sq\.?\s*ft\.?\s+(Studio|\d)\s+([\d.]+)\s+\$([\d,]+)(?:\s*[–-]\s*\$([\d,]+))?\s+Base rent from\s+\$([\d,]+)\s+Unit\s+([\w-]+)\s+Available\s+(Now|[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})\s+(\d{1,2})\s*month lease\s*from\s*\$([\d,]+)(?:\s+Base rent from\s+\$[\d,]+)?(?:\s+Show\s+(\d+)\s+available)?/gi;
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(re)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ name: m[1], sqft: num(m[2]), beds: /studio/i.test(m[3]) ? 0 : +m[3], baths: +m[4], price: num(m[5]), priceHigh: num(m[6]), base: num(m[7]), unit: m[8], available: parseDate(m[9], today), lease: +m[10], units: m[12] ? +m[12] : 1 });
  }
  return out;
}

// ---------- G5 sites (Corazon) ----------
// "A2 1 Bed 1 Bath 730 Sq.Ft Total Rent + Mandatory Fees $2,039 Base Rent $1,865 ... VIEW 7 APARTMENTS"
export function g5Plans(text) {
  const t = flat(text);
  const re = /([A-Z][\w-]{0,8})\s+(Studio|\d\s*Beds?)\s+([\d.]+)\s*Baths?\s+([\d,]{3,5})\s*Sq\.?\s*Ft\.?\s+Total Rent \+ Mandatory Fees\s+\$([\d,]+(?:\.\d+)?)\s+Base Rent\s+\$([\d,]+(?:\.\d+)?)[\s\S]{0,200}?VIEW\s+(\d+)\s+APARTMENTS?/gi;
  const out = [];
  const seen = new Set();
  for (const m of t.matchAll(re)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ name: m[1], beds: /studio/i.test(m[2]) ? 0 : +m[2].match(/\d/)[0], baths: +m[3], sqft: num(m[4]), price: num(m[5]), base: num(m[6]), units: +m[7] });
  }
  return out;
}
