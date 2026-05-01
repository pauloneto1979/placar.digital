function createAuthService(repository) {
  return {
    getStatus() {
      return repository.getMetadata();
    }
  };
}

module.exports = {
  createAuthService
};
