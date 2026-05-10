const { query } = require('../../shared/database/client');

function map(row, options = {}) {
  const item = {
    id: row.id,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpSecure: row.smtp_secure,
    smtpUser: row.smtp_user,
    smtpFromName: row.smtp_from_name,
    smtpFromEmail: row.smtp_from_email,
    smtpReplyTo: row.smtp_reply_to,
    smtpEnabled: row.smtp_enabled,
    providerName: row.provider_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (options.includeSecret) {
    item.smtpPassword = row.smtp_password || '';
  }

  return item;
}

async function getLatest(options = {}) {
  const result = await query('select * from email_configuracoes order by updated_at desc limit 1');
  return result.rows[0] ? map(result.rows[0], options) : null;
}

async function upsert(data) {
  const existing = await getLatest({ includeSecret: true });
  if (!existing) {
    const result = await query(
      `
        insert into email_configuracoes (
          smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password,
          smtp_from_name, smtp_from_email, smtp_reply_to, smtp_enabled, provider_name
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        returning *
      `,
      [
        data.smtpHost,
        data.smtpPort,
        data.smtpSecure,
        data.smtpUser,
        data.smtpPassword || null,
        data.smtpFromName,
        data.smtpFromEmail,
        data.smtpReplyTo || null,
        data.smtpEnabled,
        data.providerName
      ]
    );
    return map(result.rows[0], { includeSecret: true });
  }

  const result = await query(
    `
      update email_configuracoes
      set
        smtp_host = $2,
        smtp_port = $3,
        smtp_secure = $4,
        smtp_user = $5,
        smtp_password = case when $6::boolean then $7 else smtp_password end,
        smtp_from_name = $8,
        smtp_from_email = $9,
        smtp_reply_to = $10,
        smtp_enabled = $11,
        provider_name = $12
      where id = $1
      returning *
    `,
    [
      existing.id,
      data.smtpHost,
      data.smtpPort,
      data.smtpSecure,
      data.smtpUser,
      data.updatePassword,
      data.smtpPassword || null,
      data.smtpFromName,
      data.smtpFromEmail,
      data.smtpReplyTo || null,
      data.smtpEnabled,
      data.providerName
    ]
  );

  return map(result.rows[0], { includeSecret: true });
}

async function getTemplate(codigo, idioma = 'pt-BR') {
  const result = await query(
    `
      select *
      from email_templates
      where codigo = $1
        and ativo = true
        and idioma in ($2, 'pt-BR')
      order by case when idioma = $2 then 1 else 2 end
      limit 1
    `,
    [codigo, idioma || 'pt-BR']
  );
  return result.rows[0] || null;
}

async function createAuthToken(data) {
  const result = await query(
    `
      insert into auth_tokens (usuario_id, tipo, token, expiracao, metadata)
      values ($1,$2,$3,$4,$5)
      returning id, usuario_id, tipo, expiracao, utilizado_em, metadata, created_at
    `,
    [data.usuarioId, data.tipo, data.token, data.expiracao, JSON.stringify(data.metadata || {})]
  );
  return result.rows[0];
}

async function findAuthToken(token, tipo = null) {
  const result = await query(
    `
      select *
      from auth_tokens
      where token = $1
        and ($2::text is null or tipo = $2)
      limit 1
    `,
    [token, tipo]
  );
  return result.rows[0] || null;
}

async function markAuthTokenUsed(id) {
  const result = await query(
    'update auth_tokens set utilizado_em = now() where id = $1 and utilizado_em is null returning *',
    [id]
  );
  return result.rows[0] || null;
}

async function findUserById(usuarioId) {
  const result = await query(
    'select id, nome, email, senha_hash, perfil_global, ativo from usuarios where id = $1 limit 1',
    [usuarioId]
  );
  return result.rows[0] || null;
}

async function findUserByEmail(email) {
  const result = await query(
    'select id, nome, email, senha_hash, perfil_global, ativo from usuarios where lower(email) = lower($1) limit 1',
    [email]
  );
  return result.rows[0] || null;
}

async function updateUserPasswordAndStatus(usuarioId, senhaHash, ativo = true) {
  const result = await query(
    `
      update usuarios
      set senha_hash = $2, ativo = $3
      where id = $1
      returning id, nome, email, senha_hash, perfil_global, ativo
    `,
    [usuarioId, senhaHash, ativo]
  );
  return result.rows[0] || null;
}

async function activateParticipantFromToken(metadata = {}) {
  if (!metadata.participanteId) return null;
  const result = await query(
    `
      update participantes
      set status = 'ativo'
      where id = $1
        and status <> 'removido'
      returning *
    `,
    [metadata.participanteId]
  );
  return result.rows[0] || null;
}

async function getParticipantContext(participanteId) {
  const result = await query(
    `
      select
        p.id as participante_id,
        p.nome as participante_nome,
        p.email as participante_email,
        p.usuario_id,
        b.id as bolao_id,
        b.nome as bolao_nome,
        u.nome as usuario_nome,
        u.email as usuario_email
      from participantes p
      join boloes b on b.id = p.bolao_id
      left join usuarios u on u.id = p.usuario_id
      where p.id = $1
      limit 1
    `,
    [participanteId]
  );
  return result.rows[0] || null;
}

async function getPaymentContext(pagamentoId) {
  const result = await query(
    `
      select
        pg.id as pagamento_id,
        pg.valor,
        pg.pago_at,
        pg.status,
        b.id as bolao_id,
        b.nome as bolao_nome,
        p.id as participante_id,
        p.nome as participante_nome,
        p.email as participante_email,
        p.usuario_id,
        u.nome as usuario_nome,
        u.email as usuario_email
      from pagamentos pg
      join boloes b on b.id = pg.bolao_id
      join participantes p on p.id = pg.participante_id
      left join usuarios u on u.id = p.usuario_id
      where pg.id = $1
      limit 1
    `,
    [pagamentoId]
  );
  return result.rows[0] || null;
}

async function createNotificationLog(data) {
  const result = await query(
    `
      insert into notificacoes (
        usuario_id, bolao_id, tipo, canal, titulo, mensagem, status, payload,
        tipo_evento, destinatario, assunto, tentativas
      ) values ($1,$2,$3,'email',$4,$5,'pendente',$6,$7,$8,$9,0)
      returning *
    `,
    [
      data.usuarioId || null,
      data.bolaoId || null,
      data.tipo || 'sistema',
      data.assunto,
      data.mensagem || data.assunto,
      JSON.stringify(data.payload || {}),
      data.tipoEvento,
      data.destinatario,
      data.assunto
    ]
  );
  return result.rows[0];
}

async function markNotificationSent(id, payload = {}) {
  const result = await query(
    `
      update notificacoes
      set status = 'enviada',
          enviada_at = now(),
          tentativas = tentativas + 1,
          payload = coalesce(payload, '{}'::jsonb) || $2::jsonb
      where id = $1
      returning *
    `,
    [id, JSON.stringify(payload)]
  );
  return result.rows[0] || null;
}

async function markNotificationError(id, erro, payload = {}) {
  const result = await query(
    `
      update notificacoes
      set status = 'falhou',
          erro = $2,
          tentativas = tentativas + 1,
          payload = coalesce(payload, '{}'::jsonb) || $3::jsonb
      where id = $1
      returning *
    `,
    [id, String(erro || '').slice(0, 1000), JSON.stringify(payload)]
  );
  return result.rows[0] || null;
}

module.exports = {
  getLatest,
  upsert,
  getTemplate,
  createAuthToken,
  findAuthToken,
  markAuthTokenUsed,
  findUserById,
  findUserByEmail,
  updateUserPasswordAndStatus,
  activateParticipantFromToken,
  getParticipantContext,
  getPaymentContext,
  createNotificationLog,
  markNotificationSent,
  markNotificationError
};
