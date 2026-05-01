const { query } = require('../../shared/database/client');

function map(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    participanteId: row.participante_id,
    status: row.status,
    valor: Number(row.valor),
    formaPagamento: row.metodo,
    dataPagamento: row.pago_at,
    observacao: row.observacao,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

async function participanteExists(bolaoId, participanteId) {
  const result = await query(
    "select 1 from participantes where id = $1 and bolao_id = $2 and papel = 'apostador' limit 1",
    [participanteId, bolaoId]
  );
  return result.rowCount > 0;
}

async function listByBolao(bolaoId) {
  const result = await query('select * from pagamentos where bolao_id = $1 order by criado_at desc', [bolaoId]);
  return result.rows.map(map);
}

async function findById(id) {
  const result = await query('select * from pagamentos where id = $1 limit 1', [id]);
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function create(data) {
  const result = await query(
    `
      insert into pagamentos (bolao_id, participante_id, status, valor, metodo, pago_at, observacao)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning *
    `,
    [data.bolaoId, data.participanteId, data.status, data.valor, data.formaPagamento, data.dataPagamento, data.observacao]
  );
  return map(result.rows[0]);
}

async function update(id, data) {
  const result = await query(
    `
      update pagamentos
      set status = $2, valor = $3, metodo = $4, pago_at = $5, observacao = $6
      where id = $1
      returning *
    `,
    [id, data.status, data.valor, data.formaPagamento, data.dataPagamento, data.observacao]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function updateStatus(id, status) {
  const pagoAt = status === 'pago' ? 'now()' : 'null';
  const result = await query(
    `update pagamentos set status = $2, pago_at = ${pagoAt} where id = $1 returning *`,
    [id, status]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

module.exports = { participanteExists, listByBolao, findById, create, update, updateStatus };
