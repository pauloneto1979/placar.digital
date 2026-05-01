function createNotificacoesController(service) {
  return {
    status(req, res) {
      res.json(service.getStatus());
    }
  };
}

module.exports = {
  createNotificacoesController
};
