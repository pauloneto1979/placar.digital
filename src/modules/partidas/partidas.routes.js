const { createModuleRouter } = require('../../shared/utils/create-module');
const { createPartidasController } = require('./partidas.controller');
const { partidasRepository } = require('./partidas.repository');
const { createPartidasService } = require('./partidas.service');

const partidasService = createPartidasService(partidasRepository);
const partidasController = createPartidasController(partidasService);
const partidasRoutes = createModuleRouter(partidasController);

module.exports = {
  partidasRoutes
};
