const { HttpError } = require('../../shared/errors/http-error');

const FOOTBALL_DATA_PROVIDER = 'football-data';
const ALLOWED_STATUS = new Set(['SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED', 'POSTPONED', 'SUSPENDED', 'CANCELLED']);
const ALLOWED_COMPETITIONS = new Set(['WC', 'CL', 'BL1', 'DED', 'BSA', 'PD', 'FL1', 'ELC', 'PPL', 'EC', 'SA', 'PL']);

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function onlyDate(value, fieldName) {
  const text = clean(value);
  if (!text) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new HttpError(400, 'invalid_football_data_date', `${fieldName} deve usar formato YYYY-MM-DD.`);
  }
  return text;
}

function normalizeStatus(value) {
  const status = clean(value).toUpperCase();
  if (!status) return '';
  if (!ALLOWED_STATUS.has(status)) {
    throw new HttpError(400, 'invalid_football_data_status', 'Status externo invalido.');
  }
  return status;
}

function normalizeCompetition(value) {
  const competition = clean(value).replace(/\s+/g, '').toUpperCase();
  if (!competition) return '';
  if (!ALLOWED_COMPETITIONS.has(competition)) {
    throw new HttpError(400, 'invalid_football_data_competition', 'Competicao externa invalida.');
  }
  return competition;
}

function scoreValue(value) {
  return value === undefined || value === null ? null : Number(value);
}

function mapMatch(match) {
  return {
    externalMatchId: String(match.id),
    id: String(match.id),
    competition: match.competition ? {
      id: match.competition.id,
      name: match.competition.name,
      code: match.competition.code,
      type: match.competition.type,
      emblem: match.competition.emblem
    } : null,
    status: match.status,
    utcDate: match.utcDate,
    mandante: {
      id: match.homeTeam?.id || null,
      name: match.homeTeam?.name || '',
      shortName: match.homeTeam?.shortName || '',
      tla: match.homeTeam?.tla || '',
      crest: match.homeTeam?.crest || ''
    },
    visitante: {
      id: match.awayTeam?.id || null,
      name: match.awayTeam?.name || '',
      shortName: match.awayTeam?.shortName || '',
      tla: match.awayTeam?.tla || '',
      crest: match.awayTeam?.crest || ''
    },
    placar: {
      fullTime: {
        home: scoreValue(match.score?.fullTime?.home),
        away: scoreValue(match.score?.fullTime?.away)
      },
      halfTime: {
        home: scoreValue(match.score?.halfTime?.home),
        away: scoreValue(match.score?.halfTime?.away)
      },
      winner: match.score?.winner || null,
      duration: match.score?.duration || null
    },
    faseRodada: match.stage || match.group || match.matchday ? {
      stage: match.stage || null,
      group: match.group || null,
      matchday: match.matchday || null
    } : null
  };
}

function buildQuery(query) {
  const params = new URLSearchParams();
  const dateFrom = onlyDate(query.dateFrom, 'dateFrom');
  const dateTo = onlyDate(query.dateTo, 'dateTo');
  const status = normalizeStatus(query.status);
  const competition = normalizeCompetition(query.competition || query.competitions);

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new HttpError(400, 'invalid_football_data_date_range', 'Data inicial deve ser menor ou igual a data final.');
  }

  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (status) params.set('status', status);
  if (competition) params.set('competitions', competition);
  return params.toString();
}

function createFootballDataClientService(factory, repository, options = {}) {
  const fetchImpl = options.fetch || fetch;
  const timeoutMs = options.timeoutMs || 15000;

  async function getActiveFootballDataConfig() {
    const active = await factory.resolveActiveProvider();

    if (active && active.provider === FOOTBALL_DATA_PROVIDER) {
      return active.config;
    }

    const config = await repository.findByProvider(FOOTBALL_DATA_PROVIDER, { includeSecret: true });
    if (!config) {
      throw new HttpError(404, 'football_data_provider_not_configured', 'Provider football-data nao configurado.');
    }
    if (!config.enabled) {
      throw new HttpError(422, 'football_data_provider_disabled', 'Provider football-data esta desabilitado.');
    }
    if (!clean(config.apiToken)) {
      throw new HttpError(422, 'football_data_token_missing', 'Token do provider football-data nao configurado.');
    }
    throw new HttpError(422, 'football_data_provider_not_active', 'Provider football-data nao esta ativo.');
  }

  async function listarPartidas(query = {}) {
    const config = await getActiveFootballDataConfig();
    const baseUrl = String(config.baseUrl || '').replace(/\/$/, '');
    const qs = buildQuery(query);
    const url = `${baseUrl}/matches${qs ? `?${qs}` : ''}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          'X-Auth-Token': config.apiToken
        },
        signal: controller.signal
      });

      if (response.status === 401 || response.status === 403) {
        throw new HttpError(502, 'football_data_invalid_token', 'Token football-data invalido ou sem permissao.');
      }
      if (response.status === 429) {
        throw new HttpError(429, 'football_data_rate_limit', 'Limite de requisicoes da football-data atingido.');
      }
      if (response.status === 400) {
        throw new HttpError(400, 'football_data_invalid_filters', 'Nao foi possivel buscar as partidas. Verifique os filtros informados.');
      }
      if (!response.ok) {
        console.warn(`[football-data] Consulta de partidas retornou HTTP ${response.status}.`);
        throw new HttpError(502, 'football_data_provider_error', 'football-data retornou erro ao consultar partidas.');
      }

      const body = await response.json().catch(() => ({}));
      return {
        count: Array.isArray(body.matches) ? body.matches.length : 0,
        filters: {
          dateFrom: query.dateFrom || null,
          dateTo: query.dateTo || null,
          competition: query.competition || query.competitions || null,
          status: query.status || null
        },
        partidas: Array.isArray(body.matches) ? body.matches.map(mapMatch) : []
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new HttpError(504, 'football_data_timeout', 'Timeout ao consultar football-data.');
      }
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'football_data_network_error', 'Erro de rede ao consultar football-data.');
    } finally {
      clearTimeout(timer);
    }
  }

  async function buscarPartidaPorId(matchId) {
    const id = clean(matchId === undefined || matchId === null ? '' : String(matchId));
    if (!/^\d+$/.test(id)) {
      throw new HttpError(400, 'invalid_football_data_match_id', 'ID externo da partida invalido.');
    }

    const config = await getActiveFootballDataConfig();
    const baseUrl = String(config.baseUrl || '').replace(/\/$/, '');
    const url = `${baseUrl}/matches/${id}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          'X-Auth-Token': config.apiToken
        },
        signal: controller.signal
      });

      if (response.status === 401 || response.status === 403) {
        throw new HttpError(502, 'football_data_invalid_token', 'Token football-data invalido ou sem permissao.');
      }
      if (response.status === 404) {
        throw new HttpError(404, 'football_data_match_not_found', 'Partida externa nao encontrada.');
      }
      if (response.status === 429) {
        throw new HttpError(429, 'football_data_rate_limit', 'Limite de requisicoes da football-data atingido.');
      }
      if (!response.ok) {
        throw new HttpError(502, 'football_data_provider_error', `football-data retornou HTTP ${response.status}.`);
      }

      const body = await response.json().catch(() => ({}));
      return mapMatch(body);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new HttpError(504, 'football_data_timeout', 'Timeout ao consultar football-data.');
      }
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'football_data_network_error', 'Erro de rede ao consultar football-data.');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    validarConfiguracao: getActiveFootballDataConfig,
    listarPartidas,
    buscarPartidaPorId
  };
}

module.exports = {
  createFootballDataClientService
};
