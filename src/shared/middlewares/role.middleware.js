const { HttpError } = require('../errors/http-error');

function requirePerfilGlobal(perfisPermitidos) {
  return function roleMiddleware(req, res, next) {
    if (!req.auth || !perfisPermitidos.includes(req.auth.perfilGlobal)) {
      return next(new HttpError(403, 'forbidden_profile', 'Perfil sem permissao para acessar este recurso.'));
    }

    return next();
  };
}

module.exports = {
  requirePerfilGlobal
};
