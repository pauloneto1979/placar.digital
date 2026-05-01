function createPartidasController(service) {
  return {
    status(req, res) { res.json(service.getStatus()); },
    async list(req, res, next) { try { res.json(await service.list(req.params.bolaoId, req.auth)); } catch (e) { next(e); } },
    async create(req, res, next) { try { res.status(201).json(await service.create(req.params.bolaoId, req.body, req.auth)); } catch (e) { next(e); } },
    async update(req, res, next) { try { res.json(await service.update(req.params.bolaoId, req.params.id, req.body, req.auth, req.context)); } catch (e) { next(e); } },
    async informarResultado(req, res, next) { try { res.json(await service.informarResultado(req.params.bolaoId, req.params.id, req.body, req.auth, req.context)); } catch (e) { next(e); } }
  };
}
module.exports = { createPartidasController };
