function createProvedoresEsportivosController(service) {
  return {
    async list(req, res, next) {
      try {
        res.json(await service.listConfiguracoes());
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        res.json(await service.updateConfiguracao(req.params.provider, req.body));
      } catch (error) {
        next(error);
      }
    },

    async getToken(req, res, next) {
      try {
        res.json(await service.getTokenCompleto(req.params.provider));
      } catch (error) {
        next(error);
      }
    },

    async updateStatus(req, res, next) {
      try {
        res.json(await service.updateStatus(req.params.provider, req.body));
      } catch (error) {
        next(error);
      }
    },

    async listFootballDataPartidas(req, res, next) {
      try {
        res.json(await service.listFootballDataPartidas(req.query));
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = {
  createProvedoresEsportivosController
};
