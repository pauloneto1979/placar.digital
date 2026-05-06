const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { requirePerfilGlobal } = require('../../shared/middlewares/role.middleware');
const provedoresEsportivosRepository = require('./provedores_esportivos.repository');
const { createProvedoresEsportivosService } = require('./provedores_esportivos.service');
const { createProvedoresEsportivosController } = require('./provedores_esportivos.controller');

const provedoresEsportivosRoutes = Router();
const controller = createProvedoresEsportivosController(
  createProvedoresEsportivosService(provedoresEsportivosRepository)
);

provedoresEsportivosRoutes.use(authMiddleware);
provedoresEsportivosRoutes.use(requirePerfilGlobal(['proprietario', 'administrador']));

provedoresEsportivosRoutes.get('/', controller.list);
provedoresEsportivosRoutes.put('/:provider', controller.update);
provedoresEsportivosRoutes.patch('/:provider/status', controller.updateStatus);

module.exports = {
  provedoresEsportivosRoutes
};
