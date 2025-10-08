HLS Proxy Ready for Render
=========================

Files:
  - server.js        : Node Express proxy (at project root)
  - package.json     : includes start script "node server.js"

Instructions:
  1. Create a new GitHub repo and push these files to the repo root.
  2. In Render, create a new Web Service and connect to the GitHub repo.
  3. Use Start Command: npm start (or leave blank).
  4. Set environment variables if needed:
     SPOOF_USER_AGENT, SPOOF_REFERER, SPOOF_COOKIE
  5. Deploy and test:
     - GET / => should return "HLS proxy running"
     - /playlist?url=<m3u8>  -> returns rewritten m3u8
     - /seg?u=<encoded>     -> streams segments

Note: This repo puts server.js at the repo root to avoid Render path issues.
