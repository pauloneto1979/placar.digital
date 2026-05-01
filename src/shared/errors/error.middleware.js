function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.statusCode || 500).json({
    error: error.code || 'internal_error',
    message: error.message || 'Erro interno.'
  });
}

module.exports = {
  errorMiddleware
};
