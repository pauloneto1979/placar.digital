const { Router } = require('express');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { HttpError } = require('../../shared/errors/http-error');
const { createAuthController } = require('./auth.controller');
const { authRepository } = require('./auth.repository');
const { createAuthService } = require('./auth.service');
const { emailRepository, createTransactionalEmailService } = require('../email');

const authService = createAuthService(authRepository, {
  transactionalEmailService: createTransactionalEmailService(emailRepository)
});
const authController = createAuthController(authService);
const authRoutes = Router();
const recoveryAttempts = new Map();

function recoveryRateLimit(req, _res, next) {
  const windowMs = 15 * 60 * 1000;
  const limit = 5;
  const now = Date.now();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const key = `${req.context?.ip || req.ip || 'unknown'}:${email || 'empty'}`;
  const attempts = (recoveryAttempts.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (attempts.length >= limit) {
    return next(new HttpError(429, 'password_recovery_rate_limited', 'Muitas solicitacoes de recuperacao. Tente novamente em alguns minutos.'));
  }
  attempts.push(now);
  recoveryAttempts.set(key, attempts);
  return next();
}

authRoutes.get('/', authController.status);
authRoutes.post('/login', authController.login);
authRoutes.post('/recuperar-senha', recoveryRateLimit, authController.solicitarRecuperacaoSenha);
authRoutes.post('/validar-token', authController.validarToken);
authRoutes.post('/ativar-conta', authController.ativarConta);
authRoutes.post('/redefinir-senha', authController.redefinirSenha);
authRoutes.post('/selecionar-bolao', authController.selectBolao);
authRoutes.post('/trocar-bolao', authMiddleware, authController.switchBolao);
authRoutes.get('/me', authMiddleware, authController.me);
authRoutes.get('/meu-perfil', authMiddleware, authController.meuPerfil);
authRoutes.put('/meu-perfil', authMiddleware, authController.updateMeuPerfil);
authRoutes.put('/minha-senha', authMiddleware, authController.updateMinhaSenha);

module.exports = {
  authRoutes
};
