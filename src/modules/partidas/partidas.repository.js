const { query, transaction } = require('../../shared/database/client');

function map(row) {
  return {
    id: row.id,
    bolaoId: row.bolao_id,
    faseId: row.fase_id,
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
    criadoAt: row.criado_at,
    atualizadoAt: row.atualizado_at
  };
}

async function listByBolao(bolaoId) {
  const result = await query('select * from partidas where bolao_id=$1 order by inicio_at asc', [bolaoId]);
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
async function findByFootballDataMatchId(matchId) {
  const result = await query(
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
async function create(data) {
  const result = await query(
    `
      insert into partidas (bolao_id,fase_id,time_mandante_id,time_visitante_id,inicio_at,estadio,placar_mandante,placar_visitante,status,ativo,resultado_confirmado,football_data_match_id)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      returning *
    `,
    [data.bolaoId, data.faseId, data.timeMandanteId, data.timeVisitanteId, data.dataHora, data.estadio, data.placarMandante, data.placarVisitante, data.status, data.ativo, data.resultadoConfirmado, data.footballDataMatchId || null]
  );
  return map(result.rows[0]);
}
async function update(id, data) {
  const result = await query(
    `
      update partidas set fase_id=$2,time_mandante_id=$3,time_visitante_id=$4,inicio_at=$5,estadio=$6,placar_mandante=$7,placar_visitante=$8,status=$9,ativo=$10,resultado_confirmado=$11,football_data_match_id=$12
      where id=$1 returning *
    `,
    [id, data.faseId, data.timeMandanteId, data.timeVisitanteId, data.dataHora, data.estadio, data.placarMandante, data.placarVisitante, data.status, data.ativo, data.resultadoConfirmado, data.footballDataMatchId || null]
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

    async function ensureTeam(team) {
      const existing = await findTeam(team);
      if (existing) return existing;

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
      return result.rows[0];
    }

    for (const item of items) {
      const exists = await client.query(
        'select * from partidas where football_data_match_id = $1 limit 1',
        [String(item.footballDataMatchId)]
      );

      if (exists.rowCount > 0) {
        skipped(item, exists.rows[0].bolao_id === item.bolaoId ? 'already_imported_in_pool' : 'football_data_match_id_exists', {
          partidaId: exists.rows[0].id,
          bolaoId: exists.rows[0].bolao_id
        });
        continue;
      }

      const mandante = await ensureTeam(item.mandante);
      const visitante = await ensureTeam(item.visitante);

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
            bolao_id, fase_id, time_mandante_id, time_visitante_id, inicio_at, estadio,
            placar_mandante, placar_visitante, status, ativo, resultado_confirmado, football_data_match_id
          )
          values ($1,null,$2,$3,$4,$5,$6,$7,$8,true,$9,$10)
          returning *
        `,
        [
          item.bolaoId,
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
module.exports = { listByBolao, findById, listByFootballDataMatchIds, findByFootballDataMatchId, faseBelongsToBolao, timeAtivo, create, update, updateExternalLink, importExternalMatches, createAuditLog };
