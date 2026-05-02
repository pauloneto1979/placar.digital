const list = document.querySelector('#boloesList');
const message = document.querySelector('#message');
const selectionToken = localStorage.getItem('placar.selectionToken') || '';
const boloes = JSON.parse(localStorage.getItem('placar.boloes') || '[]');

function showMessage(text) {
  message.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function saveSession(result) {
  localStorage.setItem('placar.token', result.accessToken || '');
  localStorage.setItem('placar.user', JSON.stringify(result.user || {}));
  localStorage.setItem('placar.boloes', JSON.stringify(result.boloes || boloes));
  localStorage.setItem('placar.activeBolaoId', result.selectedBolao?.id || '');
  localStorage.setItem('placar.activeBolaoNome', result.selectedBolao?.nome || '');
  localStorage.removeItem('placar.selectionToken');
  localStorage.removeItem('placar.pendingUser');
}

async function selectBolao(bolaoId) {
  showMessage('Abrindo bolao...');
  const response = await fetch('/api/v1/auth/selecionar-bolao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectionToken, bolaoId })
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Nao foi possivel selecionar o bolao.');
  saveSession(body);
  window.location.href = '/app/app.html';
}

if (!selectionToken || !boloes.length) {
  window.location.href = '/app/login.html';
} else {
  list.innerHTML = boloes.map((bolao) => `
    <button class="select-card" type="button" data-bolao-id="${escapeHtml(bolao.id)}">
      <strong>${escapeHtml(bolao.nome)}</strong>
      <span class="muted">${escapeHtml(bolao.papel || bolao.status || 'bolao')}</span>
    </button>
  `).join('');
}

list.addEventListener('click', (event) => {
  const bolaoId = event.target.closest('[data-bolao-id]')?.dataset.bolaoId;
  if (!bolaoId) return;
  selectBolao(bolaoId).catch((error) => showMessage(error.message));
});
