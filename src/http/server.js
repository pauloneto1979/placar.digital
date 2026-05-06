const { env } = require('../config/env');
const { closeDatabase } = require('../shared/database/client');
const { createApp } = require('./app');
const { footballDataSyncService, startSportsDataSyncJob } = require('../modules/provedores_esportivos');

function startServer() {
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`${env.appName} rodando em http://localhost:${env.port}`);
  });
  const sportsDataSyncJob = startSportsDataSyncJob(footballDataSyncService);

  async function shutdown() {
    sportsDataSyncJob.stop();
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
