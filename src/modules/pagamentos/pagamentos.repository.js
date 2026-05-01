const { createModuleRepository } = require('../../shared/utils/create-module');

const pagamentosRepository = createModuleRepository('pagamentos');

module.exports = {
  pagamentosRepository
};
