const { query, transaction } = require('../../shared/database/client');

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
    administradorIds: row.administrador_ids || [],
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
    bolaoIds: row.bolao_ids || [],
    ultimoLoginAt: row.ultimo_login_at,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

function mapAdminVinculado(row) {
  return {
    vinculoId: row.vinculo_id,
    usuarioId: row.usuario_id,
    nome: row.nome,
    email: row.email,
    perfil: row.perfil_global,
    papel: row.perfil,
    status: row.status,
    entrouAt: row.criado_at
  };
}

async function listBoloes() {
  const result = await query(
    `
      select
        b.id,
        b.proprietario_id,
        b.nome,
        b.slug,
        b.descricao,
        b.data_inicio,
        b.data_fim,
        b.status,
        b.ativo,
        coalesce(admins.administrador_ids, '{}'::uuid[]) as administrador_ids,
        b.criado_at,
        b.atualizado_at
      from boloes b
      left join lateral (
        select array_agg(bu.usuario_id order by u.nome asc) as administrador_ids
        from boloes_usuarios bu
        join usuarios u on u.id = bu.usuario_id
        where bu.bolao_id = b.id
          and bu.perfil = 'administrador'
          and bu.ativo = true
          and u.perfil_global = 'administrador'
          and u.ativo = true
      ) admins on true
      order by b.criado_at desc
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

async function createBolao(data, executor = query) {
  const result = await executor(
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

async function createDefaultBolaoRules(bolaoId, executor = query) {
  await executor(
    `
      insert into configuracoes_principais_bolao (
        bolao_id,
        minutos_antecedencia_aposta,
        tipo_distribuicao_premio,
        observacoes_regras,
        ativo
      ) values ($1, 0, 'percentual', 'Regras padrao criadas automaticamente.', true)
      on conflict do nothing
    `,
    [bolaoId]
  );

  const regras = [
    ['PLACAR_EXATO', 'Placar exato', 'placar_exato', 10, 1],
    ['RESULTADO_CORRETO', 'Resultado correto', 'resultado', 5, 2],
    ['PLACAR_INVERTIDO', 'Placar invertido', 'resultado', 2, 3]
  ];

  for (const regra of regras) {
    await executor(
      `
        insert into regras_pontuacao (
          bolao_id,
          nome,
          codigo,
          descricao,
          tipo,
          pontos,
          prioridade,
          criterios,
          ativo,
          ordem
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,true,$7)
        on conflict (bolao_id, codigo) do nothing
      `,
      [bolaoId, regra[1], regra[0], regra[1], regra[2], regra[3], regra[4], JSON.stringify({ naoCumulativa: true })]
    );
  }

  const criterios = [
    ['PLACARES_EXATOS', 'Maior numero de placares exatos', 1],
    ['RESULTADOS_CORRETOS', 'Maior numero de resultados corretos', 2],
    ['PLACARES_INVERTIDOS', 'Maior numero de placares invertidos', 3],
    ['MENOR_DIFERENCA_GOLS', 'Menor diferenca total de gols', 4],
    ['ORDEM_PAGAMENTO', 'Ordem de pagamento', 5],
    ['ORDEM_ALFABETICA', 'Ordem alfabetica', 6]
  ];

  for (const criterio of criterios) {
    await executor(
      `
        insert into criterios_desempate (
          bolao_id,
          codigo,
          descricao,
          ordem,
          ativo
        ) values ($1,$2,$3,$4,true)
        on conflict (bolao_id, codigo) do nothing
      `,
      [bolaoId, criterio[0], criterio[1], criterio[2]]
    );
  }

  const premios = [
    [1, 70, '1o lugar'],
    [2, 20, '2o lugar'],
    [3, 10, '3o lugar']
  ];

  for (const premio of premios) {
    await executor(
      `
        insert into distribuicao_premios (
          bolao_id,
          posicao,
          percentual,
          descricao,
          ativo
        ) values ($1,$2,$3,$4,true)
        on conflict (bolao_id, posicao) do nothing
      `,
      [bolaoId, premio[0], premio[1], premio[2]]
    );
  }
}

async function ensureDefaultSportContext(bolaoId, executor = query) {
  await executor(
    `
      insert into competicoes (nome, codigo, provider, tipo_competicao, metadata)
      values ('Competicao personalizada', 'CUSTOM', 'manual', 'customizada', '{"origem":"default"}'::jsonb)
      on conflict do nothing
    `
  );

  await executor(
    `
      insert into competicoes_temporadas (competicao_id, nome, ativo, metadata)
      select id, 'Temporada padrao', true, '{"origem":"default"}'::jsonb
      from competicoes
      where provider = 'manual' and codigo = 'CUSTOM'
      on conflict do nothing
    `
  );

  await executor(
    `
      update boloes b
      set
        competicao_id = coalesce(b.competicao_id, c.id),
        temporada_id = coalesce(b.temporada_id, t.id)
      from competicoes c
      join competicoes_temporadas t on t.competicao_id = c.id
      where b.id = $1
        and c.provider = 'manual'
        and c.codigo = 'CUSTOM'
        and t.nome = 'Temporada padrao'
    `,
    [bolaoId]
  );
}

async function createBolaoWithDefaults(data) {
  return transaction(async (client) => {
    const executor = (text, params) => client.query(text, params);
    const bolao = await createBolao(data, executor);
    await ensureDefaultSportContext(bolao.id, executor);
    await createDefaultBolaoRules(bolao.id, executor);
    return bolao;
  });
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
      select
        u.id,
        u.nome,
        u.email,
        u.perfil_global,
        u.ativo,
        coalesce(links.bolao_ids, '{}'::uuid[]) as bolao_ids,
        u.ultimo_login_at,
        u.criado_at,
        u.atualizado_at
      from usuarios u
      left join lateral (
        select array_agg(bu.bolao_id order by b.nome asc) as bolao_ids
        from boloes_usuarios bu
        join boloes b on b.id = bu.bolao_id
        where bu.usuario_id = u.id
          and bu.perfil = 'administrador'
          and bu.ativo = true
      ) links on true
      where u.perfil_global in ('proprietario', 'administrador')
      order by u.nome asc
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
      set
        nome = $2,
        email = $3,
        perfil_global = $4,
        ativo = $5,
        senha_hash = coalesce($6, senha_hash)
      where id = $1
      returning id, nome, email, perfil_global, ativo, ultimo_login_at, criado_at, atualizado_at
    `,
    [id, data.nome, data.email, data.perfil, data.ativo, data.senhaHash || null]
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
      insert into boloes_usuarios (bolao_id, usuario_id, perfil, ativo)
      values ($1, $2, 'administrador', true)
      on conflict (bolao_id, usuario_id)
      do update set perfil = 'administrador', ativo = true
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
        bu.id as vinculo_id,
        bu.usuario_id,
        bu.perfil,
        case when bu.ativo then 'ativo' else 'removido' end as status,
        bu.criado_at,
        u.nome,
        u.email,
        u.perfil_global
      from boloes_usuarios bu
      join usuarios u on u.id = bu.usuario_id
      where bu.bolao_id = $1
        and bu.perfil = 'administrador'
        and bu.ativo = true
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
      update boloes_usuarios
      set ativo = false
      where bolao_id = $1
        and usuario_id = $2
        and perfil = 'administrador'
        and ativo = true
      returning id
    `,
    [bolaoId, usuarioId]
  );

  return result.rowCount > 0;
}

async function syncAdministradoresBolao(bolaoId, usuarioIds = []) {
  const ids = [...new Set((usuarioIds || []).filter(Boolean))];

  return transaction(async (client) => {
    await client.query(
      `
        update boloes_usuarios
        set ativo = false
        where bolao_id = $1
          and perfil = 'administrador'
          and (${ids.length ? 'usuario_id <> all($2::uuid[])' : 'true'})
      `,
      ids.length ? [bolaoId, ids] : [bolaoId]
    );

    for (const usuarioId of ids) {
      await client.query(
        `
          insert into boloes_usuarios (bolao_id, usuario_id, perfil, ativo)
          values ($1, $2, 'administrador', true)
          on conflict (bolao_id, usuario_id)
          do update set perfil = 'administrador', ativo = true
        `,
        [bolaoId, usuarioId]
      );
    }
  });
}

async function syncBoloesUsuarioAdministrador(usuarioId, bolaoIds = []) {
  const ids = [...new Set((bolaoIds || []).filter(Boolean))];

  return transaction(async (client) => {
    await client.query(
      `
        update boloes_usuarios
        set ativo = false
        where usuario_id = $1
          and perfil = 'administrador'
          and exists (
            select 1
            from boloes b
            where b.id = boloes_usuarios.bolao_id
              and b.ativo = true
              and b.status = 'ativo'
          )
          and (${ids.length ? 'bolao_id <> all($2::uuid[])' : 'true'})
      `,
      ids.length ? [usuarioId, ids] : [usuarioId]
    );

    for (const bolaoId of ids) {
      await client.query(
        `
          insert into boloes_usuarios (bolao_id, usuario_id, perfil, ativo)
          values ($1, $2, 'administrador', true)
          on conflict (bolao_id, usuario_id)
          do update set perfil = 'administrador', ativo = true
        `,
        [bolaoId, usuarioId]
      );
    }
  });
}

async function listConfiguracoesGerais() {
  const result = await query(
    `
      select chave, valor, descricao, ativo, criado_at, atualizado_at
      from configuracoes_gerais
      where chave in (
        'sessao.tempo_segundos',
        'email.remetente',
        'app.url_publica',
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
  createDefaultBolaoRules,
  ensureDefaultSportContext,
  createBolaoWithDefaults,
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
  syncAdministradoresBolao,
  syncBoloesUsuarioAdministrador,
  listConfiguracoesGerais,
  upsertConfiguracaoGeral,
  createAuditLog
};
