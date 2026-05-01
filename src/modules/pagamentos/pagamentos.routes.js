const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createPagamentosController } = require('./pagamentos.controller');
const pagamentosRepository = require('./pagamentos.repository');
const { createPagamentosService } = require('./pagamentos.service');

const pagamentosRoutes = Router();
const controller = createPagamentosController(createPagamentosService(pagamentosRepository));

pagamentosRoutes.use(authMiddleware);
pagamentosRoutes.get('/', controller.status);
pagamentosRoutes.get('/boloes/:bolaoId', controller.list);
pagamentosRoutes.post('/boloes/:bolaoId', controller.create);
pagamentosRoutes.put('/boloes/:bolaoId/:id', controller.update);
pagamentosRoutes.post('/boloes/:bolaoId/:id/marcar-pago', controller.marcarPago);
pagamentosRoutes.post('/boloes/:bolaoId/:id/voltar-pendente', controller.voltarPendente);
pagamentosRoutes.post('/boloes/:bolaoId/:id/cancelar', controller.cancelar);

module.exports = { pagamentosRoutes };
