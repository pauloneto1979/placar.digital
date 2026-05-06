const provedoresEsportivosRepository = require('./provedores_esportivos.repository');
const { createProvedoresEsportivosService } = require('./provedores_esportivos.service');
const { createSportsDataProviderFactory } = require('./provider-factory');

const provedoresEsportivosService = createProvedoresEsportivosService(provedoresEsportivosRepository);
const sportsDataProviderFactory = createSportsDataProviderFactory(provedoresEsportivosRepository);

module.exports = {
  provedoresEsportivosRepository,
  createProvedoresEsportivosService,
  provedoresEsportivosService,
  createSportsDataProviderFactory,
  sportsDataProviderFactory
};
