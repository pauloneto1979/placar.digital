const { emailRoutes } = require('./email.routes');
const repository = require('./email.repository');
const { createEmailService } = require('./email.service');
const { createTransactionalEmailService } = require('./email-transacional.service');

module.exports = {
  emailRoutes,
  emailRepository: repository,
  createEmailService,
  createTransactionalEmailService
};
