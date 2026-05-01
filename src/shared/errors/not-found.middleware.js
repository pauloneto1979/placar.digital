function notFoundMiddleware(req, res) {
  res.status(404).json({
    error: 'not_found',
    message: 'Rota nao encontrada.'
  });
}

module.exports = {
  notFoundMiddleware
};
