require('dotenv').config();

function numberEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} deve ser numerico.`);
  }
  return parsed;
}

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'sim'].includes(String(value).toLowerCase());
}

function listEnv(name, fallback = '') {
  return String(process.env[name] || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = {
  appName: process.env.APP_NAME || 'placar.digital',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: numberEnv('PORT', 3001),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  databaseUrl: process.env.DATABASE_URL || null,
  authTokenSecret: process.env.AUTH_TOKEN_SECRET || 'placar-digital-dev-secret',
  authTokenExpiresInSeconds: numberEnv('AUTH_TOKEN_EXPIRES_IN_SECONDS', 86400),
  authSelectionTokenExpiresInSeconds: numberEnv('AUTH_SELECTION_TOKEN_EXPIRES_IN_SECONDS', 600),
  infinitePayApiUrl: process.env.INFINITEPAY_API_URL || 'https://api.checkout.infinitepay.io',
  infinitePayHandle: process.env.INFINITEPAY_HANDLE || '',
  trustProxy: process.env.TRUST_PROXY || (process.env.NODE_ENV === 'production' ? 'loopback, linklocal, uniquelocal' : false),
  corsOrigins: listEnv('CORS_ORIGINS'),
  rateLimitWindowMs: numberEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  rateLimitMax: numberEnv('RATE_LIMIT_MAX', 300),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb',
  uploadDirectory: process.env.UPLOAD_DIR || 'storage/uploads',
  dbPoolMax: numberEnv('DB_POOL_MAX', 20),
  dbIdleTimeoutMs: numberEnv('DB_IDLE_TIMEOUT_MS', 30000),
  dbConnectionTimeoutMs: numberEnv('DB_CONNECTION_TIMEOUT_MS', 5000),
  dbStatementTimeoutMs: numberEnv('DB_STATEMENT_TIMEOUT_MS', 30000),
  dbSsl: boolEnv('DB_SSL', false)
};

function validateEnv() {
  if (env.nodeEnv !== 'production') return;
  const failures = [];
  if (!env.databaseUrl) failures.push('DATABASE_URL');
  if (!env.authTokenSecret || env.authTokenSecret === 'placar-digital-dev-secret' || env.authTokenSecret.length < 32) {
    failures.push('AUTH_TOKEN_SECRET forte com 32+ caracteres');
  }
  if (!env.corsOrigins.length) failures.push('CORS_ORIGINS');
  if (failures.length) {
    throw new Error(`Variaveis obrigatorias de producao ausentes/invalidas: ${failures.join(', ')}`);
  }
}

validateEnv();

module.exports = {
  env
};
