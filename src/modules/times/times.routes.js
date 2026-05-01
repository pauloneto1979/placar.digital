const { createModuleRouter } = require('../../shared/utils/create-module');
const { createTimesController } = require('./times.controller');
const { timesRepository } = require('./times.repository');
const { createTimesService } = require('./times.service');

const timesService = createTimesService(timesRepository);
const timesController = createTimesController(timesService);
const timesRoutes = createModuleRouter(timesController);

module.exports = {
  timesRoutes
};
