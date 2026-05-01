const { createModuleRouter } = require('../../shared/utils/create-module');
const { createUsuariosController } = require('./usuarios.controller');
const { usuariosRepository } = require('./usuarios.repository');
const { createUsuariosService } = require('./usuarios.service');

const usuariosService = createUsuariosService(usuariosRepository);
const usuariosController = createUsuariosController(usuariosService);
const usuariosRoutes = createModuleRouter(usuariosController);

module.exports = {
  usuariosRoutes
};
