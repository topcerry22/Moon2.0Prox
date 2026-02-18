const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from your GitHub Pages site
app.use(cors({
  origin: '*' // You can restrict this to your github pages URL later
}));

// Proxy route: /search?q=your+query
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).send('Missing query parameter: q');

  try {
    const response = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      responseType: 'text'
    });

    // Rewrite relative URLs so links/images load correctly
    let html = response.data;

    // Fix links to open in new tab and point to full DDG URLs
    html = html.replace(/href="\/\/duckduckgo\.com\//g, 'href="https://duckduckgo.com/');
    html = html.replace(/href="\//g, 'href="https://duckduckgo.com/');
    html = html.replace(/src="\//g, 'src="https://duckduckgo.com/');
    html = html.replace(/action="\//g, 'action="https://duckduckgo.com/');

    // Inject base styles to make it fit dark iframe nicely
    const styleInject = `
      <style>
        body { background: #0d1120 !important; color: #e8eeff !important; font-family: monospace !important; }
        a { color: #4f8aff !important; }
        a:visited { color: #a78bfa !important; }
        .result__snippet { color: #a0aec0 !important; }
        .result { border-bottom: 1px solid #1e2a45 !important; padding: 12px 0 !important; }
        .result__title { font-size: 1rem !important; }
        .result__url { color: #5a6a8a !important; font-size: 0.75rem !important; }
        input, button { background: #111627 !important; color: #e8eeff !important; border: 1px solid #1e2a45 !important; border-radius: 4px !important; }
        #links_wrapper, #links { max-width: 100% !important; }
        .nav-link, .nav__item { color: #4f8aff !important; }
        .badge--ad, .result--ad { display: none !important; }
      </style>
      <base target="_blank">
    `;
    html = html.replace('</head>', styleInject + '</head>');

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).send(`
      <html>
        <body style="background:#0d1120;color:#e8eeff;font-family:monospace;padding:2rem;text-align:center;">
          <p style="color:#5a6a8a;font-size:0.8rem;letter-spacing:0.1em;">SEARCH ERROR — PLEASE TRY AGAIN</p>
        </body>
      </html>
    `);
  }
});

// Health check
app.get('/', (req, res) => res.send('Moon proxy is running.'));

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
