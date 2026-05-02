const state = {
  selectionToken: '',
  boloes: []
};

const loginForm = document.querySelector('#loginForm');
const bolaoSelectionForm = document.querySelector('#bolaoSelectionForm');
const message = document.querySelector('#message');

function showMessage(text) {
  message.textContent = text;
}

function redirectForSession(result) {
  localStorage.setItem('placar.token', result.accessToken);

  if (result.selectedBolao?.id) {
    localStorage.setItem('placar.admin.bolaoId', result.selectedBolao.id);
  }

  const perfil = result.user?.perfilGlobal;
  const papel = result.selectedBolao?.papel || perfil;

  if (perfil === 'proprietario') {
    window.location.href = '/app/proprietario.html';
    return;
  }

  if (papel === 'administrador') {
    window.location.href = '/app/administrador.html';
    return;
  }

  if (papel === 'apostador') {
    window.location.href = '/app/apostador.html';
    return;
  }

  showMessage('Perfil sem tela configurada.');
}

async function postJson(path, payload) {
  const response = await fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || 'Nao foi possivel autenticar.');
  }

  return body;
}

function renderBolaoSelection(result) {
  state.selectionToken = result.selectionToken;
  state.boloes = result.boloes || [];
  const select = bolaoSelectionForm.elements.bolaoId;
  select.innerHTML = state.boloes
    .map((bolao) => `<option value="${bolao.id}">${bolao.nome}</option>`)
    .join('');
  loginForm.hidden = true;
  bolaoSelectionForm.hidden = false;
  showMessage('Selecione o bolao para continuar.');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm));
  showMessage('Entrando...');

  try {
    const result = await postJson('/auth/login', data);

    if (result.status === 'bolao_selection_required') {
      renderBolaoSelection(result);
      return;
    }

    redirectForSession(result);
  } catch (error) {
    showMessage(error.message);
  }
});

bolaoSelectionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('Carregando bolao...');

  try {
    const result = await postJson('/auth/selecionar-bolao', {
      selectionToken: state.selectionToken,
      bolaoId: bolaoSelectionForm.elements.bolaoId.value
    });
    redirectForSession(result);
  } catch (error) {
    showMessage(error.message);
  }
});
