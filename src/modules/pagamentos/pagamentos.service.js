const { env } = require('../../config/env');
const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');
const notificacoesRepository = require('../notificacoes/notificacoes.repository');
const { createNotificacoesService } = require('../notificacoes/notificacoes.service');

const STATUS = ['pendente', 'pago', 'cancelado'];
const FORMAS = ['pix', 'dinheiro', 'manual', 'outro'];
const notificacoesService = createNotificacoesService(notificacoesRepository);

function centsFromMoney(value) {
  return Math.round(Number(value) * 100);
}

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

  function ensureInfinitePayConfigured() {
    if (!env.infinitePayHandle) {
      throw new HttpError(500, 'infinitepay_not_configured', 'INFINITEPAY_HANDLE nao foi configurado.');
    }
  }

  function getWebhookUrl(body) {
    return body.webhookUrl || body.webhook_url || null;
  }

  function getRedirectUrl(body) {
    return body.redirectUrl || body.redirect_url || null;
  }

  function isInfinitePayApproved(payload) {
    const status = String(payload.status || payload.status_gateway || payload.payment_status || '').toLowerCase();
    return payload.paid === true
      || status === 'approved'
      || status === 'aprovado'
      || status === 'paid'
      || Boolean(payload.transaction_nsu);
  }

  function mapWebhookStatus(payload) {
    if (isInfinitePayApproved(payload)) return 'approved';
    return String(payload.status || payload.status_gateway || payload.payment_status || 'received').toLowerCase();
  }

  async function requestInfinitePayLink(payload) {
    const url = `${env.infinitePayApiUrl.replace(/\/$/, '')}/links`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new HttpError(
        502,
        'infinitepay_checkout_error',
        `InfinitePay retornou erro ao gerar checkout: ${JSON.stringify(body)}`
      );
    }

    const checkoutUrl = body?.url || body?.checkout_url || body?.link;
    if (!checkoutUrl) {
      throw new HttpError(502, 'infinitepay_checkout_url_missing', 'InfinitePay nao retornou url de checkout.');
    }

    return { checkoutUrl, responseBody: body };
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
    },
    async gerarLinkInfinitePay(bolaoId, id, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      ensureInfinitePayConfigured();
      const pagamento = await ensurePayment(id, bolaoId);

      if (pagamento.status !== 'pendente') {
        throw new HttpError(422, 'payment_not_pending', 'Checkout so pode ser gerado para pagamento pendente.');
      }

      if (pagamento.valor <= 0) {
        throw new HttpError(422, 'invalid_payment_value_for_checkout', 'Valor do pagamento deve ser maior que zero.');
      }

      const context = await repository.getCheckoutContext(id);
      if (!context) throw new HttpError(404, 'payment_not_found', 'Pagamento nao encontrado.');

      const orderNsu = pagamento.id;
      const checkoutPayload = {
        handle: env.infinitePayHandle,
        order_nsu: orderNsu,
        items: [{
          description: `Participacao no bolao ${context.bolao_nome}`,
          quantity: 1,
          price: centsFromMoney(pagamento.valor)
        }]
      };
      const redirectUrl = getRedirectUrl(body || {});
      const webhookUrl = getWebhookUrl(body || {});
      if (redirectUrl) checkoutPayload.redirect_url = redirectUrl;
      if (webhookUrl) checkoutPayload.webhook_url = webhookUrl;
      if (context.participante_nome || context.participante_email || context.participante_telefone) {
        checkoutPayload.customer = {
          name: context.participante_nome,
          email: context.participante_email,
          phone_number: context.participante_telefone
        };
      }

      const { checkoutUrl, responseBody } = await requestInfinitePayLink(checkoutPayload);
      return repository.saveGatewayCheckout(id, {
        orderNsu,
        checkoutUrl,
        statusGateway: responseBody.status || 'checkout_created'
      });
    },
    async webhookInfinitePay(payload) {
      const orderNsu = payload.order_nsu || payload.orderNsu;
      if (!orderNsu) throw new HttpError(400, 'missing_order_nsu', 'order_nsu e obrigatorio no webhook.');

      const pagamento = await repository.findByOrderNsu(orderNsu);
      if (!pagamento) throw new HttpError(404, 'payment_not_found', 'Pagamento nao encontrado para order_nsu.');

      if (isInfinitePayApproved(payload)) {
        if (pagamento.status === 'pago') {
          await repository.saveGatewayWebhook(pagamento.id, 'approved', payload);
          return { received: true, paid: true, pagamentoId: pagamento.id, duplicated: true };
        }

        const updated = await repository.confirmInfinitePayPayment(pagamento.id, payload);
        await notificacoesService.gerarPagamentoConfirmado(updated.id);
        return { received: true, paid: true, pagamentoId: updated.id };
      }

      await repository.saveGatewayWebhook(pagamento.id, mapWebhookStatus(payload), payload);
      return { received: true, paid: false, pagamentoId: pagamento.id };
    }
  };
}

module.exports = { createPagamentosService };
