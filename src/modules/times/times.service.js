function createTimesService(repository) {
  return {
    getStatus() {
      return repository.getMetadata();
    }
  };
}

module.exports = {
  createTimesService
};
