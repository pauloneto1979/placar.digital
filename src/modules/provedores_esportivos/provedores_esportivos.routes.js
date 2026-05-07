const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { requirePerfilGlobal } = require('../../shared/middlewares/role.middleware');
const provedoresEsportivosRepository = require('./provedores_esportivos.repository');
const { createProvedoresEsportivosService } = require('./provedores_esportivos.service');
const { createSportsDataProviderFactory } = require('./provider-factory');
const { createFootballDataClientService } = require('./football-data-client.service');
const { createProvedoresEsportivosController } = require('./provedores_esportivos.controller');

const provedoresEsportivosRoutes = Router();
const factory = createSportsDataProviderFactory(provedoresEsportivosRepository);
const controller = createProvedoresEsportivosController(
  createProvedoresEsportivosService(
    provedoresEsportivosRepository,
    createFootballDataClientService(factory, provedoresEsportivosRepository)
  )
);

provedoresEsportivosRoutes.use(authMiddleware);
provedoresEsportivosRoutes.use(requirePerfilGlobal(['proprietario', 'administrador']));

provedoresEsportivosRoutes.get('/', controller.list);
provedoresEsportivosRoutes.get('/football-data/partidas', controller.listFootballDataPartidas);
provedoresEsportivosRoutes.put('/:provider', controller.update);
provedoresEsportivosRoutes.patch('/:provider/status', controller.updateStatus);

module.exports = {
  provedoresEsportivosRoutes
};
