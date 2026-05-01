function createParticipantesController(service) {
  return {
    status(req, res) {
      res.json(service.getStatus());
    },
    async list(req, res, next) {
      try { res.json(await service.list(req.params.bolaoId, req.auth)); } catch (error) { next(error); }
    },
    async create(req, res, next) {
      try { res.status(201).json(await service.create(req.params.bolaoId, req.body, req.auth)); } catch (error) { next(error); }
    },
    async update(req, res, next) {
      try { res.json(await service.update(req.params.bolaoId, req.params.id, req.body, req.auth)); } catch (error) { next(error); }
    },
    async updateStatus(req, res, next) {
      try { res.json(await service.updateStatus(req.params.bolaoId, req.params.id, req.body, req.auth)); } catch (error) { next(error); }
    }
  };
}

module.exports = { createParticipantesController };
