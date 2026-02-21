const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Public SearXNG instance — swap this out if it goes down
// Other reliable options:
//   https://searx.be
//   https://searxng.site
//   https://search.mdosch.de
const SEARXNG_INSTANCE = 'https://searx.be';

app.use(cors({ origin: '*' }));
app.use(express.json());

/* ===============================
   IMAGE PROXY
   =============================== */
app.get('/imgproxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });
    res.setHeader(
      'Content-Type',
      response.headers['content-type'] || 'image/jpeg'
    );
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  } catch (err) {
    console.error('Image proxy error:', err.message);
    res.status(500).send('Image fetch failed');
  }
});

/* ===============================
   SEARXNG SEARCH
   =============================== */
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query)
    return res.status(400).json({ error: 'Missing query parameter: q' });

  try {
    const response = await axios.get(`${SEARXNG_INSTANCE}/search`, {
      params: {
        q: query,
        format: 'json',
        engines: 'google,bing,brave,duckduckgo',
        language: 'en',
        safesearch: 0,
      },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    const data = response.data;
    const results = (data.results || []).map((item) => ({
      type: 'web',
      title: item.title || '',
      snippet: item.content || '',
      url: item.url || '',
      engine: item.engine || '',
    }));

    res.json({
      query,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error('Search API error:', err.message);
    res.status(500).json({ error: 'Search failed', detail: err.message });
  }
});

/* ===============================
   HEALTH CHECK
   =============================== */
app.get('/', (req, res) => {
  res.send('Moon API is running.');
});

app.listen(PORT, () =>
  console.log(`Moon API running on port ${PORT}`)
);
