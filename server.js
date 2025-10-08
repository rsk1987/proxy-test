const express = require('express');
const fetch = require('node-fetch'); // v2
const cors = require('cors');
const { URL } = require('url');
const app = express();
app.use(cors({ origin: '*' }));
const PORT = process.env.PORT || 8080;

// simple HLS proxy: /playlist?url= and /seg?u=
function buildSpoofHeaders() {
  const h = {};
  if (process.env.SPOOF_USER_AGENT) h['User-Agent'] = process.env.SPOOF_USER_AGENT;
  if (process.env.SPOOF_REFERER) h['Referer'] = process.env.SPOOF_REFERER;
  if (process.env.SPOOF_COOKIE) h['Cookie'] = process.env.SPOOF_COOKIE;
  return h;
}

async function streamFetch(req, res, targetUrl, extraHeaders = {}) {
  try {
    if (req.headers.range) extraHeaders.Range = req.headers.range;
    const upstream = await fetch(targetUrl, { method: 'GET', headers: extraHeaders });
    if (!upstream) return res.status(502).send('Bad upstream');
    const status = upstream.status;
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const cache = upstream.headers.get('cache-control');
    res.status(status);
    res.setHeader('Content-Type', contentType);
    if (cache) res.setHeader('Cache-Control', cache);
    res.setHeader('Access-Control-Allow-Origin', '*');
    const body = upstream.body;
    if (!body) return res.end();
    body.pipe(res);
  } catch (err) {
    console.error('streamFetch error', err);
    if (!res.headersSent) res.status(502).json({ error: String(err) });
    else res.end();
  }
}

app.get('/playlist', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing ?url=');
  try {
    let upstream = await fetch(target, { redirect: 'follow' });
    if (!upstream.ok) {
      const spoof = buildSpoofHeaders();
      upstream = await fetch(target, { headers: spoof, redirect: 'follow' });
    }
    if (!upstream.ok) {
      const body = await upstream.text().catch(()=>''); 
      return res.status(502).json({ message: 'Upstream playlist fetch failed', status: upstream.status, preview: body.slice(0,500) });
    }
    const text = await upstream.text();
    const lines = text.split(/\r?\n/);
    const rewritten = lines.map(line => {
      if (!line || line.startsWith('#')) return line;
      try { const resolved = new URL(line, target).toString(); return `${req.protocol}://${req.get('host')}/seg?u=${encodeURIComponent(resolved)}`; }
      catch (e) { return line; }
    }).join('\n');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(rewritten);
  } catch (err) {
    console.error('playlist error', err);
    res.status(502).json({ error: String(err) });
  }
});

app.get('/seg', async (req, res) => {
  const enc = req.query.u;
  if (!enc) return res.status(400).send('Missing u=');
  const target = decodeURIComponent(enc);
  const headers = buildSpoofHeaders();
  await streamFetch(req, res, target, headers);
});

app.get('/', (req, res) => res.send('HLS proxy running'));
app.listen(PORT, () => console.log(`HLS proxy listening on ${PORT}`));
