const { env } = require('../config/env');
const { closeDatabase } = require('../shared/database/client');
const { createApp } = require('./app');

function startServer() {
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`${env.appName} rodando em http://localhost:${env.port}`);
  });

  async function shutdown() {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

module.exports = {
  startServer
};
