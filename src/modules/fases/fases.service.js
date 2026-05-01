const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');

const TIPOS = ['grupos', 'oitavas', 'quartas', 'semifinal', 'final', 'outro'];
const STATUS = ['pendente', 'ativa', 'encerrada'];

function clean(value) { return typeof value === 'string' ? value.trim() : ''; }

function payload(body, bolaoId) {
  const nome = clean(body.nome);
  const ordem = Number(body.ordem || 0);
  const tipo = body.tipo || 'outro';
  const status = body.status || 'pendente';
  const ativo = body.ativo !== false && status !== 'encerrada';
  if (!nome) throw new HttpError(400, 'invalid_phase_name', 'Nome da fase e obrigatorio.');
  if (!Number.isInteger(ordem) || ordem < 0) throw new HttpError(400, 'invalid_phase_order', 'Ordem invalida.');
  if (!TIPOS.includes(tipo)) throw new HttpError(400, 'invalid_phase_type', 'Tipo de fase invalido.');
  if (!STATUS.includes(status)) throw new HttpError(400, 'invalid_phase_status', 'Status de fase invalido.');
  return { bolaoId, nome, ordem, tipo, status, ativo };
}

function createFasesService(repository) {
  async function ensureResource(id, bolaoId) {
    const item = await repository.findById(id);
    if (!item || item.bolaoId !== bolaoId) throw new HttpError(404, 'phase_not_found', 'Fase nao encontrada.');
    return item;
  }
  return {
    getStatus() { return { module: 'fases', implemented: true }; },
    async list(bolaoId, auth) { await ensureCanAdminBolao(auth, bolaoId); return repository.listByBolao(bolaoId); },
    async create(bolaoId, body, auth) { await ensureCanAdminBolao(auth, bolaoId); return repository.create(payload(body, bolaoId)); },
    async update(bolaoId, id, body, auth) { await ensureCanAdminBolao(auth, bolaoId); await ensureResource(id, bolaoId); return repository.update(id, payload(body, bolaoId)); },
    async updateStatus(bolaoId, id, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId); await ensureResource(id, bolaoId);
      if (!STATUS.includes(body.status)) throw new HttpError(400, 'invalid_phase_status', 'Status de fase invalido.');
      return repository.updateStatus(id, body.status, body.ativo !== false && body.status !== 'encerrada');
    }
  };
}

module.exports = { createFasesService };
