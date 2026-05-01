const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createParticipantesController } = require('./participantes.controller');
const participantesRepository = require('./participantes.repository');
const { createParticipantesService } = require('./participantes.service');

const participantesRoutes = Router();
const controller = createParticipantesController(createParticipantesService(participantesRepository));

participantesRoutes.use(authMiddleware);
participantesRoutes.get('/', controller.status);
participantesRoutes.get('/boloes/:bolaoId', controller.list);
participantesRoutes.post('/boloes/:bolaoId', controller.create);
participantesRoutes.put('/boloes/:bolaoId/:id', controller.update);
participantesRoutes.patch('/boloes/:bolaoId/:id/status', controller.updateStatus);

module.exports = { participantesRoutes };
