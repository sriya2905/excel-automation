const { createProxyMiddleware } = require('http-proxy-middleware');

/** Forward API calls from CRA dev server (port 3000) to FastAPI on 8000 */
module.exports = function setupProxy(app) {
  app.use(
    ['/login', '/api'],
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    }),
  );
};
