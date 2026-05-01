const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createFasesController } = require('./fases.controller');
const fasesRepository = require('./fases.repository');
const { createFasesService } = require('./fases.service');

const fasesRoutes = Router();
const controller = createFasesController(createFasesService(fasesRepository));
fasesRoutes.use(authMiddleware);
fasesRoutes.get('/', controller.status);
fasesRoutes.get('/boloes/:bolaoId', controller.list);
fasesRoutes.post('/boloes/:bolaoId', controller.create);
fasesRoutes.put('/boloes/:bolaoId/:id', controller.update);
fasesRoutes.patch('/boloes/:bolaoId/:id/status', controller.updateStatus);
module.exports = { fasesRoutes };
