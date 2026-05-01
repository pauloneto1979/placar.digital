require('dotenv').config();

const env = {
  appName: process.env.APP_NAME || 'placar.digital',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  databaseUrl: process.env.DATABASE_URL || null
};

module.exports = {
  env
};
