const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');
const notificacoesRepository = require('../notificacoes/notificacoes.repository');
const { createNotificacoesService } = require('../notificacoes/notificacoes.service');
const rankingRepository = require('../ranking/ranking.repository');
const { createRankingService } = require('../ranking/ranking.service');

const STATUS = ['agendada', 'em_andamento', 'finalizada', 'cancelada', 'inativa'];
const notificacoesService = createNotificacoesService(notificacoesRepository);
const rankingService = createRankingService(rankingRepository);

function clean(v) { return typeof v === 'string' ? v.trim() : ''; }
function intOrNull(v) { return v === undefined || v === null || v === '' ? null : Number(v); }
function externalMatchId(value) {
  const text = clean(value === undefined || value === null ? '' : String(value));
  if (!text || !/^\d+$/.test(text)) {
    throw new HttpError(400, 'invalid_external_match_id', 'externalMatchId deve ser numerico.');
  }
  return text;
}

function mapExternalStatus(status) {
  const value = clean(status).toUpperCase();
  if (['FINISHED'].includes(value)) return 'finalizada';
  if (['LIVE', 'IN_PLAY', 'PAUSED'].includes(value)) return 'em_andamento';
  if (['CANCELLED', 'POSTPONED', 'SUSPENDED', 'AWARDED'].includes(value)) return 'cancelada';
  return 'agendada';
}

function normalizeExternalTeam(team = {}) {
  const nome = clean(team.name || team.nome || team.shortName);
  if (!nome) {
    throw new HttpError(400, 'invalid_external_team', 'Partida externa sem nome de time.');
  }
  return {
    nome,
    sigla: clean(team.tla || team.sigla).slice(0, 12),
    codigoFifa: clean(team.tla || team.codigoFifa || team.codigo_fifa).slice(0, 12),
    footballDataTeamId: team.id || team.footballDataTeamId || team.football_data_team_id || null,
    escudoUrl: clean(team.crest || team.escudoUrl || team.escudo_url),
    bandeiraUrl: clean(team.bandeiraUrl || team.bandeira_url),
    pais: clean(team.pais)
  };
}

function normalizeExternalMatch(match, bolaoId) {
  const matchId = externalMatchId(match.externalMatchId || match.id || match.external_match_id);
  const dataHora = match.utcDate || match.dataHora || match.data_hora || match.inicio_at;
  if (!dataHora || Number.isNaN(Date.parse(dataHora))) {
    throw new HttpError(400, 'invalid_external_match_datetime', `Partida externa ${matchId} sem data valida.`);
  }

  const fullTime = match.placar?.fullTime || match.score?.fullTime || {};
  const placarMandante = intOrNull(fullTime.home ?? fullTime.mandante ?? match.placarMandante);
  const placarVisitante = intOrNull(fullTime.away ?? fullTime.visitante ?? match.placarVisitante);
  const status = mapExternalStatus(match.status);
  return {
    bolaoId,
    footballDataMatchId: matchId,
    mandante: normalizeExternalTeam(match.mandante || match.homeTeam),
    visitante: normalizeExternalTeam(match.visitante || match.awayTeam),
    dataHora,
    estadio: clean(match.estadio || match.venue),
    placarMandante,
    placarVisitante,
    status,
    resultadoConfirmado: status === 'finalizada' && placarMandante !== null && placarVisitante !== null
  };
}

function payload(body, bolaoId) {
  const faseId = body.faseId || body.fase_id || null;
  const timeMandanteId = body.timeMandanteId || body.time_mandante_id;
  const timeVisitanteId = body.timeVisitanteId || body.time_visitante_id;
  const dataHora = body.dataHora || body.data_hora || body.inicio_at;
  const status = body.status || 'agendada';
  const placarMandante = intOrNull(body.placarMandante ?? body.placar_mandante);
  const placarVisitante = intOrNull(body.placarVisitante ?? body.placar_visitante);

  if (!timeMandanteId || !timeVisitanteId || !dataHora) throw new HttpError(400, 'invalid_match_payload', 'Times e data_hora sao obrigatorios.');
  if (timeMandanteId === timeVisitanteId) throw new HttpError(400, 'same_match_teams', 'Mandante e visitante nao podem ser iguais.');
  if (Number.isNaN(Date.parse(dataHora))) throw new HttpError(400, 'invalid_match_datetime', 'data_hora invalida.');
  if (!STATUS.includes(status)) throw new HttpError(400, 'invalid_match_status', 'Status de partida invalido.');
  if ((placarMandante !== null && (Number.isNaN(placarMandante) || placarMandante < 0)) || (placarVisitante !== null && (Number.isNaN(placarVisitante) || placarVisitante < 0))) {
    throw new HttpError(400, 'invalid_match_score', 'Placar invalido.');
  }

  return {
    bolaoId, faseId, timeMandanteId, timeVisitanteId, dataHora,
    estadio: clean(body.estadio),
    placarMandante,
    placarVisitante,
    status,
    ativo: status !== 'inativa' && body.ativo !== false,
    resultadoConfirmado: placarMandante !== null && placarVisitante !== null && ['finalizada', 'encerrada'].includes(status),
    footballDataMatchId: clean(body.footballDataMatchId || body.football_data_match_id) || null
  };
}

function resultadoMudou(before, after) {
  const scoreChanged = before.placarMandante !== after.placarMandante || before.placarVisitante !== after.placarVisitante;
  const statusChanged = before.status !== after.status;
  const confirmationChanged = Boolean(before.resultadoConfirmado) !== Boolean(after.resultadoConfirmado);
  return scoreChanged || statusChanged || confirmationChanged;
}

function deveRecalcularResultado(before, after) {
  return after.resultadoConfirmado && resultadoMudou(before, after);
}

function createPartidasService(repository, options = {}) {
  const footballDataClientService = options.footballDataClientService || null;
  async function validate(data) {
    if (data.faseId && !(await repository.faseBelongsToBolao(data.faseId, data.bolaoId))) {
      throw new HttpError(422, 'invalid_match_phase', 'Fase nao pertence ao bolao.');
    }
    if (!(await repository.timeAtivo(data.timeMandanteId)) || !(await repository.timeAtivo(data.timeVisitanteId))) {
      throw new HttpError(422, 'inactive_match_team', 'Times devem estar ativos.');
    }
  }
  async function ensure(id, bolaoId) {
    const item = await repository.findById(id);
    if (!item || item.bolaoId !== bolaoId) throw new HttpError(404, 'match_not_found', 'Partida nao encontrada.');
    return item;
  }
  async function auditResultado(auth, context, before, after) {
    if (!deveRecalcularResultado(before, after)) return;
    const auditContext = context || {};
    await repository.createAuditLog({
      usuarioId: auth?.usuarioId || null,
      bolaoId: after.bolaoId,
      entidade: 'partida',
      entidadeId: after.id,
      acao: 'informar_resultado',
      dataHora: new Date().toISOString(),
      dadosAnteriores: before,
      dadosNovos: {
        ...after,
        dataHoraAuditoria: new Date().toISOString()
      },
      ip: auditContext.ip,
      userAgent: auditContext.userAgent
    });
  }
  async function aplicarAlteracaoResultado(before, after, auth, context) {
    await auditResultado(auth, context, before, after);
    if (deveRecalcularResultado(before, after)) {
      await rankingService.recalcularPartidaPorResultado(after.id, auth || {}, context || {});
      await notificacoesService.gerarResultadoLancado(after.id);
      return { recalculado: true };
    }
    return { recalculado: false };
  }
  return {
    getStatus() { return { module: 'partidas', implemented: true }; },
    async list(bolaoId, auth) { await ensureCanAdminBolao(auth, bolaoId); return repository.listByBolao(bolaoId); },
    async create(bolaoId, body, auth) { await ensureCanAdminBolao(auth, bolaoId); const data = payload(body, bolaoId); await validate(data); return repository.create(data); },
    async update(bolaoId, id, body, auth, context) {
      await ensureCanAdminBolao(auth, bolaoId);
      const before = await ensure(id, bolaoId);
      const data = payload(body, bolaoId);
      await validate(data);
      const after = await repository.update(id, data);
      await aplicarAlteracaoResultado(before, after, auth, context);
      return after;
    },
    async informarResultado(bolaoId, id, body, auth, context) {
      await ensureCanAdminBolao(auth, bolaoId);
      const before = await ensure(id, bolaoId);
      const data = { ...before, placarMandante: intOrNull(body.placarMandante ?? body.placar_mandante), placarVisitante: intOrNull(body.placarVisitante ?? body.placar_visitante), status: body.status || 'finalizada', resultadoConfirmado: true, ativo: true };
      if (data.placarMandante === null || data.placarVisitante === null) throw new HttpError(400, 'invalid_match_score', 'Informe os dois placares.');
      const after = await repository.update(id, data);
      await aplicarAlteracaoResultado(before, after, auth, context);
      return after;
    },
    async aplicarAtualizacaoExterna(before, changes, context = {}) {
      const afterData = {
        ...before,
        ...changes,
        bolaoId: before.bolaoId,
        faseId: before.faseId,
        timeMandanteId: before.timeMandanteId,
        timeVisitanteId: before.timeVisitanteId,
        estadio: before.estadio,
        ativo: changes.status === 'inativa' ? false : before.ativo !== false,
        footballDataMatchId: before.footballDataMatchId
      };
      const after = await repository.update(before.id, afterData);
      const result = await aplicarAlteracaoResultado(before, after, { usuarioId: null }, context);
      return { partida: after, ...result };
    },
    async vincularPartidaExterna(id, body, auth, context = {}) {
      const partida = await repository.findById(id);
      if (!partida) throw new HttpError(404, 'match_not_found', 'Partida nao encontrada.');
      await ensureCanAdminBolao(auth, partida.bolaoId);
      const provider = clean(body.provider);
      if (provider !== 'football-data') {
        throw new HttpError(400, 'invalid_external_provider', 'Provider deve ser football-data.');
      }
      const matchId = externalMatchId(body.externalMatchId || body.external_match_id);
      const linked = await repository.findByFootballDataMatchId(matchId);
      if (linked && linked.id !== partida.id) {
        throw new HttpError(409, 'external_match_already_linked', 'Partida externa ja vinculada a outra partida local.');
      }
      const updated = await repository.updateExternalLink(partida.id, matchId);
      await repository.createAuditLog({
        usuarioId: auth.usuarioId,
        bolaoId: partida.bolaoId,
        entidade: 'partida',
        entidadeId: partida.id,
        acao: 'partida.vinculo_externo.atualizado',
        dadosAnteriores: { footballDataMatchId: partida.footballDataMatchId },
        dadosNovos: { provider, footballDataMatchId: matchId },
        ip: context.ip,
        userAgent: context.userAgent
      });
      return updated;
    },
    async removerVinculoExterno(id, auth, context = {}) {
      const partida = await repository.findById(id);
      if (!partida) throw new HttpError(404, 'match_not_found', 'Partida nao encontrada.');
      await ensureCanAdminBolao(auth, partida.bolaoId);
      const updated = await repository.updateExternalLink(partida.id, null);
      await repository.createAuditLog({
        usuarioId: auth.usuarioId,
        bolaoId: partida.bolaoId,
        entidade: 'partida',
        entidadeId: partida.id,
        acao: 'partida.vinculo_externo.removido',
        dadosAnteriores: { footballDataMatchId: partida.footballDataMatchId },
        dadosNovos: { footballDataMatchId: null },
        ip: context.ip,
        userAgent: context.userAgent
      });
      return updated;
    },
    async importarPartidasExternas(body, auth) {
      const bolaoId = clean(body.bolaoId || body.bolao_id || auth?.bolaoId);
      await ensureCanAdminBolao(auth, bolaoId);
      const provider = clean(body.provider);
      if (provider !== 'football-data') {
        throw new HttpError(400, 'invalid_external_provider', 'Provider deve ser football-data.');
      }

      if (!Array.isArray(body.matches) || !body.matches.length) {
        throw new HttpError(400, 'empty_external_matches', 'Informe ao menos uma partida externa.');
      }
      if (footballDataClientService?.validarConfiguracao) {
        await footballDataClientService.validarConfiguracao();
      }

      const normalized = [];
      for (const item of body.matches) {
        let match = item;
        const hasDetails = item && (item.mandante || item.homeTeam) && (item.visitante || item.awayTeam) && (item.utcDate || item.dataHora);
        if (!hasDetails) {
          if (!footballDataClientService) {
            throw new HttpError(500, 'football_data_client_not_configured', 'Cliente football-data nao configurado.');
          }
          match = await footballDataClientService.buscarPartidaPorId(item.externalMatchId || item.id || item.external_match_id);
        }
        normalized.push(normalizeExternalMatch(match, bolaoId));
      }

      return repository.importExternalMatches(normalized);
    }
  };
}
module.exports = { createPartidasService };
