const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { env } = require('../../config/env');
const { HttpError } = require('../../shared/errors/http-error');
const { hashPassword } = require('../../shared/utils/password');
const { assertBettorPassword, assertSystemPassword } = require('../../shared/utils/password-policy');
const { createFromAddress, createTransportConfig } = require('./email.service');

const TOKEN_TYPES = ['convite', 'ativacao', 'recuperacao_senha'];
const TOKEN_EXPIRATION_MINUTES = {
  convite: 24 * 60,
  ativacao: 24 * 60,
  recuperacao_senha: 30
};

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function email(value) {
  return clean(value).toLowerCase();
}

function tokenHash(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function expirationFor(tipo) {
  const minutes = TOKEN_EXPIRATION_MINUTES[tipo] || 30;
  return new Date(Date.now() + minutes * 60000).toISOString();
}

function normalizeBaseUrl(value) {
  const url = clean(value).replace(/\/+$/g, '');
  return /^https?:\/\//i.test(url) ? url : '';
}

async function appLink(repository, path, token) {
  const configuredUrl = await repository.getPublicAppUrl();
  const baseUrl = normalizeBaseUrl(configuredUrl) || normalizeBaseUrl(env.appBaseUrl) || `http://localhost:${env.port}`;
  return `${baseUrl}/app/${path}?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderTemplate(text, variables = {}) {
  return String(text || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? escapeHtml(variables[key]) : '';
  });
}

function baseEmailLayout(content) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin:0; background:#071018; color:#e8f5ff; font-family:Arial,sans-serif; }
          .wrap { max-width:620px; margin:0 auto; padding:28px 18px; }
          .card { background:#0f1d29; border:1px solid rgba(33,212,253,.22); border-radius:18px; padding:28px; }
          .brand { color:#c8ff2e; font-size:22px; font-weight:800; margin-bottom:18px; }
          h1 { color:#fff; font-size:24px; margin:0 0 14px; }
          p { color:#b7c9d9; font-size:15px; line-height:1.55; }
          .cta { display:inline-block; background:#c8ff2e; color:#061018 !important; padding:13px 18px; border-radius:999px; font-weight:800; text-decoration:none; }
          .footer { color:#7190a8; font-size:12px; margin-top:18px; text-align:center; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="brand">Placar.digital</div>
            ${content}
          </div>
          <div class="footer">Mensagem transacional enviada pelo Placar.digital.</div>
        </div>
      </body>
    </html>
  `;
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function dateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function publicTokenInfo(row) {
  if (!row) return null;
  return {
    tipo: row.tipo,
    expiracao: row.expiracao,
    utilizado: Boolean(row.utilizado_em),
    expirado: new Date(row.expiracao).getTime() <= Date.now()
  };
}

function createTransactionalEmailService(repository, options = {}) {
  const logger = options.logger || console;

  async function createToken(usuarioId, tipo, metadata = {}) {
    if (!TOKEN_TYPES.includes(tipo)) {
      throw new HttpError(400, 'invalid_auth_token_type', 'Tipo de token invalido.');
    }
    const rawToken = generateRawToken();
    const row = await repository.createAuthToken({
      usuarioId,
      tipo,
      token: tokenHash(rawToken),
      expiracao: expirationFor(tipo),
      metadata
    });
    return { rawToken, token: row };
  }

  async function getValidToken(rawToken, tiposPermitidos = TOKEN_TYPES) {
    const hash = tokenHash(clean(rawToken));
    const row = await repository.findAuthToken(hash);
    if (!row || !tiposPermitidos.includes(row.tipo)) {
      throw new HttpError(404, 'invalid_token', 'Link invalido.');
    }
    if (row.utilizado_em) {
      throw new HttpError(410, 'token_already_used', 'Link ja utilizado.');
    }
    if (new Date(row.expiracao).getTime() <= Date.now()) {
      throw new HttpError(410, 'token_expired', 'Link expirado.');
    }
    return row;
  }

  async function sendTemplate({ usuarioId, bolaoId, destinatario, tipoEvento, tipo = 'sistema', templateCode, idioma = 'pt-BR', variables = {}, payload = {} }) {
    const template = await repository.getTemplate(templateCode, idioma);
    if (!template) {
      throw new HttpError(500, 'email_template_missing', 'Template de e-mail nao encontrado.');
    }

    const assunto = renderTemplate(template.assunto, variables);
    const html = baseEmailLayout(renderTemplate(template.html, variables));
    const log = await repository.createNotificationLog({
      usuarioId,
      bolaoId,
      tipo,
      tipoEvento,
      destinatario,
      assunto,
      mensagem: assunto,
      payload: { ...payload, templateCode }
    });

    const config = await repository.getLatest({ includeSecret: true });
    if (!config || !config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPassword || !config.smtpFromEmail) {
      await repository.markNotificationError(log.id, 'Configuracao SMTP incompleta.', { code: 'email_not_configured' });
      return { sent: false, reason: 'email_not_configured', notificationId: log.id };
    }

    const transporter = nodemailer.createTransport(createTransportConfig(config));
    try {
      const info = await transporter.sendMail({
        from: createFromAddress(config),
        to: destinatario,
        replyTo: config.smtpReplyTo || undefined,
        subject: assunto,
        html
      });
      await repository.markNotificationSent(log.id, { messageId: info.messageId || null });
      logger.info('[email] E-mail transacional enviado.', { tipoEvento, destinatario, messageId: info.messageId || null });
      return { sent: true, notificationId: log.id, messageId: info.messageId || null };
    } catch (error) {
      await repository.markNotificationError(log.id, error.code || error.message || 'smtp_error', { code: error.code || 'smtp_error' });
      logger.warn('[email] Falha no envio transacional.', { tipoEvento, destinatario, code: error.code || 'smtp_error' });
      return { sent: false, reason: error.code || 'smtp_error', notificationId: log.id };
    } finally {
      transporter.close();
    }
  }

  async function enviarConviteParticipante(participanteId) {
    const context = await repository.getParticipantContext(participanteId);
    if (!context || !context.usuario_id) return { sent: false, reason: 'participant_context_missing' };
    const { rawToken } = await createToken(context.usuario_id, 'convite', {
      participanteId: context.participante_id,
      bolaoId: context.bolao_id
    });
    const link = await appLink(repository, 'ativacao.html', rawToken);
    return sendTemplate({
      usuarioId: context.usuario_id,
      bolaoId: context.bolao_id,
      destinatario: context.usuario_email || context.participante_email,
      tipoEvento: 'convite_bolao',
      templateCode: 'convite_bolao',
      variables: {
        nome_apostador: context.participante_nome,
        nome_bolao: context.bolao_nome,
        link
      },
      payload: { participanteId: context.participante_id }
    });
  }

  async function solicitarRecuperacaoSenha(payload = {}) {
    const destino = email(payload.email);
    if (!destino || !destino.includes('@')) {
      throw new HttpError(400, 'invalid_recovery_email', 'E-mail invalido.');
    }
    const user = await repository.findUserByEmail(destino);
    if (!user || !user.ativo) {
      return { success: true };
    }
    const { rawToken } = await createToken(user.id, 'recuperacao_senha', {});
    const link = await appLink(repository, 'redefinir-senha.html', rawToken);
    await sendTemplate({
      usuarioId: user.id,
      destinatario: user.email,
      tipoEvento: 'recuperacao_senha',
      templateCode: 'recuperacao_senha',
      variables: {
        nome_usuario: user.nome,
        link
      }
    });
    return { success: true };
  }

  async function validarToken(rawToken) {
    const hash = tokenHash(clean(rawToken));
    const row = await repository.findAuthToken(hash);
    return { valid: Boolean(row && !row.utilizado_em && new Date(row.expiracao).getTime() > Date.now()), token: publicTokenInfo(row) };
  }

  async function ativarConta(payload = {}) {
    const token = await getValidToken(payload.token, ['convite', 'ativacao']);
    const user = await repository.findUserById(token.usuario_id);
    if (!user) throw new HttpError(404, 'user_not_found', 'Usuario nao encontrado.');
    const senha = payload.senha || payload.password || payload.novaSenha || '';
    const confirmar = payload.confirmarSenha || payload.confirmPassword || payload.confirmar_senha || '';
    if (senha !== confirmar) {
      throw new HttpError(400, 'password_confirmation_mismatch', 'A confirmacao da senha nao confere.');
    }
    if (user.perfil_global === 'apostador') assertBettorPassword(senha);
    else assertSystemPassword(senha);
    await repository.updateUserPasswordAndStatus(user.id, hashPassword(senha), true);
    await repository.activateParticipantFromToken(token.metadata || {});
    await repository.markAuthTokenUsed(token.id);
    return { success: true };
  }

  async function redefinirSenha(payload = {}) {
    const token = await getValidToken(payload.token, ['recuperacao_senha']);
    const user = await repository.findUserById(token.usuario_id);
    if (!user || !user.ativo) throw new HttpError(404, 'user_not_found', 'Usuario nao encontrado.');
    const senha = payload.novaSenha || payload.senha || payload.password || '';
    const confirmar = payload.confirmarNovaSenha || payload.confirmarSenha || payload.confirmPassword || '';
    if (senha !== confirmar) {
      throw new HttpError(400, 'password_confirmation_mismatch', 'A confirmacao da senha nao confere.');
    }
    if (user.perfil_global === 'apostador') assertBettorPassword(senha);
    else assertSystemPassword(senha);
    await repository.updateUserPasswordAndStatus(user.id, hashPassword(senha), true);
    await repository.markAuthTokenUsed(token.id);
    return { success: true };
  }

  async function enviarPagamentoConfirmado(pagamentoId) {
    const context = await repository.getPaymentContext(pagamentoId);
    if (!context || !context.participante_email) return { sent: false, reason: 'payment_context_missing' };
    return sendTemplate({
      usuarioId: context.usuario_id,
      bolaoId: context.bolao_id,
      destinatario: context.usuario_email || context.participante_email,
      tipoEvento: 'pagamento_confirmado',
      tipo: 'pagamento',
      templateCode: 'pagamento_confirmado',
      variables: {
        nome_apostador: context.participante_nome,
        nome_bolao: context.bolao_nome,
        valor: money(context.valor),
        data_pagamento: dateTime(context.pago_at || new Date())
      },
      payload: { pagamentoId }
    });
  }

  return {
    createToken,
    enviarConviteParticipante,
    solicitarRecuperacaoSenha,
    validarToken,
    ativarConta,
    redefinirSenha,
    enviarPagamentoConfirmado
  };
}

module.exports = {
  createTransactionalEmailService
};
