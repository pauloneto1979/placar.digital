const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { createAuthController } = require('./auth.controller');
const { authRepository } = require('./auth.repository');
const { createAuthService } = require('./auth.service');

const authService = createAuthService(authRepository);
const authController = createAuthController(authService);
const authRoutes = Router();

authRoutes.get('/', authController.status);
authRoutes.post('/login', authController.login);
authRoutes.post('/selecionar-bolao', authController.selectBolao);
authRoutes.post('/trocar-bolao', authMiddleware, authController.switchBolao);
authRoutes.get('/me', authMiddleware, authController.me);

module.exports = {
  authRoutes
};
