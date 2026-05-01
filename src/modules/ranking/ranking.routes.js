const { createModuleRouter } = require('../../shared/utils/create-module');
const { createRankingController } = require('./ranking.controller');
const { rankingRepository } = require('./ranking.repository');
const { createRankingService } = require('./ranking.service');

const rankingService = createRankingService(rankingRepository);
const rankingController = createRankingController(rankingService);
const rankingRoutes = createModuleRouter(rankingController);

module.exports = {
  rankingRoutes
};
