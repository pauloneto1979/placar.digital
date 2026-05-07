const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createPartidasController } = require('./partidas.controller');
const partidasRepository = require('./partidas.repository');
const { createPartidasService } = require('./partidas.service');
const provedoresEsportivosRepository = require('../provedores_esportivos/provedores_esportivos.repository');
const { createSportsDataProviderFactory } = require('../provedores_esportivos/provider-factory');
const { createFootballDataClientService } = require('../provedores_esportivos/football-data-client.service');
const partidasRoutes = Router();
const footballDataFactory = createSportsDataProviderFactory(provedoresEsportivosRepository);
const controller = createPartidasController(createPartidasService(partidasRepository, {
  footballDataClientService: createFootballDataClientService(footballDataFactory, provedoresEsportivosRepository)
}));
partidasRoutes.use(authMiddleware);
partidasRoutes.get('/', controller.status);
partidasRoutes.post('/importar-externas', controller.importarPartidasExternas);
partidasRoutes.patch('/:id/vinculo-externo', controller.vincularPartidaExterna);
partidasRoutes.delete('/:id/vinculo-externo', controller.removerVinculoExterno);
partidasRoutes.get('/boloes/:bolaoId', controller.list);
partidasRoutes.post('/boloes/:bolaoId', controller.create);
partidasRoutes.put('/boloes/:bolaoId/:id', controller.update);
partidasRoutes.post('/boloes/:bolaoId/:id/resultado', controller.informarResultado);
module.exports = { partidasRoutes };
