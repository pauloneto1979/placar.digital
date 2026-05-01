const crypto = require('crypto');

const HASH_ALGORITHM = 'sha256';
const HASH_ENCODING = 'hex';
const DEFAULT_ITERATIONS = 120000;
const KEY_LENGTH = 64;

function hashPassword(password, options = {}) {
  const iterations = options.iterations || DEFAULT_ITERATIONS;
  const salt = options.salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LENGTH, HASH_ALGORITHM)
    .toString(HASH_ENCODING);

  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const [strategy, iterations, salt, expectedHash] = storedHash.split('$');

  if (strategy !== 'pbkdf2' || !iterations || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto
    .pbkdf2Sync(password, salt, Number(iterations), KEY_LENGTH, HASH_ALGORITHM)
    .toString(HASH_ENCODING);

  const actualBuffer = Buffer.from(actualHash, HASH_ENCODING);
  const expectedBuffer = Buffer.from(expectedHash, HASH_ENCODING);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

module.exports = {
  hashPassword,
  verifyPassword
};
