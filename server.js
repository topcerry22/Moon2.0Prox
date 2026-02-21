const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const SELF = 'https://moon20prox-production.up.railway.app'; // change if needed

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
   DUCKDUCKGO API SEARCH
   =============================== */
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query)
    return res.status(400).json({ error: 'Missing query parameter: q' });

  try {
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        skip_disambig: 1,
      },
      timeout: 10000,
    });

    const data = response.data;
    const results = [];

    // Main instant answer
    if (data.AbstractText) {
      results.push({
        type: 'instant_answer',
        title: data.Heading,
        snippet: data.AbstractText,
        url: data.AbstractURL || null,
      });
    }

    // Related topics
    if (Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.forEach((item) => {
        if (item.Text && item.FirstURL) {
          results.push({
            type: 'related',
            title: item.Text.split(' - ')[0],
            snippet: item.Text,
            url: item.FirstURL,
          });
        }

        // Handle nested topics
        if (item.Topics) {
          item.Topics.forEach((sub) => {
            if (sub.Text && sub.FirstURL) {
              results.push({
                type: 'related',
                title: sub.Text.split(' - ')[0],
                snippet: sub.Text,
                url: sub.FirstURL,
              });
            }
          });
        }
      });
    }

    res.json({
      query,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error('Search API error:', err.message);
    res.status(500).json({ error: 'Search failed' });
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
