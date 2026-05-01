function createAuthController(service) {
  return {
    status(req, res) {
      res.json(service.getStatus());
    }
  };
}

module.exports = {
  createAuthController
};
