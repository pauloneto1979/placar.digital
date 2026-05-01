const state = {
  token: localStorage.getItem('placar.token') || '',
  boloes: [],
  usuarios: []
};

const message = document.querySelector('#message');
const tokenInput = document.querySelector('#tokenInput');
const app = document.querySelector('#app');

tokenInput.value = state.token;

function showMessage(text) {
  message.textContent = text;
  window.setTimeout(() => {
    message.textContent = '';
  }, 4500);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function api(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${state.token}`,
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || 'Erro ao acessar API.');
  }

  return body;
}

async function validateSession() {
  if (!state.token) {
    app.hidden = true;
    return;
  }

  const session = await api('/auth/me');

  if (session.user.perfilGlobal !== 'proprietario') {
    app.hidden = true;
    throw new Error('Acesso permitido apenas para Proprietario.');
  }

  app.hidden = false;
  await refreshAll();
}

function formatDateForInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 16);
}

function renderBoloes() {
  document.querySelector('#boloesList').innerHTML = state.boloes
    .map(
      (bolao) => `
        <article class="item">
          <div>
            <strong>${escapeHtml(bolao.nome)}</strong>
            <div class="meta">${escapeHtml(bolao.status)} - ${escapeHtml(bolao.descricao || 'sem descricao')}</div>
          </div>
          <div class="actions">
            <button class="secondary" data-edit-bolao="${escapeHtml(bolao.id)}" type="button">Editar</button>
            <button class="danger" data-close-bolao="${escapeHtml(bolao.id)}" type="button">Fechar</button>
          </div>
        </article>
      `
    )
    .join('');

  const bolaoSelect = document.querySelector('#vinculoForm [name="bolaoId"]');
  bolaoSelect.innerHTML = state.boloes
    .map((bolao) => `<option value="${escapeHtml(bolao.id)}">${escapeHtml(bolao.nome)}</option>`)
    .join('');
}

function renderUsuarios() {
  document.querySelector('#usuariosList').innerHTML = state.usuarios
    .map(
      (usuario) => `
        <article class="item">
          <div>
            <strong>${escapeHtml(usuario.nome)}</strong>
            <div class="meta">${escapeHtml(usuario.email)} - ${escapeHtml(usuario.perfil)} - ${escapeHtml(usuario.status)}</div>
          </div>
          <div class="actions">
            <button class="secondary" data-edit-usuario="${escapeHtml(usuario.id)}" type="button">Editar</button>
            <button data-toggle-usuario="${escapeHtml(usuario.id)}" type="button">${usuario.ativo ? 'Inativar' : 'Ativar'}</button>
          </div>
        </article>
      `
    )
    .join('');

  const usuarioSelect = document.querySelector('#vinculoForm [name="usuarioId"]');
  usuarioSelect.innerHTML = state.usuarios
    .filter((usuario) => usuario.perfil === 'administrador' && usuario.ativo)
    .map((usuario) => `<option value="${escapeHtml(usuario.id)}">${escapeHtml(usuario.nome)}</option>`)
    .join('');
}

async function renderAdministradores() {
  const bolaoId = document.querySelector('#vinculoForm [name="bolaoId"]').value;
  const list = document.querySelector('#administradoresList');

  if (!bolaoId) {
    list.innerHTML = '';
    return;
  }

  const administradores = await api(`/proprietario/boloes/${bolaoId}/administradores`);
  list.innerHTML = administradores
    .map(
      (admin) => `
        <article class="item">
          <div>
            <strong>${escapeHtml(admin.nome)}</strong>
            <div class="meta">${escapeHtml(admin.email)} - ${escapeHtml(admin.status)}</div>
          </div>
          <button class="danger" data-remove-admin="${escapeHtml(admin.usuarioId)}" type="button">Remover</button>
        </article>
      `
    )
    .join('');
}

async function refreshAll() {
  state.boloes = await api('/proprietario/boloes');
  state.usuarios = await api('/proprietario/usuarios');
  renderBoloes();
  renderUsuarios();
  await renderAdministradores();

  const config = await api('/proprietario/configuracoes-gerais');
  document.querySelector('#configForm [name="tempoSessao"]').value = config.tempoSessao || '';
  document.querySelector('#configForm [name="emailRemetente"]').value = config.emailRemetente || '';
  document.querySelector('#configForm [name="notificacoesAtivas"]').value = String(config.notificacoesAtivas ?? true);
  document.querySelector('#configForm [name="gatewayPagamento"]').value = config.gatewayPagamento || '';
}

document.querySelector('#saveTokenButton').addEventListener('click', async () => {
  state.token = tokenInput.value.trim();
  localStorage.setItem('placar.token', state.token);

  try {
    await validateSession();
    showMessage('Sessao validada.');
  } catch (error) {
    showMessage(error.message);
  }
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`#${tab.dataset.panel}`).classList.add('active');
  });
});

document.querySelector('#bolaoForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const id = data.id;
  delete data.id;

  if (id) {
    await api(`/proprietario/boloes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  } else {
    await api('/proprietario/boloes', { method: 'POST', body: JSON.stringify(data) });
  }

  form.reset();
  await refreshAll();
  showMessage('Bolao salvo.');
});

document.querySelector('#usuarioForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const id = data.id;
  delete data.id;

  if (id) {
    if (!data.senha) delete data.senha;
    await api(`/proprietario/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  } else {
    await api('/proprietario/usuarios', { method: 'POST', body: JSON.stringify(data) });
  }

  form.reset();
  await refreshAll();
  showMessage('Usuario salvo.');
});

document.querySelector('#vinculoForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  await api(`/proprietario/boloes/${data.bolaoId}/administradores`, {
    method: 'POST',
    body: JSON.stringify({ usuarioId: data.usuarioId })
  });
  await renderAdministradores();
  showMessage('Administrador vinculado.');
});

document.querySelector('#configForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  data.tempoSessao = Number(data.tempoSessao);
  data.notificacoesAtivas = data.notificacoesAtivas === 'true';
  await api('/proprietario/configuracoes-gerais', { method: 'PUT', body: JSON.stringify(data) });
  showMessage('Configuracoes salvas.');
});

document.body.addEventListener('click', async (event) => {
  const editBolao = event.target.dataset.editBolao;
  const closeBolao = event.target.dataset.closeBolao;
  const editUsuario = event.target.dataset.editUsuario;
  const toggleUsuario = event.target.dataset.toggleUsuario;
  const removeAdmin = event.target.dataset.removeAdmin;

  if (editBolao) {
    const bolao = state.boloes.find((item) => item.id === editBolao);
    const form = document.querySelector('#bolaoForm');
    form.elements.id.value = bolao.id;
    form.elements.nome.value = bolao.nome;
    form.elements.descricao.value = bolao.descricao || '';
    form.elements.dataInicio.value = formatDateForInput(bolao.dataInicio);
    form.elements.dataFim.value = formatDateForInput(bolao.dataFim);
    form.elements.status.value = bolao.status;
  }

  if (closeBolao) {
    await api(`/proprietario/boloes/${closeBolao}/fechar`, { method: 'POST' });
    await refreshAll();
    showMessage('Bolao fechado.');
  }

  if (editUsuario) {
    const usuario = state.usuarios.find((item) => item.id === editUsuario);
    const form = document.querySelector('#usuarioForm');
    form.elements.id.value = usuario.id;
    form.elements.nome.value = usuario.nome;
    form.elements.email.value = usuario.email;
    form.elements.perfil.value = usuario.perfil;
    form.elements.status.value = usuario.status;
    form.elements.senha.value = '';
  }

  if (toggleUsuario) {
    const usuario = state.usuarios.find((item) => item.id === toggleUsuario);
    await api(`/proprietario/usuarios/${toggleUsuario}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo: !usuario.ativo })
    });
    await refreshAll();
    showMessage('Status do usuario alterado.');
  }

  if (removeAdmin) {
    const bolaoId = document.querySelector('#vinculoForm [name="bolaoId"]').value;
    await api(`/proprietario/boloes/${bolaoId}/administradores/${removeAdmin}`, { method: 'DELETE' });
    await renderAdministradores();
    showMessage('Vinculo removido.');
  }
});

document.querySelector('#vinculoForm [name="bolaoId"]').addEventListener('change', renderAdministradores);

validateSession().catch((error) => showMessage(error.message));
