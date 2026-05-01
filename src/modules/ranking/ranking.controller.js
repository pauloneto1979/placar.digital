function createRankingController(service) {
  return {
    status(req, res) { res.json(service.getStatus()); },
    async provisorio(req, res, next) {
      try {
        res.json(await service.provisorio(req.params.bolaoId, req.auth));
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = {
  createRankingController
};
