function createPartidasService(repository) {
  return {
    getStatus() {
      return repository.getMetadata();
    }
  };
}

module.exports = {
  createPartidasService
};
