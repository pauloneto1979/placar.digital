const { createModuleRouter } = require('../../shared/utils/create-module');
const { createBoloesController } = require('./boloes.controller');
const { boloesRepository } = require('./boloes.repository');
const { createBoloesService } = require('./boloes.service');

const boloesService = createBoloesService(boloesRepository);
const boloesController = createBoloesController(boloesService);
const boloesRoutes = createModuleRouter(boloesController);

module.exports = {
  boloesRoutes
};
