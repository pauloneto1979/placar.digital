function createPagamentosController(service) {
  return {
    status(req, res) { res.json(service.getStatus()); },
    async list(req, res, next) { try { res.json(await service.list(req.params.bolaoId, req.auth)); } catch (e) { next(e); } },
    async create(req, res, next) { try { res.status(201).json(await service.create(req.params.bolaoId, req.body, req.auth)); } catch (e) { next(e); } },
    async update(req, res, next) { try { res.json(await service.update(req.params.bolaoId, req.params.id, req.body, req.auth)); } catch (e) { next(e); } },
    async marcarPago(req, res, next) { try { res.json(await service.updateStatus(req.params.bolaoId, req.params.id, 'pago', req.auth)); } catch (e) { next(e); } },
    async voltarPendente(req, res, next) { try { res.json(await service.updateStatus(req.params.bolaoId, req.params.id, 'pendente', req.auth)); } catch (e) { next(e); } },
    async cancelar(req, res, next) { try { res.json(await service.updateStatus(req.params.bolaoId, req.params.id, 'cancelado', req.auth)); } catch (e) { next(e); } }
  };
}

module.exports = { createPagamentosController };
