const { createProxyMiddleware } = require('http-proxy-middleware');

// Simple console logger for proxy errors (no external dependencies needed)
const logger = {
  error: (message, data) =>
    console.error(`[PROXY ERROR] ${message}`, data || ''),
  info: (message, data) => console.log(`[PROXY INFO] ${message}`, data || ''),
  warn: (message, data) => console.warn(`[PROXY WARN] ${message}`, data || ''),
};

module.exports = function (app) {
  const proxyOptions = {
    target: 'http://localhost:80',
    changeOrigin: true,
    timeout: 10000,
    proxyTimeout: 10000,
    secure: false,
    headers: {
      Connection: 'keep-alive',
    },
    onError: function (err, req, res) {
      logger.error('Proxy error:', err.message);
      res.writeHead(500, {
        'Content-Type': 'text/plain',
      });
      res.end('Proxy error: ' + err.message);
    },
    onProxyReq: function (proxyReq, req, res) {
      logger.info('Proxying request:', req.method, req.url);
      // Asegurar que las cookies se pasen correctamente
      if (req.headers.cookie) {
        proxyReq.setHeader('Cookie', req.headers.cookie);
      }
      // Pasar headers de CSRF
      if (req.headers['x-csrftoken']) {
        proxyReq.setHeader('X-CSRFToken', req.headers['x-csrftoken']);
      }
    },
    onProxyRes: function (proxyRes, req, res) {
      // Asegurar que las cookies se pasen de vuelta
      if (proxyRes.headers['set-cookie']) {
        res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
      }
    },
  };

  // Proxy para API requests
  app.use(
    '/api',
    createProxyMiddleware({
      ...proxyOptions,
      logLevel: 'debug',
    }),
  );

  // Proxy para admin
  app.use(
    '/admin',
    createProxyMiddleware({
      ...proxyOptions,
      logLevel: 'debug',
    }),
  );

  // Proxy para archivos de media
  app.use(
    '/media',
    createProxyMiddleware({
      ...proxyOptions,
      logLevel: 'debug',
    }),
  );

  // Proxy para archivos estáticos de Django
  app.use(
    '/django-static',
    createProxyMiddleware({
      ...proxyOptions,
      logLevel: 'debug',
    }),
  );

  // WebSocket proxy para desarrollo (si se necesita)
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'ws://localhost:80',
      ws: true,
      changeOrigin: true,
      logLevel: 'debug',
    }),
  );
};
