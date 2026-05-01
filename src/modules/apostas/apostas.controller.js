function createApostasController(service) {
  return {
    status(req, res) { res.json(service.getStatus()); },
    async dashboard(req, res, next) { try { res.json(await service.dashboard(req.params.bolaoId, req.auth)); } catch (e) { next(e); } },
    async jogos(req, res, next) { try { res.json(await service.jogos(req.params.bolaoId, req.query, req.auth)); } catch (e) { next(e); } },
    async apostar(req, res, next) { try { res.status(201).json(await service.apostar(req.params.bolaoId, req.body, req.auth)); } catch (e) { next(e); } },
    async minhasApostas(req, res, next) { try { res.json(await service.minhasApostas(req.params.bolaoId, req.auth)); } catch (e) { next(e); } },
    async regras(req, res, next) { try { res.json(await service.regras(req.params.bolaoId, req.auth)); } catch (e) { next(e); } }
  };
}

module.exports = {
  createApostasController
};
