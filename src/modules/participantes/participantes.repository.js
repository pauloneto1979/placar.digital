const { createModuleRepository } = require('../../shared/utils/create-module');

const participantesRepository = createModuleRepository('participantes');

module.exports = {
  participantesRepository
};
