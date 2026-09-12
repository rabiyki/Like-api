// Free Fire Profile Search API
// Read-only wrapper around `ffapis` — no like/spam endpoints included on purpose.

const express = require('express');
const { FreeFireAPI } = require('ffapis');

const app = express();
const PORT = process.env.PORT || 3000;

// One shared client. `region` / obVersion can be overridden per-request too.
const api = new FreeFireAPI();

// simple in-memory cache so repeat lookups don't hammer the upstream servers
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60s

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// GET /search?nickname=FannBot
app.get('/search', async (req, res) => {
  const { nickname, obVersion } = req.query;
  if (!nickname) {
    return res.status(400).json({ error: 'query param "nickname" is required' });
  }

  const cacheKey = `search:${nickname}:${obVersion || ''}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ cached: true, results: cached });

  try {
    const results = await api.searchAccount(nickname, obVersion);
    setCached(cacheKey, results);
    res.json({ cached: false, results });
  } catch (err) {
    console.error('[search] error:', err.message);
    res.status(502).json({ error: 'upstream lookup failed', detail: err.message });
  }
});

// GET /profile/:uid
app.get('/profile/:uid', async (req, res) => {
  const { uid } = req.params;
  const { obVersion } = req.query;

  const cacheKey = `profile:${uid}:${obVersion || ''}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ cached: true, profile: cached });

  try {
    const profile = await api.getPlayerProfile(uid, obVersion);
    setCached(cacheKey, profile);
    res.json({ cached: false, profile });
  } catch (err) {
    console.error('[profile] error:', err.message);
    res.status(502).json({ error: 'upstream lookup failed', detail: err.message });
  }
});

// GET /profile/:uid/full  -> profile + stats + items combined
app.get('/profile/:uid/full', async (req, res) => {
  const { uid } = req.params;
  const { obVersion } = req.query;

  try {
    const [profile, brStats, items] = await Promise.all([
      api.getPlayerProfile(uid, obVersion),
      api.getPlayerStats(uid, 'br', 'career', obVersion).catch(() => null),
      api.getPlayerItems(uid, obVersion).catch(() => null)
    ]);

    res.json({ profile, brStats, items });
  } catch (err) {
    console.error('[profile/full] error:', err.message);
    res.status(502).json({ error: 'upstream lookup failed', detail: err.message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Profile search API running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET /search?nickname=<name>');
  console.log('  GET /profile/:uid');
  console.log('  GET /profile/:uid/full');
});
