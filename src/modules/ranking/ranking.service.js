const { ensureCanViewBolao } = require('../../shared/permissions/bolao-access');

function createRankingService(repository) {
  return {
    getStatus() {
      return { module: 'ranking', implemented: true };
    },
    async provisorio(bolaoId, auth) {
      await ensureCanViewBolao(auth, bolaoId);
      return repository.getRankingProvisorio(bolaoId);
    }
  };
}

module.exports = {
  createRankingService
};
