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

async function rebuildRanking(bolaoId) {
  await query(
    `
      insert into ranking (
        bolao_id,
        participante_id,
        pontos_total,
        apostas_total,
        acertos_exatos,
        acertos_resultado,
        posicao,
        atualizado_at
      )
      select
        p.bolao_id,
        p.id,
        coalesce(sum(pa.pontos), 0)::int as pontos_total,
        count(pa.id)::int as apostas_total,
        count(*) filter (where pa.codigo_regra_aplicada = 'PLACAR_EXATO')::int as acertos_exatos,
        count(*) filter (where pa.codigo_regra_aplicada = 'RESULTADO_CORRETO')::int as acertos_resultado,
        row_number() over (order by coalesce(sum(pa.pontos), 0) desc, p.nome asc)::int as posicao,
        now()
      from participantes p
      left join pontuacoes_apostas pa on pa.participante_id = p.id and pa.bolao_id = p.bolao_id
      where p.bolao_id = $1
        and p.papel = 'apostador'
        and p.status <> 'removido'
      group by p.bolao_id, p.id, p.nome
      on conflict (bolao_id, participante_id)
      do update set
        pontos_total = excluded.pontos_total,
        apostas_total = excluded.apostas_total,
        acertos_exatos = excluded.acertos_exatos,
        acertos_resultado = excluded.acertos_resultado,
        posicao = excluded.posicao,
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

async function getRankingProvisorio(bolaoId) {
  const result = await query(
    `
      select
        base.participante_id,
        base.nome,
        base.pontos,
        base.posicao,
        dp.percentual as percentual_premio
      from (
        select
          p.id as participante_id,
          p.nome,
          coalesce(r.pontos_total, 0)::int as pontos,
          coalesce(r.posicao, row_number() over (order by coalesce(r.pontos_total, 0) desc, p.nome asc))::int as posicao,
          p.bolao_id
        from participantes p
        left join ranking r on r.participante_id = p.id and r.bolao_id = p.bolao_id
        where p.bolao_id = $1
          and p.papel = 'apostador'
          and p.status <> 'removido'
      ) base
      left join distribuicao_premios dp on dp.bolao_id = base.bolao_id and dp.posicao = base.posicao and dp.ativo = true
      order by base.posicao asc
    `,
    [bolaoId]
  );

  return result.rows.map((row) => ({
    participanteId: row.participante_id,
    participante: row.nome,
    pontosAtuais: row.pontos,
    posicao: row.posicao,
    valorPremioPrevisto: row.percentual_premio ? { percentual: Number(row.percentual_premio) } : null
  }));
}

module.exports = {
  getPartidaParaCalculo,
  listPartidasFinalizadasBolao,
  listRegrasPontuacao,
  getMinutosAntecedencia,
  listApostasPartida,
  upsertPontuacao,
  updateApostaPontuacao,
  rebuildRanking,
  createAuditLog,
  getRankingProvisorio
};
