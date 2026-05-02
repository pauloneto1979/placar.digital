function createNotificacoesController(service) {
  return {
    status(req, res) {
      res.json(service.getStatus());
    },
    async minhas(req, res, next) {
      try {
        res.json(await service.minhas(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    },
    async marcarLida(req, res, next) {
      try {
        res.json(await service.marcarLida(req.params.bolaoId, req.params.id, req.auth));
      } catch (error) {
        next(error);
      }
    },
    async listAdmin(req, res, next) {
      try {
        res.json(await service.listAdmin(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    },
    async criarManualTodos(req, res, next) {
      try {
        res.status(201).json(await service.criarManualTodos(req.params.bolaoId, req.body, req.auth));
      } catch (error) {
        next(error);
      }
    },
    async cancelar(req, res, next) {
      try {
        res.json(await service.cancelar(req.params.bolaoId, req.params.id, req.auth));
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = {
  createNotificacoesController
};
