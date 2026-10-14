// Finds map coordinates for each community's address using OpenStreetMap's free lookup (Nominatim).
// Results are saved in data/geo.json so each address is looked up only once.
import fs from "node:fs/promises";

const FILE = "data/geo.json";
const UA = "RachelVictoriaApartmentSearch/1.0 (+https://github.com/rachelvictoriarealestate/apartments)";
// Rough box around central Austin, to reject a wrong match in another city.
const inAustin = (lat, lng) => lat > 30.1 && lat < 30.5 && lng > -97.95 && lng < -97.55;

export async function geocodeAll(communities) {
  let geo = {};
  try { geo = JSON.parse(await fs.readFile(FILE, "utf8")); } catch {}
  for (const c of communities) {
    if (!c.address) continue;
    if (geo[c.id] && geo[c.id].address === c.address) continue;
    try {
      const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" + encodeURIComponent(c.address);
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" }, signal: AbortSignal.timeout(20000) });
      const [hit] = res.ok ? await res.json() : [];
      if (hit && inAustin(+hit.lat, +hit.lon)) {
        geo[c.id] = { address: c.address, lat: +(+hit.lat).toFixed(6), lng: +(+hit.lon).toFixed(6) };
        console.log(`📍 ${c.name}: ${geo[c.id].lat}, ${geo[c.id].lng}`);
      } else {
        console.log(`📍 ${c.name}: address not found`);
      }
    } catch (e) {
      console.log(`📍 ${c.name}: lookup failed (${e.message})`);
    }
    await new Promise((r) => setTimeout(r, 1200)); // OpenStreetMap asks for at most one lookup per second
  }
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(geo, null, 1));
  return geo;
}
