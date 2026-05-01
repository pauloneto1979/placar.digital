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

    me(req, res) {
      res.json(service.getSession(req.auth));
    }
  };
}

module.exports = {
  createAuthController
};
