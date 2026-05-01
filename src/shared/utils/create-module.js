const { Router } = require('express');

function createModuleRepository(moduleName) {
  return {
    getMetadata() {
      return {
        module: moduleName,
        persistence: 'postgresql',
        implemented: false
      };
    }
  };
}

function createModuleService(repository) {
  return {
    getStatus() {
      return repository.getMetadata();
    }
  };
}

function createModuleController(service) {
  return {
    status(req, res) {
      res.json(service.getStatus());
    }
  };
}

function createModuleRouter(controller) {
  const router = Router();

  router.get('/', controller.status);

  return router;
}

module.exports = {
  createModuleRepository,
  createModuleService,
  createModuleController,
  createModuleRouter
};
