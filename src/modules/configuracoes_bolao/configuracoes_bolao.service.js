function createConfiguracoesBolaoService(repository) {
  return {
    getStatus() {
      return repository.getMetadata();
    }
  };
}

module.exports = {
  createConfiguracoesBolaoService
};
