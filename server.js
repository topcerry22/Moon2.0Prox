const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));

// Image proxy route — fetches external images and pipes them through
app.get('/imgproxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    });
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  } catch (err) {
    res.status(500).send('Image fetch failed');
  }
});

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).send('Missing query parameter: q');

  try {
    const response = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://duckduckgo.com/',
      },
      responseType: 'text'
    });

    let html = response.data;

    // Fix protocol-relative URLs (//duckduckgo.com/... and //external-content.duckduckgo.com/...)
    html = html.replace(/src="\/\//g, 'src="https://');
    html = html.replace(/src='\/\//g, "src='https://");

    // Fix root-relative URLs
    html = html.replace(/href="\//g, 'href="https://duckduckgo.com/');
    html = html.replace(/src="\//g, 'src="https://duckduckgo.com/');
    html = html.replace(/action="\//g, 'action="https://duckduckgo.com/');

    // Route all external-content images through our image proxy
    // so they aren't blocked by the browser's mixed-content or CORS rules
    const SELF = 'https://moonprox.onrender.com';
    html = html.replace(
      /src="(https:\/\/external-content\.duckduckgo\.com[^"]+)"/g,
      (match, url) => `src="${SELF}/imgproxy?url=${encodeURIComponent(url)}"`
    );
    html = html.replace(
      /src="(https:\/\/[^"]*duckduckgo\.com\/i\/[^"]+)"/g,
      (match, url) => `src="${SELF}/imgproxy?url=${encodeURIComponent(url)}"`
    );

    const inject = `
      <base target="_blank">
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        html, body {
          width: 100% !important; min-height: 100vh !important;
          margin: 0 !important; padding: 0 !important;
          background: #0d1120 !important; color: #e8eeff !important;
          font-family: 'Segoe UI', Arial, sans-serif !important;
          overflow-x: hidden !important;
        }
        .serp__results, #links, #links_wrapper, .results {
          width: 100% !important; max-width: 100% !important;
          padding: 0 16px !important; margin: 0 auto !important;
        }
        .result {
          background: #111627 !important; border: 1px solid #1e2a45 !important;
          border-radius: 8px !important; padding: 14px 16px !important;
          margin-bottom: 10px !important; width: 100% !important;
        }
        .result:hover { border-color: #4f8aff !important; }
        .result__title a, .result__a {
          color: #4f8aff !important; font-size: 1rem !important;
          text-decoration: none !important; font-weight: 600 !important;
        }
        .result__title a:hover { text-decoration: underline !important; }
        .result__snippet { color: #a0aec0 !important; font-size: 0.85rem !important; margin-top: 4px !important; line-height: 1.5 !important; }
        .result__url, .result__extras { color: #5a6a8a !important; font-size: 0.75rem !important; }
        .result__image, .result img { border-radius: 6px !important; max-width: 120px !important; height: auto !important; }
        #search_form, .search__form { background: #111627 !important; border-bottom: 1px solid #1e2a45 !important; padding: 10px 16px !important; margin-bottom: 12px !important; }
        #search_form input, .search__input { background: #0d1120 !important; border: 1px solid #1e2a45 !important; color: #e8eeff !important; border-radius: 4px !important; padding: 8px 12px !important; width: 100% !important; font-size: 0.9rem !important; }
        .result--ad, .badge--ad, .sponsored-result { display: none !important; }
        .nav-link, .result-link, .result__links a { color: #4f8aff !important; }
        .nav-link--btn { background: #111627 !important; border: 1px solid #1e2a45 !important; color: #e8eeff !important; border-radius: 4px !important; padding: 6px 14px !important; }
        .nav-link--btn:hover { border-color: #4f8aff !important; }
        #footer_home { display: none !important; }
      </style>
    `;

    html = html.replace('</head>', inject + '</head>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).send(`
      <html>
        <body style="background:#0d1120;color:#e8eeff;font-family:monospace;padding:2rem;text-align:center;height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;">
          <div style="font-size:2rem;opacity:0.3;">⚠</div>
          <p style="color:#5a6a8a;font-size:0.8rem;letter-spacing:0.1em;">SEARCH ERROR — PLEASE TRY AGAIN</p>
        </body>
      </html>
    `);
  }
});

app.get('/', (req, res) => res.send('Moon proxy is running.'));
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
