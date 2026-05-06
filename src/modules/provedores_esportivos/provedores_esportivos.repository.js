const { query } = require('../../shared/database/client');

function map(row, options = {}) {
  const includeSecret = options.includeSecret === true;
  const item = {
    id: row.id,
    provider: row.provider,
    enabled: row.enabled,
    syncIntervalSeconds: row.sync_interval_seconds,
    baseUrl: row.base_url,
    lastSyncAt: row.last_sync_at,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };

  if (includeSecret) {
    item.apiToken = row.api_token || '';
  }

  return item;
}

async function list(options = {}) {
  const result = await query(
    'select * from provedores_dados_esportivos order by provider asc'
  );
  return result.rows.map((row) => map(row, options));
}

async function listEnabled(options = {}) {
  const result = await query(
    'select * from provedores_dados_esportivos where enabled = true order by provider asc'
  );
  return result.rows.map((row) => map(row, options));
}

async function findByProvider(provider, options = {}) {
  const result = await query(
    'select * from provedores_dados_esportivos where provider = $1 limit 1',
    [provider]
  );
  return result.rows[0] ? map(result.rows[0], options) : null;
}

async function touchLastSync(provider, lastSyncAt = new Date()) {
  const result = await query(
    'update provedores_dados_esportivos set last_sync_at = $2 where provider = $1 returning *',
    [provider, lastSyncAt]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

module.exports = {
  list,
  listEnabled,
  findByProvider,
  touchLastSync
};
