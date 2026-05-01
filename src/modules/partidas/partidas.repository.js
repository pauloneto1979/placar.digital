const { query } = require('../../shared/database/client');

function map(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    faseId: row.fase_id,
    timeMandanteId: row.time_mandante_id,
    timeVisitanteId: row.time_visitante_id,
    dataHora: row.inicio_at,
    estadio: row.estadio,
    placarMandante: row.placar_mandante,
    placarVisitante: row.placar_visitante,
    status: row.status,
    ativo: row.ativo,
    resultadoConfirmado: row.resultado_confirmado,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

async function listByBolao(bolaoId) {
  const result = await query('select * from partidas where bolao_id=$1 order by inicio_at asc', [bolaoId]);
  return result.rows.map(map);
}
async function findById(id) {
  const result = await query('select * from partidas where id=$1 limit 1', [id]);
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function faseBelongsToBolao(faseId, bolaoId) {
  const result = await query('select 1 from fases where id=$1 and bolao_id=$2 and ativo=true limit 1', [faseId, bolaoId]);
  return result.rowCount > 0;
}
async function timeAtivo(id) {
  const result = await query('select 1 from times where id=$1 and ativo=true limit 1', [id]);
  return result.rowCount > 0;
}
async function create(data) {
  const result = await query(
    `
      insert into partidas (bolao_id,fase_id,time_mandante_id,time_visitante_id,inicio_at,estadio,placar_mandante,placar_visitante,status,ativo,resultado_confirmado)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      returning *
    `,
    [data.bolaoId, data.faseId, data.timeMandanteId, data.timeVisitanteId, data.dataHora, data.estadio, data.placarMandante, data.placarVisitante, data.status, data.ativo, data.resultadoConfirmado]
  );
  return map(result.rows[0]);
}
async function update(id, data) {
  const result = await query(
    `
      update partidas set fase_id=$2,time_mandante_id=$3,time_visitante_id=$4,inicio_at=$5,estadio=$6,placar_mandante=$7,placar_visitante=$8,status=$9,ativo=$10,resultado_confirmado=$11
      where id=$1 returning *
    `,
    [id, data.faseId, data.timeMandanteId, data.timeVisitanteId, data.dataHora, data.estadio, data.placarMandante, data.placarVisitante, data.status, data.ativo, data.resultadoConfirmado]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function createAuditLog(data) {
  await query(
    `
      insert into auditoria_logs (usuario_id, bolao_id, entidade, entidade_id, acao, dados_anteriores, dados_novos, ip, user_agent)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `,
    [data.usuarioId, data.bolaoId, data.entidade, data.entidadeId, data.acao, JSON.stringify(data.dadosAnteriores), JSON.stringify(data.dadosNovos), data.ip || null, data.userAgent || null]
  );
}
module.exports = { listByBolao, findById, faseBelongsToBolao, timeAtivo, create, update, createAuditLog };
