const { HttpError } = require('../../shared/errors/http-error');
const { ensureApostadorSelecionado, ensureCanViewBolao } = require('../../shared/permissions/bolao-access');

const PARTIDAS_BLOQUEADAS = ['finalizada', 'encerrada', 'cancelada', 'inativa'];

function numberFrom(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new HttpError(400, 'invalid_bet_score', `${field} deve ser inteiro maior ou igual a zero.`);
  }
  return parsed;
}

function canChangeBet(partida, minutosAntecedencia) {
  if (!partida || PARTIDAS_BLOQUEADAS.includes(partida.status) || partida.ativo === false) return false;
  const limite = new Date(partida.inicio_at).getTime() - minutosAntecedencia * 60000;
  return Date.now() < limite;
}

function prazoApostaAt(partida, minutosAntecedencia) {
  if (!partida?.inicio_at) return null;
  const limite = new Date(partida.inicio_at).getTime() - minutosAntecedencia * 60000;
  if (Number.isNaN(limite)) return null;
  return new Date(limite).toISOString();
}

function mapMinhaAposta(row, minutosAntecedencia) {
  const partida = {
    inicio_at: row.inicio_at,
    status: row.partida_status,
    ativo: true
  };
  return {
    partidaId: row.partida_id,
    apostaId: row.id,
    dataHora: row.inicio_at,
    fase: row.fase_nome,
    grupo: row.grupo_nome,
    rodada: row.rodada_nome,
    competicao: row.competicao_nome,
    temporada: row.temporada_nome,
    estadio: row.estadio,
    mandante: {
      nome: row.mandante_nome,
      sigla: row.mandante_sigla,
      codigoFifa: row.mandante_codigo_fifa,
      escudoUrl: row.mandante_escudo_url,
      bandeiraUrl: row.mandante_bandeira_url
    },
    visitante: {
      nome: row.visitante_nome,
      sigla: row.visitante_sigla,
      codigoFifa: row.visitante_codigo_fifa,
      escudoUrl: row.visitante_escudo_url,
      bandeiraUrl: row.visitante_bandeira_url
    },
    placarOficial: row.oficial_mandante === null || row.oficial_visitante === null ? null : {
      mandante: row.oficial_mandante,
      visitante: row.oficial_visitante
    },
    meuPalpite: row.placar_mandante === null || row.placar_visitante === null ? null : {
      mandante: row.placar_mandante,
      visitante: row.placar_visitante
    },
    statusAposta: row.status || 'sem_aposta',
    statusPartida: row.partida_status,
    prazoApostaAt: prazoApostaAt(partida, minutosAntecedencia),
    pontos: Number(row.pontos_calculados || 0),
    pontuado: Boolean(row.calculado_em),
    podeAlterar: canChangeBet(partida, minutosAntecedencia)
  };
}

function mapPalpitePartida(row, auth) {
  const hasBet = row.aposta_id && row.placar_mandante !== null && row.placar_visitante !== null;
  return {
    participanteId: row.participante_id,
    participante: row.participante_nome,
    isMe: auth.participanteId === row.participante_id,
    apostaId: row.aposta_id || null,
    palpite: hasBet ? {
      mandante: row.placar_mandante,
      visitante: row.placar_visitante
    } : null,
    status: row.status || 'sem_aposta',
    pontos: Number(row.pontos_calculados || 0),
    pontuado: Boolean(row.calculado_em)
  };
}

function createApostasService(repository) {
  return {
    getStatus() {
      return { module: 'apostas', implemented: true };
    },

    async dashboard(bolaoId, auth) {
      await ensureCanViewBolao(auth, bolaoId);
      const [dashboard, resumoStatus, top3Ranking, jogosDoDia] = await Promise.all([
        repository.getDashboard(bolaoId),
        repository.getPartidasPorStatus(bolaoId),
        repository.getTop3Ranking(bolaoId),
        repository.getJogosDoDia(bolaoId)
      ]);

      return {
        participantesTotal: dashboard.participantes_total,
        partidasTotal: dashboard.partidas_total,
        partidasFinalizadas: dashboard.partidas_finalizadas,
        totalArrecadado: Number(dashboard.total_arrecadado),
        competicao: dashboard.competicao_nome ? {
          id: dashboard.competicao_id,
          nome: dashboard.competicao_nome,
          codigo: dashboard.competicao_codigo
        } : null,
        temporada: dashboard.temporada_nome ? {
          id: dashboard.temporada_id,
          nome: dashboard.temporada_nome
        } : null,
        sportsSync: {
          provider: 'football-data',
          enabled: dashboard.sports_provider_enabled === true,
          lastSyncAt: dashboard.sports_provider_last_sync_at || null,
          syncIntervalSeconds: Number(dashboard.sports_provider_sync_interval_seconds || 0)
        },
        top3Ranking,
        jogosDoDia,
        partidasPorStatus: resumoStatus
      };
    },

    async jogos(bolaoId, query, auth) {
      await ensureCanViewBolao(auth, bolaoId);
      return repository.listJogos(bolaoId, {
        faseId: query.faseId || query.fase_id,
        data: query.data,
        timeId: query.timeId || query.time_id,
        status: query.status
      });
    },

    async apostar(bolaoId, body, auth) {
      ensureApostadorSelecionado(auth, bolaoId);
      const bolao = await repository.findBolaoById(bolaoId);
      if (!bolao || !['ativo'].includes(bolao.status)) {
        throw new HttpError(422, 'pool_not_open_for_bets', 'Este bolao nao permite novas apostas.');
      }
      const partidaId = body.partidaId || body.partida_id;
      if (!partidaId) throw new HttpError(400, 'missing_match_id', 'partida_id e obrigatorio.');
      const partida = await repository.findPartidaById(partidaId);
      if (!partida || partida.bolao_id !== bolaoId) throw new HttpError(404, 'match_not_found', 'Partida nao encontrada neste bolao.');
      const minutos = await repository.getMinutosAntecedencia(bolaoId);
      if (!canChangeBet(partida, minutos)) throw new HttpError(422, 'bet_locked', 'Aposta travada para esta partida.');
      return repository.upsertAposta({
        bolaoId,
        participanteId: auth.participanteId,
        partidaId,
        palpiteMandante: numberFrom(body.palpiteMandante ?? body.palpite_mandante, 'palpite_mandante'),
        palpiteVisitante: numberFrom(body.palpiteVisitante ?? body.palpite_visitante, 'palpite_visitante'),
        status: 'aberta'
      });
    },

    async minhasApostas(bolaoId, auth) {
      ensureApostadorSelecionado(auth, bolaoId);
      const minutos = await repository.getMinutosAntecedencia(bolaoId);
      const rows = await repository.listMinhasApostas(bolaoId, auth.participanteId);
      return rows.map((row) => mapMinhaAposta(row, minutos));
    },

    async palpitesPartida(bolaoId, partidaId, auth) {
      await ensureCanViewBolao(auth, bolaoId);
      const partida = await repository.findPartidaById(partidaId);
      if (!partida || partida.bolao_id !== bolaoId) {
        throw new HttpError(404, 'match_not_found', 'Partida nao encontrada neste bolao.');
      }
      const minutos = await repository.getMinutosAntecedencia(bolaoId);
      if (canChangeBet(partida, minutos)) {
        throw new HttpError(423, 'match_guesses_locked', 'Os palpites do bolao ficam visiveis apenas apos o encerramento do prazo.');
      }
      const rows = await repository.listPalpitesPartida(bolaoId, partidaId);
      return {
        partidaId,
        prazoApostaAt: prazoApostaAt(partida, minutos),
        palpites: rows.map((row) => mapPalpitePartida(row, auth))
      };
    },

    async regras(bolaoId, auth) {
      await ensureCanViewBolao(auth, bolaoId);
      return repository.getRegras(bolaoId);
    }
  };
}

module.exports = {
  createApostasService
};
