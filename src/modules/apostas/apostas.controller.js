function createApostasController(service) {
  return {
    status(req, res) {
      res.json(service.getStatus());
    }
  };
}

module.exports = {
  createApostasController
};
