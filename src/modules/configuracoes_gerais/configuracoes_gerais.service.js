function createConfiguracoesGeraisService(repository) {
  return {
    getStatus() {
      return repository.getMetadata();
    }
  };
}

module.exports = {
  createConfiguracoesGeraisService
};
