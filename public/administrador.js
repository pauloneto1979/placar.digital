const state = {
  token: localStorage.getItem('placar.token') || '',
  bolaoId: localStorage.getItem('placar.admin.bolaoId') || ''
};

const app = document.querySelector('#app');
const message = document.querySelector('#message');
const tokenInput = document.querySelector('#tokenInput');
tokenInput.value = state.token;
document.querySelector('#bolaoForm').elements.bolaoId.value = state.bolaoId;

function showMessage(text) {
  message.textContent = text;
  setTimeout(() => { message.textContent = ''; }, 4500);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

async function validateSession() {
  if (!state.token) return;
  const session = await api('/auth/me');
  if (!['proprietario', 'administrador'].includes(session.user.perfilGlobal)) {
    throw new Error('Acesso administrativo negado.');
  }
  app.hidden = false;
  if (state.bolaoId) await refresh();
}

function renderList(selector, rows, fields) {
  document.querySelector(selector).innerHTML = rows.map((row) => `
    <article class="item">
      <div>
        <strong>${escapeHtml(row.nome || row.email || row.id)}</strong>
        <div class="meta">${fields.map((field) => `${field}: ${escapeHtml(row[field])}`).join(' - ')}</div>
      </div>
    </article>
  `).join('');
}

async function refresh() {
  if (!state.bolaoId) return;
  const [participantes, pagamentos, fases, times, partidas] = await Promise.all([
    api(`/participantes/boloes/${state.bolaoId}`),
    api(`/pagamentos/boloes/${state.bolaoId}`),
    api(`/fases/boloes/${state.bolaoId}`),
    api(`/times/boloes/${state.bolaoId}`),
    api(`/partidas/boloes/${state.bolaoId}`)
  ]);
  renderList('#participantesList', participantes, ['email', 'telefone', 'status']);
  renderList('#pagamentosList', pagamentos, ['participanteId', 'status', 'valor', 'formaPagamento']);
  renderList('#fasesList', fases, ['tipo', 'ordem', 'status']);
  renderList('#timesList', times, ['sigla', 'pais', 'status']);
  renderList('#partidasList', partidas, ['dataHora', 'status', 'placarMandante', 'placarVisitante']);
}

document.querySelector('#saveTokenButton').addEventListener('click', async () => {
  state.token = tokenInput.value.trim();
  localStorage.setItem('placar.token', state.token);
  try { await validateSession(); showMessage('Sessao validada.'); } catch (error) { showMessage(error.message); }
});

document.querySelector('#bolaoForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  state.bolaoId = event.currentTarget.elements.bolaoId.value.trim();
  localStorage.setItem('placar.admin.bolaoId', state.bolaoId);
  try { await refresh(); showMessage('Bolao carregado.'); } catch (error) { showMessage(error.message); }
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
