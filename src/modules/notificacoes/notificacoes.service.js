const { HttpError } = require('../../shared/errors/http-error');
const { ensureApostadorSelecionado, ensureCanAdminBolao } = require('../../shared/permissions/bolao-access');

const TIPOS = [
  'JOGO_VAI_COMECAR',
  'APOSTA_ENCERRANDO',
  'RESULTADO_LANCADO',
  'RANKING_ATUALIZADO',
  'PAGAMENTO_CONFIRMADO'
];
const CANAIS = ['sistema', 'email', 'whatsapp', 'push'];
const STATUS = ['pendente', 'enviada', 'erro', 'cancelada', 'enviada_sistema'];

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function notificationPayload(body, bolaoId) {
  const tipo = clean(body.tipo || 'JOGO_VAI_COMECAR').toUpperCase();
  const canal = clean(body.canal || 'sistema').toLowerCase();
  const status = clean(body.status || 'pendente').toLowerCase();
  const titulo = clean(body.titulo);
  const mensagem = clean(body.mensagem);
  const dataAgendada = body.dataAgendada || body.data_agendada || null;

  if (!TIPOS.includes(tipo)) throw new HttpError(400, 'invalid_notification_type', 'Tipo de notificacao invalido.');
  if (!CANAIS.includes(canal)) throw new HttpError(400, 'invalid_notification_channel', 'Canal de notificacao invalido.');
  if (!STATUS.includes(status)) throw new HttpError(400, 'invalid_notification_status', 'Status de notificacao invalido.');
  if (!titulo) throw new HttpError(400, 'missing_notification_title', 'Titulo e obrigatorio.');
  if (!mensagem) throw new HttpError(400, 'missing_notification_message', 'Mensagem e obrigatoria.');
  if (dataAgendada && Number.isNaN(Date.parse(dataAgendada))) {
    throw new HttpError(400, 'invalid_notification_schedule', 'data_agendada invalida.');
  }

  return {
    bolaoId,
    tipo,
    canal,
    status,
    titulo,
    mensagem,
    dataAgendada,
    payload: body.payload || null
  };
}

function createNotificacoesService(repository) {
  async function shouldGenerateAutomatic() {
    return repository.notificacoesAtivas();
  }

  async function createAutomatic(data) {
    if (!(await shouldGenerateAutomatic())) return [];
    return repository.createMany(Array.isArray(data) ? data : [data]);
  }

  return {
    getStatus() {
      return { module: 'notificacoes', implemented: true };
    },
    async minhas(bolaoId, auth) {
      ensureApostadorSelecionado(auth, bolaoId);
      return repository.listByApostador(bolaoId, auth.participanteId, auth.usuarioId);
    },
    async marcarLida(bolaoId, id, auth) {
      ensureApostadorSelecionado(auth, bolaoId);
      const item = await repository.findById(id);
      if (!item || item.bolaoId !== bolaoId) throw new HttpError(404, 'notification_not_found', 'Notificacao nao encontrada.');
      const canRead = item.participanteId === auth.participanteId || item.usuarioId === auth.usuarioId || (!item.participanteId && !item.usuarioId);
      if (!canRead) throw new HttpError(403, 'forbidden_notification_read', 'Notificacao nao pertence ao apostador.');
      return repository.markAsRead(id);
    },
    async listAdmin(bolaoId, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      return repository.listByBolao(bolaoId);
    },
    async criarManualTodos(bolaoId, body, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      const data = notificationPayload(body, bolaoId);
      const participantes = await repository.listParticipantesAtivos(bolaoId);
      const items = participantes.map((participante) => ({
        ...data,
        participanteId: participante.id,
        payload: {
          ...(data.payload || {}),
          participanteNome: participante.nome,
          manual: true
        }
      }));
      return repository.createMany(items);
    },
    async cancelar(bolaoId, id, auth) {
      await ensureCanAdminBolao(auth, bolaoId);
      const item = await repository.findById(id);
      if (!item || item.bolaoId !== bolaoId) throw new HttpError(404, 'notification_not_found', 'Notificacao nao encontrada.');
      if (item.status !== 'pendente') throw new HttpError(422, 'notification_not_pending', 'Apenas notificacoes pendentes podem ser canceladas.');
      return repository.cancelPending(id);
    },
    async gerarResultadoLancado(partidaId) {
      const partida = await repository.getPartidaResumo(partidaId);
      if (!partida) return [];
      return createAutomatic({
        bolaoId: partida.bolao_id,
        tipo: 'RESULTADO_LANCADO',
        titulo: 'Resultado lancado',
        mensagem: `${partida.mandante_nome} ${partida.placar_mandante} x ${partida.placar_visitante} ${partida.visitante_nome}`,
        canal: 'sistema',
        status: 'enviada_sistema',
        dataEnvio: new Date().toISOString(),
        payload: { partidaId }
      });
    },
    async gerarRankingAtualizado(bolaoId, resumo = {}) {
      return createAutomatic({
        bolaoId,
        tipo: 'RANKING_ATUALIZADO',
        titulo: 'Ranking atualizado',
        mensagem: 'O ranking do bolao foi recalculado.',
        canal: 'sistema',
        status: 'enviada_sistema',
        dataEnvio: new Date().toISOString(),
        payload: resumo
      });
    },
    async gerarPagamentoConfirmado(pagamentoId) {
      const pagamento = await repository.getPagamentoResumo(pagamentoId);
      if (!pagamento || pagamento.status !== 'pago') return [];
      return createAutomatic({
        bolaoId: pagamento.bolao_id,
        participanteId: pagamento.participante_id,
        tipo: 'PAGAMENTO_CONFIRMADO',
        titulo: 'Pagamento confirmado',
        mensagem: `Pagamento confirmado para ${pagamento.participante_nome}.`,
        canal: 'sistema',
        status: 'enviada_sistema',
        dataEnvio: new Date().toISOString(),
        payload: {
          pagamentoId,
          valor: Number(pagamento.valor)
        }
      });
    }
  };
}

module.exports = {
  createNotificacoesService
};
