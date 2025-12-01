// tmdb-proxy/scripts/fetch_popular_pages.js
// Fetch multiple pages of TMDb "popular" movies and save into
// tmdb-proxy/cache/popular_page_<n>.json
//
// Usage (from tmdb-proxy folder):
//   node scripts/fetch_popular_pages.js
//
// Make sure:
//  - VPN is ON (TMDb must be reachable from your region).
//  - TMDB_API_KEY is set in .env or environment.

const fs = require("fs");
const path = require("path");
require("dotenv").config(); // reads .env in tmdb-proxy

// Use node-fetch for Node < 18; otherwise global fetch.
let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = require("node-fetch");
}

const TMDB_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY";
const TMDB_BASE = "https://api.themoviedb.org/3";

// 🔴 Change this if you ever want more pages:
const START_PAGE = 1;
const END_PAGE = 40;

const CACHE_DIR = path.join(__dirname, "..", "cache");

if (!TMDB_KEY || TMDB_KEY === "YOUR_TMDB_API_KEY") {
  console.error("ERROR: TMDB_API_KEY is not set. Check tmdb-proxy/.env");
  process.exit(1);
}

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function fetchPage(page) {
  const url = `${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=${page}`;
  console.log(`Fetching TMDb popular page ${page}...`);
  const resp = await fetchFn(url);

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `TMDb error for page ${page}: ${resp.status} ${resp.statusText}\n${text}`
    );
  }

  const data = await resp.json();
  const file = path.join(CACHE_DIR, `popular_page_${page}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  console.log(`Saved: ${file} (results: ${data.results?.length || 0})`);
}

(async () => {
  try {
    for (let p = START_PAGE; p <= END_PAGE; p++) {
      await fetchPage(p);
    }
    console.log(
      `✅ Done. Popular pages ${START_PAGE}–${END_PAGE} saved to cache/`
    );
  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }
})();
