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

async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await callback(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function closeDatabase() {
  return pool ? pool.end() : Promise.resolve();
}

module.exports = {
  query,
  transaction,
  closeDatabase
};
