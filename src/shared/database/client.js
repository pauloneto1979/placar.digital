const { Pool } = require('pg');
const { env } = require('../../config/env');

const pool = env.databaseUrl ? new Pool({ connectionString: env.databaseUrl }) : null;

function getPool() {
  if (!pool) {
    throw new Error('DATABASE_URL nao foi configurada.');
  }

  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

function closeDatabase() {
  return pool ? pool.end() : Promise.resolve();
}

module.exports = {
  query,
  closeDatabase
};
