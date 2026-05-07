const provedoresEsportivosRepository = require('./provedores_esportivos.repository');
const { createProvedoresEsportivosService } = require('./provedores_esportivos.service');
const { createSportsDataProviderFactory } = require('./provider-factory');
const { createFootballDataSyncService } = require('./football-data-sync.service');
const { createFootballDataClientService } = require('./football-data-client.service');
const { startSportsDataSyncJob } = require('./sports-data-sync.job');
const { provedoresEsportivosRoutes } = require('./provedores_esportivos.routes');

const provedoresEsportivosService = createProvedoresEsportivosService(provedoresEsportivosRepository);
const sportsDataProviderFactory = createSportsDataProviderFactory(provedoresEsportivosRepository);
const footballDataSyncService = createFootballDataSyncService(sportsDataProviderFactory);

module.exports = {
  provedoresEsportivosRepository,
  createProvedoresEsportivosService,
  provedoresEsportivosService,
  createSportsDataProviderFactory,
  sportsDataProviderFactory,
  createFootballDataSyncService,
  footballDataSyncService,
  startSportsDataSyncJob,
  createFootballDataClientService,
  provedoresEsportivosRoutes
};
