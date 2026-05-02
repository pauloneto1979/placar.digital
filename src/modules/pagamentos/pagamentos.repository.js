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
    gateway: row.gateway,
    orderNsu: row.order_nsu,
    checkoutUrl: row.checkout_url,
    statusGateway: row.status_gateway,
    webhookPayload: row.webhook_payload,
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

async function findByOrderNsu(orderNsu) {
  const result = await query('select * from pagamentos where order_nsu = $1 limit 1', [orderNsu]);
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function getCheckoutContext(id) {
  const result = await query(
    `
      select
        pg.*,
        b.nome as bolao_nome,
        p.nome as participante_nome,
        p.email as participante_email,
        p.telefone as participante_telefone
      from pagamentos pg
      join boloes b on b.id = pg.bolao_id
      join participantes p on p.id = pg.participante_id
      where pg.id = $1
      limit 1
    `,
    [id]
  );
  return result.rows[0] || null;
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

async function saveGatewayCheckout(id, data) {
  const result = await query(
    `
      update pagamentos
      set
        gateway = 'infinitepay',
        order_nsu = $2,
        checkout_url = $3,
        status_gateway = $4,
        webhook_payload = coalesce(webhook_payload, '{}'::jsonb)
      where id = $1
      returning *
    `,
    [id, data.orderNsu, data.checkoutUrl, data.statusGateway]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function confirmInfinitePayPayment(id, webhookPayload) {
  const result = await query(
    `
      update pagamentos
      set
        status = 'pago',
        pago_at = now(),
        gateway = 'infinitepay',
        status_gateway = 'approved',
        webhook_payload = $2
      where id = $1
      returning *
    `,
    [id, JSON.stringify(webhookPayload)]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function saveGatewayWebhook(id, statusGateway, webhookPayload) {
  const result = await query(
    `
      update pagamentos
      set status_gateway = $2, webhook_payload = $3
      where id = $1
      returning *
    `,
    [id, statusGateway, JSON.stringify(webhookPayload)]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

module.exports = {
  participanteExists,
  listByBolao,
  findById,
  findByOrderNsu,
  getCheckoutContext,
  create,
  update,
  updateStatus,
  saveGatewayCheckout,
  confirmInfinitePayPayment,
  saveGatewayWebhook
};
