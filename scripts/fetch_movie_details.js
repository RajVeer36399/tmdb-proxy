// tmdb-proxy/scripts/fetch_movie_details.js
//
// Reads all popular_page_*.json in tmdb-proxy/cache, collects movie IDs,
// and fetches full TMDb details (+credits) for each ID.
// Saves to cache/movie_<id>.json
//
// Usage (from tmdb-proxy folder, VPN ON):
//   node scripts/fetch_movie_details.js
//
// Requirements:
//   - TMDB_API_KEY in tmdb-proxy/.env  (TMDB_API_KEY=your_key)
//   - popular_page_*.json already cached (your popular pages script)

const fs = require("fs");
const path = require("path");
require("dotenv").config();

const fetchFn = global.fetch || require("node-fetch");

const TMDB_KEY = process.env.TMDB_API_KEY || "";
if (!TMDB_KEY) {
  console.error("ERROR: TMDB_API_KEY not set. Put it in tmdb-proxy/.env");
  process.exit(1);
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const CACHE_DIR = path.join(__dirname, "..", "cache");

const DELAY_MS = Number(process.env.DETAIL_DELAY_MS || 250);
const RETRIES = Number(process.env.DETAIL_RETRIES || 3);

if (!fs.existsSync(CACHE_DIR)) {
  console.error("ERROR: cache directory does not exist:", CACHE_DIR);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPopularFiles() {
  const files = fs
    .readdirSync(CACHE_DIR)
    .filter((name) => /^popular_page_\d+\.json$/.test(name));

  const ids = new Set();

  for (const file of files) {
    const full = path.join(CACHE_DIR, file);
    try {
      const json = JSON.parse(fs.readFileSync(full, "utf8"));
      const results = Array.isArray(json.results) ? json.results : [];
      for (const m of results) {
        if (m && typeof m.id === "number") {
          ids.add(m.id);
        }
      }
    } catch (err) {
      console.warn("Failed to parse", file, ":", err.message);
    }
  }

  return Array.from(ids);
}

async function fetchDetails(id) {
  // append_to_response=credits gives us cast & crew. No videos/trailers.
  const url = `${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&language=en-US&append_to_response=credits`;
  const resp = await fetchFn(url);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const err = new Error(`HTTP ${resp.status} ${resp.statusText}: ${text}`);
    err.status = resp.status;
    throw err;
  }
  return await resp.json();
}

async function saveDetails(id, data) {
  const file = path.join(CACHE_DIR, `movie_${id}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  return file;
}

(async () => {
  try {
    const ids = readPopularFiles();
    console.log(`Found ${ids.length} unique movie IDs from popular_page_*.json`);

    let done = 0;
    for (const id of ids) {
      const outFile = path.join(CACHE_DIR, `movie_${id}.json`);
      if (fs.existsSync(outFile)) {
        done++;
        console.log(`[${done}/${ids.length}] movie_${id}.json exists, skipping`);
        continue;
      }

      let attempt = 0;
      let success = false;

      while (attempt < RETRIES && !success) {
        attempt++;
        try {
          console.log(`[${done + 1}/${ids.length}] Fetching details for ID ${id} (attempt ${attempt})...`);
          const data = await fetchDetails(id);
          await saveDetails(id, data);
          console.log(`Saved: ${outFile}`);
          success = true;
        } catch (err) {
          console.warn(`Failed ID ${id} attempt ${attempt}: ${err.message}`);
          if (attempt < RETRIES) {
            console.log(`Retrying after ${DELAY_MS}ms...`);
            await sleep(DELAY_MS);
          }
        }
      }

      done++;
      await sleep(DELAY_MS);
    }

    console.log("✅ Done fetching movie details. Check cache/movie_<id>.json files.");
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();
