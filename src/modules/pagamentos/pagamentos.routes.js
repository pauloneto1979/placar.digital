const { createModuleRouter } = require('../../shared/utils/create-module');
const { createPagamentosController } = require('./pagamentos.controller');
const { pagamentosRepository } = require('./pagamentos.repository');
const { createPagamentosService } = require('./pagamentos.service');

const pagamentosService = createPagamentosService(pagamentosRepository);
const pagamentosController = createPagamentosController(pagamentosService);
const pagamentosRoutes = createModuleRouter(pagamentosController);

module.exports = {
  pagamentosRoutes
};
