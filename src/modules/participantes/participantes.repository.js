const { query } = require('../../shared/database/client');

function map(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    status: row.status,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

async function listByBolao(bolaoId) {
  const result = await query(
    'select * from participantes where bolao_id = $1 and papel = $2 order by nome asc',
    [bolaoId, 'apostador']
  );
  return result.rows.map(map);
}

async function findById(id) {
  const result = await query('select * from participantes where id = $1 limit 1', [id]);
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function findByEmail(bolaoId, email) {
  const result = await query(
    'select * from participantes where bolao_id = $1 and lower(email) = lower($2) limit 1',
    [bolaoId, email]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function create(data) {
  const result = await query(
    `
      insert into participantes (bolao_id, nome, email, telefone, papel, status)
      values ($1, $2, $3, $4, 'apostador', $5)
      returning *
    `,
    [data.bolaoId, data.nome, data.email, data.telefone, data.status]
  );
  return map(result.rows[0]);
}

async function update(id, data) {
  const result = await query(
    `
      update participantes
      set nome = $2, email = $3, telefone = $4, status = $5
      where id = $1 and papel = 'apostador'
      returning *
    `,
    [id, data.nome, data.email, data.telefone, data.status]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function updateStatus(id, status) {
  const result = await query(
    "update participantes set status = $2 where id = $1 and papel = 'apostador' returning *",
    [id, status]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

module.exports = {
  listByBolao,
  findById,
  findByEmail,
  create,
  update,
  updateStatus
};
