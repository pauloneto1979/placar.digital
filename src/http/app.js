const express = require('express');
const path = require('path');
const { env } = require('../config/env');
const { routes } = require('./routes');
const { errorMiddleware } = require('../shared/errors/error.middleware');
const { notFoundMiddleware } = require('../shared/errors/not-found.middleware');
const { requestContextMiddleware } = require('../shared/middlewares/request-context.middleware');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/app', express.static(path.resolve(__dirname, '../../public')));
  app.use(requestContextMiddleware);

  app.get('/', (req, res) => {
    res.json({
      app: env.appName,
      status: 'online',
      api: env.apiPrefix
    });
  });

  app.use(env.apiPrefix, routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

module.exports = {
  createApp
};
