const { createModuleRouter } = require('../../shared/utils/create-module');
const { createAuthController } = require('./auth.controller');
const { authRepository } = require('./auth.repository');
const { createAuthService } = require('./auth.service');

const authService = createAuthService(authRepository);
const authController = createAuthController(authService);
const authRoutes = createModuleRouter(authController);

module.exports = {
  authRoutes
};
