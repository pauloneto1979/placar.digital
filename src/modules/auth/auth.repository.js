const { query } = require('../../shared/database/client');

async function findUserByEmail(email) {
  const result = await query(
    `
      select
        id,
        nome,
        email,
        senha_hash,
        perfil_global,
        ativo
      from usuarios
      where lower(email) = lower($1)
      limit 1
    `,
    [email]
  );

  return result.rows[0] || null;
}

async function listUserBoloes(usuarioId) {
  const result = await query(
    `
      select
        null::uuid as participante_id,
        bu.id as vinculo_administrativo_id,
        bu.perfil::text as papel,
        case when bu.ativo then 'ativo' else 'inativo' end as participante_status,
        b.id as bolao_id,
        b.nome as bolao_nome,
        b.slug as bolao_slug,
        b.status as bolao_status
      from boloes_usuarios bu
      join usuarios u on u.id = bu.usuario_id
      join boloes b on b.id = bu.bolao_id
      where bu.usuario_id = $1
        and bu.ativo = true
        and bu.perfil = 'administrador'
        and u.perfil_global = 'administrador'
        and u.ativo = true
        and b.ativo = true
      union all
      select
        p.id as participante_id,
        null::uuid as vinculo_administrativo_id,
        p.papel::text as papel,
        p.status::text as participante_status,
        b.id as bolao_id,
        b.nome as bolao_nome,
        b.slug as bolao_slug,
        b.status as bolao_status
      from participantes p
      join usuarios u on u.id = p.usuario_id
      join boloes b on b.id = p.bolao_id
      where p.usuario_id = $1
        and p.status = 'ativo'
        and p.papel = 'apostador'
        and u.perfil_global = 'apostador'
        and u.ativo = true
        and b.ativo = true
      order by bolao_nome asc
    `,
    [usuarioId]
  );

  return result.rows;
}

async function findUserBolao(usuarioId, bolaoId) {
  const result = await query(
    `
      select
        null::uuid as participante_id,
        bu.id as vinculo_administrativo_id,
        bu.perfil::text as papel,
        case when bu.ativo then 'ativo' else 'inativo' end as participante_status,
        b.id as bolao_id,
        b.nome as bolao_nome,
        b.slug as bolao_slug,
        b.status as bolao_status
      from boloes_usuarios bu
      join usuarios u on u.id = bu.usuario_id
      join boloes b on b.id = bu.bolao_id
      where bu.usuario_id = $1
        and bu.bolao_id = $2
        and bu.ativo = true
        and bu.perfil = 'administrador'
        and u.perfil_global = 'administrador'
        and u.ativo = true
        and b.ativo = true
      union all
      select
        p.id as participante_id,
        null::uuid as vinculo_administrativo_id,
        p.papel::text as papel,
        p.status::text as participante_status,
        b.id as bolao_id,
        b.nome as bolao_nome,
        b.slug as bolao_slug,
        b.status as bolao_status
      from participantes p
      join usuarios u on u.id = p.usuario_id
      join boloes b on b.id = p.bolao_id
      where p.usuario_id = $1
        and p.bolao_id = $2
        and p.status = 'ativo'
        and p.papel = 'apostador'
        and u.perfil_global = 'apostador'
        and u.ativo = true
        and b.ativo = true
      limit 1
    `,
    [usuarioId, bolaoId]
  );

  return result.rows[0] || null;
}

async function updateLastLogin(usuarioId) {
  await query('update usuarios set ultimo_login_at = now() where id = $1', [usuarioId]);
}

async function createAuditLog(data) {
  await query(
    `
      insert into auditoria_logs (
        usuario_id,
        bolao_id,
        entidade,
        entidade_id,
        acao,
        dados_anteriores,
        dados_novos,
        ip,
        user_agent
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      data.usuarioId || null,
      data.bolaoId || null,
      data.entidade,
      data.entidadeId || null,
      data.acao,
      data.dadosAnteriores || null,
      data.dadosNovos || null,
      data.ip || null,
      data.userAgent || null
    ]
  );
}

const authRepository = {
  getMetadata() {
    return {
      module: 'auth',
      persistence: 'postgresql',
      implemented: true
    };
  },
  findUserByEmail,
  listUserBoloes,
  findUserBolao,
  updateLastLogin,
  createAuditLog
};

module.exports = {
  authRepository
};
