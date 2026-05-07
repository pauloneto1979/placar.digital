const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((safe, [key, entryValue]) => {
      if (BLOCKED_KEYS.has(key)) return safe;
      safe[key] = sanitizeValue(entryValue);
      return safe;
    }, {});
  }

  if (typeof value === 'string') {
    return value.replace(/\0/g, '');
  }

  return value;
}

function sanitizeMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}

module.exports = {
  sanitizeMiddleware
};
