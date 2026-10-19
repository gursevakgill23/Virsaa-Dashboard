/**
 * Development-only proxy (used by `npm start`, ignored by `npm run build`).
 *
 * Requests to /backend/* are forwarded to the Django API, which mirrors the
 * Vercel rewrite in production — same origin, so no CORS / mixed-content issues.
 *
 * Set BACKEND_ORIGIN in .env (or .env.development.local), e.g.
 *   BACKEND_ORIGIN=http://virsaa-api.us-east-2.elasticbeanstalk.com
 * No REACT_APP_ prefix — this value never reaches the browser bundle.
 *
 * NOTE: CRA only reads this file at start-up. Restart `npm start` after
 * adding or changing it, or after editing .env.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const target = (process.env.BACKEND_ORIGIN || 'http://localhost:8000').trim().replace(/\/+$/, '');

module.exports = function setupProxy(app) {
  // eslint-disable-next-line no-console
  console.log(`\n[virsaa] Proxying /backend/* → ${target}\n`);

  app.use(
    '/backend',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      // Works with http-proxy-middleware v2 (full path) and v3 (mount path stripped).
      pathRewrite: (path) => path.replace(/^\/backend/, ''),
      onError: (err, req, res) => {
        // eslint-disable-next-line no-console
        console.error(`[virsaa] Proxy error for ${req.method} ${req.originalUrl}: ${err.message}`);
        if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: `Dev proxy could not reach ${target}` }));
      },
    })
  );
};
