const { query } = require('../../shared/database/client');

function mapBolao(row) {
  return {
    id: row.id,
    proprietarioId: row.proprietario_id,
    nome: row.nome,
    slug: row.slug,
    descricao: row.descricao,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    status: row.status,
    ativo: row.ativo,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

function mapUsuario(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    perfil: row.perfil_global,
    ativo: row.ativo,
    status: row.ativo ? 'ativo' : 'inativo',
    ultimoLoginAt: row.ultimo_login_at,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

function mapAdminVinculado(row) {
  return {
    participanteId: row.participante_id,
    usuarioId: row.usuario_id,
    nome: row.nome,
    email: row.email,
    perfil: row.perfil_global,
    papel: row.papel,
    status: row.status,
    entrouAt: row.entrou_at
  };
}

async function listBoloes() {
  const result = await query(
    `
      select id, proprietario_id, nome, slug, descricao, data_inicio, data_fim, status, ativo, criado_at, atualizado_at
      from boloes
      order by criado_at desc
    `
  );

  return result.rows.map(mapBolao);
}

async function findBolaoById(id) {
  const result = await query(
    `
      select id, proprietario_id, nome, slug, descricao, data_inicio, data_fim, status, ativo, criado_at, atualizado_at
      from boloes
      where id = $1
      limit 1
    `,
    [id]
  );

  return result.rows[0] ? mapBolao(result.rows[0]) : null;
}

async function findBolaoBySlug(slug) {
  const result = await query('select id from boloes where slug = $1 limit 1', [slug]);
  return result.rows[0] || null;
}

async function createBolao(data) {
  const result = await query(
    `
      insert into boloes (
        proprietario_id,
        nome,
        slug,
        descricao,
        data_inicio,
        data_fim,
        status,
        tipo_esporte,
        ativo
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning id, proprietario_id, nome, slug, descricao, data_inicio, data_fim, status, ativo, criado_at, atualizado_at
    `,
    [
      data.proprietarioId,
      data.nome,
      data.slug,
      data.descricao,
      data.dataInicio,
      data.dataFim,
      data.status,
      data.tipoEsporte,
      data.ativo
    ]
  );

  return mapBolao(result.rows[0]);
}

async function updateBolao(id, data) {
  const result = await query(
    `
      update boloes
      set
        nome = $2,
        slug = $3,
        descricao = $4,
        data_inicio = $5,
        data_fim = $6,
        status = $7,
        ativo = $8
      where id = $1
      returning id, proprietario_id, nome, slug, descricao, data_inicio, data_fim, status, ativo, criado_at, atualizado_at
    `,
    [id, data.nome, data.slug, data.descricao, data.dataInicio, data.dataFim, data.status, data.ativo]
  );

  return result.rows[0] ? mapBolao(result.rows[0]) : null;
}

async function fecharBolao(id) {
  const result = await query(
    `
      update boloes
      set status = 'fechado', ativo = false
      where id = $1
      returning id, proprietario_id, nome, slug, descricao, data_inicio, data_fim, status, ativo, criado_at, atualizado_at
    `,
    [id]
  );

  return result.rows[0] ? mapBolao(result.rows[0]) : null;
}

async function listUsuarios() {
  const result = await query(
    `
      select id, nome, email, perfil_global, ativo, ultimo_login_at, criado_at, atualizado_at
      from usuarios
      where perfil_global in ('proprietario', 'administrador')
      order by nome asc
    `
  );

  return result.rows.map(mapUsuario);
}

async function findUsuarioById(id) {
  const result = await query(
    `
      select id, nome, email, perfil_global, ativo, ultimo_login_at, criado_at, atualizado_at
      from usuarios
      where id = $1
      limit 1
    `,
    [id]
  );

  return result.rows[0] ? mapUsuario(result.rows[0]) : null;
}

async function findUsuarioByEmail(email) {
  const result = await query(
    `
      select id, nome, email, perfil_global, ativo, ultimo_login_at, criado_at, atualizado_at
      from usuarios
      where lower(email) = lower($1)
      limit 1
    `,
    [email]
  );

  return result.rows[0] ? mapUsuario(result.rows[0]) : null;
}

async function createUsuario(data) {
  const result = await query(
    `
      insert into usuarios (nome, email, senha_hash, perfil_global, ativo)
      values ($1, $2, $3, $4, $5)
      returning id, nome, email, perfil_global, ativo, ultimo_login_at, criado_at, atualizado_at
    `,
    [data.nome, data.email, data.senhaHash, data.perfil, data.ativo]
  );

  return mapUsuario(result.rows[0]);
}

async function updateUsuario(id, data) {
  const result = await query(
    `
      update usuarios
      set nome = $2, email = $3, perfil_global = $4, ativo = $5
      where id = $1
      returning id, nome, email, perfil_global, ativo, ultimo_login_at, criado_at, atualizado_at
    `,
    [id, data.nome, data.email, data.perfil, data.ativo]
  );

  return result.rows[0] ? mapUsuario(result.rows[0]) : null;
}

async function updateUsuarioStatus(id, ativo) {
  const result = await query(
    `
      update usuarios
      set ativo = $2
      where id = $1
      returning id, nome, email, perfil_global, ativo, ultimo_login_at, criado_at, atualizado_at
    `,
    [id, ativo]
  );

  return result.rows[0] ? mapUsuario(result.rows[0]) : null;
}

async function vincularAdministrador(bolaoId, usuarioId) {
  const result = await query(
    `
      insert into participantes (bolao_id, usuario_id, papel, status)
      values ($1, $2, 'administrador', 'ativo')
      on conflict (bolao_id, usuario_id)
      do update set papel = 'administrador', status = 'ativo'
      returning id
    `,
    [bolaoId, usuarioId]
  );

  return result.rows[0];
}

async function listAdministradoresBolao(bolaoId) {
  const result = await query(
    `
      select
        p.id as participante_id,
        p.usuario_id,
        p.papel,
        p.status,
        p.entrou_at,
        u.nome,
        u.email,
        u.perfil_global
      from participantes p
      join usuarios u on u.id = p.usuario_id
      where p.bolao_id = $1
        and p.papel = 'administrador'
        and u.perfil_global = 'administrador'
      order by u.nome asc
    `,
    [bolaoId]
  );

  return result.rows.map(mapAdminVinculado);
}

async function removerVinculoAdministrador(bolaoId, usuarioId) {
  const result = await query(
    `
      update participantes
      set status = 'removido'
      where bolao_id = $1
        and usuario_id = $2
        and papel = 'administrador'
      returning id
    `,
    [bolaoId, usuarioId]
  );

  return result.rowCount > 0;
}

async function listConfiguracoesGerais() {
  const result = await query(
    `
      select chave, valor, descricao, ativo, criado_at, atualizado_at
      from configuracoes_gerais
      where chave in (
        'sessao.tempo_segundos',
        'email.remetente',
        'notificacoes.ativas',
        'pagamentos.gateway'
      )
      order by chave asc
    `
  );

  return result.rows;
}

async function upsertConfiguracaoGeral(chave, valor, descricao) {
  const result = await query(
    `
      insert into configuracoes_gerais (chave, valor, descricao, ativo)
      values ($1, $2, $3, true)
      on conflict (chave)
      do update set valor = excluded.valor, descricao = excluded.descricao, ativo = true
      returning chave, valor, descricao, ativo, criado_at, atualizado_at
    `,
    [chave, JSON.stringify(valor), descricao]
  );

  return result.rows[0];
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
      data.dadosAnteriores ? JSON.stringify(data.dadosAnteriores) : null,
      data.dadosNovos ? JSON.stringify(data.dadosNovos) : null,
      data.ip || null,
      data.userAgent || null
    ]
  );
}

module.exports = {
  listBoloes,
  findBolaoById,
  findBolaoBySlug,
  createBolao,
  updateBolao,
  fecharBolao,
  listUsuarios,
  findUsuarioById,
  findUsuarioByEmail,
  createUsuario,
  updateUsuario,
  updateUsuarioStatus,
  vincularAdministrador,
  listAdministradoresBolao,
  removerVinculoAdministrador,
  listConfiguracoesGerais,
  upsertConfiguracaoGeral,
  createAuditLog
};
