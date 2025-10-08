// src/server.js
const express = require('express');
const fetch = require('node-fetch'); // v2
const cors = require('cors');
const { URL } = require('url');

const app = express();
app.use(cors({ origin: '*' }));

const PORT = process.env.PORT || 8080;

// Header spoofing options via env
const SPOOF_USER_AGENT = process.env.SPOOF_USER_AGENT || '';
const SPOOF_REFERER = process.env.SPOOF_REFERER || '';
const SPOOF_COOKIE = process.env.SPOOF_COOKIE || '';

function buildSpoofHeaders(additional = {}) {
  const h = { ...additional };
  if (SPOOF_USER_AGENT) h['User-Agent'] = SPOOF_USER_AGENT;
  if (SPOOF_REFERER) h['Referer'] = SPOOF_REFERER;
  if (SPOOF_COOKIE) h['Cookie'] = SPOOF_COOKIE;
  return h;
}

// helper: stream upstream response to client (supports Range)
async function streamFetch(req, res, targetUrl, extraHeaders = {}) {
  try {
    // forward Range header if present
    if (req.headers.range) extraHeaders.Range = req.headers.range;

    const upstream = await fetch(targetUrl, { method: 'GET', headers: extraHeaders });
    if (!upstream) return res.status(502).send('Bad upstream');

    // Forward status (200 or 206), content-type, and cache-control if present
    const status = upstream.status;
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const cache = upstream.headers.get('cache-control');
    res.status(status);
    res.setHeader('Content-Type', contentType);
    if (cache) res.setHeader('Cache-Control', cache);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // pipe body
    const body = upstream.body;
    if (!body) return res.end();
    body.pipe(res);
  } catch (err) {
    console.error('streamFetch error', err);
    if (!res.headersSent) res.status(502).json({ error: String(err) });
    else res.end();
  }
}

// /playlist?url=<m3u8-url>  -> fetch playlist, rewrite absolute/relative segment urls to /seg?u=<encoded>
app.get('/playlist', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing ?url=');

  try {
    // Try plain fetch first
    let upstream = await fetch(target, { redirect: 'follow' });

    // If blocked or non-ok, retry with spoof headers
    if (!upstream.ok) {
      const spoof = buildSpoofHeaders();
      upstream = await fetch(target, { headers: spoof, redirect: 'follow' });
    }

    if (!upstream.ok) {
      const body = await upstream.text().catch(()=>'');
      console.warn('Upstream playlist failed', upstream.status, body.slice(0,200));
      return res.status(502).json({ message: 'Upstream playlist fetch failed', status: upstream.status, preview: body.slice(0,500) });
    }

    const text = await upstream.text();
    // rewrite segment URLs
    const lines = text.split(/\r?\n/);
    const rewritten = lines.map(line => {
      if (!line || line.startsWith('#')) return line;
      try {
        const resolved = new URL(line, target).toString();
        return `${req.protocol}://${req.get('host')}/seg?u=${encodeURIComponent(resolved)}`;
      } catch (e) {
        return line;
      }
    }).join('\n');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(rewritten);
  } catch (err) {
    console.error('playlist error', err);
    res.status(502).json({ error: String(err) });
  }
});

// /seg?u=<encodedSegmentUrl> -> proxy the segment (supports Range headers)
app.get('/seg', async (req, res) => {
  const enc = req.query.u;
  if (!enc) return res.status(400).send('Missing u=');
  const target = decodeURIComponent(enc);

  // Build spoof headers for segments if necessary
  const headers = buildSpoofHeaders();

  await streamFetch(req, res, target, headers);
});

// root
app.get('/', (req, res) => {
  res.send('HLS Proxy running');
});

// start
app.listen(PORT, () => {
  console.log(`HLS proxy listening on ${PORT}`);
});
