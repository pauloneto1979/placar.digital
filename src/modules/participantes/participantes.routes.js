const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createParticipantesController } = require('./participantes.controller');
const participantesRepository = require('./participantes.repository');
const { createParticipantesService } = require('./participantes.service');
const { emailRepository, createTransactionalEmailService } = require('../email');

const participantesRoutes = Router();
const controller = createParticipantesController(createParticipantesService(participantesRepository, {
  transactionalEmailService: createTransactionalEmailService(emailRepository)
}));

participantesRoutes.use(authMiddleware);
participantesRoutes.get('/', controller.status);
participantesRoutes.get('/boloes/:bolaoId', controller.list);
participantesRoutes.post('/boloes/:bolaoId', controller.create);
participantesRoutes.put('/boloes/:bolaoId/:id', controller.update);
participantesRoutes.patch('/boloes/:bolaoId/:id/status', controller.updateStatus);
participantesRoutes.post('/boloes/:bolaoId/:id/convite', controller.sendInvite);

module.exports = { participantesRoutes };
