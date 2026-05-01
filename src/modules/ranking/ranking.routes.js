const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createRankingController } = require('./ranking.controller');
const rankingRepository = require('./ranking.repository');
const { createRankingService } = require('./ranking.service');

const rankingRoutes = Router();
const controller = createRankingController(createRankingService(rankingRepository));

rankingRoutes.use(authMiddleware);
rankingRoutes.get('/', controller.status);
rankingRoutes.get('/boloes/:bolaoId/provisorio', controller.provisorio);
rankingRoutes.post('/boloes/:bolaoId/recalcular', controller.recalcularBolao);
rankingRoutes.post('/boloes/:bolaoId/partidas/:partidaId/recalcular', controller.recalcularPartida);

module.exports = {
  rankingRoutes
};
