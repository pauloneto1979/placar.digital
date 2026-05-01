const { query } = require('../../shared/database/client');

function map(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    nome: row.nome,
    ordem: row.ordem,
    tipo: row.tipo,
    status: row.status,
    ativo: row.ativo,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

async function listByBolao(bolaoId) {
  const result = await query('select * from fases where bolao_id = $1 order by ordem asc, nome asc', [bolaoId]);
  return result.rows.map(map);
}

async function findById(id) {
  const result = await query('select * from fases where id = $1 limit 1', [id]);
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function create(data) {
  const result = await query(
    'insert into fases (bolao_id, nome, ordem, tipo, status, ativo) values ($1,$2,$3,$4,$5,$6) returning *',
    [data.bolaoId, data.nome, data.ordem, data.tipo, data.status, data.ativo]
  );
  return map(result.rows[0]);
}

async function update(id, data) {
  const result = await query(
    'update fases set nome=$2, ordem=$3, tipo=$4, status=$5, ativo=$6 where id=$1 returning *',
    [id, data.nome, data.ordem, data.tipo, data.status, data.ativo]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function updateStatus(id, status, ativo) {
  const result = await query('update fases set status=$2, ativo=$3 where id=$1 returning *', [id, status, ativo]);
  return result.rows[0] ? map(result.rows[0]) : null;
}

module.exports = { listByBolao, findById, create, update, updateStatus };
