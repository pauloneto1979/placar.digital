const { createModuleRouter } = require('../../shared/utils/create-module');
const { createAuditoriaController } = require('./auditoria.controller');
const { auditoriaRepository } = require('./auditoria.repository');
const { createAuditoriaService } = require('./auditoria.service');

const auditoriaService = createAuditoriaService(auditoriaRepository);
const auditoriaController = createAuditoriaController(auditoriaService);
const auditoriaRoutes = createModuleRouter(auditoriaController);

module.exports = {
  auditoriaRoutes
};
