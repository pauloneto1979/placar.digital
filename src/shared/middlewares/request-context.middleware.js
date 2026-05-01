function requestContextMiddleware(req, res, next) {
  req.context = {
    requestId: req.headers['x-request-id'] || null
  };

  next();
}

module.exports = {
  requestContextMiddleware
};
