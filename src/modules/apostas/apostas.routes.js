const { createModuleRouter } = require('../../shared/utils/create-module');
const { createApostasController } = require('./apostas.controller');
const { apostasRepository } = require('./apostas.repository');
const { createApostasService } = require('./apostas.service');

const apostasService = createApostasService(apostasRepository);
const apostasController = createApostasController(apostasService);
const apostasRoutes = createModuleRouter(apostasController);

module.exports = {
  apostasRoutes
};
