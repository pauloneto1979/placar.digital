const partidasRepository = require('../partidas/partidas.repository');
const { createPartidasService } = require('../partidas/partidas.service');

const MIN_SYNC_INTERVAL_SECONDS = 60;
const FOOTBALL_DATA_PROVIDER = 'football-data';

const partidasService = createPartidasService(partidasRepository);

function toExternalId(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

function scoreValue(value) {
  return value === undefined || value === null ? null : Number(value);
}

function dateTimeMs(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function mapStatus(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'FINISHED') return 'finalizada';
  if (['IN_PLAY', 'LIVE', 'PAUSED'].includes(normalized)) return 'em_andamento';
  if (['CANCELLED', 'SUSPENDED'].includes(normalized)) return 'cancelada';
  return 'agendada';
}

function mapFootballDataMatch(match) {
  const status = mapStatus(match.status);
  const placarMandante = scoreValue(match.score?.fullTime?.home);
  const placarVisitante = scoreValue(match.score?.fullTime?.away);
  const finishedWithScore = status === 'finalizada' && placarMandante !== null && placarVisitante !== null;

  return {
    externalId: toExternalId(match.id),
    status,
    placarMandante: finishedWithScore ? placarMandante : null,
    placarVisitante: finishedWithScore ? placarVisitante : null,
    resultadoConfirmado: finishedWithScore,
    finishedWithoutScore: status === 'finalizada' && !finishedWithScore,
    dataHora: match.utcDate || null,
    homeTeamName: match.homeTeam?.name || '',
    awayTeamName: match.awayTeam?.name || ''
  };
}

function shouldRun(config, now = new Date()) {
  const syncIntervalSeconds = Math.max(
    MIN_SYNC_INTERVAL_SECONDS,
    Number(config.syncIntervalSeconds || MIN_SYNC_INTERVAL_SECONDS)
  );
  if (!config.lastSyncAt) return true;
  const lastSyncAt = new Date(config.lastSyncAt).getTime();
  if (Number.isNaN(lastSyncAt)) return true;
  return now.getTime() - lastSyncAt >= syncIntervalSeconds * 1000;
}

function hasRelevantChange(partida, external) {
  if (external.finishedWithoutScore) return false;
  if (partida.resultadoConfirmado && !external.resultadoConfirmado) return false;
  if (external.dataHora && dateTimeMs(partida.dataHora) !== dateTimeMs(external.dataHora)) return true;
  if (partida.status !== external.status) return true;
  if (external.resultadoConfirmado && partida.placarMandante !== external.placarMandante) return true;
  if (external.resultadoConfirmado && partida.placarVisitante !== external.placarVisitante) return true;
  if (external.resultadoConfirmado && !partida.resultadoConfirmado) return true;
  return false;
}

function buildChanges(partida, external) {
  return {
    dataHora: external.dataHora || partida.dataHora,
    status: external.status,
    placarMandante: external.resultadoConfirmado ? external.placarMandante : partida.placarMandante,
    placarVisitante: external.resultadoConfirmado ? external.placarVisitante : partida.placarVisitante,
    resultadoConfirmado: external.resultadoConfirmado || partida.resultadoConfirmado === true
  };
}

function createFootballDataSyncService(factory, options = {}) {
  const logger = options.logger || console;
  let running = false;

  async function fetchMatches(config) {
    const baseUrl = String(config.baseUrl || '').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/matches`, {
      method: 'GET',
      headers: {
        'X-Auth-Token': config.apiToken
      }
    });

    if (response.status === 429) {
      logger.warn('[football-data] Rate limit atingido ao sincronizar partidas. Nova tentativa ocorrera no proximo ciclo permitido.');
      return { rateLimited: true, matches: [] };
    }

    if (!response.ok) {
      logger.warn(`[football-data] Erro ao sincronizar partidas. Status HTTP: ${response.status}.`);
      return { failed: true, matches: [] };
    }

    const body = await response.json().catch(() => ({}));
    return {
      matches: Array.isArray(body.matches) ? body.matches : []
    };
  }

  async function syncOnce(now = new Date()) {
    if (running) {
      logger.warn('[football-data] Sincronizacao ignorada porque uma execucao anterior ainda esta em andamento.');
      return { skipped: true, reason: 'already_running' };
    }

    running = true;
    try {
      const active = await factory.resolveActiveProvider();
      if (!active) return { skipped: true, reason: 'no_active_provider' };
      if (active.provider !== FOOTBALL_DATA_PROVIDER) return { skipped: true, reason: 'unsupported_provider' };
      if (!shouldRun(active.config, now)) return { skipped: true, reason: 'sync_interval' };

      const result = await fetchMatches(active.config);
      if (result.rateLimited) return { skipped: true, reason: 'rate_limited' };
      if (result.failed) return { skipped: true, reason: 'provider_error' };

      const externalMatches = result.matches
        .map(mapFootballDataMatch)
        .filter((match) => match.externalId);

      const byExternalId = new Map(externalMatches.map((match) => [match.externalId, match]));
      const linkedPartidas = await partidasRepository.listByFootballDataMatchIds([...byExternalId.keys()]);

      let updated = 0;
      let recalculated = 0;

      for (const partida of linkedPartidas) {
        const external = byExternalId.get(partida.footballDataMatchId);
        if (!external || !hasRelevantChange(partida, external)) continue;

        const syncResult = await partidasService.aplicarAtualizacaoExterna(
          partida,
          buildChanges(partida, external),
          {
            ip: 'football-data-sync',
            userAgent: 'football-data-sync'
          }
        );
        updated += 1;
        if (syncResult.recalculado) recalculated += 1;
      }

      await factory.markSync(active.provider, now);
      return {
        provider: active.provider,
        fetched: externalMatches.length,
        linked: linkedPartidas.length,
        updated,
        recalculated
      };
    } catch (error) {
      logger.warn(`[football-data] Falha controlada na sincronizacao: ${error.message}`);
      return { skipped: true, reason: 'unexpected_error' };
    } finally {
      running = false;
    }
  }

  return {
    syncOnce
  };
}

module.exports = {
  createFootballDataSyncService,
  MIN_SYNC_INTERVAL_SECONDS
};
