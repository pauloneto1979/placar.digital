const state = {
  token: localStorage.getItem('placar.token') || '',
  user: JSON.parse(localStorage.getItem('placar.user') || '{}'),
  boloes: JSON.parse(localStorage.getItem('placar.boloes') || '[]'),
  activeBolaoId: localStorage.getItem('placar.activeBolaoId') || '',
  activeBolaoNome: localStorage.getItem('placar.activeBolaoNome') || '',
  route: 'home',
  data: {}
};

const content = document.querySelector('#content');
const menu = document.querySelector('#menu');
const message = document.querySelector('#message');
const pageTitle = document.querySelector('#pageTitle');
const pageSubtitle = document.querySelector('#pageSubtitle');
const roleLabel = document.querySelector('#roleLabel');
const shell = document.querySelector('#shell');
const bolaoSwitcher = document.querySelector('#bolaoSwitcher');
const bolaoSelect = document.querySelector('#bolaoSelect');

const routes = [
  { id: 'home', label: 'Home', subtitle: 'Resumo, ranking e proximos jogos.' },
  { id: 'apostas', label: 'Apostas', subtitle: 'Registre seus palpites jogo a jogo.', roles: ['apostador'] },
  { id: 'ranking', label: 'Ranking', subtitle: 'Pontuacao, desempates e premiacao.' },
  { id: 'jogos', label: 'Jogos', subtitle: 'Calendario e resultados do bolao.' },
  { id: 'regras', label: 'Regras', subtitle: 'Pontuacao, desempate e premios.' },
  { id: 'notificacoes', label: 'Notificacoes', subtitle: 'Avisos do bolao.' },
  { id: 'participantes', label: 'Participantes', subtitle: 'Gestao operacional do bolao.', admin: true },
  { id: 'pagamentos', label: 'Pagamentos', subtitle: 'Controle financeiro das participacoes.', admin: true },
  { id: 'partidas', label: 'Partidas', subtitle: 'Resultados e jogos cadastrados.', admin: true },
  { id: 'boloes', label: 'Boloes', subtitle: 'Gestao geral de boloes.', owner: true },
  { id: 'usuarios', label: 'Usuarios', subtitle: 'Proprietarios e administradores.', owner: true },
  { id: 'configuracoes', label: 'Configuracoes', subtitle: 'Preferencias gerais da plataforma.', owner: true }
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showMessage(text) {
  message.textContent = text;
  window.setTimeout(() => { message.textContent = ''; }, 3600);
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateTime(value) {
  if (!value) return 'sem data';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function isOwner() {
  return state.user.perfilGlobal === 'proprietario';
}

function isAdmin() {
  return ['proprietario', 'administrador'].includes(state.user.perfilGlobal);
}

function isApostador() {
  return state.user.perfilGlobal === 'apostador';
}

function redirectLogin() {
  window.location.href = '/app/login.html';
}

function saveAuth(result) {
  state.token = result.accessToken || state.token;
  state.user = result.user || state.user;
  state.boloes = result.boloes || state.boloes;
  state.activeBolaoId = result.selectedBolao?.id || state.activeBolaoId;
  state.activeBolaoNome = result.selectedBolao?.nome || state.activeBolaoNome;
  localStorage.setItem('placar.token', state.token);
  localStorage.setItem('placar.user', JSON.stringify(state.user));
  localStorage.setItem('placar.boloes', JSON.stringify(state.boloes));
  localStorage.setItem('placar.activeBolaoId', state.activeBolaoId || '');
  localStorage.setItem('placar.activeBolaoNome', state.activeBolaoNome || '');
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
  if (!response.ok) throw new Error(body?.message || 'Erro ao acessar API.');
  return body;
}

function routeAllowed(route) {
  if (route.owner) return isOwner();
  if (route.admin) return isAdmin();
  if (route.roles) return route.roles.includes(state.user.perfilGlobal);
  return true;
}

function currentRoute() {
  return routes.find((item) => item.id === state.route) || routes[0];
}

function renderMenu() {
  menu.innerHTML = routes.filter(routeAllowed).map((item) => `
    <button class="nav-item ${item.id === state.route ? 'active' : ''}" type="button" data-route="${item.id}">
      ${escapeHtml(item.label)}
    </button>
  `).join('');
}

function renderChrome() {
  const route = currentRoute();
  pageTitle.textContent = route.label;
  pageSubtitle.textContent = state.activeBolaoNome || route.subtitle;
  roleLabel.textContent = state.user.perfilGlobal || 'sessao';
  renderMenu();

  if (state.boloes.length > 1) {
    bolaoSwitcher.hidden = false;
    bolaoSelect.innerHTML = state.boloes.map((bolao) => `
      <option value="${escapeHtml(bolao.id)}" ${bolao.id === state.activeBolaoId ? 'selected' : ''}>
        ${escapeHtml(bolao.nome)}
      </option>
    `).join('');
  } else {
    bolaoSwitcher.hidden = true;
  }
}

function empty(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function getRankMedal(position) {
  if (position === 1) return '1';
  if (position === 2) return '2';
  if (position === 3) return '3';
  return String(position || '-');
}

async function loadBaseData() {
  if (!state.activeBolaoId && !isOwner()) {
    content.innerHTML = empty('Nenhum bolao ativo encontrado para esta sessao.');
    return false;
  }

  if (isOwner()) {
    const ownerBoloes = await api('/proprietario/boloes').catch(() => []);
    state.boloes = ownerBoloes.map((bolao) => ({
      id: bolao.id,
      nome: bolao.nome,
      status: bolao.status,
      papel: 'proprietario'
    }));
    if (!state.activeBolaoId && state.boloes.length) {
      state.activeBolaoId = state.boloes[0].id;
      state.activeBolaoNome = state.boloes[0].nome;
    }
    localStorage.setItem('placar.boloes', JSON.stringify(state.boloes));
    localStorage.setItem('placar.activeBolaoId', state.activeBolaoId || '');
    localStorage.setItem('placar.activeBolaoNome', state.activeBolaoNome || '');
  }

  return true;
}

async function renderHome() {
  if (!(await loadBaseData())) return;
  const [dashboard, ranking, minhas, jogos] = await Promise.all([
    state.activeBolaoId ? api(`/apostas/boloes/${state.activeBolaoId}/dashboard`).catch(() => null) : null,
    state.activeBolaoId ? api(`/ranking/boloes/${state.activeBolaoId}/atual`).catch(() => []) : [],
    isApostador() && state.activeBolaoId ? api(`/apostas/boloes/${state.activeBolaoId}/minhas`).catch(() => []) : [],
    state.activeBolaoId ? api(`/apostas/boloes/${state.activeBolaoId}/jogos`).catch(() => []) : []
  ]);
  const meuRanking = ranking.find((item) => item.participanteId === currentParticipanteId()) || {};
  const ultimoResultado = minhas.find((item) => item.placarOficial);

  content.innerHTML = `
    <section class="grid three">
      <article class="card">
        <div class="card-title"><h2>Seu desempenho</h2><span class="pill">${escapeHtml(state.activeBolaoNome || 'Bolao')}</span></div>
        <div class="kpi">${escapeHtml(meuRanking.posicao || '-')}</div>
        <p class="muted">${escapeHtml(meuRanking.pontosAtuais ?? 0)} pontos no ranking</p>
      </article>
      <article class="card">
        <div class="card-title"><h2>Arrecadado</h2></div>
        <div class="kpi">${money(dashboard?.totalArrecadado)}</div>
        <p class="muted">${escapeHtml(dashboard?.participantesTotal || 0)} participantes</p>
      </article>
      <article class="card">
        <div class="card-title"><h2>Ultimo resultado</h2></div>
        ${ultimoResultado ? `
          <strong>${escapeHtml(ultimoResultado.mandante)} ${ultimoResultado.placarOficial.mandante} x ${ultimoResultado.placarOficial.visitante} ${escapeHtml(ultimoResultado.visitante)}</strong>
          <p class="muted">Seu palpite: ${ultimoResultado.meuPalpite ? `${ultimoResultado.meuPalpite.mandante} x ${ultimoResultado.meuPalpite.visitante}` : 'sem aposta'}</p>
        ` : empty('Sem resultado recente.')}
      </article>
    </section>
    <section class="grid two">
      <article class="card">
        <div class="card-title"><h2>Top 3 ranking</h2><button class="secondary" data-route="ranking" type="button">Ver completo</button></div>
        <div class="list">${ranking.slice(0, 3).map(renderRankingRow).join('') || empty('Ranking ainda vazio.')}</div>
      </article>
      <article class="card">
        <div class="card-title"><h2>Proximos jogos</h2><button class="secondary" data-route="${isApostador() ? 'apostas' : 'jogos'}" type="button">${isApostador() ? 'Apostar' : 'Ver jogos'}</button></div>
        <div class="list">${jogos.slice(0, 4).map(renderGameCard).join('') || empty('Nenhum jogo cadastrado.')}</div>
      </article>
    </section>
  `;
}

function currentParticipanteId() {
  const tokenPayload = state.token.split('.')[1];
  if (!tokenPayload) return null;
  try {
    const normalized = tokenPayload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(tokenPayload.length / 4) * 4, '=');
    return JSON.parse(atob(normalized)).participanteId || null;
  } catch {
    return null;
  }
}

function renderGameCard(game) {
  const mandante = game.mandante?.nome || game.mandante || game.timeMandante || 'Mandante';
  const visitante = game.visitante?.nome || game.visitante || game.timeVisitante || 'Visitante';
  return `
    <article class="match-card">
      <div>
        <div class="team-line"><strong>${escapeHtml(mandante)}</strong><span class="score">x</span><strong>${escapeHtml(visitante)}</strong></div>
        <p class="muted">${escapeHtml(game.fase || game.faseNome || '')} ${dateTime(game.dataHora || game.inicioAt || game.inicio_at)} - ${escapeHtml(game.status || '')}</p>
      </div>
      <span class="pill">${escapeHtml(game.estadio || 'jogo')}</span>
    </article>
  `;
}

function renderRankingRow(item) {
  const me = item.participanteId === currentParticipanteId();
  return `
    <article class="ranking-row ${me ? 'me' : ''}">
      <div class="medal">${getRankMedal(item.posicao)}</div>
      <div>
        <strong>${escapeHtml(item.participante)}</strong>
        <p class="muted">Exatos ${item.acertosExatos || 0} · Resultados ${item.acertosResultado || 0} · Dif. gols ${item.diferencaGolsTotal || 0}</p>
      </div>
      <div class="score">${escapeHtml(item.pontosAtuais || 0)} pts</div>
    </article>
  `;
}

async function renderApostas() {
  if (!isApostador()) {
    content.innerHTML = empty('Apostas ficam disponiveis apenas para apostadores.');
    return;
  }
  const apostas = await api(`/apostas/boloes/${state.activeBolaoId}/minhas`);
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Meus palpites</h2><span class="pill">salvamento automatico</span></div>
      <div class="list">${apostas.map(renderBetCard).join('') || empty('Nenhum jogo disponivel para aposta.')}</div>
    </section>
  `;
}

function renderBetCard(aposta) {
  const canEdit = Boolean(aposta.podeAlterar);
  const left = aposta.meuPalpite?.mandante ?? '';
  const right = aposta.meuPalpite?.visitante ?? '';
  const status = canEdit ? 'Salvo automaticamente' : (aposta.statusAposta === 'sem_aposta' ? 'Ainda nao disponivel' : 'Aposta encerrada');
  return `
    <article class="match-card" data-partida-id="${escapeHtml(aposta.partidaId)}">
      <div>
        <div class="team-line">
          <strong>${escapeHtml(aposta.mandante)}</strong>
          <div class="bet-inputs">
            <input type="number" min="0" inputmode="numeric" value="${escapeHtml(left)}" data-bet-side="mandante" ${canEdit ? '' : 'disabled'}>
            <span class="score">x</span>
            <input type="number" min="0" inputmode="numeric" value="${escapeHtml(right)}" data-bet-side="visitante" ${canEdit ? '' : 'disabled'}>
          </div>
          <strong>${escapeHtml(aposta.visitante)}</strong>
        </div>
        <p class="muted">${escapeHtml(aposta.fase || '')} · ${dateTime(aposta.dataHora)} · ${escapeHtml(aposta.estadio || '')}</p>
      </div>
      <span class="pill" data-save-status>${escapeHtml(status)}</span>
    </article>
  `;
}

async function renderRanking() {
  const ranking = await api(`/ranking/boloes/${state.activeBolaoId}/atual`);
  content.innerHTML = `<section class="card"><div class="card-title"><h2>Ranking completo</h2></div><div class="list">${ranking.map(renderRankingRow).join('') || empty('Ranking vazio.')}</div></section>`;
}

async function renderJogos() {
  const jogos = await api(`/apostas/boloes/${state.activeBolaoId}/jogos`);
  content.innerHTML = `<section class="card"><div class="card-title"><h2>Jogos e resultados</h2></div><div class="list">${jogos.map(renderGameCard).join('') || empty('Nenhum jogo cadastrado.')}</div></section>`;
}

async function renderRegras() {
  const regras = await api(`/apostas/boloes/${state.activeBolaoId}/regras`);
  const rows = [
    ...(regras.regrasPontuacao || []).map((item) => `Pontuacao · ${item.codigo} · ${item.pontos} pts`),
    ...(regras.criteriosDesempate || []).map((item) => `Desempate · ${item.codigo}`),
    ...(regras.distribuicaoPremios || []).map((item) => `Premio · ${item.posicao} lugar · ${item.percentual}%`)
  ];
  content.innerHTML = `<section class="card"><div class="card-title"><h2>Regras do bolao</h2></div><div class="list">${rows.map((text) => `<article class="row-card"><strong>${escapeHtml(text)}</strong></article>`).join('') || empty('Sem regras configuradas.')}</div></section>`;
}

async function renderNotificacoes() {
  const path = isApostador() ? `/notificacoes/boloes/${state.activeBolaoId}/minhas` : `/notificacoes/boloes/${state.activeBolaoId}`;
  const rows = await api(path).catch(() => []);
  content.innerHTML = `<section class="card"><div class="card-title"><h2>Notificacoes</h2></div><div class="list">${rows.map((item) => `<article class="row-card"><div><strong>${escapeHtml(item.titulo)}</strong><p class="muted">${escapeHtml(item.mensagem || item.tipo || '')}</p></div><span class="pill">${escapeHtml(item.status || '')}</span></article>`).join('') || empty('Sem notificacoes.')}</div></section>`;
}

async function renderAdminList(kind) {
  const endpoints = {
    participantes: `/participantes/boloes/${state.activeBolaoId}`,
    pagamentos: `/pagamentos/boloes/${state.activeBolaoId}`,
    partidas: `/partidas/boloes/${state.activeBolaoId}`
  };
  const rows = await api(endpoints[kind]);
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(currentRoute().label)}</h2><span class="pill">administracao</span></div>
      <div class="list">${rows.map((row) => `<article class="row-card"><div><strong>${escapeHtml(row.nome || row.email || row.id)}</strong><p class="muted">${escapeHtml(row.status || row.formaPagamento || row.dataHora || '')}</p></div><span class="pill">${escapeHtml(row.valor ? money(row.valor) : row.sigla || row.tipo || '')}</span></article>`).join('') || empty('Nenhum registro encontrado.')}</div>
    </section>
  `;
}

async function renderBoloesOwner() {
  const rows = await api('/proprietario/boloes');
  content.innerHTML = `<section class="card"><div class="card-title"><h2>Boloes</h2></div><div class="list">${rows.map((row) => `<article class="row-card"><div><strong>${escapeHtml(row.nome)}</strong><p class="muted">${escapeHtml(row.descricao || '')}</p></div><span class="pill">${escapeHtml(row.status)}</span></article>`).join('') || empty('Nenhum bolao cadastrado.')}</div></section>`;
}

async function renderUsuariosOwner() {
  const rows = await api('/proprietario/usuarios');
  content.innerHTML = `<section class="card"><div class="card-title"><h2>Usuarios</h2></div><div class="list">${rows.map((row) => `<article class="row-card"><div><strong>${escapeHtml(row.nome)}</strong><p class="muted">${escapeHtml(row.email)}</p></div><span class="pill">${escapeHtml(row.perfil || row.status)}</span></article>`).join('') || empty('Nenhum usuario cadastrado.')}</div></section>`;
}

async function renderConfiguracoesOwner() {
  const config = await api('/proprietario/configuracoes-gerais').catch(() => ({}));
  content.innerHTML = `<section class="card"><div class="card-title"><h2>Configuracoes gerais</h2></div><div class="list">${Object.entries(config).map(([key, value]) => `<article class="row-card"><strong>${escapeHtml(key)}</strong><span class="muted">${escapeHtml(value)}</span></article>`).join('') || empty('Sem configuracoes.')}</div></section>`;
}

const renderers = {
  home: renderHome,
  apostas: renderApostas,
  ranking: renderRanking,
  jogos: renderJogos,
  regras: renderRegras,
  notificacoes: renderNotificacoes,
  participantes: () => renderAdminList('participantes'),
  pagamentos: () => renderAdminList('pagamentos'),
  partidas: () => renderAdminList('partidas'),
  boloes: renderBoloesOwner,
  usuarios: renderUsuariosOwner,
  configuracoes: renderConfiguracoesOwner
};

async function navigate(routeId) {
  const route = routes.find((item) => item.id === routeId && routeAllowed(item));
  state.route = route ? route.id : 'home';
  renderChrome();
  content.innerHTML = '<section class="card"><div class="empty">Carregando...</div></section>';
  try {
    await renderers[state.route]();
  } catch (error) {
    content.innerHTML = `<section class="card">${empty(error.message)}</section>`;
  }
}

async function switchBolao(bolaoId) {
  const result = await api('/auth/trocar-bolao', {
    method: 'POST',
    body: JSON.stringify({ bolaoId })
  });
  saveAuth(result);
  const active = state.boloes.find((bolao) => bolao.id === state.activeBolaoId);
  state.activeBolaoNome = active?.nome || result.selectedBolao?.nome || '';
  localStorage.setItem('placar.activeBolaoNome', state.activeBolaoNome);
  await navigate(state.route);
}

async function init() {
  if (!state.token) {
    redirectLogin();
    return;
  }
  const session = await api('/auth/me').catch(() => null);
  if (!session) {
    redirectLogin();
    return;
  }
  state.user = session.user;
  localStorage.setItem('placar.user', JSON.stringify(state.user));
  await loadBaseData();
  renderChrome();
  await navigate('home');
}

menu.addEventListener('click', (event) => {
  const route = event.target.closest('[data-route]')?.dataset.route;
  if (route) navigate(route);
});

content.addEventListener('click', (event) => {
  const route = event.target.closest('[data-route]')?.dataset.route;
  if (route) navigate(route);
});

document.querySelector('#menuButton').addEventListener('click', () => {
  shell.classList.toggle('menu-open');
});

document.querySelector('#refreshButton').addEventListener('click', () => navigate(state.route));

document.querySelector('#logoutButton').addEventListener('click', () => {
  localStorage.removeItem('placar.token');
  localStorage.removeItem('placar.user');
  localStorage.removeItem('placar.boloes');
  localStorage.removeItem('placar.activeBolaoId');
  localStorage.removeItem('placar.activeBolaoNome');
  redirectLogin();
});

bolaoSelect.addEventListener('change', () => {
  switchBolao(bolaoSelect.value).catch((error) => showMessage(error.message));
});

const pendingSaves = new Map();
content.addEventListener('input', (event) => {
  const input = event.target.closest('[data-bet-side]');
  if (!input) return;
  const card = input.closest('[data-partida-id]');
  const partidaId = card?.dataset.partidaId;
  if (!partidaId) return;
  const status = card.querySelector('[data-save-status]');
  status.textContent = 'Salvando...';
  clearTimeout(pendingSaves.get(partidaId));
  pendingSaves.set(partidaId, window.setTimeout(async () => {
    const mandante = card.querySelector('[data-bet-side="mandante"]').value;
    const visitante = card.querySelector('[data-bet-side="visitante"]').value;
    if (mandante === '' || visitante === '') {
      status.textContent = 'Informe os dois placares';
      return;
    }
    try {
      await api(`/apostas/boloes/${state.activeBolaoId}`, {
        method: 'POST',
        body: JSON.stringify({ partidaId, palpiteMandante: Number(mandante), palpiteVisitante: Number(visitante) })
      });
      status.textContent = 'Salvo automaticamente';
    } catch (error) {
      status.textContent = error.message;
    }
  }, 650));
});

init().catch((error) => {
  content.innerHTML = `<section class="card">${empty(error.message)}</section>`;
});
