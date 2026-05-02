const { query } = require('../../shared/database/client');

function map(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    participanteId: row.participante_id,
    usuarioId: row.usuario_id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensagem: row.mensagem,
    canal: row.canal,
    status: row.status,
    dataAgendada: row.data_agendada,
    dataEnvio: row.data_envio || row.enviada_at,
    lidaEm: row.lida_at,
    erro: row.erro,
    payload: row.payload,
    criadoEm: row.criado_em || row.criado_at
  };
}

async function notificacoesAtivas() {
  const result = await query(
    "select valor from configuracoes_gerais where chave = 'notificacoes.ativas' and ativo = true limit 1"
  );
  if (!result.rows[0]) return true;
  return result.rows[0].valor !== false;
}

async function listParticipantesAtivos(bolaoId) {
  const result = await query(
    "select id, nome, email from participantes where bolao_id = $1 and papel = 'apostador' and status = 'ativo' order by nome asc",
    [bolaoId]
  );
  return result.rows;
}

async function create(data) {
  const result = await query(
    `
      insert into notificacoes (
        bolao_id,
        participante_id,
        usuario_id,
        tipo,
        titulo,
        mensagem,
        canal,
        status,
        data_agendada,
        data_envio,
        erro,
        payload,
        criado_em
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
      returning *
    `,
    [
      data.bolaoId || null,
      data.participanteId || null,
      data.usuarioId || null,
      data.tipo,
      data.titulo,
      data.mensagem,
      data.canal,
      data.status || 'pendente',
      data.dataAgendada || null,
      data.dataEnvio || null,
      data.erro || null,
      data.payload ? JSON.stringify(data.payload) : null
    ]
  );
  return map(result.rows[0]);
}

async function createMany(items) {
  const saved = [];
  for (const item of items) {
    saved.push(await create(item));
  }
  return saved;
}

async function listByBolao(bolaoId) {
  const result = await query(
    `
      select n.*, p.nome as participante_nome, u.nome as usuario_nome
      from notificacoes n
      left join participantes p on p.id = n.participante_id
      left join usuarios u on u.id = n.usuario_id
      where n.bolao_id = $1
      order by n.criado_em desc, n.criado_at desc
    `,
    [bolaoId]
  );
  return result.rows.map((row) => ({
    ...map(row),
    participante: row.participante_nome,
    usuario: row.usuario_nome
  }));
}

async function listByApostador(bolaoId, participanteId, usuarioId) {
  const result = await query(
    `
      select *
      from notificacoes
      where bolao_id = $1
        and (
          participante_id = $2
          or ($3::uuid is not null and usuario_id = $3)
          or (participante_id is null and usuario_id is null)
        )
      order by coalesce(lida_at, '9999-12-31'::timestamptz) desc, criado_em desc, criado_at desc
    `,
    [bolaoId, participanteId, usuarioId || null]
  );
  return result.rows.map(map);
}

async function findById(id) {
  const result = await query('select * from notificacoes where id = $1 limit 1', [id]);
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function markAsRead(id) {
  const result = await query(
    'update notificacoes set lida_at = coalesce(lida_at, now()) where id = $1 returning *',
    [id]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function cancelPending(id) {
  const result = await query(
    "update notificacoes set status = 'cancelada', erro = null where id = $1 and status = 'pendente' returning *",
    [id]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}

async function getPartidaResumo(partidaId) {
  const result = await query(
    `
      select
        p.*,
        tm.nome as mandante_nome,
        tv.nome as visitante_nome
      from partidas p
      join times tm on tm.id = p.time_mandante_id
      join times tv on tv.id = p.time_visitante_id
      where p.id = $1
      limit 1
    `,
    [partidaId]
  );
  return result.rows[0] || null;
}

async function getPagamentoResumo(pagamentoId) {
  const result = await query(
    `
      select pg.*, p.nome as participante_nome
      from pagamentos pg
      join participantes p on p.id = pg.participante_id
      where pg.id = $1
      limit 1
    `,
    [pagamentoId]
  );
  return result.rows[0] || null;
}

module.exports = {
  notificacoesAtivas,
  listParticipantesAtivos,
  create,
  createMany,
  listByBolao,
  listByApostador,
  findById,
  markAsRead,
  cancelPending,
  getPartidaResumo,
  getPagamentoResumo
};
