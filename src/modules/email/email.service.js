const nodemailer = require('nodemailer');
const { HttpError } = require('../../shared/errors/http-error');
const { maskSecret, validateConfigPayload, validateTestPayload } = require('./email.validator');

const TEST_SUBJECT = 'Teste de configuração de e-mail';
const TEST_TEXT = 'Seu serviço de envio de e-mail do Placar.digital foi configurado com sucesso.';

function sanitize(config) {
  if (!config) {
    return {
      configured: false,
      smtpPasswordConfigured: false,
      smtpPasswordMasked: '',
      smtpEnabled: false
    };
  }

  return {
    id: config.id,
    providerName: config.providerName,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpSecure: config.smtpSecure,
    smtpUser: config.smtpUser,
    smtpPasswordConfigured: Boolean(config.smtpPassword),
    smtpPasswordMasked: maskSecret(config.smtpPassword),
    smtpFromName: config.smtpFromName,
    smtpFromEmail: config.smtpFromEmail,
    smtpReplyTo: config.smtpReplyTo,
    smtpEnabled: config.smtpEnabled,
    configured: Boolean(config.smtpHost && config.smtpPort && config.smtpUser && config.smtpPassword && config.smtpFromEmail),
    updatedAt: config.updatedAt
  };
}

function createTransportConfig(config) {
  return {
    host: config.smtpHost,
    port: config.smtpPort,
    secure: Boolean(config.smtpSecure),
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword
    },
    pool: true,
    maxConnections: 2,
    maxMessages: 20,
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000,
    requireTLS: !config.smtpSecure && Number(config.smtpPort) === 587,
    tls: {
      minVersion: 'TLSv1.2'
    }
  };
}

function friendlyMailError(error) {
  const code = error.code || error.responseCode || 'smtp_error';
  if (['EAUTH', 535, 534].includes(code)) {
    return new HttpError(422, 'smtp_auth_error', 'Falha de autenticacao SMTP. Verifique usuario e senha.');
  }
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET'].includes(code)) {
    return new HttpError(504, 'smtp_connection_error', 'Nao foi possivel conectar ao SMTP. Verifique host, porta e SSL/TLS.');
  }
  return new HttpError(502, 'smtp_send_error', 'Nao foi possivel enviar o e-mail de teste.');
}

function createEmailService(repository) {
  async function getSecretConfig() {
    const config = await repository.getLatest({ includeSecret: true });
    if (!config || !config.smtpPassword) {
      throw new HttpError(422, 'email_not_configured', 'Configuracao de e-mail incompleta.');
    }
    return config;
  }

  return {
    async getConfiguracao() {
      return sanitize(await repository.getLatest({ includeSecret: true }));
    },

    async salvarConfiguracao(payload) {
      const existing = await repository.getLatest({ includeSecret: true });
      const existingForValidation = existing ? { ...existing, smtpPasswordMasked: maskSecret(existing.smtpPassword) } : null;
      const data = validateConfigPayload(payload, existingForValidation);
      const saved = await repository.upsert(data);
      return sanitize(saved);
    },

    async enviarTeste(payload) {
      const { destino } = validateTestPayload(payload);
      const config = await getSecretConfig();
      const transporter = nodemailer.createTransport(createTransportConfig(config));
      const from = config.smtpFromName
        ? `"${config.smtpFromName.replace(/"/g, '')}" <${config.smtpFromEmail}>`
        : config.smtpFromEmail;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          await transporter.verify();
          const info = await transporter.sendMail({
            from,
            to: destino,
            replyTo: config.smtpReplyTo || undefined,
            subject: TEST_SUBJECT,
            text: TEST_TEXT,
            html: `<p>${TEST_TEXT}</p>`
          });
          console.info('[email] E-mail de teste enviado.', {
            providerName: config.providerName,
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure,
            messageId: info.messageId
          });
          transporter.close();
          return { success: true, messageId: info.messageId || null };
        } catch (error) {
          console.warn('[email] Falha ao enviar e-mail de teste.', {
            providerName: config.providerName,
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure,
            code: error.code || error.responseCode || 'smtp_error',
            attempt
          });
          if (attempt === 2) {
            transporter.close();
            throw friendlyMailError(error);
          }
        }
      }
      transporter.close();
      return { success: false };
    }
  };
}

module.exports = {
  createEmailService
};
