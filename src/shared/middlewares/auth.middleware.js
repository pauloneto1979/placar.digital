const { HttpError } = require('../errors/http-error');
const { verify } = require('../utils/token');

function authMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new HttpError(401, 'missing_token', 'Token nao informado.');
    }

    req.auth = verify(token);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authMiddleware
};
