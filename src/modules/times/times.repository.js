const { query } = require('../../shared/database/client');

function map(row) {
  return {
    id: row.id,
    nome: row.nome,
    sigla: row.sigla,
    codigoFifa: row.codigo_fifa,
    footballDataTeamId: row.football_data_team_id,
    escudoUrl: row.escudo_url,
    bandeiraUrl: row.bandeira_url,
    pais: row.pais,
    ativo: row.ativo,
    status: row.ativo ? 'ativo' : 'inativo',
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

async function list(bolaoId) {
  const result = await query(
    `
      select t.*
      from times t
      join boloes_times bt on bt.time_id = t.id
      where bt.bolao_id = $1
      order by t.nome asc
    `,
    [bolaoId]
  );
  return result.rows.map(map);
}
async function findById(id) {
  const result = await query('select * from times where id=$1 limit 1', [id]);
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function belongsToBolao(id, bolaoId) {
  const result = await query('select 1 from boloes_times where bolao_id=$1 and time_id=$2 limit 1', [bolaoId, id]);
  return result.rowCount > 0;
}
async function linkToBolao(bolaoId, timeId) {
  await query(
    'insert into boloes_times (bolao_id,time_id) values ($1,$2) on conflict (bolao_id,time_id) do nothing',
    [bolaoId, timeId]
  );
}
async function findReusable(data) {
  const result = await query(
    `
      select *
      from times
      where lower(nome) = lower($1)
      limit 1
    `,
    [data.nome]
  );
  return result.rows[0] || null;
}
async function create(bolaoId, data) {
  const reusable = await findReusable(data);
  if (reusable) {
    await linkToBolao(bolaoId, reusable.id);
    return map(reusable);
  }
  const result = await query(
    'insert into times (nome,sigla,codigo_fifa,escudo_url,bandeira_url,pais,ativo) values ($1,$2,$3,$4,$5,$6,$7) returning *',
    [data.nome, data.sigla, data.codigoFifa, data.escudoUrl, data.bandeiraUrl, data.pais, data.ativo]
  );
  await linkToBolao(bolaoId, result.rows[0].id);
  return map(result.rows[0]);
}
async function update(id, data) {
  const result = await query(
    'update times set nome=$2,sigla=$3,codigo_fifa=$4,escudo_url=$5,bandeira_url=$6,pais=$7,ativo=$8 where id=$1 returning *',
    [id, data.nome, data.sigla, data.codigoFifa, data.escudoUrl, data.bandeiraUrl, data.pais, data.ativo]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function updateStatus(id, ativo) {
  const result = await query('update times set ativo=$2 where id=$1 returning *', [id, ativo]);
  return result.rows[0] ? map(result.rows[0]) : null;
}
module.exports = { list, findById, belongsToBolao, linkToBolao, create, update, updateStatus };
