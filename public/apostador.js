const state = {
  token: localStorage.getItem('placar.token') || '',
  bolaoId: null
};

const app = document.querySelector('#app');
const message = document.querySelector('#message');
const tokenInput = document.querySelector('#tokenInput');
tokenInput.value = state.token;

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showMessage(text) {
  message.textContent = text;
  setTimeout(() => { message.textContent = ''; }, 4500);
}

async function api(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}`, ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Erro ao acessar API.');
  return body;
}

function renderCards(selector, rows, render) {
  document.querySelector(selector).innerHTML = rows.map(render).join('');
}

async function refresh() {
  const [dashboard, jogos, minhas, ranking, regras] = await Promise.all([
    api(`/apostas/boloes/${state.bolaoId}/dashboard`),
    api(`/apostas/boloes/${state.bolaoId}/jogos`),
    api(`/apostas/boloes/${state.bolaoId}/minhas`),
    api(`/ranking/boloes/${state.bolaoId}/provisorio`),
    api(`/apostas/boloes/${state.bolaoId}/regras`)
  ]);

  renderCards('#dashboardList', [
    ['Participantes', dashboard.participantesTotal],
    ['Partidas', dashboard.partidasTotal],
    ['Finalizadas', dashboard.partidasFinalizadas],
    ['Arrecadado', dashboard.totalArrecadado]
  ], ([label, value]) => `<article class="item"><strong>${label}</strong><div>${escapeHtml(value)}</div></article>`);

  renderCards('#jogosList', jogos, (jogo) => `
    <article class="item">
      <div>
        <strong>${escapeHtml(jogo.mandante.nome)} x ${escapeHtml(jogo.visitante.nome)}</strong>
        <div class="meta">${escapeHtml(jogo.fase || '')} - ${escapeHtml(jogo.dataHora)} - ${escapeHtml(jogo.status)}</div>
      </div>
    </article>
  `);

  renderCards('#apostasList', minhas, (aposta) => `
    <article class="item">
      <div>
        <strong>${escapeHtml(aposta.mandante)} x ${escapeHtml(aposta.visitante)}</strong>
        <div class="meta">Meu palpite: ${aposta.meuPalpite ? `${aposta.meuPalpite.mandante} x ${aposta.meuPalpite.visitante}` : 'sem aposta'} - ${escapeHtml(aposta.statusAposta)}</div>
      </div>
    </article>
  `);

  renderCards('#rankingList', ranking, (item) => `
    <article class="item">
      <strong>${item.posicao} - ${escapeHtml(item.participante)}</strong>
      <div>${item.pontosAtuais} pontos</div>
    </article>
  `);

  renderCards('#regrasList', [
    ...(regras.regrasPontuacao || []).map((r) => `Pontuacao: ${r.codigo} - ${r.descricao} (${r.pontos})`),
    ...(regras.criteriosDesempate || []).map((r) => `Desempate: ${r.codigo} - ${r.descricao}`),
    ...(regras.distribuicaoPremios || []).map((r) => `Premio: ${r.posicao} - ${r.percentual}%`)
  ], (text) => `<article class="item"><div>${escapeHtml(text)}</div></article>`);
}

async function validateSession() {
  if (!state.token) return;
  const session = await api('/auth/me');
  if (session.user.perfilGlobal !== 'apostador' || !session.selectedBolao?.id || !session.selectedBolao?.participanteId) {
    throw new Error('Acesso permitido apenas ao apostador com bolao selecionado.');
  }
  state.bolaoId = session.selectedBolao.id;
  app.hidden = false;
  await refresh();
}

document.querySelector('#saveTokenButton').addEventListener('click', async () => {
  state.token = tokenInput.value.trim();
  localStorage.setItem('placar.token', state.token);
  try { await validateSession(); showMessage('Sessao validada.'); } catch (error) { showMessage(error.message); }
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`#${tab.dataset.panel}`).classList.add('active');
  });
});

validateSession().catch((error) => showMessage(error.message));
