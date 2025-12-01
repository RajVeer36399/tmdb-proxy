⚡ TMDb Proxy Cache Server

A lightweight Node.js + Express caching proxy that mirrors TMDb responses and serves them instantly from JSON files.
Used for Movie Matrix, avoids TMDb rate limits, improves speed, and makes the frontend deployment 100% stable.

🚀 Features

🔥 Instant cached responses

💾 10,000+ movies stored in /cache

🚫 No TMDb limits (all served locally)

🛡️ CORS enabled

🛠️ Health check endpoint (/ping)

🌐 Works perfectly with Netlify/Render deployments

📦 Installation
npm install

▶️ Start Server
node server.js


Default port: 3000

📁 Folder Structure
tmdb-proxy/
 ├── cache/               # JSON data for all movies
 ├── server.js            # Express app
 ├── .env                 # TMDb API key (never commit)
 └── package.json

⚙️ Environment Variables

Create .env:

TMDB_API_KEY=your_key_here

🔍 Endpoints
Health Check
GET /ping

Cached Files
GET /cache/popular_page_1.json
GET /cache/movie_12345.json

🚀 Deployment

Deploy to Render (Free Instance)

Start command:

node server.js


Add /ping as health check endpoint

Add TMDB_API_KEY in Render's Dashboard

📄 License

MIT License.
