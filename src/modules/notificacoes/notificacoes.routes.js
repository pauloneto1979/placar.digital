const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createNotificacoesController } = require('./notificacoes.controller');
const notificacoesRepository = require('./notificacoes.repository');
const { createNotificacoesService } = require('./notificacoes.service');

const notificacoesRoutes = Router();
const controller = createNotificacoesController(createNotificacoesService(notificacoesRepository));

notificacoesRoutes.use(authMiddleware);
notificacoesRoutes.get('/', controller.status);
notificacoesRoutes.get('/boloes/:bolaoId/minhas', controller.minhas);
notificacoesRoutes.patch('/boloes/:bolaoId/:id/lida', controller.marcarLida);
notificacoesRoutes.get('/boloes/:bolaoId', controller.listAdmin);
notificacoesRoutes.post('/boloes/:bolaoId/manual/todos', controller.criarManualTodos);
notificacoesRoutes.post('/boloes/:bolaoId/:id/cancelar', controller.cancelar);

module.exports = {
  notificacoesRoutes
};
