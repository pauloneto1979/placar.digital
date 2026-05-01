const { HttpError } = require('../../shared/errors/http-error');
const { ensureApostadorSelecionado, ensureCanAdminBolao, ensureCanViewBolao } = require('../../shared/permissions/bolao-access');

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

function normalizarCodigo(codigo) {
  return String(codigo || '').toUpperCase();
}

function criterioConhecido(codigo) {
  const normalized = normalizarCodigo(codigo);
  if (normalized.includes('EXATO')) return 'acertosExatos';
  if (normalized.includes('RESULTADO')) return 'acertosResultado';
  if (normalized.includes('INVERTIDO')) return 'acertosInvertidos';
  if (normalized.includes('DIFERENCA')) return 'diferencaGolsTotal';
  if (normalized.includes('PAGAMENTO')) return 'ordemPagamento';
  if (normalized.includes('ALFABET')) return 'nome';
  return null;
}

function compararDatasComNulosPorUltimo(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
}

function compararPorCriterio(a, b, criterio) {
  if (criterio === 'acertosExatos' || criterio === 'acertosResultado' || criterio === 'acertosInvertidos') {
    return b[criterio] - a[criterio];
  }

  if (criterio === 'diferencaGolsTotal') {
    return a.diferencaGolsTotal - b.diferencaGolsTotal;
  }

  if (criterio === 'ordemPagamento') {
    return compararDatasComNulosPorUltimo(a.ordemPagamento, b.ordemPagamento);
  }

  if (criterio === 'nome') {
    return a.participante.localeCompare(b.participante, 'pt-BR', { sensitivity: 'base' });
  }

  return 0;
}

function mapRankingBaseRow(row) {
  return {
    bolaoId: row.bolao_id,
    participanteId: row.participante_id,
    participante: row.nome,
    pontosTotal: Number(row.pontos_total || 0),
    apostasTotal: Number(row.apostas_total || 0),
    acertosExatos: Number(row.acertos_exatos || 0),
    acertosResultado: Number(row.acertos_resultado || 0),
    acertosInvertidos: Number(row.acertos_invertidos || 0),
    diferencaGolsTotal: Number(row.diferenca_gols_total || 0),
    ordemPagamento: row.ordem_pagamento || null,
    posicao: null,
    valorPremioPrevisto: 0
  };
}

function validarDistribuicao(distribuicao) {
  const total = distribuicao.reduce((sum, item) => sum + Number(item.percentual || 0), 0);
  if (total > 100) {
    throw new HttpError(422, 'invalid_prize_distribution_total', 'A soma dos percentuais ativos de premiacao ultrapassa 100%.');
  }
  return total;
}

function aplicarDesempate(rows, criterios) {
  const criteriosAplicaveis = criterios.map((item) => criterioConhecido(item.codigo)).filter(Boolean);

  return [...rows].sort((a, b) => {
    const pontos = b.pontosTotal - a.pontosTotal;
    if (pontos !== 0) return pontos;

    for (const criterio of criteriosAplicaveis) {
      const result = compararPorCriterio(a, b, criterio);
      if (result !== 0) return result;
    }

    return a.participante.localeCompare(b.participante, 'pt-BR', { sensitivity: 'base' });
  });
}

function aplicarPosicoesEPremios(rows, distribuicao, totalArrecadado) {
  const distribuicaoPorPosicao = new Map(distribuicao.map((item) => [Number(item.posicao), Number(item.percentual || 0)]));

  return rows.map((row, index) => {
    const posicao = index + 1;
    const percentual = distribuicaoPorPosicao.get(posicao) || 0;
    return {
      ...row,
      posicao,
      valorPremioPrevisto: Number(((totalArrecadado * percentual) / 100).toFixed(2))
    };
  });
}

function mapRankingResponse(row) {
  return {
    participanteId: row.participanteId,
    participante: row.participante,
    pontosAtuais: row.pontosTotal,
    posicao: row.posicao,
    acertosExatos: row.acertosExatos,
    acertosResultado: row.acertosResultado,
    acertosInvertidos: row.acertosInvertidos,
    apostasValidas: row.apostasTotal,
    diferencaGolsTotal: row.diferencaGolsTotal,
    ordemPagamento: row.ordemPagamento,
    valorPremioPrevisto: row.valorPremioPrevisto
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

    await calcularRankingAtual(partida.bolao_id);
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

  async function calcularRankingAtual(bolaoId) {
    const [base, criterios, distribuicao, totalArrecadado] = await Promise.all([
      repository.getRankingBase(bolaoId),
      repository.listCriteriosDesempate(bolaoId),
      repository.listDistribuicaoPremios(bolaoId),
      repository.getTotalArrecadado(bolaoId)
    ]);

    validarDistribuicao(distribuicao);
    const rows = aplicarPosicoesEPremios(
      aplicarDesempate(base.map(mapRankingBaseRow), criterios),
      distribuicao,
      totalArrecadado
    );
    await repository.saveRankingRows(bolaoId, rows);
    return rows;
  }

  async function getRankingAtual(bolaoId, auth) {
    await ensureCanViewBolao(auth, bolaoId);
    return (await calcularRankingAtual(bolaoId)).map(mapRankingResponse);
  }

  async function getPremiacaoResumo(bolaoId, auth) {
    await ensureCanViewBolao(auth, bolaoId);
    const [distribuicao, totalArrecadado] = await Promise.all([
      repository.listDistribuicaoPremios(bolaoId),
      repository.getTotalArrecadado(bolaoId)
    ]);
    const percentualTotal = validarDistribuicao(distribuicao);

    return {
      bolaoId,
      totalArrecadado,
      percentualTotal,
      distribuicao: distribuicao.map((item) => ({
        posicao: Number(item.posicao),
        percentual: Number(item.percentual || 0),
        descricao: item.descricao,
        valorPrevisto: Number(((totalArrecadado * Number(item.percentual || 0)) / 100).toFixed(2))
      }))
    };
  }

  return {
    getStatus() {
      return { module: 'ranking', implemented: true };
    },
    async atual(bolaoId, auth) {
      return getRankingAtual(bolaoId, auth);
    },
    async provisorio(bolaoId, auth) {
      return getRankingAtual(bolaoId, auth);
    },
    async meu(bolaoId, auth) {
      await ensureApostadorSelecionado(auth, bolaoId);
      const ranking = await getRankingAtual(bolaoId, auth);
      return ranking.find((item) => item.participanteId === auth.participanteId) || null;
    },
    async premiacao(bolaoId, auth) {
      return getPremiacaoResumo(bolaoId, auth);
    },
    async regras(bolaoId, auth) {
      await ensureCanViewBolao(auth, bolaoId);
      return repository.getRegrasVisiveis(bolaoId);
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
        apostasCalculadas: resultados.reduce((total, item) => total + item.apostasCalculadas, 0),
        ranking: await getRankingAtual(bolaoId, auth)
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
