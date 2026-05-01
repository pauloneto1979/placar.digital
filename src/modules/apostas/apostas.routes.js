const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createApostasController } = require('./apostas.controller');
const apostasRepository = require('./apostas.repository');
const { createApostasService } = require('./apostas.service');

const apostasRoutes = Router();
const controller = createApostasController(createApostasService(apostasRepository));

apostasRoutes.use(authMiddleware);
apostasRoutes.get('/', controller.status);
apostasRoutes.get('/boloes/:bolaoId/dashboard', controller.dashboard);
apostasRoutes.get('/boloes/:bolaoId/jogos', controller.jogos);
apostasRoutes.post('/boloes/:bolaoId', controller.apostar);
apostasRoutes.put('/boloes/:bolaoId', controller.apostar);
apostasRoutes.get('/boloes/:bolaoId/minhas', controller.minhasApostas);
apostasRoutes.get('/boloes/:bolaoId/regras', controller.regras);

module.exports = {
  apostasRoutes
};
