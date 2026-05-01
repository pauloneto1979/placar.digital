const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = connectionString ? new Pool({ connectionString }) : null;

function query(text, params) {
  if (!pool) {
    throw new Error('DATABASE_URL nao foi configurada.');
  }

  return pool.query(text, params);
}

function closePool() {
  return pool ? pool.end() : Promise.resolve();
}

module.exports = {
  query,
  closePool
};
