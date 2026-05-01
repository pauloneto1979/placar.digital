const { query } = require('../../shared/database/client');

function mapConfiguracao(row) {
  return row
    ? {
        id: row.id,
        bolaoId: row.bolao_id,
        minutosAntecedenciaAposta: row.minutos_antecedencia_aposta,
        tipoDistribuicaoPremio: row.tipo_distribuicao_premio,
        observacoesRegras: row.observacoes_regras,
        ativo: row.ativo,
        criadoAt: row.criado_at,
        atualizadoAt: row.atualizado_at
      }
    : null;
}

function mapRegra(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    codigo: row.codigo,
    descricao: row.descricao,
    pontos: row.pontos,
    prioridade: row.prioridade,
    ativo: row.ativo,
    criterios: row.criterios,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

function mapCriterio(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    codigo: row.codigo,
    descricao: row.descricao,
    ordem: row.ordem,
    ativo: row.ativo,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

function mapDistribuicao(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    posicao: row.posicao,
    percentual: Number(row.percentual),
    descricao: row.descricao,
    ativo: row.ativo,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

async function findBolaoById(bolaoId) {
  const result = await query('select id, nome, ativo from boloes where id = $1 limit 1', [bolaoId]);
  return result.rows[0] || null;
}

async function isAdministradorVinculado(usuarioId, bolaoId) {
  const result = await query(
    `
      select 1
      from participantes
      where usuario_id = $1
        and bolao_id = $2
        and papel = 'administrador'
        and status = 'ativo'
      limit 1
    `,
    [usuarioId, bolaoId]
  );

  return result.rowCount > 0;
}

async function getConfiguracaoAtiva(bolaoId) {
  const result = await query(
    `
      select *
      from configuracoes_principais_bolao
      where bolao_id = $1 and ativo = true
      limit 1
    `,
    [bolaoId]
  );

  return mapConfiguracao(result.rows[0]);
}

async function listConfiguracoes(bolaoId) {
  const result = await query(
    `
      select *
      from configuracoes_principais_bolao
      where bolao_id = $1
      order by criado_at desc
    `,
    [bolaoId]
  );

  return result.rows.map(mapConfiguracao);
}

async function findConfiguracaoById(id) {
  const result = await query('select * from configuracoes_principais_bolao where id = $1 limit 1', [id]);
  return mapConfiguracao(result.rows[0]);
}

async function createConfiguracao(data) {
  const result = await query(
    `
      insert into configuracoes_principais_bolao (
        bolao_id,
        minutos_antecedencia_aposta,
        tipo_distribuicao_premio,
        observacoes_regras,
        ativo
      ) values ($1, $2, $3, $4, $5)
      returning *
    `,
    [
      data.bolaoId,
      data.minutosAntecedenciaAposta,
      data.tipoDistribuicaoPremio,
      data.observacoesRegras,
      data.ativo
    ]
  );

  return mapConfiguracao(result.rows[0]);
}

async function updateConfiguracao(id, data) {
  const result = await query(
    `
      update configuracoes_principais_bolao
      set
        minutos_antecedencia_aposta = $2,
        tipo_distribuicao_premio = $3,
        observacoes_regras = $4,
        ativo = $5
      where id = $1
      returning *
    `,
    [id, data.minutosAntecedenciaAposta, data.tipoDistribuicaoPremio, data.observacoesRegras, data.ativo]
  );

  return mapConfiguracao(result.rows[0]);
}

async function listRegras(bolaoId, includeInactive = false) {
  const result = await query(
    `
      select *
      from regras_pontuacao
      where bolao_id = $1
        and ($2 = true or ativo = true)
      order by prioridade desc, pontos desc, codigo asc
    `,
    [bolaoId, includeInactive]
  );

  return result.rows.map(mapRegra);
}

async function findRegraById(id) {
  const result = await query('select * from regras_pontuacao where id = $1 limit 1', [id]);
  return result.rows[0] ? mapRegra(result.rows[0]) : null;
}

async function createRegra(data) {
  const result = await query(
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
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      returning *
    `,
    [
      data.bolaoId,
      data.descricao,
      data.codigo,
      data.descricao,
      data.tipo,
      data.pontos,
      data.prioridade,
      JSON.stringify(data.criterios || {}),
      data.ativo,
      data.prioridade
    ]
  );

  return mapRegra(result.rows[0]);
}

async function updateRegra(id, data) {
  const result = await query(
    `
      update regras_pontuacao
      set
        nome = $2,
        codigo = $3,
        descricao = $4,
        tipo = $5,
        pontos = $6,
        prioridade = $7,
        criterios = $8,
        ativo = $9,
        ordem = $10
      where id = $1
      returning *
    `,
    [
      id,
      data.descricao,
      data.codigo,
      data.descricao,
      data.tipo,
      data.pontos,
      data.prioridade,
      JSON.stringify(data.criterios || {}),
      data.ativo,
      data.prioridade
    ]
  );

  return result.rows[0] ? mapRegra(result.rows[0]) : null;
}

async function deleteRegra(id) {
  const result = await query('update regras_pontuacao set ativo = false where id = $1 returning *', [id]);
  return result.rows[0] ? mapRegra(result.rows[0]) : null;
}

async function listCriterios(bolaoId, includeInactive = false) {
  const result = await query(
    `
      select *
      from criterios_desempate
      where bolao_id = $1
        and ($2 = true or ativo = true)
      order by ordem asc
    `,
    [bolaoId, includeInactive]
  );

  return result.rows.map(mapCriterio);
}

async function findCriterioById(id) {
  const result = await query('select * from criterios_desempate where id = $1 limit 1', [id]);
  return result.rows[0] ? mapCriterio(result.rows[0]) : null;
}

async function createCriterio(data) {
  const result = await query(
    `
      insert into criterios_desempate (bolao_id, codigo, descricao, ordem, ativo)
      values ($1, $2, $3, $4, $5)
      returning *
    `,
    [data.bolaoId, data.codigo, data.descricao, data.ordem, data.ativo]
  );

  return mapCriterio(result.rows[0]);
}

async function updateCriterio(id, data) {
  const result = await query(
    `
      update criterios_desempate
      set codigo = $2, descricao = $3, ordem = $4, ativo = $5
      where id = $1
      returning *
    `,
    [id, data.codigo, data.descricao, data.ordem, data.ativo]
  );

  return result.rows[0] ? mapCriterio(result.rows[0]) : null;
}

async function deleteCriterio(id) {
  const result = await query('update criterios_desempate set ativo = false where id = $1 returning *', [id]);
  return result.rows[0] ? mapCriterio(result.rows[0]) : null;
}

async function listDistribuicoes(bolaoId, includeInactive = false) {
  const result = await query(
    `
      select *
      from distribuicao_premios
      where bolao_id = $1
        and ($2 = true or ativo = true)
      order by posicao asc
    `,
    [bolaoId, includeInactive]
  );

  return result.rows.map(mapDistribuicao);
}

async function findDistribuicaoById(id) {
  const result = await query('select * from distribuicao_premios where id = $1 limit 1', [id]);
  return result.rows[0] ? mapDistribuicao(result.rows[0]) : null;
}

async function createDistribuicao(data) {
  const result = await query(
    `
      insert into distribuicao_premios (bolao_id, posicao, percentual, descricao, ativo)
      values ($1, $2, $3, $4, $5)
      returning *
    `,
    [data.bolaoId, data.posicao, data.percentual, data.descricao, data.ativo]
  );

  return mapDistribuicao(result.rows[0]);
}

async function updateDistribuicao(id, data) {
  const result = await query(
    `
      update distribuicao_premios
      set posicao = $2, percentual = $3, descricao = $4, ativo = $5
      where id = $1
      returning *
    `,
    [id, data.posicao, data.percentual, data.descricao, data.ativo]
  );

  return result.rows[0] ? mapDistribuicao(result.rows[0]) : null;
}

async function deleteDistribuicao(id) {
  const result = await query('update distribuicao_premios set ativo = false where id = $1 returning *', [id]);
  return result.rows[0] ? mapDistribuicao(result.rows[0]) : null;
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

const configuracoesBolaoRepository = {
  getMetadata() {
    return {
      module: 'configuracoes_bolao',
      persistence: 'postgresql',
      implemented: true
    };
  },
  findBolaoById,
  isAdministradorVinculado,
  getConfiguracaoAtiva,
  listConfiguracoes,
  findConfiguracaoById,
  createConfiguracao,
  updateConfiguracao,
  listRegras,
  findRegraById,
  createRegra,
  updateRegra,
  deleteRegra,
  listCriterios,
  findCriterioById,
  createCriterio,
  updateCriterio,
  deleteCriterio,
  listDistribuicoes,
  findDistribuicaoById,
  createDistribuicao,
  updateDistribuicao,
  deleteDistribuicao,
  createAuditLog
};

module.exports = {
  configuracoesBolaoRepository
};
