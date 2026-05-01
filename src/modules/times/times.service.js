const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');

function clean(v) { return typeof v === 'string' ? v.trim() : ''; }
function payload(body) {
  const nome = clean(body.nome);
  if (!nome) throw new HttpError(400, 'invalid_team_name', 'Nome do time e obrigatorio.');
  return { nome, sigla: clean(body.sigla), pais: clean(body.pais), ativo: body.status ? body.status === 'ativo' : body.ativo !== false };
}
function createTimesService(repository) {
  async function ensure(id) { const item = await repository.findById(id); if (!item) throw new HttpError(404, 'team_not_found', 'Time nao encontrado.'); return item; }
  return {
    getStatus() { return { module: 'times', implemented: true }; },
    async list(bolaoId, auth) { await ensureCanAdminBolao(auth, bolaoId); return repository.list(); },
    async create(bolaoId, body, auth) { await ensureCanAdminBolao(auth, bolaoId); return repository.create(payload(body)); },
    async update(bolaoId, id, body, auth) { await ensureCanAdminBolao(auth, bolaoId); await ensure(id); return repository.update(id, payload(body)); },
    async updateStatus(bolaoId, id, body, auth) { await ensureCanAdminBolao(auth, bolaoId); await ensure(id); return repository.updateStatus(id, body.status ? body.status === 'ativo' : body.ativo === true); }
  };
}
module.exports = { createTimesService };
