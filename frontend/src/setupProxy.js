const { createProxyMiddleware } = require('http-proxy-middleware');

// Logger mejorado para proxy con niveles
const logger = {
  error: (message, data) =>
    console.error(`🔴 [PROXY ERROR] ${message}`, data || ''),
  info: (message, data) =>
    console.log(`🔵 [PROXY INFO] ${message}`, data || ''),
  warn: (message, data) =>
    console.warn(`🟡 [PROXY WARN] ${message}`, data || ''),
  success: (message, data) =>
    console.log(`🟢 [PROXY SUCCESS] ${message}`, data || ''),
};

// Configuración centralizada del proxy
const PROXY_CONFIG = {
  // Target: Docker nginx en puerto 80, fallback a backend directo
  target: process.env.REACT_APP_PROXY_TARGET || 'http://localhost:80',
  backup_target: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000', // Fallback directo al backend parametrizado

  // Timeouts aumentados para estabilidad
  timeout: 30000, // 30 segundos
  proxyTimeout: 30000,

  // Configuración de conexión
  changeOrigin: true,
  secure: false,
  followRedirects: true,

  // Headers para mantener contexto
  headers: {
    Connection: 'keep-alive',
    'X-Forwarded-Proto': 'http',
    'X-Forwarded-Host': 'localhost',
  },

  // Configuración de buffer para requests grandes
  buffer: {
    from: '5mb',
    to: '10mb',
  },
};

module.exports = function (app) {
  // Función helper para crear opciones de proxy
  const createProxyOptions = (pathRewrite = {}, additionalOptions = {}) => ({
    target: PROXY_CONFIG.target,
    changeOrigin: PROXY_CONFIG.changeOrigin,
    timeout: PROXY_CONFIG.timeout,
    proxyTimeout: PROXY_CONFIG.proxyTimeout,
    secure: PROXY_CONFIG.secure,
    followRedirects: PROXY_CONFIG.followRedirects,
    headers: PROXY_CONFIG.headers,
    pathRewrite,
    ...additionalOptions,

    // Handler de errores mejorado con retry
    onError: function (err, req, res) {
      logger.error(
        `Error en proxy para ${req.method} ${req.url}:`,
        err.message,
      );

      // Intentar con backup target si falla el principal
      if (err.code === 'ECONNREFUSED' && !req._proxyRetried) {
        logger.warn('Intentando con target de respaldo...');
        req._proxyRetried = true;

        // Recrear proxy con target de respaldo
        const backupProxy = createProxyMiddleware({
          target: PROXY_CONFIG.backup_target,
          changeOrigin: true,
          timeout: 10000,
          onError: function (backupErr, backupReq, backupRes) {
            logger.error(
              'Error también en target de respaldo:',
              backupErr.message,
            );
            backupRes.writeHead(503, { 'Content-Type': 'application/json' });
            backupRes.end(
              JSON.stringify({
                success: false,
                error: 'Servicio no disponible',
                message:
                  'El backend no está disponible. Por favor, inténtelo más tarde.',
                timestamp: new Date().toISOString(),
              }),
            );
          },
        });

        return backupProxy(req, res);
      }

      // Error final
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          error: 'Error de proxy',
          message: 'No se pudo conectar con el servidor backend.',
          details:
            process.env.NODE_ENV === 'development' ? err.message : undefined,
          timestamp: new Date().toISOString(),
        }),
      );
    },

    // Log de requests
    onProxyReq: function (proxyReq, req, res) {
      const requestInfo = `${req.method} ${req.url}`;
      logger.info(`Enviando request: ${requestInfo}`);

      // Asegurar headers importantes
      if (req.headers.cookie) {
        proxyReq.setHeader('Cookie', req.headers.cookie);
      }
      if (req.headers['x-csrftoken']) {
        proxyReq.setHeader('X-CSRFToken', req.headers['x-csrftoken']);
      }
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }

      // Agregar header de identificación
      proxyReq.setHeader('X-Proxy-Source', 'react-dev-server');
      proxyReq.setHeader(
        'X-Request-ID',
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      );
    },

    // Log de responses
    onProxyRes: function (proxyRes, req, res) {
      const status = proxyRes.statusCode;
      const method = req.method;
      const url = req.url;

      if (status >= 400) {
        logger.error(`Response error: ${method} ${url} - ${status}`);
      } else {
        logger.success(`Response ok: ${method} ${url} - ${status}`);
      }

      // Asegurar que las cookies se pasen de vuelta
      if (proxyRes.headers['set-cookie']) {
        res.setHeader('Set-Cookie', proxyRes.headers['set-cookie']);
      }

      // Headers de CORS para desarrollo
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    },

    // Configuración de logging
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    logProvider: () => logger,
  });

  // ===================================
  // CONFIGURACIÓN DE PROXIES ESPECÍFICOS
  // ===================================

  // 1. Proxy para API requests (más importante)
  app.use('/api', createProxyMiddleware(createProxyOptions()));

  // 2. Proxy para admin de Django
  app.use('/admin', createProxyMiddleware(createProxyOptions()));

  // 3. Proxy para health checks
  app.use('/health', createProxyMiddleware(createProxyOptions()));

  // 4. Proxy para archivos estáticos de Django
  app.use('/django-static', createProxyMiddleware(createProxyOptions()));

  // 5. Proxy para archivos de media
  app.use('/media', createProxyMiddleware(createProxyOptions()));

  // 6. WebSocket proxy para desarrollo (si se necesita)
  app.use(
    '/ws',
    createProxyMiddleware({
      target: PROXY_CONFIG.target.replace('http', 'ws'),
      ws: true,
      changeOrigin: true,
      logLevel: 'debug',
      onError: function (err, req, res) {
        logger.error('WebSocket proxy error:', err.message);
      },
    }),
  );

  // Log inicial de configuración
  logger.info('='.repeat(60));
  logger.info('🚀 PROXY CONFIGURATION INITIALIZED');
  logger.info(`📡 Primary Target: ${PROXY_CONFIG.target}`);
  logger.info(`🔄 Backup Target: ${PROXY_CONFIG.backup_target}`);
  logger.info(`⏱️  Timeout: ${PROXY_CONFIG.timeout}ms`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('='.repeat(60));
};
