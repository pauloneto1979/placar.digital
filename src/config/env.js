require('dotenv').config();

const env = {
  appName: process.env.APP_NAME || 'placar.digital',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  databaseUrl: process.env.DATABASE_URL || null,
  authTokenSecret: process.env.AUTH_TOKEN_SECRET || 'placar-digital-dev-secret',
  authTokenExpiresInSeconds: Number(process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS || 86400),
  authSelectionTokenExpiresInSeconds: Number(process.env.AUTH_SELECTION_TOKEN_EXPIRES_IN_SECONDS || 600)
};

module.exports = {
  env
};
