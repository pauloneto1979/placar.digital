const { query, transaction } = require('../../shared/database/client');

function map(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    competicaoId: row.competicao_id,
    temporadaId: row.temporada_id,
    faseId: row.fase_id,
    grupoId: row.grupo_id,
    rodadaId: row.rodada_id,
    timeMandanteId: row.time_mandante_id,
    timeVisitanteId: row.time_visitante_id,
    dataHora: row.inicio_at,
    estadio: row.estadio,
    placarMandante: row.placar_mandante,
    placarVisitante: row.placar_visitante,
    status: row.status,
    ativo: row.ativo,
    resultadoConfirmado: row.resultado_confirmado,
    footballDataMatchId: row.football_data_match_id,
    competicao: row.competicao_nome ? {
      id: row.competicao_id,
      nome: row.competicao_nome,
      codigo: row.competicao_codigo,
      tipo: row.tipo_competicao
    } : null,
    temporada: row.temporada_nome ? {
      id: row.temporada_id,
      nome: row.temporada_nome,
      anoInicio: row.temporada_ano_inicio,
      anoFim: row.temporada_ano_fim
    } : null,
    faseNome: row.fase_nome,
    faseCodigo: row.fase_codigo,
    faseTipo: row.tipo_fase,
    grupoNome: row.grupo_nome,
    grupoCodigo: row.grupo_codigo,
    rodadaNome: row.rodada_nome,
    rodadaNumero: row.rodada_numero,
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

async function listByBolao(bolaoId) {
  const result = await query(
    `
      select
        p.*,
        c.nome as competicao_nome,
        c.codigo as competicao_codigo,
        c.tipo_competicao,
        s.nome as temporada_nome,
        s.ano_inicio as temporada_ano_inicio,
        s.ano_fim as temporada_ano_fim,
        f.nome as fase_nome,
        f.codigo as fase_codigo,
        f.tipo_fase,
        g.nome as grupo_nome,
        g.codigo as grupo_codigo,
        r.nome as rodada_nome,
        r.numero as rodada_numero
      from partidas p
      left join competicoes c on c.id = p.competicao_id
      left join competicoes_temporadas s on s.id = p.temporada_id
      left join fases f on f.id = p.fase_id
      left join grupos g on g.id = p.grupo_id
      left join rodadas r on r.id = p.rodada_id
      where p.bolao_id=$1
      order by p.inicio_at asc
    `,
    [bolaoId]
  );
  return result.rows.map(map);
}
async function findById(id) {
  const result = await query('select * from partidas where id=$1 limit 1', [id]);
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function listByFootballDataMatchIds(matchIds) {
  if (!Array.isArray(matchIds) || !matchIds.length) return [];
  const result = await query(
    'select * from partidas where football_data_match_id = any($1::text[]) order by inicio_at asc',
    [matchIds]
  );
  return result.rows.map(map);
}
async function listLinkedForFootballDataSync() {
  const result = await query(
    `
      select *
      from partidas
      where football_data_match_id is not null
        and (
          resultado_confirmado is distinct from true
          or status <> 'finalizada'
        )
        and inicio_at >= now() - interval '7 days'
        and inicio_at <= now() + interval '10 days'
      order by inicio_at asc
    `
  );
  return result.rows.map(map);
}
async function findByFootballDataMatchId(matchId, bolaoId = null) {
  const result = bolaoId
    ? await query(
      'select * from partidas where bolao_id = $1 and football_data_match_id = $2 limit 1',
      [bolaoId, String(matchId)]
    )
    : await query(
      'select * from partidas where football_data_match_id = $1 limit 1',
      [String(matchId)]
    );
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function findDuplicateLocalMatch(client, item, mandanteId, visitanteId) {
  const result = await client.query(
    `
      select *
      from partidas
      where bolao_id = $1
        and time_mandante_id = $2
        and time_visitante_id = $3
        and inicio_at = $4
      limit 1
    `,
    [item.bolaoId, mandanteId, visitanteId, item.dataHora]
  );
  return result.rows[0] || null;
}
async function faseBelongsToBolao(faseId, bolaoId) {
  const result = await query('select 1 from fases where id=$1 and bolao_id=$2 and ativo=true limit 1', [faseId, bolaoId]);
  return result.rowCount > 0;
}
async function timeAtivo(id) {
  const result = await query('select 1 from times where id=$1 and ativo=true limit 1', [id]);
  return result.rowCount > 0;
}
async function timeAtivoNoBolao(id, bolaoId) {
  const result = await query(
    `
      select 1
      from times t
      join boloes_times bt on bt.time_id = t.id
      where t.id = $1
        and bt.bolao_id = $2
        and t.ativo = true
      limit 1
    `,
    [id, bolaoId]
  );
  return result.rowCount > 0;
}
async function create(data) {
  const result = await query(
    `
      insert into partidas (bolao_id,competicao_id,temporada_id,fase_id,grupo_id,rodada_id,time_mandante_id,time_visitante_id,inicio_at,estadio,placar_mandante,placar_visitante,status,ativo,resultado_confirmado,football_data_match_id)
      values (
        $1,
        coalesce($2, (select competicao_id from boloes where id = $1)),
        coalesce($3, (select temporada_id from boloes where id = $1)),
        $4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )
      returning *
    `,
    [data.bolaoId, data.competicaoId || null, data.temporadaId || null, data.faseId, data.grupoId || null, data.rodadaId || null, data.timeMandanteId, data.timeVisitanteId, data.dataHora, data.estadio, data.placarMandante, data.placarVisitante, data.status, data.ativo, data.resultadoConfirmado, data.footballDataMatchId || null]
  );
  return map(result.rows[0]);
}
async function update(id, data) {
  const result = await query(
    `
      update partidas set competicao_id=$2,temporada_id=$3,fase_id=$4,grupo_id=$5,rodada_id=$6,time_mandante_id=$7,time_visitante_id=$8,inicio_at=$9,estadio=$10,placar_mandante=$11,placar_visitante=$12,status=$13,ativo=$14,resultado_confirmado=$15,football_data_match_id=$16
      where id=$1 returning *
    `,
    [id, data.competicaoId || null, data.temporadaId || null, data.faseId, data.grupoId || null, data.rodadaId || null, data.timeMandanteId, data.timeVisitanteId, data.dataHora, data.estadio, data.placarMandante, data.placarVisitante, data.status, data.ativo, data.resultadoConfirmado, data.footballDataMatchId || null]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function updateExternalLink(id, footballDataMatchId) {
  const result = await query(
    'update partidas set football_data_match_id=$2 where id=$1 returning *',
    [id, footballDataMatchId ? String(footballDataMatchId) : null]
  );
  return result.rows[0] ? map(result.rows[0]) : null;
}
async function importExternalMatches(items) {
  return transaction(async (client) => {
    const createdMatches = [];
    const skippedMatches = [];
    const warnings = [];
    const createdTeams = [];

    function skipped(item, reason, extra = {}) {
      skippedMatches.push({
        externalMatchId: String(item.footballDataMatchId),
        mandante: item.mandante?.nome || '',
        visitante: item.visitante?.nome || '',
        dataHora: item.dataHora || null,
        reason,
        motivo: reason,
        ...extra
      });
    }

    async function findTeam(team) {
      const externalId = team.footballDataTeamId ? String(team.footballDataTeamId) : null;
      const nome = team.nome || '';
      const sigla = team.sigla || '';
      const codigoFifa = team.codigoFifa || sigla || '';
      const result = await client.query(
        `
          select *
          from times
          where ($1::text is not null and football_data_team_id = $1)
             or ($2::text <> '' and lower(nome) = lower($2))
             or ($3::text <> '' and lower(coalesce(sigla, '')) = lower($3))
             or ($4::text <> '' and lower(coalesce(codigo_fifa, '')) = lower($4))
          order by
            case
              when $1::text is not null and football_data_team_id = $1 then 1
              when $4::text <> '' and lower(coalesce(codigo_fifa, '')) = lower($4) then 2
              when $3::text <> '' and lower(coalesce(sigla, '')) = lower($3) then 3
              else 4
            end
          limit 2
        `,
        [externalId, nome, sigla, codigoFifa]
      );

      if (result.rowCount > 1) {
        warnings.push({
          code: 'team_match_ambiguous',
          message: `Possivel duplicidade para o time ${nome}. Nenhum time foi criado automaticamente.`,
          motivo: 'team_match_ambiguous',
          team: nome
        });
        return null;
      }

      return result.rows[0] || null;
    }

    async function linkTeamToBolao(bolaoId, timeId) {
      await client.query(
        'insert into boloes_times (bolao_id,time_id) values ($1,$2) on conflict (bolao_id,time_id) do nothing',
        [bolaoId, timeId]
      );
    }

    async function getBolaoSportContext(bolaoId) {
      const result = await client.query(
        'select competicao_id, temporada_id from boloes where id = $1 limit 1',
        [bolaoId]
      );
      return result.rows[0] || {};
    }

    async function ensureCompetition(info) {
      if (!info?.nome) return null;
      const provider = info.provider || 'manual';
      const providerCompetitionId = info.providerCompetitionId ? String(info.providerCompetitionId) : null;
      const codigo = info.codigo || null;
      const existing = await client.query(
        `
          select *
          from competicoes
          where (provider = $1 and $2::text is not null and provider_competition_id = $2)
             or (provider = $1 and $3::text is not null and lower(codigo) = lower($3))
          order by case when provider_competition_id = $2 then 1 else 2 end
          limit 1
        `,
        [provider, providerCompetitionId, codigo]
      );
      if (existing.rows[0]) return existing.rows[0];

      const result = await client.query(
        `
          insert into competicoes (nome, codigo, provider, provider_competition_id, tipo_competicao, ativo, metadata)
          values ($1,$2,$3,$4,$5,true,$6)
          returning *
        `,
        [
          info.nome,
          codigo,
          provider,
          providerCompetitionId,
          info.tipoCompeticao || 'misto',
          JSON.stringify(info.metadata || {})
        ]
      );
      return result.rows[0];
    }

    async function ensureSeason(competition, info) {
      if (!competition || !info?.nome) return null;
      const providerSeasonId = info.providerSeasonId ? String(info.providerSeasonId) : null;
      const existing = await client.query(
        `
          select *
          from competicoes_temporadas
          where competicao_id = $1
            and (($2::text is not null and provider_season_id = $2) or lower(nome) = lower($3))
          order by case when provider_season_id = $2 then 1 else 2 end
          limit 1
        `,
        [competition.id, providerSeasonId, info.nome]
      );
      if (existing.rows[0]) return existing.rows[0];

      const result = await client.query(
        `
          insert into competicoes_temporadas (competicao_id, nome, ano_inicio, ano_fim, provider_season_id, ativo, metadata)
          values ($1,$2,$3,$4,$5,true,$6)
          returning *
        `,
        [
          competition.id,
          info.nome,
          info.anoInicio || null,
          info.anoFim || null,
          providerSeasonId,
          JSON.stringify(info.metadata || {})
        ]
      );
      return result.rows[0];
    }

    async function linkBolaoToSeason(bolaoId, competition, season) {
      if (!competition || !season) return;
      await client.query(
        `
          update boloes
          set
            competicao_id = $2,
            temporada_id = $3
          where id = $1
            and (
              competicao_id is null
              or exists (
                select 1
                from competicoes c
                where c.id = boloes.competicao_id
                  and c.provider = 'manual'
                  and c.codigo = 'CUSTOM'
              )
            )
        `,
        [bolaoId, competition.id, season.id]
      );
    }

    async function nextFaseOrder(bolaoId) {
      const result = await client.query('select coalesce(max(ordem), 0) + 1 as ordem from fases where bolao_id = $1', [bolaoId]);
      return Number(result.rows[0]?.ordem || 1);
    }

    async function ensureFase(bolaoId, season, info) {
      if (!season || !info?.nome) return null;
      const existing = await client.query(
        `
          select *
          from fases
          where bolao_id = $1
            and (
              ($2::text is not null and provider_stage = $2)
              or ($3::text is not null and lower(coalesce(codigo, '')) = lower($3))
              or lower(nome) = lower($4)
            )
          limit 1
        `,
        [bolaoId, info.providerStage || null, info.codigo || null, info.nome]
      );
      if (existing.rows[0]) {
        await client.query(
          'update fases set temporada_id = coalesce(temporada_id, $2), tipo_fase = coalesce(tipo_fase, $3), provider_stage = coalesce(provider_stage, $4) where id = $1',
          [existing.rows[0].id, season.id, info.tipo || 'outro', info.providerStage || null]
        );
        return existing.rows[0];
      }

      const ordem = await nextFaseOrder(bolaoId);
      const result = await client.query(
        `
          insert into fases (bolao_id, temporada_id, codigo, nome, ordem, tipo, tipo_fase, status, ativo, provider_stage, metadata)
          values ($1,$2,$3,$4,$5,$6,$6,'pendente',true,$7,$8)
          returning *
        `,
        [
          bolaoId,
          season.id,
          info.codigo || null,
          info.nome,
          ordem,
          info.tipo || 'outro',
          info.providerStage || null,
          JSON.stringify({ ordemProvider: info.ordem || null })
        ]
      );
      return result.rows[0];
    }

    async function ensureGroup(fase, info) {
      if (!fase || !info?.nome) return null;
      const existing = await client.query(
        `
          select *
          from grupos
          where fase_id = $1
            and (($2::text is not null and lower(coalesce(codigo, '')) = lower($2)) or lower(nome) = lower($3))
          limit 1
        `,
        [fase.id, info.codigo || null, info.nome]
      );
      if (existing.rows[0]) return existing.rows[0];
      const result = await client.query(
        `
          insert into grupos (fase_id, codigo, nome, ordem, provider_group)
          values ($1,$2,$3,$4,$5)
          returning *
        `,
        [fase.id, info.codigo || null, info.nome, info.ordem || 0, info.providerGroup || null]
      );
      return result.rows[0];
    }

    async function ensureRound(fase, info) {
      if (!fase || !info?.nome) return null;
      const existing = await client.query(
        `
          select *
          from rodadas
          where fase_id = $1
            and (($2::int is not null and numero = $2) or lower(nome) = lower($3))
          limit 1
        `,
        [fase.id, info.numero || null, info.nome]
      );
      if (existing.rows[0]) return existing.rows[0];
      const result = await client.query(
        `
          insert into rodadas (fase_id, numero, nome, ordem, provider_matchday)
          values ($1,$2,$3,$4,$5)
          returning *
        `,
        [fase.id, info.numero || null, info.nome, info.ordem || info.numero || 0, info.providerMatchday || null]
      );
      return result.rows[0];
    }

    async function ensureSportStructure(item) {
      const context = await getBolaoSportContext(item.bolaoId);
      const competition = item.competicao ? await ensureCompetition(item.competicao) : null;
      const season = competition && item.temporada ? await ensureSeason(competition, item.temporada) : null;
      if (competition && season) {
        await linkBolaoToSeason(item.bolaoId, competition, season);
      }
      const fase = season ? await ensureFase(item.bolaoId, season, item.faseInfo) : null;
      const grupo = fase ? await ensureGroup(fase, item.grupoInfo) : null;
      const rodada = fase ? await ensureRound(fase, item.rodadaInfo) : null;
      return {
        competicaoId: competition?.id || context.competicao_id || null,
        temporadaId: season?.id || context.temporada_id || null,
        faseId: fase?.id || null,
        grupoId: grupo?.id || null,
        rodadaId: rodada?.id || null
      };
    }

    async function ensureTeam(team, bolaoId) {
      const existing = await findTeam(team);
      if (existing) {
        await linkTeamToBolao(bolaoId, existing.id);
        return existing;
      }

      const result = await client.query(
        `
          insert into times (nome, sigla, codigo_fifa, football_data_team_id, escudo_url, bandeira_url, pais, ativo)
          values ($1,$2,$3,$4,$5,$6,$7,true)
          returning *
        `,
        [
          team.nome,
          team.sigla || null,
          team.codigoFifa || team.sigla || null,
          team.footballDataTeamId ? String(team.footballDataTeamId) : null,
          team.escudoUrl || null,
          team.bandeiraUrl || null,
          team.pais || null
        ]
      );
      createdTeams.push({
        id: result.rows[0].id,
        nome: result.rows[0].nome,
        footballDataTeamId: result.rows[0].football_data_team_id
      });
      await linkTeamToBolao(bolaoId, result.rows[0].id);
      return result.rows[0];
    }

    for (const item of items) {
      const exists = await client.query(
        'select * from partidas where bolao_id = $1 and football_data_match_id = $2 limit 1',
        [item.bolaoId, String(item.footballDataMatchId)]
      );

      if (exists.rowCount > 0) {
        skipped(item, 'already_imported_in_pool', {
          partidaId: exists.rows[0].id,
          bolaoId: exists.rows[0].bolao_id
        });
        continue;
      }

      const mandante = await ensureTeam(item.mandante, item.bolaoId);
      const visitante = await ensureTeam(item.visitante, item.bolaoId);
      const sport = await ensureSportStructure(item);

      if (!mandante || !visitante) {
        skipped(item, 'team_ambiguous');
        continue;
      }

      if (mandante.id === visitante.id) {
        skipped(item, 'same_team');
        warnings.push({
          code: 'same_team',
          message: `Mandante e visitante foram resolvidos para o mesmo time na partida ${item.footballDataMatchId}.`
        });
        continue;
      }

      const duplicateLocalMatch = await findDuplicateLocalMatch(client, item, mandante.id, visitante.id);
      if (duplicateLocalMatch) {
        skipped(item, 'local_match_duplicate', {
          partidaId: duplicateLocalMatch.id,
          bolaoId: duplicateLocalMatch.bolao_id
        });
        continue;
      }

      const result = await client.query(
        `
          insert into partidas (
            bolao_id, competicao_id, temporada_id, fase_id, grupo_id, rodada_id,
            time_mandante_id, time_visitante_id, inicio_at, estadio,
            placar_mandante, placar_visitante, status, ativo, resultado_confirmado, football_data_match_id
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14,$15)
          returning *
        `,
        [
          item.bolaoId,
          sport.competicaoId,
          sport.temporadaId,
          sport.faseId,
          sport.grupoId,
          sport.rodadaId,
          mandante.id,
          visitante.id,
          item.dataHora,
          item.estadio || null,
          item.placarMandante,
          item.placarVisitante,
          item.status,
          item.resultadoConfirmado,
          String(item.footballDataMatchId)
        ]
      );
      createdMatches.push(map(result.rows[0]));
    }

    return {
      partidasCriadas: createdMatches.length,
      partidasIgnoradas: skippedMatches.length,
      timesCriados: createdTeams.length,
      partidas: createdMatches,
      ignoradas: skippedMatches,
      times: createdTeams,
      avisos: warnings
    };
  });
}
async function createAuditLog(data) {
  await query(
    `
      insert into auditoria_logs (usuario_id, bolao_id, entidade, entidade_id, acao, dados_anteriores, dados_novos, ip, user_agent)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `,
    [data.usuarioId, data.bolaoId, data.entidade, data.entidadeId, data.acao, JSON.stringify(data.dadosAnteriores), JSON.stringify(data.dadosNovos), data.ip || null, data.userAgent || null]
  );
}
module.exports = { listByBolao, findById, listByFootballDataMatchIds, listLinkedForFootballDataSync, findByFootballDataMatchId, faseBelongsToBolao, timeAtivo, timeAtivoNoBolao, create, update, updateExternalLink, importExternalMatches, createAuditLog };
