// tmdb-proxy/scripts/fetch_all_popular.js
//
// Fetch the whole TMDb "popular" collection (up to TMDb cap).
// Saves pages into tmdb-proxy/cache/popular_page_<n>.json
//
// Usage (from tmdb-proxy folder):
//   VPN: ON (must have network access to api.themoviedb.org)
//   node scripts/fetch_all_popular.js
//
// Optional environment variables:
//   TMDB_API_KEY  - your API key (or put in tmdb-proxy/.env)
//   START_PAGE    - default 1
//   END_PAGE      - override upper bound (will still be capped at TMDb's total and 500)
//   DELAY_MS      - milliseconds delay between requests (default 250)
//   RETRIES       - tries per page (default 3)

const fs = require("fs");
const path = require("path");
require("dotenv").config();

const fetchFn = global.fetch || require("node-fetch");

const TMDB_KEY = process.env.TMDB_API_KEY || "";
if (!TMDB_KEY) {
  console.error("ERROR: TMDB_API_KEY not set. Put it in tmdb-proxy/.env or export it in your shell.");
  process.exit(1);
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const CACHE_DIR = path.join(__dirname, "..", "cache");

const START_PAGE = Number(process.env.START_PAGE || 1);
let END_PAGE_OVERRIDE = process.env.END_PAGE ? Number(process.env.END_PAGE) : null;
const DELAY_MS = Number(process.env.DELAY_MS || 250);
const RETRIES = Number(process.env.RETRIES || 3);

// ensure cache dir exists
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const resp = await fetchFn(url);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const err = new Error(`HTTP ${resp.status} ${resp.statusText} : ${text}`);
    err.status = resp.status;
    throw err;
  }
  return await resp.json();
}

async function fetchPage(page) {
  const url = `${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=${page}`;
  return await fetchJson(url);
}

async function savePage(page, data) {
  const file = path.join(CACHE_DIR, `popular_page_${page}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  return file;
}

(async () => {
  try {
    console.log("Fetching page 1 to learn total_pages...");
    const p1 = await fetchPage(1);
    const tmdbTotalPages = Number(p1.total_pages) || 1;
    const cap = Math.min(tmdbTotalPages, 500); // TMDb cap ~500 pages
    const endPage = END_PAGE_OVERRIDE ? Math.min(END_PAGE_OVERRIDE, cap) : cap;

    console.log(`TMDb reports total_pages = ${tmdbTotalPages}, capping at ${cap}.`);
    console.log(`Will fetch pages ${START_PAGE} → ${endPage}.`);

    // Save page 1 right away (if not present)
    const file1 = path.join(CACHE_DIR, `popular_page_1.json`);
    if (!fs.existsSync(file1)) {
      await savePage(1, p1);
      console.log(`Saved page 1 -> ${file1}`);
    } else {
      console.log(`Page 1 already exists, skipping write.`);
    }

    // loop pages 2..endPage
    for (let page = Math.max(START_PAGE, 2); page <= endPage; page++) {
      const outFile = path.join(CACHE_DIR, `popular_page_${page}.json`);
      if (fs.existsSync(outFile)) {
        console.log(`page ${page} already cached, skipping.`);
        continue;
      }

      let attempt = 0;
      let ok = false;
      while (attempt < RETRIES && !ok) {
        attempt++;
        try {
          console.log(`Fetching page ${page} (attempt ${attempt})...`);
          const data = await fetchPage(page);
          await savePage(page, data);
          console.log(`Saved: ${outFile} (results: ${data.results?.length || 0})`);
          ok = true;
        } catch (err) {
          console.warn(`Failed page ${page} on attempt ${attempt}: ${err.message}`);
          if (attempt < RETRIES) {
            console.log(`Retrying after ${DELAY_MS}ms...`);
            await sleep(DELAY_MS);
          } else {
            console.error(`Giving up on page ${page} after ${RETRIES} attempts.`);
            // Fail the whole script so you see what happened, or optionally continue.
            // We'll continue to next page to maximize cached pages — comment next line to stop.
            // process.exit(1);
          }
        }
      }

      // small delay between pages
      await sleep(DELAY_MS);
    }

    console.log("All done (or attempted). Check the cache directory for saved files.");
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();
