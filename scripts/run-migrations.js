const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL nao foi configurada.');
  process.exit(1);
}

const migrationsDir = path.resolve(__dirname, '../db/migrations');
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: ['1', 'true', 'yes'].includes(String(process.env.DB_SSL || '').toLowerCase())
    ? { rejectUnauthorized: false }
    : undefined
});

async function ensureLedger(client) {
  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function getApplied(client) {
  const result = await client.query('select filename from schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

async function hasExistingApplicationSchema(client) {
  const result = await client.query(`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('usuarios', 'boloes', 'participantes')
    ) as exists
  `);
  return Boolean(result.rows[0]?.exists);
}

async function baselineExistingSchema(client, files) {
  console.log('[migrations] baseline de schema existente habilitado.');
  await client.query('begin');
  try {
    for (const file of files) {
      await client.query(
        'insert into schema_migrations (filename) values ($1) on conflict (filename) do nothing',
        [file]
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function run() {
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    await ensureLedger(client);
    const applied = await getApplied(client);

    if (applied.size === 0 && await hasExistingApplicationSchema(client)) {
      if (process.env.MIGRATIONS_BASELINE === 'true') {
        await baselineExistingSchema(client, files);
        console.log('[migrations] baseline concluido. Nenhuma migration foi reaplicada.');
        return;
      }

      throw new Error(
        'Banco existente detectado sem schema_migrations. Valide o schema atual e execute uma unica vez com MIGRATIONS_BASELINE=true npm run migrate.'
      );
    }

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrations] skip ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`[migrations] apply ${file}`);
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (filename) values ($1)', [file]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }

    console.log('[migrations] ok');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('[migrations] erro:', error.message);
  process.exit(1);
});
