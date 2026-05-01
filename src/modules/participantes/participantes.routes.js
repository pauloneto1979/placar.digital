const { createModuleRouter } = require('../../shared/utils/create-module');
const { createParticipantesController } = require('./participantes.controller');
const { participantesRepository } = require('./participantes.repository');
const { createParticipantesService } = require('./participantes.service');

const participantesService = createParticipantesService(participantesRepository);
const participantesController = createParticipantesController(participantesService);
const participantesRoutes = createModuleRouter(participantesController);

module.exports = {
  participantesRoutes
};
