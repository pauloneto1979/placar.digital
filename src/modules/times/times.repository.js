const { query } = require('../../shared/database/client');

function map(row) {
  return { id: row.id, nome: row.nome, sigla: row.sigla, pais: row.pais, ativo: row.ativo, status: row.ativo ? 'ativo' : 'inativo', criadoAt: row.criado_at, atualizadoAt: row.atualizado_at };
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
  const result = await query('insert into times (nome,sigla,pais,ativo) values ($1,$2,$3,$4) returning *', [data.nome, data.sigla, data.pais, data.ativo]);
  return map(result.rows[0]);
}
async function update(id, data) {
  const result = await query('update times set nome=$2,sigla=$3,pais=$4,ativo=$5 where id=$1 returning *', [id, data.nome, data.sigla, data.pais, data.ativo]);
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function updateStatus(id, ativo) {
  const result = await query('update times set ativo=$2 where id=$1 returning *', [id, ativo]);
  return result.rows[0] ? map(result.rows[0]) : null;
}
module.exports = { list, findById, create, update, updateStatus };
