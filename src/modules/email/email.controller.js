function createEmailController(service) {
  return {
    async getConfiguracao(req, res, next) {
      try {
        res.json(await service.getConfiguracao());
      } catch (error) {
        next(error);
      }
    },

    async getSenhaConfiguracao(req, res, next) {
      try {
        res.set('Cache-Control', 'no-store');
        res.json(await service.getSenhaConfiguracao());
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
