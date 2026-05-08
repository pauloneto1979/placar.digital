function createEmailController(service) {
  return {
    async getConfiguracao(req, res, next) {
      try {
        res.json(await service.getConfiguracao());
      } catch (error) {
        next(error);
      }
    },

    async salvarConfiguracao(req, res, next) {
      try {
        res.json(await service.salvarConfiguracao(req.body));
      } catch (error) {
        next(error);
      }
    },

    async enviarTeste(req, res, next) {
      try {
        res.json(await service.enviarTeste(req.body));
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = {
  createEmailController
};
