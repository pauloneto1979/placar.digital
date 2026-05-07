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

async function list() {
  const result = await query('select * from times order by nome asc');
  return result.rows.map(map);
}
async function findById(id) {
  const result = await query('select * from times where id=$1 limit 1', [id]);
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function create(data) {
  const result = await query(
    'insert into times (nome,sigla,codigo_fifa,escudo_url,bandeira_url,pais,ativo) values ($1,$2,$3,$4,$5,$6,$7) returning *',
    [data.nome, data.sigla, data.codigoFifa, data.escudoUrl, data.bandeiraUrl, data.pais, data.ativo]
  );
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
module.exports = { list, findById, create, update, updateStatus };
