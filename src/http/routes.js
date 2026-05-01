const { Router } = require('express');
const { query } = require('../shared/database/client');
const { authRoutes } = require('../modules/auth');
const { usuariosRoutes } = require('../modules/usuarios');
const { boloesRoutes } = require('../modules/boloes');
const { participantesRoutes } = require('../modules/participantes');
const { fasesRoutes } = require('../modules/fases');
const { timesRoutes } = require('../modules/times');
const { partidasRoutes } = require('../modules/partidas');
const { apostasRoutes } = require('../modules/apostas');
const { rankingRoutes } = require('../modules/ranking');
const { pagamentosRoutes } = require('../modules/pagamentos');
const { configuracoesBolaoRoutes } = require('../modules/configuracoes_bolao');
const { configuracoesGeraisRoutes } = require('../modules/configuracoes_gerais');
const { notificacoesRoutes } = require('../modules/notificacoes');
const { auditoriaRoutes } = require('../modules/auditoria');

const routes = Router();

routes.get('/health', async (req, res) => {
  try {
    const result = await query('select now() as database_time');

    res.json({
      status: 'ok',
      database: 'connected',
      databaseTime: result.rows[0].database_time
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'unavailable',
      message: error.message
    });
  }
});

routes.use('/auth', authRoutes);
routes.use('/usuarios', usuariosRoutes);
routes.use('/boloes', boloesRoutes);
routes.use('/participantes', participantesRoutes);
routes.use('/fases', fasesRoutes);
routes.use('/times', timesRoutes);
routes.use('/partidas', partidasRoutes);
routes.use('/apostas', apostasRoutes);
routes.use('/ranking', rankingRoutes);
routes.use('/pagamentos', pagamentosRoutes);
routes.use('/configuracoes-bolao', configuracoesBolaoRoutes);
routes.use('/configuracoes-gerais', configuracoesGeraisRoutes);
routes.use('/notificacoes', notificacoesRoutes);
routes.use('/auditoria', auditoriaRoutes);

module.exports = {
  routes
};
