const { HttpError } = require('../../shared/errors/http-error');

const RULE_CODE_TO_TYPE = {
  PLACAR_EXATO: 'placar_exato',
  RESULTADO_CORRETO: 'resultado',
  PLACAR_INVERTIDO: 'resultado'
};

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCode(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseBoolean(value, defaultValue = true) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === 'ativo';
}

function createConfiguracoesBolaoService(repository) {
  async function audit(auth, context, data) {
    try {
      await repository.createAuditLog({
        usuarioId: auth.usuarioId,
        ip: context.ip,
        userAgent: context.userAgent,
        ...data
      });
    } catch (error) {
      console.error('Falha ao registrar auditoria de configuracoes do bolao:', error.message);
    }
  }

  async function ensureBolaoExists(bolaoId) {
    const bolao = await repository.findBolaoById(bolaoId);

    if (!bolao) {
      throw new HttpError(404, 'bolao_not_found', 'Bolao nao encontrado.');
    }

    return bolao;
  }

  async function canManageBolao(auth, bolaoId) {
    if (auth.perfilGlobal === 'proprietario') return true;

    if (auth.perfilGlobal === 'administrador') {
      return repository.isAdministradorVinculado(auth.usuarioId, bolaoId);
    }

    return false;
  }

  async function ensureCanView(auth, bolaoId) {
    await ensureBolaoExists(bolaoId);

    if (auth.perfilGlobal === 'proprietario') return;
    if (auth.bolaoId === bolaoId) return;
    if (auth.perfilGlobal === 'administrador' && (await repository.isAdministradorVinculado(auth.usuarioId, bolaoId))) return;

    throw new HttpError(403, 'forbidden_bolao_access', 'Usuario sem acesso ao bolao informado.');
  }

  async function ensureCanManage(auth, bolaoId) {
    await ensureBolaoExists(bolaoId);

    if (!(await canManageBolao(auth, bolaoId))) {
      throw new HttpError(403, 'forbidden_bolao_management', 'Usuario sem permissao para alterar configuracoes deste bolao.');
    }
  }

  async function ensureOwnsResource(resource, bolaoId, notFoundCode, notFoundMessage) {
    if (!resource) {
      throw new HttpError(404, notFoundCode, notFoundMessage);
    }

    if (resource.bolaoId !== bolaoId) {
      throw new HttpError(404, notFoundCode, notFoundMessage);
    }
  }

  function buildConfiguracaoPayload(payload, bolaoId) {
    const minutos = Number(payload.minutosAntecedenciaAposta ?? payload.minutos_antecedencia_aposta ?? 0);
    const tipo = normalizeText(payload.tipoDistribuicaoPremio ?? payload.tipo_distribuicao_premio ?? 'percentual');

    if (!Number.isInteger(minutos) || minutos < 0) {
      throw new HttpError(400, 'invalid_bet_deadline_minutes', 'minutos_antecedencia_aposta deve ser inteiro maior ou igual a zero.');
    }

    if (!tipo) {
      throw new HttpError(400, 'invalid_prize_distribution_type', 'tipo_distribuicao_premio e obrigatorio.');
    }

    return {
      bolaoId,
      minutosAntecedenciaAposta: minutos,
      tipoDistribuicaoPremio: tipo,
      observacoesRegras: normalizeText(payload.observacoesRegras ?? payload.observacoes_regras),
      ativo: parseBoolean(payload.ativo ?? payload.status, true)
    };
  }

  function buildRegraPayload(payload, bolaoId) {
    const codigo = normalizeCode(payload.codigo);
    const descricao = normalizeText(payload.descricao);
    const pontos = Number(payload.pontos);
    const prioridade = Number(payload.prioridade ?? 0);

    if (!codigo || !descricao) {
      throw new HttpError(400, 'invalid_score_rule_payload', 'codigo e descricao sao obrigatorios.');
    }

    if (!Number.isInteger(pontos) || pontos < 0) {
      throw new HttpError(400, 'invalid_score_points', 'pontos deve ser inteiro maior ou igual a zero.');
    }

    if (!Number.isInteger(prioridade) || prioridade <= 0) {
      throw new HttpError(400, 'invalid_score_priority', 'prioridade deve ser inteiro maior que zero.');
    }

    return {
      bolaoId,
      codigo,
      descricao,
      pontos,
      prioridade,
      tipo: RULE_CODE_TO_TYPE[codigo] || 'bonus',
      criterios: {
        naoCumulativa: true,
        desempateEntreRegras: 'menor_prioridade_depois_maior_pontuacao'
      },
      ativo: parseBoolean(payload.ativo, true)
    };
  }

  function buildCriterioPayload(payload, bolaoId) {
    const codigo = normalizeCode(payload.codigo);
    const descricao = normalizeText(payload.descricao);
    const ordem = Number(payload.ordem);

    if (!codigo || !descricao) {
      throw new HttpError(400, 'invalid_tiebreaker_payload', 'codigo e descricao sao obrigatorios.');
    }

    if (!Number.isInteger(ordem) || ordem <= 0) {
      throw new HttpError(400, 'invalid_tiebreaker_order', 'ordem deve ser inteiro maior que zero.');
    }

    return {
      bolaoId,
      codigo,
      descricao,
      ordem,
      ativo: parseBoolean(payload.ativo, true)
    };
  }

  function buildDistribuicaoPayload(payload, bolaoId) {
    const posicao = Number(payload.posicao);
    const percentual = Number(payload.percentual);

    if (!Number.isInteger(posicao) || posicao <= 0) {
      throw new HttpError(400, 'invalid_prize_position', 'posicao deve ser inteiro maior que zero.');
    }

    if (Number.isNaN(percentual) || percentual < 0 || percentual > 100) {
      throw new HttpError(400, 'invalid_prize_percent', 'percentual deve estar entre 0 e 100.');
    }

    return {
      bolaoId,
      posicao,
      percentual,
      descricao: normalizeText(payload.descricao),
      ativo: parseBoolean(payload.ativo, true)
    };
  }

  async function validateDistribuicaoTotal(bolaoId, candidate, ignoreId = null) {
    const distribuicoes = await repository.listDistribuicoes(bolaoId, true);
    const total = distribuicoes
      .filter((item) => item.ativo && item.id !== ignoreId)
      .reduce((sum, item) => sum + Number(item.percentual), 0);
    const nextTotal = total + (candidate.ativo ? Number(candidate.percentual) : 0);

    if (nextTotal > 100) {
      throw new HttpError(400, 'invalid_prize_distribution_total', 'A soma dos percentuais ativos nao pode ultrapassar 100%.');
    }
  }

  return {
    getStatus() {
      return repository.getMetadata();
    },

    async getResumo(bolaoId, auth) {
      await ensureCanView(auth, bolaoId);

      return {
        configuracaoAtiva: await repository.getConfiguracaoAtiva(bolaoId),
        regrasPontuacao: await repository.listRegras(bolaoId, false),
        criteriosDesempate: await repository.listCriterios(bolaoId, false),
        distribuicaoPremios: await repository.listDistribuicoes(bolaoId, false),
        politicaPontuacao: {
          cumulativa: false,
          criterioAplicacao: 'maior_prioridade_depois_maior_pontuacao'
        }
      };
    },

    async listConfiguracoes(bolaoId, auth) {
      await ensureCanManage(auth, bolaoId);
      return repository.listConfiguracoes(bolaoId);
    },

    async createConfiguracao(bolaoId, payload, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const data = buildConfiguracaoPayload(payload, bolaoId);

      if (data.ativo && (await repository.getConfiguracaoAtiva(bolaoId))) {
        throw new HttpError(409, 'active_bolao_config_exists', 'Este bolao ja possui uma configuracao ativa.');
      }

      const configuracao = await repository.createConfiguracao(data);
      await audit(auth, context, {
        bolaoId,
        entidade: 'configuracoes_principais_bolao',
        entidadeId: configuracao.id,
        acao: 'configuracoes_bolao.configuracao.criada',
        dadosNovos: configuracao
      });

      return configuracao;
    },

    async updateConfiguracao(bolaoId, id, payload, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const existing = await repository.findConfiguracaoById(id);
      await ensureOwnsResource(existing, bolaoId, 'bolao_config_not_found', 'Configuracao do bolao nao encontrada.');
      const data = buildConfiguracaoPayload(payload, bolaoId);
      const active = await repository.getConfiguracaoAtiva(bolaoId);

      if (data.ativo && active && active.id !== id) {
        throw new HttpError(409, 'active_bolao_config_exists', 'Este bolao ja possui uma configuracao ativa.');
      }

      const configuracao = await repository.updateConfiguracao(id, data);
      await audit(auth, context, {
        bolaoId,
        entidade: 'configuracoes_principais_bolao',
        entidadeId: id,
        acao: 'configuracoes_bolao.configuracao.atualizada',
        dadosAnteriores: existing,
        dadosNovos: configuracao
      });

      return configuracao;
    },

    async listRegras(bolaoId, auth, includeInactive = false) {
      await ensureCanView(auth, bolaoId);
      return repository.listRegras(bolaoId, includeInactive && auth.perfilGlobal !== 'apostador');
    },

    async createRegra(bolaoId, payload, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const regra = await repository.createRegra(buildRegraPayload(payload, bolaoId));
      await audit(auth, context, {
        bolaoId,
        entidade: 'regras_pontuacao',
        entidadeId: regra.id,
        acao: 'configuracoes_bolao.regra_pontuacao.criada',
        dadosNovos: regra
      });
      return regra;
    },

    async updateRegra(bolaoId, id, payload, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const existing = await repository.findRegraById(id);
      await ensureOwnsResource(existing, bolaoId, 'score_rule_not_found', 'Regra de pontuacao nao encontrada.');
      const regra = await repository.updateRegra(id, buildRegraPayload(payload, bolaoId));
      await audit(auth, context, {
        bolaoId,
        entidade: 'regras_pontuacao',
        entidadeId: id,
        acao: 'configuracoes_bolao.regra_pontuacao.atualizada',
        dadosAnteriores: existing,
        dadosNovos: regra
      });
      return regra;
    },

    async deleteRegra(bolaoId, id, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const existing = await repository.findRegraById(id);
      await ensureOwnsResource(existing, bolaoId, 'score_rule_not_found', 'Regra de pontuacao nao encontrada.');
      const regra = await repository.deleteRegra(id);
      await audit(auth, context, {
        bolaoId,
        entidade: 'regras_pontuacao',
        entidadeId: id,
        acao: 'configuracoes_bolao.regra_pontuacao.inativada',
        dadosAnteriores: existing,
        dadosNovos: regra
      });
      return regra;
    },

    async listCriterios(bolaoId, auth, includeInactive = false) {
      await ensureCanView(auth, bolaoId);
      return repository.listCriterios(bolaoId, includeInactive && auth.perfilGlobal !== 'apostador');
    },

    async createCriterio(bolaoId, payload, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const criterio = await repository.createCriterio(buildCriterioPayload(payload, bolaoId));
      await audit(auth, context, {
        bolaoId,
        entidade: 'criterios_desempate',
        entidadeId: criterio.id,
        acao: 'configuracoes_bolao.criterio_desempate.criado',
        dadosNovos: criterio
      });
      return criterio;
    },

    async updateCriterio(bolaoId, id, payload, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const existing = await repository.findCriterioById(id);
      await ensureOwnsResource(existing, bolaoId, 'tiebreaker_not_found', 'Criterio de desempate nao encontrado.');
      const criterio = await repository.updateCriterio(id, buildCriterioPayload(payload, bolaoId));
      await audit(auth, context, {
        bolaoId,
        entidade: 'criterios_desempate',
        entidadeId: id,
        acao: 'configuracoes_bolao.criterio_desempate.atualizado',
        dadosAnteriores: existing,
        dadosNovos: criterio
      });
      return criterio;
    },

    async deleteCriterio(bolaoId, id, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const existing = await repository.findCriterioById(id);
      await ensureOwnsResource(existing, bolaoId, 'tiebreaker_not_found', 'Criterio de desempate nao encontrado.');
      const criterio = await repository.deleteCriterio(id);
      await audit(auth, context, {
        bolaoId,
        entidade: 'criterios_desempate',
        entidadeId: id,
        acao: 'configuracoes_bolao.criterio_desempate.inativado',
        dadosAnteriores: existing,
        dadosNovos: criterio
      });
      return criterio;
    },

    async listDistribuicoes(bolaoId, auth, includeInactive = false) {
      await ensureCanView(auth, bolaoId);
      return repository.listDistribuicoes(bolaoId, includeInactive && auth.perfilGlobal !== 'apostador');
    },

    async createDistribuicao(bolaoId, payload, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const data = buildDistribuicaoPayload(payload, bolaoId);
      await validateDistribuicaoTotal(bolaoId, data);
      const distribuicao = await repository.createDistribuicao(data);
      await audit(auth, context, {
        bolaoId,
        entidade: 'distribuicao_premios',
        entidadeId: distribuicao.id,
        acao: 'configuracoes_bolao.distribuicao_premio.criada',
        dadosNovos: distribuicao
      });
      return distribuicao;
    },

    async updateDistribuicao(bolaoId, id, payload, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const existing = await repository.findDistribuicaoById(id);
      await ensureOwnsResource(existing, bolaoId, 'prize_distribution_not_found', 'Distribuicao de premio nao encontrada.');
      const data = buildDistribuicaoPayload(payload, bolaoId);
      await validateDistribuicaoTotal(bolaoId, data, id);
      const distribuicao = await repository.updateDistribuicao(id, data);
      await audit(auth, context, {
        bolaoId,
        entidade: 'distribuicao_premios',
        entidadeId: id,
        acao: 'configuracoes_bolao.distribuicao_premio.atualizada',
        dadosAnteriores: existing,
        dadosNovos: distribuicao
      });
      return distribuicao;
    },

    async deleteDistribuicao(bolaoId, id, auth, context) {
      await ensureCanManage(auth, bolaoId);
      const existing = await repository.findDistribuicaoById(id);
      await ensureOwnsResource(existing, bolaoId, 'prize_distribution_not_found', 'Distribuicao de premio nao encontrada.');
      const distribuicao = await repository.deleteDistribuicao(id);
      await audit(auth, context, {
        bolaoId,
        entidade: 'distribuicao_premios',
        entidadeId: id,
        acao: 'configuracoes_bolao.distribuicao_premio.inativada',
        dadosAnteriores: existing,
        dadosNovos: distribuicao
      });
      return distribuicao;
    }
  };
}

module.exports = {
  createConfiguracoesBolaoService
};
