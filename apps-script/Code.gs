// Google Apps Script: receives a client's picks from the apartment page and emails them to Rachel.
// Setup steps are in the README ("Turn on Send my picks").

const TO = "rachelvictoriarealestate@gmail.com";
const MAX_PER_HOUR = 30; // simple protection against spam floods

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    if (d.website) return json({ ok: true }); // hidden field only bots fill in
    const picks = (d.picks || []).slice(0, 40);
    const name = clip(d.name, 100);
    const email = clip(d.email, 150);
    if (!picks.length || !name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "missing details" });

    const cache = CacheService.getScriptCache();
    const n = Number(cache.get("count") || 0);
    if (n >= MAX_PER_HOUR) return json({ ok: false, error: "busy" });
    cache.put("count", String(n + 1), 3600);

    const rows = picks.map((p, i) =>
      `<tr><td>${i + 1}</td><td><b>${h(p.community)}</b><br><span style="color:#666">${h(p.area)}</span></td>` +
      `<td>${h(p.plan)}${p.unit ? " #" + h(p.unit) : ""}<br><span style="color:#666">${h(p.layout)}</span></td>` +
      `<td>${h(p.price)}</td><td>${h(p.available)}</td><td><a href="${h(p.url)}">View</a></td></tr>`).join("");
    const details = [
      ["Name", name], ["Email", email], ["Phone", clip(d.phone, 40)],
      ["Move-in", clip(d.moveIn, 100)], ["Notes", clip(d.note, 1500)],
    ].filter((x) => x[1]).map((x) => `<p style="margin:4px 0"><b>${x[0]}:</b> ${h(x[1])}</p>`).join("");
    const html =
      `<div style="font-family:Arial,sans-serif;font-size:14px;color:#18201E">` +
      `<h2 style="margin:0 0 8px">New apartment picks from ${h(name)}</h2>${details}` +
      `<table cellpadding="8" style="border-collapse:collapse;margin-top:12px" border="1" bordercolor="#DCE2DF">` +
      `<tr style="background:#E2EFEC"><th>#</th><th>Community</th><th>Plan</th><th>Price</th><th>Move-in</th><th></th></tr>${rows}</table>` +
      `<p style="color:#666;margin-top:12px">Sent from your apartment search page. Reply to this email to answer ${h(name.split(" ")[0])} directly.</p></div>`;

    MailApp.sendEmail({ to: TO, replyTo: email, name: "Apartment Search", subject: `Apartment picks from ${name} (${picks.length})`, htmlBody: html });
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clip(s, n) { return String(s || "").trim().slice(0, n); }
function h(s) { return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
