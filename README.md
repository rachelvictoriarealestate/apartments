# Rachel Victoria Apartment Search

A free, login-free apartment search page for clients. Every morning it reads available units and
prices straight from each community's own website, and clients can save apartments and send their
picks to Rachel's inbox.

- **Client page:** https://rachelvictoriarealestate.github.io/apartments/
- **Price data:** `data/listings.json` (updated daily)
- **Communities:** `scrape/communities.mjs`

## How it works

1. **Daily refresh** (`.github/workflows/refresh.yml`): GitHub runs `scrape/run.mjs` every morning.
   It opens each community's floorplan pages in a real browser, pausing between pages, and saves
   units, prices, move-in dates and floorplan images to `data/listings.json`.
2. If a community's website fails or changes, its **previous data is kept** and the page shows
   "Prices from <date>" on those cards, so the page never goes blank.
3. The page is republished to GitHub Pages after each refresh.
4. **Send my picks** posts the client's list to a small Google Apps Script that emails Rachel.

## One-time setup

### 1. Turn on the website (GitHub Pages)
1. In this repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab → **Refresh apartments** → **Run workflow**. The first run takes about 10 minutes.

### 2. Turn on "Send my picks" (Google Apps Script)
1. Go to https://script.google.com and click **New project**. Name it "Apartment picks".
2. Delete what's in the editor and paste everything from `apps-script/Code.gs`. Click **Save**.
3. Click **Deploy → New deployment**. Click the gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, approve the Google permission prompt (it needs to send email as you), and copy the **Web app URL**.
5. Send that URL to Claude (or paste it into `SEND_URL` near the top of the script in `index.html`).

Until step 2 is done, clients can still copy their list or open it in their email app.

## Adding a community
Add a line to `scrape/communities.mjs`. The `reader` is the website type:

| reader | Websites that look like |
|---|---|
| `jonah` | Jonah Digital sites (Alexan Waterloo, 700 River, The Bowie, The Quincy) |
| `rentcafe` | "Powered by RentCafe" sites (Skyline at Barton Creek) |
| `leaseleads` | "Powered by LeaseLeads" sites (415 Colorado) |
| `amli` | amli.com community pages |
| `generic` | anything else: saves the page text to `debug/` so a reader can be written |

## Files
- `index.html` — the client page
- `scrape/` — the refresh program (`run.mjs` drives the browser, `parse.mjs` reads page text)
- `data/listings.json` — today's listings
- `debug/` — the text each website showed on the last run, for fixing readers when a site changes
- `apps-script/Code.gs` — the email script for Send my picks
