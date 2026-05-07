const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');
const { routes } = require('./routes');
const { errorMiddleware } = require('../shared/errors/error.middleware');
const { notFoundMiddleware } = require('../shared/errors/not-found.middleware');
const { requestContextMiddleware } = require('../shared/middlewares/request-context.middleware');
const { sanitizeMiddleware } = require('../shared/middlewares/sanitize.middleware');

function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set('trust proxy', env.trustProxy);
  }

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
  }));
  app.use(compression());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || !env.corsOrigins.length || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem CORS nao autorizada.'));
    },
    credentials: true
  }));
  const apiLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(express.json({ limit: env.jsonBodyLimit }));
  app.use(sanitizeMiddleware);
  app.use('/app', express.static(path.resolve(__dirname, '../../public'), {
    maxAge: env.nodeEnv === 'production' ? '1h' : 0,
    etag: true,
    immutable: false
  }));
  app.use(requestContextMiddleware);

  app.get('/', (req, res) => {
    res.json({
      app: env.appName,
      status: 'online',
      api: env.apiPrefix
    });
  });

  app.use(env.apiPrefix, apiLimiter, routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

module.exports = {
  createApp
};
