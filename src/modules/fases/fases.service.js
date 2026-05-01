function createFasesService(repository) {
  return {
    getStatus() {
      return repository.getMetadata();
    }
  };
}

module.exports = {
  createFasesService
};
