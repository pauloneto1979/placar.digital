const crypto = require('crypto');
const { env } = require('../../config/env');
const { HttpError } = require('../errors/http-error');

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(payload, expiresInSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`;
  const signature = crypto.createHmac('sha256', env.authTokenSecret).update(unsignedToken).digest('base64url');

  return `${unsignedToken}.${signature}`;
}

function verify(token) {
  const parts = token ? token.split('.') : [];

  if (parts.length !== 3) {
    throw new HttpError(401, 'invalid_token', 'Token invalido.');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto.createHmac('sha256', env.authTokenSecret).update(unsignedToken).digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new HttpError(401, 'invalid_token', 'Token invalido.');
  }

  let payload;

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch (error) {
    throw new HttpError(401, 'invalid_token', 'Token invalido.');
  }
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw new HttpError(401, 'expired_token', 'Token expirado.');
  }

  return payload;
}

module.exports = {
  sign,
  verify
};
