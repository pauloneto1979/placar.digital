function createProprietarioController(service) {
  return {
    async listBoloes(req, res, next) {
      try {
        res.json(await service.listBoloes());
      } catch (error) {
        next(error);
      }
    },

    async createBolao(req, res, next) {
      try {
        res.status(201).json(await service.createBolao(req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async updateBolao(req, res, next) {
      try {
        res.json(await service.updateBolao(req.params.id, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async fecharBolao(req, res, next) {
      try {
        res.json(await service.fecharBolao(req.params.id, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async listUsuarios(req, res, next) {
      try {
        res.json(await service.listUsuarios());
      } catch (error) {
        next(error);
      }
    },

    async createUsuario(req, res, next) {
      try {
        res.status(201).json(await service.createUsuario(req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async updateUsuario(req, res, next) {
      try {
        res.json(await service.updateUsuario(req.params.id, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async updateUsuarioStatus(req, res, next) {
      try {
        res.json(await service.updateUsuarioStatus(req.params.id, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async vincularAdministrador(req, res, next) {
      try {
        res.status(201).json(await service.vincularAdministrador(req.params.bolaoId, req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async listAdministradoresBolao(req, res, next) {
      try {
        res.json(await service.listAdministradoresBolao(req.params.bolaoId));
      } catch (error) {
        next(error);
      }
    },

    async removerVinculoAdministrador(req, res, next) {
      try {
        res.json(
          await service.removerVinculoAdministrador(
            req.params.bolaoId,
            req.params.usuarioId,
            req.auth,
            req.context
          )
        );
      } catch (error) {
        next(error);
      }
    },

    async getConfiguracoesGerais(req, res, next) {
      try {
        res.json(await service.getConfiguracoesGerais());
      } catch (error) {
        next(error);
      }
    },

    async updateConfiguracoesGerais(req, res, next) {
      try {
        res.json(await service.updateConfiguracoesGerais(req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = {
  createProprietarioController
};
