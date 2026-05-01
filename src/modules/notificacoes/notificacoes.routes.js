const { createModuleRouter } = require('../../shared/utils/create-module');
const { createNotificacoesController } = require('./notificacoes.controller');
const { notificacoesRepository } = require('./notificacoes.repository');
const { createNotificacoesService } = require('./notificacoes.service');

const notificacoesService = createNotificacoesService(notificacoesRepository);
const notificacoesController = createNotificacoesController(notificacoesService);
const notificacoesRoutes = createModuleRouter(notificacoesController);

module.exports = {
  notificacoesRoutes
};
