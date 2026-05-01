const { createModuleRouter } = require('../../shared/utils/create-module');
const { createConfiguracoesBolaoController } = require('./configuracoes_bolao.controller');
const { configuracoesBolaoRepository } = require('./configuracoes_bolao.repository');
const { createConfiguracoesBolaoService } = require('./configuracoes_bolao.service');

const configuracoesBolaoService = createConfiguracoesBolaoService(configuracoesBolaoRepository);
const configuracoesBolaoController = createConfiguracoesBolaoController(configuracoesBolaoService);
const configuracoesBolaoRoutes = createModuleRouter(configuracoesBolaoController);

module.exports = {
  configuracoesBolaoRoutes
};
