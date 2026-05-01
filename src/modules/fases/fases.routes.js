const { createModuleRouter } = require('../../shared/utils/create-module');
const { createFasesController } = require('./fases.controller');
const { fasesRepository } = require('./fases.repository');
const { createFasesService } = require('./fases.service');

const fasesService = createFasesService(fasesRepository);
const fasesController = createFasesController(fasesService);
const fasesRoutes = createModuleRouter(fasesController);

module.exports = {
  fasesRoutes
};
