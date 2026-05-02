const form = document.querySelector('#loginForm');
const message = document.querySelector('#message');

function showMessage(text) {
  message.textContent = text;
}

function saveSession(result) {
  localStorage.setItem('placar.token', result.accessToken || '');
  localStorage.setItem('placar.user', JSON.stringify(result.user || {}));
  localStorage.setItem('placar.boloes', JSON.stringify(result.boloes || []));

  if (result.selectedBolao?.id) {
    localStorage.setItem('placar.activeBolaoId', result.selectedBolao.id);
    localStorage.setItem('placar.activeBolaoNome', result.selectedBolao.nome || '');
  } else {
    localStorage.removeItem('placar.activeBolaoId');
    localStorage.removeItem('placar.activeBolaoNome');
  }
}

async function postJson(path, payload) {
  const response = await fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Não foi possível entrar.');
  return body;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('Validando acesso...');

  try {
    const result = await postJson('/auth/login', Object.fromEntries(new FormData(form)));

    if (result.status === 'bolao_selection_required') {
      localStorage.setItem('placar.selectionToken', result.selectionToken);
      localStorage.setItem('placar.pendingUser', JSON.stringify(result.user || {}));
      localStorage.setItem('placar.boloes', JSON.stringify(result.boloes || []));
      window.location.href = '/app/selecao-bolao.html';
      return;
    }

    saveSession(result);
    window.location.href = '/app/app.html';
  } catch (error) {
    showMessage(error.message);
  }
});
