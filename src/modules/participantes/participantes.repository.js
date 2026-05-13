const { query } = require('../../shared/database/client');

function map(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    usuarioId: row.usuario_id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    status: row.status,
    acessoStatus: row.acesso_status || null,
    conviteExpiracao: row.convite_expiracao || null,
    conviteEnviadoAt: row.convite_enviado_at || null,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

function mapUsuario(row) {
  return row ? {
    id: row.id,
    nome: row.nome,
    email: row.email,
    perfilGlobal: row.perfil_global,
    ativo: row.ativo
  } : null;
}

async function listByBolao(bolaoId) {
  const result = await query(
    `
      select
        p.*,
        convite.expiracao as convite_expiracao,
        convite.created_at as convite_enviado_at,
        case
          when u.id is not null and u.ativo = false then 'credencial_inativa'
          when u.ativo = true and p.status = 'ativo' then 'acesso_ativo'
          when convite.id is null then 'pendente'
          when convite.utilizado_em is not null then 'acesso_ativo'
          when convite.expiracao <= now() then 'expirado'
          else 'convite_enviado'
        end as acesso_status
      from participantes p
      left join usuarios u on u.id = p.usuario_id
      left join lateral (
        select id, expiracao, utilizado_em, created_at
        from auth_tokens
        where tipo = 'convite'
          and metadata->>'participanteId' = p.id::text
        order by created_at desc
        limit 1
      ) convite on true
      where p.bolao_id = $1 and p.papel = $2
      order by p.nome asc
    `,
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

async function findUsuarioByEmail(email) {
  const result = await query(
    `
      select id, nome, email, perfil_global, ativo
      from usuarios
      where lower(email) = lower($1)
      limit 1
    `,
    [email]
  );
  return mapUsuario(result.rows[0]);
}

async function createUsuarioApostador(data) {
  const result = await query(
    `
      insert into usuarios (nome, email, senha_hash, perfil_global, ativo)
      values ($1, $2, $3, 'apostador', $4)
      returning id, nome, email, perfil_global, ativo
    `,
    [data.nome, data.email, data.senhaHash, data.ativo !== false]
  );
  return mapUsuario(result.rows[0]);
}

async function updateUsuarioApostadorPassword(id, senhaHash) {
  const result = await query(
    `
      update usuarios
      set senha_hash = $2
      where id = $1 and perfil_global = 'apostador'
      returning id, nome, email, perfil_global, ativo
    `,
    [id, senhaHash]
  );

  return result.rows[0] ? mapUsuario(result.rows[0]) : null;
}

async function activateUsuarioApostador(id) {
  const result = await query(
    `
      update usuarios
      set ativo = true
      where id = $1 and perfil_global = 'apostador'
      returning id, nome, email, perfil_global, ativo
    `,
    [id]
  );

  return result.rows[0] ? mapUsuario(result.rows[0]) : null;
}

async function create(data) {
  const result = await query(
    `
      insert into participantes (bolao_id, usuario_id, nome, email, telefone, papel, status)
      values ($1, $2, $3, $4, $5, 'apostador', $6)
      returning *
    `,
    [data.bolaoId, data.usuarioId, data.nome, data.email, data.telefone, data.status]
  );
  return map(result.rows[0]);
}

async function update(id, data) {
  const result = await query(
    `
      update participantes
      set usuario_id = $2, nome = $3, email = $4, telefone = $5, status = $6
      where id = $1 and papel = 'apostador'
      returning *
    `,
    [id, data.usuarioId, data.nome, data.email, data.telefone, data.status]
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
  findUsuarioByEmail,
  createUsuarioApostador,
  updateUsuarioApostadorPassword,
  activateUsuarioApostador,
  create,
  update,
  updateStatus
};
