function requestContextMiddleware(req, res, next) {
  req.context = {
    requestId: req.headers['x-request-id'] || null,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || null
  };

  next();
}

module.exports = {
  requestContextMiddleware
};
