const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { requirePerfilGlobal } = require('../../shared/middlewares/role.middleware');
const repository = require('./email.repository');
const { createEmailService } = require('./email.service');
const { createEmailController } = require('./email.controller');

const emailRoutes = Router();
const controller = createEmailController(createEmailService(repository));

emailRoutes.use(authMiddleware);
emailRoutes.use(requirePerfilGlobal(['proprietario']));

emailRoutes.get('/configuracao', controller.getConfiguracao);
emailRoutes.put('/configuracao', controller.salvarConfiguracao);
emailRoutes.post('/teste', controller.enviarTeste);

module.exports = {
  emailRoutes
};
