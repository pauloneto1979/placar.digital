const { query } = require('../../shared/database/client');

async function getPartidaParaCalculo(partidaId) {
  const result = await query('select * from partidas where id = $1 limit 1', [partidaId]);
  return result.rows[0] || null;
}

async function listPartidasFinalizadasBolao(bolaoId) {
  const result = await query(
    `
      select id
      from partidas
      where bolao_id = $1
        and status in ('finalizada', 'encerrada')
        and placar_mandante is not null
        and placar_visitante is not null
    `,
    [bolaoId]
  );
  return result.rows;
}

async function listRegrasPontuacao(bolaoId) {
  const result = await query(
    `
      select id, codigo, pontos, prioridade
      from regras_pontuacao
      where bolao_id = $1 and ativo = true
      order by prioridade desc, pontos desc
    `,
    [bolaoId]
  );
  return result.rows;
}

async function getMinutosAntecedencia(bolaoId) {
  const result = await query(
    `
      select minutos_antecedencia_aposta
      from configuracoes_principais_bolao
      where bolao_id = $1 and ativo = true
      limit 1
    `,
    [bolaoId]
  );
  return result.rows[0]?.minutos_antecedencia_aposta || 0;
}

async function listApostasPartida(partidaId) {
  const result = await query(
    `
      select
        a.*,
        p.inicio_at,
        p.placar_mandante as resultado_mandante,
        p.placar_visitante as resultado_visitante,
        p.status as partida_status
      from apostas a
      join partidas p on p.id = a.partida_id
      where a.partida_id = $1
    `,
    [partidaId]
  );
  return result.rows;
}

async function upsertPontuacao(data) {
  const result = await query(
    `
      insert into pontuacoes_apostas (
        bolao_id,
        partida_id,
        participante_id,
        aposta_id,
        regra_pontuacao_id,
        codigo_regra_aplicada,
        pontos,
        calculado_em
      ) values ($1,$2,$3,$4,$5,$6,$7,now())
      on conflict (aposta_id)
      do update set
        regra_pontuacao_id = excluded.regra_pontuacao_id,
        codigo_regra_aplicada = excluded.codigo_regra_aplicada,
        pontos = excluded.pontos,
        calculado_em = now()
      returning *
    `,
    [
      data.bolaoId,
      data.partidaId,
      data.participanteId,
      data.apostaId,
      data.regraPontuacaoId,
      data.codigoRegraAplicada,
      data.pontos
    ]
  );
  return result.rows[0];
}

async function updateApostaPontuacao(apostaId, pontos) {
  await query("update apostas set pontos_calculados = $2, status = 'calculada' where id = $1", [apostaId, pontos]);
}

async function getRankingBase(bolaoId) {
  const result = await query(
    `
      with pontuacoes as (
        select
          p.bolao_id,
          p.id as participante_id,
          p.nome,
          coalesce(sum(pa.pontos), 0)::int as pontos_total,
          count(pa.id) filter (where a.status <> 'cancelada')::int as apostas_total,
          count(pa.id) filter (where pa.codigo_regra_aplicada = 'PLACAR_EXATO')::int as acertos_exatos,
          count(pa.id) filter (where pa.codigo_regra_aplicada = 'RESULTADO_CORRETO')::int as acertos_resultado,
          count(pa.id) filter (where pa.codigo_regra_aplicada = 'PLACAR_INVERTIDO')::int as acertos_invertidos,
          coalesce(sum(
            case
              when pa.id is null or a.status = 'cancelada' or m.placar_mandante is null or m.placar_visitante is null then 0
              else abs(a.placar_mandante - m.placar_mandante) + abs(a.placar_visitante - m.placar_visitante)
            end
          ), 0)::int as diferenca_gols_total
        from participantes p
        left join pontuacoes_apostas pa on pa.participante_id = p.id and pa.bolao_id = p.bolao_id
        left join apostas a on a.id = pa.aposta_id
        left join partidas m on m.id = pa.partida_id
        where p.bolao_id = $1
          and p.papel = 'apostador'
          and p.status <> 'removido'
        group by p.bolao_id, p.id, p.nome
      ),
      pagamentos_participante as (
        select
          participante_id,
          min(coalesce(pago_at, atualizado_at, criado_at)) as ordem_pagamento
        from pagamentos
        where bolao_id = $1
          and status = 'pago'
        group by participante_id
      )
      select
        pontuacoes.*,
        pagamentos_participante.ordem_pagamento
      from pontuacoes
      left join pagamentos_participante on pagamentos_participante.participante_id = pontuacoes.participante_id
    `,
    [bolaoId]
  );
  return result.rows;
}

async function listCriteriosDesempate(bolaoId) {
  const result = await query(
    `
      select codigo, descricao, ordem, ativo
      from criterios_desempate
      where bolao_id = $1 and ativo = true
      order by ordem asc
    `,
    [bolaoId]
  );
  return result.rows;
}

async function listDistribuicaoPremios(bolaoId) {
  const result = await query(
    `
      select posicao, percentual, descricao, ativo
      from distribuicao_premios
      where bolao_id = $1 and ativo = true
      order by posicao asc
    `,
    [bolaoId]
  );
  return result.rows;
}

async function getTotalArrecadado(bolaoId) {
  const result = await query(
    "select coalesce(sum(valor), 0)::numeric as total from pagamentos where bolao_id = $1 and status = 'pago'",
    [bolaoId]
  );
  return Number(result.rows[0]?.total || 0);
}

async function saveRankingRows(bolaoId, rows) {
  for (const row of rows) {
    await query(
      `
        insert into ranking (
          bolao_id,
          participante_id,
          pontos_total,
          apostas_total,
          acertos_exatos,
          acertos_resultado,
          acertos_invertidos,
          diferenca_gols_total,
          ordem_pagamento,
          posicao,
          premio_previsto,
          atualizado_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
        on conflict (bolao_id, participante_id)
        do update set
          pontos_total = excluded.pontos_total,
          apostas_total = excluded.apostas_total,
          acertos_exatos = excluded.acertos_exatos,
          acertos_resultado = excluded.acertos_resultado,
          acertos_invertidos = excluded.acertos_invertidos,
          diferenca_gols_total = excluded.diferenca_gols_total,
          ordem_pagamento = excluded.ordem_pagamento,
          posicao = excluded.posicao,
          premio_previsto = excluded.premio_previsto,
          atualizado_at = now()
      `,
      [
        bolaoId,
        row.participanteId,
        row.pontosTotal,
        row.apostasTotal,
        row.acertosExatos,
        row.acertosResultado,
        row.acertosInvertidos,
        row.diferencaGolsTotal,
        row.ordemPagamento || null,
        row.posicao,
        row.valorPremioPrevisto
      ]
    );
  }
}

async function rebuildRanking(bolaoId, rows = null) {
  if (rows) {
    await saveRankingRows(bolaoId, rows);
    return;
  }

  await query(
    `
      insert into ranking (
        bolao_id,
        participante_id,
        pontos_total,
        apostas_total,
        acertos_exatos,
        acertos_resultado,
        acertos_invertidos,
        diferenca_gols_total,
        ordem_pagamento,
        posicao,
        premio_previsto,
        atualizado_at
      )
      select
        base.bolao_id,
        base.participante_id,
        base.pontos_total,
        base.apostas_total,
        base.acertos_exatos,
        base.acertos_resultado,
        base.acertos_invertidos,
        base.diferenca_gols_total,
        base.ordem_pagamento,
        row_number() over (order by base.pontos_total desc, base.nome asc)::int as posicao,
        0,
        now()
      from (
        select
          p.bolao_id,
          p.id as participante_id,
          p.nome,
          coalesce(sum(pa.pontos), 0)::int as pontos_total,
          count(pa.id)::int as apostas_total,
          count(pa.id) filter (where pa.codigo_regra_aplicada = 'PLACAR_EXATO')::int as acertos_exatos,
          count(pa.id) filter (where pa.codigo_regra_aplicada = 'RESULTADO_CORRETO')::int as acertos_resultado,
          count(pa.id) filter (where pa.codigo_regra_aplicada = 'PLACAR_INVERTIDO')::int as acertos_invertidos,
          0::int as diferenca_gols_total,
          null::timestamptz as ordem_pagamento
        from participantes p
        left join pontuacoes_apostas pa on pa.participante_id = p.id and pa.bolao_id = p.bolao_id
        where p.bolao_id = $1
          and p.papel = 'apostador'
          and p.status <> 'removido'
        group by p.bolao_id, p.id, p.nome
      ) base
      on conflict (bolao_id, participante_id)
      do update set
        pontos_total = excluded.pontos_total,
        apostas_total = excluded.apostas_total,
        acertos_exatos = excluded.acertos_exatos,
        acertos_resultado = excluded.acertos_resultado,
        acertos_invertidos = excluded.acertos_invertidos,
        diferenca_gols_total = excluded.diferenca_gols_total,
        ordem_pagamento = excluded.ordem_pagamento,
        posicao = excluded.posicao,
        premio_previsto = excluded.premio_previsto,
        atualizado_at = now()
    `,
    [bolaoId]
  );
}

async function createAuditLog(data) {
  await query(
    `
      insert into auditoria_logs (usuario_id, bolao_id, entidade, entidade_id, acao, dados_anteriores, dados_novos, ip, user_agent)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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

async function getRankingAtual(bolaoId) {
  const result = await query(
    `
      select
        p.id as participante_id,
        p.nome,
        coalesce(r.pontos_total, 0)::int as pontos_total,
        coalesce(r.apostas_total, 0)::int as apostas_total,
        coalesce(r.acertos_exatos, 0)::int as acertos_exatos,
        coalesce(r.acertos_resultado, 0)::int as acertos_resultado,
        coalesce(r.acertos_invertidos, 0)::int as acertos_invertidos,
        coalesce(r.diferenca_gols_total, 0)::int as diferenca_gols_total,
        r.ordem_pagamento,
        coalesce(r.posicao, 999999)::int as posicao,
        coalesce(r.premio_previsto, 0)::numeric as premio_previsto
      from participantes p
      left join ranking r on r.participante_id = p.id and r.bolao_id = p.bolao_id
      where p.bolao_id = $1
        and p.papel = 'apostador'
        and p.status <> 'removido'
      order by coalesce(r.posicao, 999999) asc, p.nome asc
    `,
    [bolaoId]
  );

  return result.rows.map((row) => ({
    participanteId: row.participante_id,
    participante: row.nome,
    pontosAtuais: row.pontos_total,
    posicao: row.posicao,
    acertosExatos: row.acertos_exatos,
    acertosResultado: row.acertos_resultado,
    acertosInvertidos: row.acertos_invertidos,
    apostasValidas: row.apostas_total,
    diferencaGolsTotal: row.diferenca_gols_total,
    ordemPagamento: row.ordem_pagamento,
    valorPremioPrevisto: Number(row.premio_previsto || 0)
  }));
}

async function getRegrasVisiveis(bolaoId) {
  const [config, regras, criterios, premios] = await Promise.all([
    query('select observacoes_regras from configuracoes_principais_bolao where bolao_id = $1 and ativo = true limit 1', [bolaoId]),
    query('select codigo, descricao, pontos, prioridade from regras_pontuacao where bolao_id = $1 and ativo = true order by prioridade desc, pontos desc', [bolaoId]),
    query('select codigo, descricao, ordem from criterios_desempate where bolao_id = $1 and ativo = true order by ordem asc', [bolaoId]),
    query('select posicao, percentual, descricao from distribuicao_premios where bolao_id = $1 and ativo = true order by posicao asc', [bolaoId])
  ]);

  return {
    observacoesRegras: config.rows[0]?.observacoes_regras || null,
    regrasPontuacao: regras.rows,
    criteriosDesempate: criterios.rows,
    distribuicaoPremios: premios.rows
  };
}

module.exports = {
  getPartidaParaCalculo,
  listPartidasFinalizadasBolao,
  listRegrasPontuacao,
  getMinutosAntecedencia,
  listApostasPartida,
  upsertPontuacao,
  updateApostaPontuacao,
  getRankingBase,
  listCriteriosDesempate,
  listDistribuicaoPremios,
  getTotalArrecadado,
  saveRankingRows,
  rebuildRanking,
  createAuditLog,
  getRankingAtual,
  getRankingProvisorio: getRankingAtual,
  getRegrasVisiveis
};
