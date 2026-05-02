function createAuthController(service) {
  return {
    status(req, res) {
      res.json(service.getStatus());
    },

    async login(req, res, next) {
      try {
        const result = await service.login(req.body, req.context);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    async selectBolao(req, res, next) {
      try {
        const result = await service.selectBolao(req.body, req.context);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    async switchBolao(req, res, next) {
      try {
        const result = await service.switchBolao(req.body, req.auth, req.context);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    me(req, res) {
      res.json(service.getSession(req.auth));
    },

    async meuPerfil(req, res, next) {
      try {
        res.json(await service.getMeuPerfil(req.auth));
      } catch (error) {
        next(error);
      }
    },

    async updateMeuPerfil(req, res, next) {
      try {
        res.json(await service.updateMeuPerfil(req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    },

    async updateMinhaSenha(req, res, next) {
      try {
        res.json(await service.updateMinhaSenha(req.body, req.auth, req.context));
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = {
  createAuthController
};
