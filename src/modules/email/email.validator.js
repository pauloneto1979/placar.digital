const { HttpError } = require('../../shared/errors/http-error');

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean(value));
}

function maskSecret(value) {
  const text = String(value || '');
  if (!text) return '';
  const visible = text.slice(-3);
  return `${'*'.repeat(Math.max(8, text.length - visible.length))}${visible}`;
}

function validatePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new HttpError(400, 'invalid_smtp_port', 'Porta SMTP invalida.');
  }
  return port;
}

function validateEmail(value, fieldName) {
  const email = clean(value).toLowerCase();
  if (!email || !isEmail(email)) {
    throw new HttpError(400, `invalid_${fieldName}`, `${fieldName} invalido.`);
  }
  return email;
}

function validateOptionalEmail(value, fieldName) {
  const email = clean(value).toLowerCase();
  if (!email) return '';
  if (!isEmail(email)) {
    throw new HttpError(400, `invalid_${fieldName}`, `${fieldName} invalido.`);
  }
  return email;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new HttpError(400, 'invalid_smtp_boolean', 'Campo booleano invalido.');
}

function validateConfigPayload(payload = {}, existing = null) {
  const smtpHost = clean(payload.smtpHost ?? payload.smtp_host ?? existing?.smtpHost);
  if (!smtpHost || /\s/.test(smtpHost)) {
    throw new HttpError(400, 'invalid_smtp_host', 'Host SMTP invalido.');
  }

  const smtpPassword = clean(payload.smtpPassword ?? payload.smtp_password);
  const maskedPassword = existing?.smtpPasswordMasked || '';
  const shouldUpdatePassword = Boolean(smtpPassword && smtpPassword !== maskedPassword);
  const hasStoredPassword = Boolean(existing?.smtpPassword || existing?.smtpPasswordMasked);

  const smtpUser = clean(payload.smtpUser ?? payload.smtp_user ?? existing?.smtpUser);
  const smtpFromName = clean(payload.smtpFromName ?? payload.smtp_from_name ?? existing?.smtpFromName);
  const providerName = clean(payload.providerName ?? payload.provider_name ?? existing?.providerName ?? 'hostgator');

  if (!smtpUser) {
    throw new HttpError(400, 'invalid_smtp_user', 'Usuario SMTP e obrigatorio.');
  }
  if (!smtpFromName) {
    throw new HttpError(400, 'invalid_smtp_from_name', 'Nome do remetente e obrigatorio.');
  }
  if (!providerName) {
    throw new HttpError(400, 'invalid_email_provider', 'Provider de e-mail e obrigatorio.');
  }

  const smtpEnabled = normalizeBoolean(payload.smtpEnabled ?? payload.smtp_enabled, existing?.smtpEnabled ?? false);
  if (smtpEnabled && !shouldUpdatePassword && !hasStoredPassword) {
    throw new HttpError(400, 'invalid_smtp_password', 'Senha SMTP obrigatoria para habilitar o envio de e-mail.');
  }

  return {
    smtpHost,
    smtpPort: validatePort(payload.smtpPort ?? payload.smtp_port ?? existing?.smtpPort),
    smtpSecure: normalizeBoolean(payload.smtpSecure ?? payload.smtp_secure, existing?.smtpSecure ?? false),
    smtpUser,
    smtpPassword: shouldUpdatePassword ? smtpPassword : null,
    updatePassword: shouldUpdatePassword,
    smtpFromName,
    smtpFromEmail: validateEmail(payload.smtpFromEmail ?? payload.smtp_from_email ?? existing?.smtpFromEmail, 'smtp_from_email'),
    smtpReplyTo: validateOptionalEmail(payload.smtpReplyTo ?? payload.smtp_reply_to ?? existing?.smtpReplyTo, 'smtp_reply_to'),
    smtpEnabled,
    providerName
  };
}

function validateTestPayload(payload = {}) {
  return {
    destino: validateEmail(payload.destino || payload.email || payload.to, 'email_destino')
  };
}

module.exports = {
  clean,
  maskSecret,
  validateConfigPayload,
  validateTestPayload
};
