const { query } = require('../../shared/database/client');

function mapPartida(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    faseId: row.fase_id,
    fase: row.fase_nome,
    dataHora: row.inicio_at,
    estadio: row.estadio,
    mandante: { id: row.time_mandante_id, nome: row.mandante_nome, sigla: row.mandante_sigla },
    visitante: { id: row.time_visitante_id, nome: row.visitante_nome, sigla: row.visitante_sigla },
    placarMandante: row.placar_mandante,
    placarVisitante: row.placar_visitante,
    status: row.status
  };
}

function mapAposta(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    participanteId: row.participante_id,
    partidaId: row.partida_id,
    palpiteMandante: row.placar_mandante,
    palpiteVisitante: row.placar_visitante,
    status: row.status,
    dataHoraAposta: row.registrada_at,
    atualizadoAt: row.atualizado_at
  };
}

async function getDashboard(bolaoId) {
  const result = await query(
    `
      select
        (select count(*)::int from participantes where bolao_id = $1 and papel = 'apostador' and status <> 'removido') as participantes_total,
        (select count(*)::int from partidas where bolao_id = $1 and ativo = true) as partidas_total,
        (select count(*)::int from partidas where bolao_id = $1 and status in ('finalizada', 'encerrada')) as partidas_finalizadas,
        (select coalesce(sum(valor), 0)::numeric from pagamentos where bolao_id = $1 and status = 'pago') as total_arrecadado
    `,
    [bolaoId]
  );
  return result.rows[0];
}

async function getPartidasPorStatus(bolaoId) {
  const result = await query(
    'select status, count(*)::int as total from partidas where bolao_id = $1 group by status order by status',
    [bolaoId]
  );
  return result.rows;
}

async function getTop3Ranking(bolaoId) {
  const result = await query(
    `
      select p.id as participante_id, p.nome, coalesce(r.pontos_total, 0)::int as pontos, coalesce(r.posicao, 999999)::int as posicao
      from participantes p
      left join ranking r on r.participante_id = p.id and r.bolao_id = p.bolao_id
      where p.bolao_id = $1
        and p.papel = 'apostador'
        and p.status <> 'removido'
      order by coalesce(r.posicao, 999999) asc, coalesce(r.pontos_total, 0) desc, p.nome asc
      limit 3
    `,
    [bolaoId]
  );
  return result.rows.map((row, index) => ({
    participanteId: row.participante_id,
    participante: row.nome,
    pontosAtuais: row.pontos,
    posicao: row.posicao === 999999 ? index + 1 : row.posicao
  }));
}

async function getJogosDoDia(bolaoId) {
  const result = await query(
    `
      select p.*, f.nome as fase_nome, tm.nome as mandante_nome, tm.sigla as mandante_sigla, tv.nome as visitante_nome, tv.sigla as visitante_sigla
      from partidas p
      left join fases f on f.id = p.fase_id
      join times tm on tm.id = p.time_mandante_id
      join times tv on tv.id = p.time_visitante_id
      where p.bolao_id = $1
        and p.inicio_at::date = current_date
      order by p.inicio_at asc
    `,
    [bolaoId]
  );
  return result.rows.map(mapPartida);
}

async function listJogos(bolaoId, filters) {
  const result = await query(
    `
      select p.*, f.nome as fase_nome, tm.nome as mandante_nome, tm.sigla as mandante_sigla, tv.nome as visitante_nome, tv.sigla as visitante_sigla
      from partidas p
      left join fases f on f.id = p.fase_id
      join times tm on tm.id = p.time_mandante_id
      join times tv on tv.id = p.time_visitante_id
      where p.bolao_id = $1
        and ($2::uuid is null or p.fase_id = $2::uuid)
        and ($3::date is null or p.inicio_at::date = $3::date)
        and ($4::uuid is null or p.time_mandante_id = $4::uuid or p.time_visitante_id = $4::uuid)
        and ($5::text is null or p.status::text = $5::text)
      order by p.inicio_at asc
    `,
    [bolaoId, filters.faseId || null, filters.data || null, filters.timeId || null, filters.status || null]
  );
  return result.rows.map(mapPartida);
}

async function findPartidaById(partidaId) {
  const result = await query('select * from partidas where id = $1 limit 1', [partidaId]);
  return result.rows[0] || null;
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

async function findAposta(participanteId, partidaId) {
  const result = await query(
    'select * from apostas where participante_id = $1 and partida_id = $2 limit 1',
    [participanteId, partidaId]
  );
  return result.rows[0] ? mapAposta(result.rows[0]) : null;
}

async function upsertAposta(data) {
  const result = await query(
    `
      insert into apostas (bolao_id, participante_id, partida_id, placar_mandante, placar_visitante, status, registrada_at)
      values ($1, $2, $3, $4, $5, $6, now())
      on conflict (participante_id, partida_id)
      do update set placar_mandante = excluded.placar_mandante, placar_visitante = excluded.placar_visitante, status = excluded.status
      returning *
    `,
    [data.bolaoId, data.participanteId, data.partidaId, data.palpiteMandante, data.palpiteVisitante, data.status]
  );
  return mapAposta(result.rows[0]);
}

async function listMinhasApostas(bolaoId, participanteId) {
  const result = await query(
    `
      select
        a.id,
        a.bolao_id,
        a.participante_id,
        p.id as partida_id,
        a.placar_mandante,
        a.placar_visitante,
        a.status,
        a.registrada_at,
        a.atualizado_at,
        p.inicio_at,
        p.estadio,
        p.placar_mandante as oficial_mandante,
        p.placar_visitante as oficial_visitante,
        p.status as partida_status,
        f.nome as fase_nome,
        tm.nome as mandante_nome,
        tv.nome as visitante_nome
      from partidas p
      left join apostas a on a.partida_id = p.id and a.participante_id = $2
      left join fases f on f.id = p.fase_id
      join times tm on tm.id = p.time_mandante_id
      join times tv on tv.id = p.time_visitante_id
      where p.bolao_id = $1
      order by p.inicio_at asc
    `,
    [bolaoId, participanteId]
  );
  return result.rows;
}

async function getRegras(bolaoId) {
  const [config, regras, criterios, premios] = await Promise.all([
    query('select * from configuracoes_principais_bolao where bolao_id = $1 and ativo = true limit 1', [bolaoId]),
    query('select codigo, descricao, pontos, prioridade, ativo from regras_pontuacao where bolao_id = $1 and ativo = true order by prioridade desc, pontos desc', [bolaoId]),
    query('select codigo, descricao, ordem, ativo from criterios_desempate where bolao_id = $1 and ativo = true order by ordem asc', [bolaoId]),
    query('select posicao, percentual, descricao, ativo from distribuicao_premios where bolao_id = $1 and ativo = true order by posicao asc', [bolaoId])
  ]);
  return {
    observacoesRegras: config.rows[0]?.observacoes_regras || null,
    regrasPontuacao: regras.rows,
    criteriosDesempate: criterios.rows,
    distribuicaoPremios: premios.rows
  };
}

module.exports = {
  getDashboard,
  getPartidasPorStatus,
  getTop3Ranking,
  getJogosDoDia,
  listJogos,
  findPartidaById,
  getMinutosAntecedencia,
  findAposta,
  upsertAposta,
  listMinhasApostas,
  getRegras
};
