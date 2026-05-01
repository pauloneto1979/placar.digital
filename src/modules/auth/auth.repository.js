const { createModuleRepository } = require('../../shared/utils/create-module');

const authRepository = createModuleRepository('auth');

module.exports = {
  authRepository
};
