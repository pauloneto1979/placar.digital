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
    estadio: row.estadio,
    mandante: row.mandante_nome,
    visitante: row.visitante_nome,
    placarOficial: row.oficial_mandante === null || row.oficial_visitante === null ? null : {
      mandante: row.oficial_mandante,
      visitante: row.oficial_visitante
    },
    meuPalpite: row.placar_mandante === null || row.placar_visitante === null ? null : {
      mandante: row.placar_mandante,
      visitante: row.placar_visitante
    },
    statusAposta: row.status || 'sem_aposta',
    podeAlterar: canChangeBet(partida, minutosAntecedencia)
  };
}

function createApostasService(repository) {
  return {
    getStatus() {
      return { module: 'apostas', implemented: true };
    },

    async dashboard(bolaoId, auth) {
      await ensureCanViewBolao(auth, bolaoId);
      const [dashboard, resumoStatus, jogosDoDia] = await Promise.all([
        repository.getDashboard(bolaoId),
        repository.getPartidasPorStatus(bolaoId),
        repository.getJogosDoDia(bolaoId)
      ]);

      return {
        participantesTotal: dashboard.participantes_total,
        partidasTotal: dashboard.partidas_total,
        partidasFinalizadas: dashboard.partidas_finalizadas,
        totalArrecadado: Number(dashboard.total_arrecadado),
        top3Ranking: [],
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

    async regras(bolaoId, auth) {
      await ensureCanViewBolao(auth, bolaoId);
      return repository.getRegras(bolaoId);
    }
  };
}

module.exports = {
  createApostasService
};
