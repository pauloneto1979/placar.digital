const { createModuleRouter } = require('../../shared/utils/create-module');
const { createConfiguracoesGeraisController } = require('./configuracoes_gerais.controller');
const { configuracoesGeraisRepository } = require('./configuracoes_gerais.repository');
const { createConfiguracoesGeraisService } = require('./configuracoes_gerais.service');

const configuracoesGeraisService = createConfiguracoesGeraisService(configuracoesGeraisRepository);
const configuracoesGeraisController = createConfiguracoesGeraisController(configuracoesGeraisService);
const configuracoesGeraisRoutes = createModuleRouter(configuracoesGeraisController);

module.exports = {
  configuracoesGeraisRoutes
};
