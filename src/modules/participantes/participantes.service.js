const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');

const STATUS = ['convidado', 'ativo', 'bloqueado', 'removido'];

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function payload(body, bolaoId) {
  const nome = clean(body.nome);
  const email = normalizeEmail(body.email);
  const telefone = clean(body.telefone);
  const status = body.status || 'ativo';

  if (!nome || !email) throw new HttpError(400, 'invalid_participant_payload', 'Nome e email sao obrigatorios.');
  if (!email.includes('@')) throw new HttpError(400, 'invalid_participant_email', 'Email invalido.');
  if (!STATUS.includes(status)) throw new HttpError(400, 'invalid_participant_status', 'Status invalido.');

  return { bolaoId, nome, email, telefone, status };
}

function createParticipantesService(repository) {
  async function ensureResource(id, bolaoId) {
    const item = await repository.findById(id);
    if (!item || item.bolaoId !== bolaoId) throw new HttpError(404, 'participant_not_found', 'Participante nao encontrado.');
    return item;
  }

  async function ensureUniqueEmail(bolaoId, email, ignoreId = null) {
    const existing = await repository.findByEmail(bolaoId, email);
    if (existing && existing.id !== ignoreId) throw new HttpError(409, 'duplicated_participant_email', 'Email ja cadastrado neste bolao.');
  }

  return {
    getStatus() {
      return { module: 'participantes', implemented: true };
    },
    async list(bolaoId, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      return repository.listByBolao(bolaoId);
    },
    async create(bolaoId, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      const data = payload(body, bolaoId);
      await ensureUniqueEmail(bolaoId, data.email);
      return repository.create(data);
    },
    async update(bolaoId, id, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      await ensureResource(id, bolaoId);
      const data = payload(body, bolaoId);
      await ensureUniqueEmail(bolaoId, data.email, id);
      return repository.update(id, data);
    },
    async updateStatus(bolaoId, id, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      await ensureResource(id, bolaoId);
      if (!STATUS.includes(body.status)) throw new HttpError(400, 'invalid_participant_status', 'Status invalido.');
      return repository.updateStatus(id, body.status);
    }
  };
}

module.exports = { createParticipantesService };
