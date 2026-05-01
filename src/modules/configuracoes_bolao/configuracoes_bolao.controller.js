function includeInactive(req) {
  return req.query.includeInactive === 'true';
}

function createConfiguracoesBolaoController(service) {
  return {
    status(req, res) {
      res.json(service.getStatus());
    },

    async resumo(req, res, next) {
      try {
        res.json(await service.getResumo(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    },

    async listConfiguracoes(req, res, next) {
      try {
        res.json(await service.listConfiguracoes(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    },

    async createConfiguracao(req, res, next) {
      try {
        res.status(201).json(await service.createConfiguracao(req.params.bolaoId, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async updateConfiguracao(req, res, next) {
      try {
        res.json(
          await service.updateConfiguracao(req.params.bolaoId, req.params.configuracaoId, req.body, req.auth, req.context)
        );
      } catch (error) {
        next(error);
      }
    },

    async listRegras(req, res, next) {
      try {
        res.json(await service.listRegras(req.params.bolaoId, req.auth, includeInactive(req)));
      } catch (error) {
        next(error);
      }
    },

    async createRegra(req, res, next) {
      try {
        res.status(201).json(await service.createRegra(req.params.bolaoId, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async updateRegra(req, res, next) {
      try {
        res.json(await service.updateRegra(req.params.bolaoId, req.params.regraId, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async deleteRegra(req, res, next) {
      try {
        res.json(await service.deleteRegra(req.params.bolaoId, req.params.regraId, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async listCriterios(req, res, next) {
      try {
        res.json(await service.listCriterios(req.params.bolaoId, req.auth, includeInactive(req)));
      } catch (error) {
        next(error);
      }
    },

    async createCriterio(req, res, next) {
      try {
        res.status(201).json(await service.createCriterio(req.params.bolaoId, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async updateCriterio(req, res, next) {
      try {
        res.json(await service.updateCriterio(req.params.bolaoId, req.params.criterioId, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async deleteCriterio(req, res, next) {
      try {
        res.json(await service.deleteCriterio(req.params.bolaoId, req.params.criterioId, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async listDistribuicoes(req, res, next) {
      try {
        res.json(await service.listDistribuicoes(req.params.bolaoId, req.auth, includeInactive(req)));
      } catch (error) {
        next(error);
      }
    },

    async createDistribuicao(req, res, next) {
      try {
        res.status(201).json(await service.createDistribuicao(req.params.bolaoId, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async updateDistribuicao(req, res, next) {
      try {
        res.json(
          await service.updateDistribuicao(req.params.bolaoId, req.params.distribuicaoId, req.body, req.auth, req.context)
        );
      } catch (error) {
        next(error);
      }
    },

    async deleteDistribuicao(req, res, next) {
      try {
        res.json(await service.deleteDistribuicao(req.params.bolaoId, req.params.distribuicaoId, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = {
  createConfiguracoesBolaoController
};
