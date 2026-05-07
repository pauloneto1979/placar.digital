const { HttpError } = require('../errors/http-error');

function cleanPassword(value) {
  return typeof value === 'string' ? value : '';
}

function validateSystemPassword(password) {
  const value = cleanPassword(password);
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  );
}

function assertSystemPassword(password) {
  if (!validateSystemPassword(password)) {
    throw new HttpError(
      400,
      'invalid_system_password',
      'A senha deve ter no minimo 8 caracteres, com ao menos 1 letra maiuscula, 1 letra minuscula e 1 numero.'
    );
  }
}

function assertBettorPassword(password) {
  if (!cleanPassword(password)) {
    throw new HttpError(400, 'missing_bettor_password', 'Senha do apostador e obrigatoria.');
  }
}

module.exports = {
  assertSystemPassword,
  assertBettorPassword,
  validateSystemPassword
};
