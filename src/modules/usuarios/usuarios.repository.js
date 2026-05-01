const { createModuleRepository } = require('../../shared/utils/create-module');

const usuariosRepository = createModuleRepository('usuarios');

module.exports = {
  usuariosRepository
};
