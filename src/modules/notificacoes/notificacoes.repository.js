const { createModuleRepository } = require('../../shared/utils/create-module');

const notificacoesRepository = createModuleRepository('notificacoes');

module.exports = {
  notificacoesRepository
};
