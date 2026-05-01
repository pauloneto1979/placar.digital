function createRankingController(service) {
  return {
    status(req, res) { res.json(service.getStatus()); },
    async provisorio(req, res, next) {
      try {
        res.json(await service.provisorio(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    },
    async atual(req, res, next) {
      try {
        res.json(await service.atual(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    },
    async meu(req, res, next) {
      try {
        res.json(await service.meu(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    },
    async premiacao(req, res, next) {
      try {
        res.json(await service.premiacao(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    },
    async regras(req, res, next) {
      try {
        res.json(await service.regras(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    },
    async recalcularPartida(req, res, next) {
      try {
        res.json(await service.recalcularPartida(req.params.bolaoId, req.params.partidaId, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },
    async recalcularBolao(req, res, next) {
      try {
        res.json(await service.recalcularBolao(req.params.bolaoId, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = {
  createRankingController
};
