const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');
const notificacoesRepository = require('../notificacoes/notificacoes.repository');
const { createNotificacoesService } = require('../notificacoes/notificacoes.service');

const STATUS = ['pendente', 'pago', 'cancelado'];
const FORMAS = ['pix', 'dinheiro', 'manual', 'outro'];
const notificacoesService = createNotificacoesService(notificacoesRepository);

function payload(body, bolaoId) {
  const participanteId = body.participanteId || body.participante_id;
  const valor = Number(body.valor || 0);
  const status = body.status || 'pendente';
  const formaPagamento = body.formaPagamento || body.forma_pagamento || body.metodo || 'manual';
  const dataPagamento = body.dataPagamento || body.data_pagamento || body.pago_at || (status === 'pago' ? new Date().toISOString() : null);
  const observacao = body.observacao || null;

  if (!participanteId) throw new HttpError(400, 'missing_payment_participant', 'participante_id e obrigatorio.');
  if (!STATUS.includes(status)) throw new HttpError(400, 'invalid_payment_status', 'Status de pagamento invalido.');
  if (!FORMAS.includes(formaPagamento)) throw new HttpError(400, 'invalid_payment_method', 'Forma de pagamento invalida.');
  if (Number.isNaN(valor) || valor < 0) throw new HttpError(400, 'invalid_payment_value', 'Valor invalido.');

  return { bolaoId, participanteId, valor, status, formaPagamento, dataPagamento, observacao };
}

function createPagamentosService(repository) {
  async function ensurePayment(id, bolaoId) {
    const item = await repository.findById(id);
    if (!item || item.bolaoId !== bolaoId) throw new HttpError(404, 'payment_not_found', 'Pagamento nao encontrado.');
    return item;
  }

  async function ensureParticipant(bolaoId, participanteId) {
    if (!(await repository.participanteExists(bolaoId, participanteId))) {
      throw new HttpError(422, 'invalid_payment_participant', 'Participante nao pertence ao bolao.');
    }
  }

  return {
    getStatus() { return { module: 'pagamentos', implemented: true }; },
    async list(bolaoId, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      return repository.listByBolao(bolaoId);
    },
    async create(bolaoId, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      const data = payload(body, bolaoId);
      await ensureParticipant(bolaoId, data.participanteId);
      const pagamento = await repository.create(data);
      if (pagamento.status === 'pago') await notificacoesService.gerarPagamentoConfirmado(pagamento.id);
      return pagamento;
    },
    async update(bolaoId, id, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      await ensurePayment(id, bolaoId);
      const data = payload(body, bolaoId);
      await ensureParticipant(bolaoId, data.participanteId);
      const pagamento = await repository.update(id, data);
      if (pagamento.status === 'pago') await notificacoesService.gerarPagamentoConfirmado(pagamento.id);
      return pagamento;
    },
    async updateStatus(bolaoId, id, status, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      await ensurePayment(id, bolaoId);
      if (!STATUS.includes(status)) throw new HttpError(400, 'invalid_payment_status', 'Status de pagamento invalido.');
      const pagamento = await repository.updateStatus(id, status);
      if (pagamento.status === 'pago') await notificacoesService.gerarPagamentoConfirmado(pagamento.id);
      return pagamento;
    }
  };
}

module.exports = { createPagamentosService };
