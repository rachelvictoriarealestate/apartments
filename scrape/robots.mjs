// Checks a site's robots.txt so the program stays out of anywhere a site asks automated visitors not to go.
const cache = new Map();

export async function robotsAllows(url) {
  const u = new URL(url);
  if (!cache.has(u.origin)) {
    let rules = [];
    try {
      const res = await fetch(u.origin + "/robots.txt", { headers: { "User-Agent": "Mozilla/5.0 (apartment-availability-checker)" }, signal: AbortSignal.timeout(15000) });
      if (res.ok) rules = parse(await res.text());
    } catch {}
    cache.set(u.origin, rules);
  }
  const rules = cache.get(u.origin);
  const path = u.pathname + u.search;
  // Longest matching rule wins (standard robots.txt behavior); Allow wins ties.
  let best = null;
  for (const r of rules) {
    if (matches(r.path, path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

// Rules from the "User-agent: *" group only.
function parse(txt) {
  const rules = [];
  let agents = [];
  let inRules = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "user-agent") {
      if (inRules) { agents = []; inRules = false; }
      agents.push(val.toLowerCase());
    } else if (key === "allow" || key === "disallow") {
      inRules = true;
      if (agents.includes("*") && val) rules.push({ allow: key === "allow", path: val });
    }
  }
  return rules;
}

function matches(pattern, path) {
  const re = new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
  return re.test(path);
}
