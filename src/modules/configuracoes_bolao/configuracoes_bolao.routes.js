const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createConfiguracoesBolaoController } = require('./configuracoes_bolao.controller');
const { configuracoesBolaoRepository } = require('./configuracoes_bolao.repository');
const { createConfiguracoesBolaoService } = require('./configuracoes_bolao.service');

const configuracoesBolaoRoutes = Router();
const configuracoesBolaoService = createConfiguracoesBolaoService(configuracoesBolaoRepository);
const configuracoesBolaoController = createConfiguracoesBolaoController(configuracoesBolaoService);

configuracoesBolaoRoutes.use(authMiddleware);
configuracoesBolaoRoutes.get('/', configuracoesBolaoController.status);

configuracoesBolaoRoutes.get('/:bolaoId', configuracoesBolaoController.resumo);

configuracoesBolaoRoutes.get('/:bolaoId/configuracao', configuracoesBolaoController.listConfiguracoes);
configuracoesBolaoRoutes.post('/:bolaoId/configuracao', configuracoesBolaoController.createConfiguracao);
configuracoesBolaoRoutes.put('/:bolaoId/configuracao/:configuracaoId', configuracoesBolaoController.updateConfiguracao);

configuracoesBolaoRoutes.get('/:bolaoId/regras-pontuacao', configuracoesBolaoController.listRegras);
configuracoesBolaoRoutes.post('/:bolaoId/regras-pontuacao', configuracoesBolaoController.createRegra);
configuracoesBolaoRoutes.put('/:bolaoId/regras-pontuacao/:regraId', configuracoesBolaoController.updateRegra);
configuracoesBolaoRoutes.delete('/:bolaoId/regras-pontuacao/:regraId', configuracoesBolaoController.deleteRegra);

configuracoesBolaoRoutes.get('/:bolaoId/criterios-desempate', configuracoesBolaoController.listCriterios);
configuracoesBolaoRoutes.post('/:bolaoId/criterios-desempate', configuracoesBolaoController.createCriterio);
configuracoesBolaoRoutes.put('/:bolaoId/criterios-desempate/:criterioId', configuracoesBolaoController.updateCriterio);
configuracoesBolaoRoutes.delete('/:bolaoId/criterios-desempate/:criterioId', configuracoesBolaoController.deleteCriterio);

configuracoesBolaoRoutes.get('/:bolaoId/distribuicao-premios', configuracoesBolaoController.listDistribuicoes);
configuracoesBolaoRoutes.post('/:bolaoId/distribuicao-premios', configuracoesBolaoController.createDistribuicao);
configuracoesBolaoRoutes.put('/:bolaoId/distribuicao-premios/:distribuicaoId', configuracoesBolaoController.updateDistribuicao);
configuracoesBolaoRoutes.delete('/:bolaoId/distribuicao-premios/:distribuicaoId', configuracoesBolaoController.deleteDistribuicao);

module.exports = {
  configuracoesBolaoRoutes
};
