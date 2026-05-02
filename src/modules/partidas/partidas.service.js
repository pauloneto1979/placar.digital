const { HttpError } = require('../../shared/errors/http-error');
const { ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');
const notificacoesRepository = require('../notificacoes/notificacoes.repository');
const { createNotificacoesService } = require('../notificacoes/notificacoes.service');
const rankingRepository = require('../ranking/ranking.repository');
const { createRankingService } = require('../ranking/ranking.service');

const STATUS = ['agendada', 'em_andamento', 'finalizada', 'cancelada', 'inativa'];
const notificacoesService = createNotificacoesService(notificacoesRepository);
const rankingService = createRankingService(rankingRepository);

function clean(v) { return typeof v === 'string' ? v.trim() : ''; }
function intOrNull(v) { return v === undefined || v === null || v === '' ? null : Number(v); }

function payload(body, bolaoId) {
  const faseId = body.faseId || body.fase_id || null;
  const timeMandanteId = body.timeMandanteId || body.time_mandante_id;
  const timeVisitanteId = body.timeVisitanteId || body.time_visitante_id;
  const dataHora = body.dataHora || body.data_hora || body.inicio_at;
  const status = body.status || 'agendada';
  const placarMandante = intOrNull(body.placarMandante ?? body.placar_mandante);
  const placarVisitante = intOrNull(body.placarVisitante ?? body.placar_visitante);

  if (!timeMandanteId || !timeVisitanteId || !dataHora) throw new HttpError(400, 'invalid_match_payload', 'Times e data_hora sao obrigatorios.');
  if (timeMandanteId === timeVisitanteId) throw new HttpError(400, 'same_match_teams', 'Mandante e visitante nao podem ser iguais.');
  if (Number.isNaN(Date.parse(dataHora))) throw new HttpError(400, 'invalid_match_datetime', 'data_hora invalida.');
  if (!STATUS.includes(status)) throw new HttpError(400, 'invalid_match_status', 'Status de partida invalido.');
  if ((placarMandante !== null && (Number.isNaN(placarMandante) || placarMandante < 0)) || (placarVisitante !== null && (Number.isNaN(placarVisitante) || placarVisitante < 0))) {
    throw new HttpError(400, 'invalid_match_score', 'Placar invalido.');
  }

  return {
    bolaoId, faseId, timeMandanteId, timeVisitanteId, dataHora,
    estadio: clean(body.estadio),
    placarMandante,
    placarVisitante,
    status,
    ativo: status !== 'inativa' && body.ativo !== false,
    resultadoConfirmado: placarMandante !== null && placarVisitante !== null && ['finalizada', 'encerrada'].includes(status)
  };
}

function createPartidasService(repository) {
  async function validate(data) {
    if (data.faseId && !(await repository.faseBelongsToBolao(data.faseId, data.bolaoId))) {
      throw new HttpError(422, 'invalid_match_phase', 'Fase nao pertence ao bolao.');
    }
    if (!(await repository.timeAtivo(data.timeMandanteId)) || !(await repository.timeAtivo(data.timeVisitanteId))) {
      throw new HttpError(422, 'inactive_match_team', 'Times devem estar ativos.');
    }
  }
  async function ensure(id, bolaoId) {
    const item = await repository.findById(id);
    if (!item || item.bolaoId !== bolaoId) throw new HttpError(404, 'match_not_found', 'Partida nao encontrada.');
    return item;
  }
  async function auditResultado(auth, context, before, after) {
    const changedScore = before.placarMandante !== after.placarMandante || before.placarVisitante !== after.placarVisitante || before.status !== after.status;
    const hasScore = after.placarMandante !== null && after.placarVisitante !== null;
    if (!changedScore || !hasScore) return;
    await repository.createAuditLog({
      usuarioId: auth.usuarioId,
      bolaoId: after.bolaoId,
      entidade: 'partida',
      entidadeId: after.id,
      acao: 'informar_resultado',
      dataHora: new Date().toISOString(),
      dadosAnteriores: before,
      dadosNovos: {
        ...after,
        dataHoraAuditoria: new Date().toISOString()
      },
      ip: context.ip,
      userAgent: context.userAgent
    });
  }
  return {
    getStatus() { return { module: 'partidas', implemented: true }; },
    async list(bolaoId, auth) { await ensureCanAdminBolao(auth, bolaoId); return repository.listByBolao(bolaoId); },
    async create(bolaoId, body, auth) { await ensureCanAdminBolao(auth, bolaoId); const data = payload(body, bolaoId); await validate(data); return repository.create(data); },
    async update(bolaoId, id, body, auth, context) {
      await ensureCanAdminBolao(auth, bolaoId);
      const before = await ensure(id, bolaoId);
      const data = payload(body, bolaoId);
      await validate(data);
      const after = await repository.update(id, data);
      await auditResultado(auth, context, before, after);
      if (after.resultadoConfirmado) {
        await rankingService.recalcularPartidaPorResultado(after.id, auth, context);
        await notificacoesService.gerarResultadoLancado(after.id);
      }
      return after;
    },
    async informarResultado(bolaoId, id, body, auth, context) {
      await ensureCanAdminBolao(auth, bolaoId);
      const before = await ensure(id, bolaoId);
      const data = { ...before, placarMandante: intOrNull(body.placarMandante ?? body.placar_mandante), placarVisitante: intOrNull(body.placarVisitante ?? body.placar_visitante), status: body.status || 'finalizada', resultadoConfirmado: true, ativo: true };
      if (data.placarMandante === null || data.placarVisitante === null) throw new HttpError(400, 'invalid_match_score', 'Informe os dois placares.');
      const after = await repository.update(id, data);
      await auditResultado(auth, context, before, after);
      await rankingService.recalcularPartidaPorResultado(after.id, auth, context);
      await notificacoesService.gerarResultadoLancado(after.id);
      return after;
    }
  };
}
module.exports = { createPartidasService };
