const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { requirePerfilGlobal } = require('../../shared/middlewares/role.middleware');
const repository = require('./proprietario.repository');
const { createProprietarioController } = require('./proprietario.controller');
const { createProprietarioService } = require('./proprietario.service');

const proprietarioRoutes = Router();
const proprietarioService = createProprietarioService(repository);
const proprietarioController = createProprietarioController(proprietarioService);
const onlyProprietario = requirePerfilGlobal(['proprietario']);

proprietarioRoutes.use(authMiddleware);
proprietarioRoutes.use(onlyProprietario);

proprietarioRoutes.get('/boloes', proprietarioController.listBoloes);
proprietarioRoutes.post('/boloes', proprietarioController.createBolao);
proprietarioRoutes.put('/boloes/:id', proprietarioController.updateBolao);
proprietarioRoutes.post('/boloes/:id/fechar', proprietarioController.fecharBolao);

proprietarioRoutes.get('/usuarios', proprietarioController.listUsuarios);
proprietarioRoutes.post('/usuarios', proprietarioController.createUsuario);
proprietarioRoutes.put('/usuarios/:id', proprietarioController.updateUsuario);
proprietarioRoutes.patch('/usuarios/:id/status', proprietarioController.updateUsuarioStatus);

proprietarioRoutes.get('/boloes/:bolaoId/administradores', proprietarioController.listAdministradoresBolao);
proprietarioRoutes.post('/boloes/:bolaoId/administradores', proprietarioController.vincularAdministrador);
proprietarioRoutes.delete(
  '/boloes/:bolaoId/administradores/:usuarioId',
  proprietarioController.removerVinculoAdministrador
);

proprietarioRoutes.get('/configuracoes-gerais', proprietarioController.getConfiguracoesGerais);
proprietarioRoutes.put('/configuracoes-gerais', proprietarioController.updateConfiguracoesGerais);

module.exports = {
  proprietarioRoutes
};
