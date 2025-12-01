// tmdb-proxy/server.js
// Minimal server: only serves /cache and a /ping route.

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_DIR = path.join(__dirname, "cache");

console.log(">>> SIMPLE CACHE SERVER STARTING <<<");
console.log("CACHE_DIR =", CACHE_DIR);

// CORS (optional but safe)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Log each request so we can see activity
app.use((req, res, next) => {
  console.log(`[cache-server] ${req.method} ${req.url}`);
  next();
});

// Simple health check
app.get("/ping", (req, res) => {
  res.send("ok");
});

// Static cache folder (this is the important part)
app.use("/cache", express.static(CACHE_DIR));

app.listen(PORT, () => {
  console.log(`Simple cache server running on http://localhost:${PORT}`);
});
