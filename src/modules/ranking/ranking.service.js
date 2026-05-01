const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao, ensureCanViewBolao } = require('../../shared/permissions/bolao-access');

function resultado(placarMandante, placarVisitante) {
  if (placarMandante > placarVisitante) return 'mandante';
  if (placarVisitante > placarMandante) return 'visitante';
  return 'empate';
}

function regraAplica(codigo, aposta, partida) {
  const palpiteMandante = aposta.placar_mandante;
  const palpiteVisitante = aposta.placar_visitante;
  const placarMandante = partida.placar_mandante;
  const placarVisitante = partida.placar_visitante;

  if (codigo === 'PLACAR_EXATO') {
    return palpiteMandante === placarMandante && palpiteVisitante === placarVisitante;
  }

  if (codigo === 'RESULTADO_CORRETO') {
    return resultado(palpiteMandante, palpiteVisitante) === resultado(placarMandante, placarVisitante);
  }

  if (codigo === 'PLACAR_INVERTIDO') {
    return palpiteMandante === placarVisitante && palpiteVisitante === placarMandante;
  }

  return false;
}

function apostaValidaParaCalculo(aposta, partida, minutosAntecedencia) {
  if (aposta.status === 'cancelada') return false;
  if (!['aberta', 'travada', 'registrada', 'calculada'].includes(aposta.status)) return false;
  const limite = new Date(partida.inicio_at).getTime() - minutosAntecedencia * 60000;
  return new Date(aposta.registrada_at).getTime() <= limite;
}

function escolherPontuacao(aposta, partida, regras, minutosAntecedencia) {
  if (!apostaValidaParaCalculo(aposta, partida, minutosAntecedencia)) {
    return {
      regraPontuacaoId: null,
      codigoRegraAplicada: null,
      pontos: 0
    };
  }

  const aplicaveis = regras
    .filter((regra) => regraAplica(regra.codigo, aposta, partida))
    .sort((a, b) => b.prioridade - a.prioridade || b.pontos - a.pontos);
  const vencedora = aplicaveis[0];

  return {
    regraPontuacaoId: vencedora?.id || null,
    codigoRegraAplicada: vencedora?.codigo || null,
    pontos: vencedora?.pontos || 0
  };
}

function createRankingService(repository) {
  async function ensurePartidaCalculavel(partidaId, bolaoId = null) {
    const partida = await repository.getPartidaParaCalculo(partidaId);

    if (!partida || (bolaoId && partida.bolao_id !== bolaoId)) {
      throw new HttpError(404, 'match_not_found', 'Partida nao encontrada.');
    }

    if (!['finalizada', 'encerrada'].includes(partida.status) || partida.placar_mandante === null || partida.placar_visitante === null) {
      throw new HttpError(422, 'match_not_calculable', 'Pontuacao so pode ser calculada para partida finalizada com placar.');
    }

    return partida;
  }

  async function recalcularPartidaInterno(partida, auth = {}, context = {}) {
    const [regras, minutosAntecedencia, apostas] = await Promise.all([
      repository.listRegrasPontuacao(partida.bolao_id),
      repository.getMinutosAntecedencia(partida.bolao_id),
      repository.listApostasPartida(partida.id)
    ]);
    const resultados = [];

    for (const aposta of apostas) {
      const pontuacao = escolherPontuacao(aposta, partida, regras, minutosAntecedencia);
      const saved = await repository.upsertPontuacao({
        bolaoId: aposta.bolao_id,
        partidaId: aposta.partida_id,
        participanteId: aposta.participante_id,
        apostaId: aposta.id,
        ...pontuacao
      });
      await repository.updateApostaPontuacao(aposta.id, pontuacao.pontos);
      resultados.push(saved);
    }

    await repository.rebuildRanking(partida.bolao_id);
    await repository.createAuditLog({
      usuarioId: auth.usuarioId,
      bolaoId: partida.bolao_id,
      entidade: 'partida',
      entidadeId: partida.id,
      acao: 'recalcular_pontuacao_partida',
      dadosNovos: {
        apostasCalculadas: resultados.length
      },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return {
      bolaoId: partida.bolao_id,
      partidaId: partida.id,
      apostasCalculadas: resultados.length
    };
  }

  return {
    getStatus() {
      return { module: 'ranking', implemented: true };
    },
    async provisorio(bolaoId, auth) {
      await ensureCanViewBolao(auth, bolaoId);
      return repository.getRankingProvisorio(bolaoId);
    },
    async recalcularPartida(bolaoId, partidaId, auth, context = {}) {
      await ensureCanAdminBolao(auth, bolaoId);
      const partida = await ensurePartidaCalculavel(partidaId, bolaoId);
      return recalcularPartidaInterno(partida, auth, context);
    },
    async recalcularBolao(bolaoId, auth, context = {}) {
      await ensureCanAdminBolao(auth, bolaoId);
      const partidas = await repository.listPartidasFinalizadasBolao(bolaoId);
      const resultados = [];

      for (const partidaRow of partidas) {
        const partida = await ensurePartidaCalculavel(partidaRow.id, bolaoId);
        resultados.push(await recalcularPartidaInterno(partida, auth, context));
      }

      return {
        bolaoId,
        partidasCalculadas: resultados.length,
        apostasCalculadas: resultados.reduce((total, item) => total + item.apostasCalculadas, 0)
      };
    },
    async recalcularPartidaPorResultado(partidaId, auth, context = {}) {
      const partida = await ensurePartidaCalculavel(partidaId);
      return recalcularPartidaInterno(partida, auth, context);
    }
  };
}

module.exports = {
  createRankingService
};
