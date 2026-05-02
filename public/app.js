const state = {
  token: localStorage.getItem('placar.token') || '',
  user: JSON.parse(localStorage.getItem('placar.user') || '{}'),
  boloes: JSON.parse(localStorage.getItem('placar.boloes') || '[]'),
  activeBolaoId: localStorage.getItem('placar.activeBolaoId') || '',
  activeBolaoNome: localStorage.getItem('placar.activeBolaoNome') || '',
  route: 'home',
  data: {},
  formMessages: {}
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
const profileButton = document.querySelector('#profileButton');

const SCORE_RULE_OPTIONS = [
  { value: 'PLACAR_EXATO', label: 'Placar exato' },
  { value: 'RESULTADO_CORRETO', label: 'Resultado correto' },
  { value: 'PLACAR_INVERTIDO', label: 'Placar invertido' }
];

const TIEBREAKER_OPTIONS = [
  { value: 'PLACARES_EXATOS', label: 'Maior número de placares exatos' },
  { value: 'RESULTADOS_CORRETOS', label: 'Maior número de resultados corretos' },
  { value: 'PLACARES_INVERTIDOS', label: 'Maior número de placares invertidos' },
  { value: 'MENOR_DIFERENCA_GOLS', label: 'Menor diferença total de gols' },
  { value: 'ORDEM_PAGAMENTO', label: 'Ordem de pagamento' },
  { value: 'ORDEM_ALFABETICA', label: 'Ordem alfabética' }
];

const PRIZE_DISTRIBUTION_OPTIONS = [
  { value: 'percentual', label: 'Percentual' },
  { value: 'fixo', label: 'Valor fixo' },
  { value: 'vencedor_leva_tudo', label: 'Tudo para o 1º colocado' }
];

const RULE_FORM_KINDS = new Set(['bolaoConfig', 'regrasPontuacao', 'criteriosDesempate', 'distribuicaoPremios']);
const PROFILE_FORM_KINDS = new Set(['meuPerfil', 'minhaSenha']);

const routes = [
  { id: 'home', label: 'Placar', subtitle: 'Resumo, ranking e próximos jogos.' },
  { id: 'apostas', label: 'Apostas', subtitle: 'Registre seus palpites jogo a jogo.', roles: ['apostador'] },
  { id: 'ranking', label: 'Ranking', subtitle: 'Pontuação, desempates e premiação.' },
  { id: 'jogos', label: 'Jogos', subtitle: 'Calendário e resultados do bolão.' },
  { id: 'regras', label: 'Regras', subtitle: 'Pontuação, desempate e prêmios.' },
  { id: 'notificacoes', label: 'Notificações', subtitle: 'Avisos do bolão.' },
  { id: 'participantes', label: 'Participantes', subtitle: 'Gestão operacional do bolão.', admin: true },
  { id: 'pagamentos', label: 'Pagamentos', subtitle: 'Controle financeiro das participações.', admin: true },
  { id: 'fases', label: 'Fases', subtitle: 'Etapas e grupos do bolão.', admin: true },
  { id: 'times', label: 'Times', subtitle: 'Seleções e clubes disponíveis.', admin: true },
  { id: 'partidas', label: 'Partidas', subtitle: 'Resultados e jogos cadastrados.', admin: true },
  { id: 'boloes', label: 'Bolões', subtitle: 'Gestão geral de bolões.', owner: true },
  { id: 'usuarios', label: 'Usuários', subtitle: 'Proprietários e administradores.', owner: true },
  { id: 'configuracoes', label: 'Configurações', subtitle: 'Preferências gerais da plataforma.', owner: true },
  { id: 'perfil', label: 'Meu perfil', subtitle: 'Atualize seus dados de acesso.', hidden: true }
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showMessage(text, tone = 'warning') {
  message.textContent = text;
  message.dataset.tone = tone;
  window.setTimeout(() => { message.textContent = ''; }, 3600);
}

function roleLabelText() {
  return ({
    proprietario: 'Proprietário',
    administrador: 'Administrador',
    apostador: 'Apostador'
  }[state.user.perfilGlobal] || 'Sessão');
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
  if (Array.isArray(result.boloes) && result.boloes.length > 0) {
    state.boloes = result.boloes;
  }
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
  menu.innerHTML = routes.filter((item) => !item.hidden && routeAllowed(item)).map((item) => `
    <button class="nav-item ${item.id === state.route ? 'active' : ''}" type="button" data-route="${item.id}">
      ${escapeHtml(item.label)}
    </button>
  `).join('');
}

function renderChrome() {
  const route = currentRoute();
  pageTitle.textContent = route.label;
  pageSubtitle.textContent = state.activeBolaoNome || route.subtitle;
  roleLabel.textContent = roleLabelText();
  shell.dataset.role = state.user.perfilGlobal || 'sessao';
  profileButton.classList.toggle('active', state.route === 'perfil');
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

function optionList(rows, valueKey = 'id', labelKey = 'nome', selected = '') {
  return rows.map((row) => `
    <option value="${escapeHtml(row[valueKey])}" ${row[valueKey] === selected ? 'selected' : ''}>
      ${escapeHtml(row[labelKey] || row.email || row.id)}
    </option>
  `).join('');
}

function staticOptionList(options, selected = '') {
  return options.map((option) => `
    <option value="${escapeHtml(option.value)}" ${option.value === selected ? 'selected' : ''}>
      ${escapeHtml(option.label)}
    </option>
  `).join('');
}

function optionLabel(options, value, fallback = '') {
  return options.find((option) => option.value === value)?.label || fallback || value || '';
}

function setFormMessage(kind, text, tone = 'warning') {
  state.formMessages[kind] = { text, tone };
  const el = document.querySelector(`[data-form-message="${kind}"]`);
  if (!el) return;
  el.hidden = false;
  el.dataset.tone = tone;
  el.textContent = text;
}

function clearFormMessage(kind) {
  delete state.formMessages[kind];
  const el = document.querySelector(`[data-form-message="${kind}"]`);
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
  el.dataset.tone = 'warning';
}

function scopedMessage(kind) {
  const current = state.formMessages[kind];
  return `<p class="message card-message" data-form-message="${kind}" data-tone="${escapeHtml(current?.tone || 'warning')}" ${current ? '' : 'hidden'}>${escapeHtml(current?.text || '')}</p>`;
}

function findById(rows, id) {
  return rows.find((row) => row.id === id) || null;
}

function dateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function formPayload(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  Object.keys(data).forEach((key) => {
    if (data[key] === '') delete data[key];
  });
  return data;
}

function setFormValues(form, row) {
  form.reset();
  Object.entries(row).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (field.type === 'datetime-local') {
      field.value = dateTimeInput(value);
      return;
    }
    field.value = value ?? '';
  });
}

function clearForm(kind) {
  const form = document.querySelector(`[data-crud-form="${kind}"]`);
  if (!form) return;
  form.reset();
  if (form.elements.id) form.elements.id.value = '';
}

function getRankMedal(position) {
  if (position === 1) return '1';
  if (position === 2) return '2';
  if (position === 3) return '3';
  return String(position || '-');
}

async function loadBaseData() {
  if (!state.activeBolaoId && !isOwner()) {
    content.innerHTML = empty('Nenhum bolão ativo encontrado para esta sessão.');
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
    const active = state.boloes.find((bolao) => bolao.id === state.activeBolaoId);
    if (active) {
      state.activeBolaoNome = active.nome;
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
        <div class="card-title"><h2>Seu desempenho</h2><span class="pill">${escapeHtml(state.activeBolaoNome || 'Bolão')}</span></div>
        <div class="kpi">${escapeHtml(meuRanking.posicao || '-')}</div>
        <p class="muted">${escapeHtml(meuRanking.pontosAtuais ?? 0)} pontos no ranking</p>
      </article>
      <article class="card">
        <div class="card-title"><h2>Arrecadado</h2></div>
        <div class="kpi">${money(dashboard?.totalArrecadado)}</div>
        <p class="muted">${escapeHtml(dashboard?.participantesTotal || 0)} participantes</p>
      </article>
      <article class="card">
        <div class="card-title"><h2>Último resultado</h2></div>
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
        <div class="card-title"><h2>Próximos jogos</h2><button class="secondary" data-route="${isApostador() ? 'apostas' : 'jogos'}" type="button">${isApostador() ? 'Apostar' : 'Ver jogos'}</button></div>
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
  const placarMandante = game.placarMandante ?? game.placar_mandante;
  const placarVisitante = game.placarVisitante ?? game.placar_visitante;
  const hasScore = placarMandante !== null && placarMandante !== undefined && placarVisitante !== null && placarVisitante !== undefined;
  return `
    <article class="match-card">
      <div>
        <div class="team-line">
          <strong>${escapeHtml(mandante)}</strong>
          <span class="score">${hasScore ? `${escapeHtml(placarMandante)} x ${escapeHtml(placarVisitante)}` : 'x'}</span>
          <strong>${escapeHtml(visitante)}</strong>
        </div>
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
    content.innerHTML = empty('Apostas ficam disponíveis apenas para apostadores.');
    return;
  }
  const apostas = await api(`/apostas/boloes/${state.activeBolaoId}/minhas`);
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Meus palpites</h2><span class="pill">salvamento automático</span></div>
      <div class="list">${apostas.map(renderBetCard).join('') || empty('Nenhum jogo disponível para aposta.')}</div>
    </section>
  `;
}

function renderBetCard(aposta) {
  const canEdit = Boolean(aposta.podeAlterar);
  const left = aposta.meuPalpite?.mandante ?? '';
  const right = aposta.meuPalpite?.visitante ?? '';
  const status = canEdit ? 'Salvo automaticamente' : (aposta.statusAposta === 'sem_aposta' ? 'Ainda não disponível' : 'Aposta encerrada');
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
  if (!state.activeBolaoId) {
    content.innerHTML = `<section class="card">${empty('Selecione um bolão para visualizar as regras.')}</section>`;
    return;
  }

  if (isAdmin()) {
    await renderRegrasAdmin();
    return;
  }

  const regras = await api(`/ranking/boloes/${state.activeBolaoId}/regras`);
  const configuracao = regras.configuracaoBolao;
  const configRows = configuracao ? [
    `Minutos de antecedência: ${configuracao.minutosAntecedenciaAposta ?? 0}`,
    `Tipo de distribuição do prêmio: ${optionLabel(PRIZE_DISTRIBUTION_OPTIONS, configuracao.tipoDistribuicaoPremio, configuracao.tipoDistribuicaoPremio)}`,
    configuracao.observacoesRegras ? `Observações: ${configuracao.observacoesRegras}` : null
  ].filter(Boolean) : [];

  const regrasRows = (regras.regrasPontuacao || []).map((item) => ({
    title: optionLabel(SCORE_RULE_OPTIONS, item.codigo, item.codigo),
    subtitle: `${item.descricao} - ${item.pontos} pts - prioridade ${item.prioridade}`
  }));
  const criteriosRows = (regras.criteriosDesempate || []).map((item) => ({
    title: optionLabel(TIEBREAKER_OPTIONS, item.codigo, item.codigo),
    subtitle: `${item.descricao} - ordem ${item.ordem}`
  }));
  const premiosRows = (regras.distribuicaoPremios || []).map((item) => ({
    title: `${item.posicao}º lugar`,
    subtitle: `${item.percentual}% - ${item.descricao || 'sem descrição'}`
  }));

  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Configuração do bolão</h2><span class="pill">somente leitura</span></div>
      <div class="list">
        ${configRows.map((text) => `<article class="row-card"><div><strong>${escapeHtml(text)}</strong></div></article>`).join('') || empty('Nenhuma configuração principal ativa para este bolão.')}
      </div>
    </section>

    <section class="grid three">
      <article class="card">
        <div class="card-title"><h2>Regras de pontuação</h2></div>
        <div class="list">${regrasRows.map((item) => `<article class="row-card"><div><strong>${escapeHtml(item.title)}</strong><p class="muted">${escapeHtml(item.subtitle)}</p></div></article>`).join('') || empty('Nenhuma regra de pontuação ativa.')}</div>
      </article>
      <article class="card">
        <div class="card-title"><h2>Critérios de desempate</h2></div>
        <div class="list">${criteriosRows.map((item) => `<article class="row-card"><div><strong>${escapeHtml(item.title)}</strong><p class="muted">${escapeHtml(item.subtitle)}</p></div></article>`).join('') || empty('Nenhum critério de desempate ativo.')}</div>
      </article>
      <article class="card">
        <div class="card-title"><h2>Distribuição de prêmios</h2></div>
        <div class="list">${premiosRows.map((item) => `<article class="row-card"><div><strong>${escapeHtml(item.title)}</strong><p class="muted">${escapeHtml(item.subtitle)}</p></div></article>`).join('') || empty('Nenhuma distribuição de prêmios ativa.')}</div>
      </article>
    </section>
  `;
}

async function renderNotificacoes() {
  if (!state.activeBolaoId) {
    content.innerHTML = `<section class="card">${empty('Selecione um bolão para visualizar as notificações.')}</section>`;
    return;
  }

  const path = isApostador() ? `/notificacoes/boloes/${state.activeBolaoId}/minhas` : `/notificacoes/boloes/${state.activeBolaoId}`;
  const rows = await api(path);
  const emptyMessage = isApostador()
    ? 'Você ainda não possui notificações neste bolão.'
    : 'Não há notificações registradas para o bolão selecionado.';
  content.innerHTML = `<section class="card"><div class="card-title"><h2>Notificações</h2><span class="pill">${escapeHtml(state.activeBolaoNome || 'bolão')}</span></div><div class="list">${rows.map((item) => `<article class="row-card"><div><strong>${escapeHtml(item.titulo)}</strong><p class="muted">${escapeHtml(item.mensagem || item.tipo || '')}</p></div><span class="pill">${escapeHtml(item.status || '')}</span></article>`).join('') || empty(emptyMessage)}</div></section>`;
}

function editableRow(kind, row, title, subtitle, badge = '') {
  return `
    <article class="row-card">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p class="muted">${escapeHtml(subtitle || '')}</p>
      </div>
      <div class="actions">
        ${badge ? `<span class="pill">${escapeHtml(badge)}</span>` : ''}
        <button class="secondary" type="button" data-edit-kind="${kind}" data-id="${escapeHtml(row.id)}">Editar</button>
      </div>
    </article>
  `;
}

function regraActions(row, index, rows) {
  const buttons = [];
  if (index > 0) {
    buttons.push(`<button class="ghost" type="button" data-move-rule="up" data-id="${escapeHtml(row.id)}">Subir</button>`);
  }
  if (index < rows.length - 1) {
    buttons.push(`<button class="ghost" type="button" data-move-rule="down" data-id="${escapeHtml(row.id)}">Descer</button>`);
  }
  buttons.push(`<button class="secondary" type="button" data-edit-kind="regrasPontuacao" data-id="${escapeHtml(row.id)}">Editar</button>`);
  return buttons.join('');
}

function regraRow(row, index, rows) {
  return `
    <article class="row-card">
      <div>
        <strong>${escapeHtml(optionLabel(SCORE_RULE_OPTIONS, row.codigo, row.codigo))}</strong>
        <p class="muted">${escapeHtml(`${row.descricao} - ${row.pontos} pts - prioridade ${row.prioridade}`)}</p>
      </div>
      <div class="actions">
        <span class="pill">${escapeHtml(row.ativo ? 'ativo' : 'inativo')}</span>
        ${regraActions(row, index, rows)}
      </div>
    </article>
  `;
}

async function renderMeuPerfil() {
  const perfil = await api('/auth/meu-perfil');
  state.data.meuPerfil = perfil;
  content.innerHTML = `
    <section class="grid two">
      <article class="card">
        <div class="card-title"><h2>Meus dados</h2><span class="pill">${escapeHtml(roleLabelText())}</span></div>
        <form class="form-grid" data-crud-form="meuPerfil">
          <label>Nome <input name="nome" value="${escapeHtml(perfil.nome || '')}" required></label>
          <label>Email <input name="email" type="email" value="${escapeHtml(perfil.email || '')}" readonly></label>
          <div class="form-actions"><button type="submit">Salvar dados</button></div>
          ${scopedMessage('meuPerfil')}
        </form>
      </article>
      <article class="card">
        <div class="card-title"><h2>Trocar senha</h2></div>
        <form class="form-grid" data-crud-form="minhaSenha">
          <label>Senha atual <input name="senhaAtual" type="password" required></label>
          <label>Nova senha <input name="novaSenha" type="password" required></label>
          <label>Confirmar nova senha <input name="confirmarNovaSenha" type="password" required></label>
          <div class="form-actions"><button type="submit">Atualizar senha</button></div>
          ${scopedMessage('minhaSenha')}
        </form>
      </article>
    </section>
  `;
}

async function renderBoloesOwner() {
  const rows = await api('/proprietario/boloes');
  state.data.boloes = rows;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Bolões</h2><span class="pill">proprietário</span></div>
      <form class="form-card" data-crud-form="boloes">
        <input name="id" type="hidden">
        <label>Nome <input name="nome" required></label>
        <label>Descrição <input name="descricao"></label>
        <label>Data início <input name="dataInicio" type="datetime-local"></label>
        <label>Data fim <input name="dataFim" type="datetime-local"></label>
        <label>Status
          <select name="status">
            <option value="ativo">ativo</option>
            <option value="fechado">fechado</option>
            <option value="inativo">inativo</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">Salvar bolão</button>
          <button class="ghost" type="button" data-reset-form="boloes">Novo</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('boloes', row, row.nome, row.descricao, row.status)).join('') || empty('Nenhum bolão cadastrado.')}</div></section>
  `;
}

async function renderUsuariosOwner() {
  const rows = await api('/proprietario/usuarios');
  state.data.usuarios = rows;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Usuários</h2><span class="pill">proprietário</span></div>
      <form class="form-card" data-crud-form="usuarios">
        <input name="id" type="hidden">
        <label>Nome <input name="nome" required></label>
        <label>Email <input name="email" type="email" required></label>
        <label>Senha <input name="senha" type="password" placeholder="Obrigatória apenas no cadastro"></label>
        <label>Perfil
          <select name="perfil">
            <option value="administrador">administrador</option>
            <option value="proprietario">proprietário</option>
          </select>
        </label>
        <label>Status
          <select name="status">
            <option value="ativo">ativo</option>
            <option value="inativo">inativo</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">Salvar usuário</button>
          <button class="ghost" type="button" data-reset-form="usuarios">Novo</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('usuarios', row, row.nome, row.email, row.perfil || row.status)).join('') || empty('Nenhum usuário cadastrado.')}</div></section>
  `;
}

async function renderParticipantesAdmin() {
  const rows = await api(`/participantes/boloes/${state.activeBolaoId}`);
  state.data.participantes = rows;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Participantes</h2><span class="pill">administração</span></div>
      <form class="form-card" data-crud-form="participantes">
        <input name="id" type="hidden">
        <label>Nome <input name="nome" required></label>
        <label>Email <input name="email" type="email" required></label>
        <label>Telefone <input name="telefone"></label>
        <label>Senha inicial <input name="senhaInicial" type="password" placeholder="Opcional"></label>
        <label>Status
          <select name="status">
            <option value="ativo">ativo</option>
            <option value="convidado">convidado</option>
            <option value="bloqueado">bloqueado</option>
            <option value="removido">removido</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">Salvar participante</button>
          <button class="ghost" type="button" data-reset-form="participantes">Novo</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('participantes', row, row.nome, `${row.email} ${row.telefone || ''}`, row.status)).join('') || empty('Nenhum participante cadastrado.')}</div></section>
  `;
}

async function renderPagamentosAdmin() {
  const [rows, participantes] = await Promise.all([
    api(`/pagamentos/boloes/${state.activeBolaoId}`),
    api(`/participantes/boloes/${state.activeBolaoId}`)
  ]);
  state.data.pagamentos = rows;
  state.data.participantes = participantes;
  const paymentRow = (row) => {
    const participante = findById(participantes, row.participanteId);
    const gatewayInfo = [];
    if (row.gateway) gatewayInfo.push(row.gateway);
    if (row.statusGateway) gatewayInfo.push(`gateway ${row.statusGateway}`);
    if (row.orderNsu) gatewayInfo.push(`pedido ${row.orderNsu}`);
    const checkoutParts = [];
    if (gatewayInfo.length) checkoutParts.push(escapeHtml(gatewayInfo.join(' · ')));
    if (row.checkoutUrl) checkoutParts.push(`<a href="${escapeHtml(row.checkoutUrl)}" target="_blank" rel="noreferrer">Abrir checkout</a>`);
    return `
      <article class="row-card">
        <div>
          <strong>${escapeHtml(participante?.nome || row.participanteId)}</strong>
          <p class="muted">
            ${escapeHtml([
              money(row.valor),
              row.formaPagamento || 'manual',
              row.dataPagamento ? `pago em ${dateTime(row.dataPagamento)}` : 'sem data de pagamento',
              row.observacao || ''
            ].filter(Boolean).join(' · '))}
          </p>
          ${checkoutParts.length ? `<p class="muted">${checkoutParts.join(' · ')}</p>` : ''}
        </div>
        <div class="actions">
          <span class="pill">${escapeHtml(row.status || 'pendente')}</span>
          <button class="secondary" type="button" data-edit-kind="pagamentos" data-id="${escapeHtml(row.id)}">Editar</button>
        </div>
      </article>
    `;
  };
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Pagamentos</h2><span class="pill">administração</span></div>
      <form class="form-card" data-crud-form="pagamentos">
        <input name="id" type="hidden">
        <label>Participante <select name="participanteId" required>${optionList(participantes)}</select></label>
        <label>Valor <input name="valor" type="number" min="0" step="0.01" required></label>
        <label>Status
          <select name="status">
            <option value="pendente">pendente</option>
            <option value="pago">pago</option>
            <option value="cancelado">cancelado</option>
          </select>
        </label>
        <label>Forma
          <select name="formaPagamento">
            <option value="manual">manual</option>
            <option value="pix">pix</option>
            <option value="dinheiro">dinheiro</option>
            <option value="outro">outro</option>
          </select>
        </label>
        <label>Data pagamento <input name="dataPagamento" type="datetime-local"></label>
        <label>Observação <input name="observacao"></label>
        <div class="form-actions">
          <button type="submit">Salvar pagamento</button>
          <button class="ghost" type="button" data-reset-form="pagamentos">Novo</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map(paymentRow).join('') || empty('Nenhum pagamento cadastrado.')}</div></section>
  `;
}

async function renderFasesAdmin() {
  const rows = await api(`/fases/boloes/${state.activeBolaoId}`);
  state.data.fases = rows;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Fases</h2><span class="pill">administração</span></div>
      <form class="form-card" data-crud-form="fases">
        <input name="id" type="hidden">
        <label>Nome <input name="nome" required></label>
        <label>Ordem <input name="ordem" type="number" min="0" value="0"></label>
        <label>Tipo
          <select name="tipo">
            <option value="grupos">grupos</option>
            <option value="oitavas">oitavas</option>
            <option value="quartas">quartas</option>
            <option value="semifinal">semifinal</option>
            <option value="final">final</option>
            <option value="outro">outro</option>
          </select>
        </label>
        <label>Status
          <select name="status">
            <option value="pendente">pendente</option>
            <option value="ativa">ativa</option>
            <option value="encerrada">encerrada</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">Salvar fase</button>
          <button class="ghost" type="button" data-reset-form="fases">Nova</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('fases', row, row.nome, `Ordem ${row.ordem} · ${row.tipo}`, row.status)).join('') || empty('Nenhuma fase cadastrada.')}</div></section>
  `;
}

async function renderTimesAdmin() {
  const rows = await api(`/times/boloes/${state.activeBolaoId}`);
  state.data.times = rows;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Times</h2><span class="pill">administração</span></div>
      <form class="form-card" data-crud-form="times">
        <input name="id" type="hidden">
        <label>Nome <input name="nome" required></label>
        <label>Sigla <input name="sigla"></label>
        <label>País <input name="pais"></label>
        <label>Status
          <select name="status">
            <option value="ativo">ativo</option>
            <option value="inativo">inativo</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">Salvar time</button>
          <button class="ghost" type="button" data-reset-form="times">Novo</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('times', row, row.nome, `${row.sigla || ''} ${row.pais || ''}`, row.status)).join('') || empty('Nenhum time cadastrado.')}</div></section>
  `;
}

async function renderPartidasAdmin() {
  const [rows, fases, times] = await Promise.all([
    api(`/partidas/boloes/${state.activeBolaoId}`),
    api(`/fases/boloes/${state.activeBolaoId}`),
    api(`/times/boloes/${state.activeBolaoId}`)
  ]);
  state.data.partidas = rows;
  state.data.fases = fases;
  state.data.times = times;
  const partidaTitle = (row) => {
    const mandante = findById(times, row.timeMandanteId)?.nome || row.timeMandanteId;
    const visitante = findById(times, row.timeVisitanteId)?.nome || row.timeVisitanteId;
    const score = row.placarMandante !== null && row.placarMandante !== undefined && row.placarVisitante !== null && row.placarVisitante !== undefined
      ? ` ${row.placarMandante} x ${row.placarVisitante} `
      : ' x ';
    return `${mandante}${score}${visitante}`;
  };
  const partidaSubtitle = (row) => {
    const fase = findById(fases, row.faseId)?.nome || 'sem fase';
    return `${fase} - ${dateTime(row.dataHora)} - ${row.estadio || 'sem estádio'}`;
  };
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Partidas</h2><span class="pill">administração</span></div>
      <form class="form-card" data-crud-form="partidas">
        <input name="id" type="hidden">
        <label>Fase <select name="faseId"><option value="">sem fase</option>${optionList(fases)}</select></label>
        <label>Mandante <select name="timeMandanteId" required>${optionList(times)}</select></label>
        <label>Visitante <select name="timeVisitanteId" required>${optionList(times)}</select></label>
        <label>Data/hora <input name="dataHora" type="datetime-local" required></label>
        <label>Estádio <input name="estadio"></label>
        <label>Placar mandante <input name="placarMandante" type="number" min="0"></label>
        <label>Placar visitante <input name="placarVisitante" type="number" min="0"></label>
        <label>Status
          <select name="status">
            <option value="agendada">agendada</option>
            <option value="em_andamento">em andamento</option>
            <option value="finalizada">finalizada</option>
            <option value="cancelada">cancelada</option>
            <option value="inativa">inativa</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">Salvar partida</button>
          <button class="ghost" type="button" data-reset-form="partidas">Nova</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('partidas', row, partidaTitle(row), partidaSubtitle(row), row.status)).join('') || empty('Nenhuma partida cadastrada.')}</div></section>
  `;
}

async function renderRegrasAdmin() {
  const [configuracoes, regras, criterios, premios] = await Promise.all([
    api(`/configuracoes-bolao/${state.activeBolaoId}/configuracao`),
    api(`/configuracoes-bolao/${state.activeBolaoId}/regras-pontuacao?includeInactive=true`),
    api(`/configuracoes-bolao/${state.activeBolaoId}/criterios-desempate?includeInactive=true`),
    api(`/configuracoes-bolao/${state.activeBolaoId}/distribuicao-premios?includeInactive=true`)
  ]);
  const configuracao = configuracoes.find((item) => item.ativo) || configuracoes[0] || {};
  state.data.bolaoConfig = configuracoes;
  state.data.regrasPontuacao = regras;
  state.data.criteriosDesempate = criterios;
  state.data.distribuicaoPremios = premios;

  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Configuração do bolão</h2><span class="pill">administração</span></div>
      <form class="form-card" data-crud-form="bolaoConfig">
        <input name="id" type="hidden" value="${escapeHtml(configuracao.id || '')}">
        <label>Minutos de antecedência da aposta <input name="minutosAntecedenciaAposta" type="number" min="0" value="${escapeHtml(configuracao.minutosAntecedenciaAposta ?? 0)}"></label>
        <label>Tipo de distribuição do prêmio
          <select name="tipoDistribuicaoPremio">
            ${staticOptionList(PRIZE_DISTRIBUTION_OPTIONS, configuracao.tipoDistribuicaoPremio || 'percentual')}
          </select>
        </label>
        <label>Observações <textarea name="observacoesRegras">${escapeHtml(configuracao.observacoesRegras || '')}</textarea></label>
        <label>Ativo
          <select name="ativo">
            <option value="true" ${configuracao.ativo !== false ? 'selected' : ''}>sim</option>
            <option value="false" ${configuracao.ativo === false ? 'selected' : ''}>não</option>
          </select>
        </label>
        <div class="form-actions"><button type="submit">Salvar configuração</button></div>
        ${scopedMessage('bolaoConfig')}
      </form>
    </section>

    <section class="grid three">
      <article class="card">
        <div class="card-title"><h2>Regras de pontuação</h2></div>
        <form class="form-grid" data-crud-form="regrasPontuacao">
          <input name="id" type="hidden">
          <label>Código
            <select name="codigo" required>
              <option value="">Selecione</option>
              ${staticOptionList(SCORE_RULE_OPTIONS)}
            </select>
          </label>
          <label>Descrição <input name="descricao" required></label>
          <label>Pontos <input name="pontos" type="number" min="0" required></label>
          <label>Prioridade (1 = mais importante) <input name="prioridade" type="number" min="1" value="1" required></label>
          <p class="help-text">A pontuação não é cumulativa. Quando mais de uma regra se aplicar, vale a regra com maior prioridade.</p>
          <label>Ativo <select name="ativo"><option value="true">sim</option><option value="false">não</option></select></label>
          <div class="form-actions"><button type="submit">Salvar regra</button><button class="ghost" type="button" data-reset-form="regrasPontuacao">Nova</button></div>
          ${scopedMessage('regrasPontuacao')}
        </form>
      </article>

      <article class="card">
        <div class="card-title"><h2>Critérios de desempate</h2></div>
        <form class="form-grid" data-crud-form="criteriosDesempate">
          <input name="id" type="hidden">
          <label>Código
            <select name="codigo" required>
              <option value="">Selecione</option>
              ${staticOptionList(TIEBREAKER_OPTIONS)}
            </select>
          </label>
          <label>Descrição <input name="descricao" required></label>
          <label>Ordem <input name="ordem" type="number" min="1" value="1" required></label>
          <label>Ativo <select name="ativo"><option value="true">sim</option><option value="false">não</option></select></label>
          <div class="form-actions"><button type="submit">Salvar critério</button><button class="ghost" type="button" data-reset-form="criteriosDesempate">Novo</button></div>
          ${scopedMessage('criteriosDesempate')}
        </form>
      </article>

      <article class="card">
        <div class="card-title"><h2>Distribuição de prêmios</h2></div>
        <form class="form-grid" data-crud-form="distribuicaoPremios">
          <input name="id" type="hidden">
          <label>Posição <input name="posicao" type="number" min="1" required></label>
          <label>Percentual <input name="percentual" type="number" min="0" max="100" step="0.01" required></label>
          <label>Descrição <input name="descricao"></label>
          <label>Ativo <select name="ativo"><option value="true">sim</option><option value="false">não</option></select></label>
          <div class="form-actions"><button type="submit">Salvar prêmio</button><button class="ghost" type="button" data-reset-form="distribuicaoPremios">Novo</button></div>
          ${scopedMessage('distribuicaoPremios')}
        </form>
      </article>
    </section>

    <section class="grid three">
      <article class="card"><div class="card-title"><h3>Regras cadastradas</h3></div><div class="list">${regras.map((row, index) => regraRow(row, index, regras)).join('') || empty('Nenhuma regra configurada. Use o formulário acima para cadastrar.')}</div></article>
      <article class="card"><div class="card-title"><h3>Critérios cadastrados</h3></div><div class="list">${criterios.map((row) => editableRow('criteriosDesempate', row, optionLabel(TIEBREAKER_OPTIONS, row.codigo, row.codigo), `${row.descricao} - ordem ${row.ordem}`, row.ativo ? 'ativo' : 'inativo')).join('') || empty('Nenhum critério configurado. Use o formulário acima para cadastrar.')}</div></article>
      <article class="card"><div class="card-title"><h3>Prêmios cadastrados</h3></div><div class="list">${premios.map((row) => editableRow('distribuicaoPremios', row, `${row.posicao}º lugar`, `${row.percentual}% - ${row.descricao || ''}`, row.ativo ? 'ativo' : 'inativo')).join('') || empty('Nenhuma premiação configurada. Use o formulário acima para cadastrar.')}</div></article>
    </section>
  `;
}

async function renderConfiguracoesOwner() {
  const config = await api('/proprietario/configuracoes-gerais').catch(() => ({}));
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>Configurações gerais</h2><span class="pill">plataforma</span></div>
      <form class="form-card" data-crud-form="configuracoesGerais">
        <label>Tempo de sessão (segundos) <input name="tempoSessao" type="number" min="1" value="${escapeHtml(config.tempoSessao || '')}"></label>
        <label>Email remetente <input name="emailRemetente" type="email" value="${escapeHtml(config.emailRemetente || '')}"></label>
        <label>Notificações ativas
          <select name="notificacoesAtivas">
            <option value="true" ${config.notificacoesAtivas !== false ? 'selected' : ''}>sim</option>
            <option value="false" ${config.notificacoesAtivas === false ? 'selected' : ''}>não</option>
          </select>
        </label>
        <label>Gateway de pagamento <input name="gatewayPagamento" value="${escapeHtml(config.gatewayPagamento || '')}"></label>
        <div class="form-actions"><button type="submit">Salvar configurações</button></div>
      </form>
    </section>
  `;
}

async function moveRulePriority(regraId, direction) {
  const regras = [...(state.data.regrasPontuacao || [])];
  const index = regras.findIndex((row) => row.id === regraId);
  if (index === -1) return;

  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (!regras[neighborIndex]) return;

  const [current] = regras.splice(index, 1);
  regras.splice(neighborIndex, 0, current);

  for (const [position, regra] of regras.entries()) {
    await api(`/configuracoes-bolao/${state.activeBolaoId}/regras-pontuacao/${regra.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...regra, prioridade: position + 1 })
    });
  }

  state.formMessages.regrasPontuacao = { text: 'Prioridade atualizada com sucesso.', tone: 'success' };
  await navigate('regras');
}

const renderers = {
  home: renderHome,
  apostas: renderApostas,
  ranking: renderRanking,
  jogos: renderJogos,
  regras: renderRegras,
  notificacoes: renderNotificacoes,
  participantes: renderParticipantesAdmin,
  pagamentos: renderPagamentosAdmin,
  fases: renderFasesAdmin,
  times: renderTimesAdmin,
  partidas: renderPartidasAdmin,
  boloes: renderBoloesOwner,
  usuarios: renderUsuariosOwner,
  configuracoes: renderConfiguracoesOwner,
  perfil: renderMeuPerfil
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

async function submitCrud(kind, form) {
  const data = formPayload(form);
  const id = data.id;
  delete data.id;

  if (RULE_FORM_KINDS.has(kind)) {
    clearFormMessage(kind);
  }

  if (PROFILE_FORM_KINDS.has(kind)) {
    clearFormMessage(kind);
  }

  if (kind === 'configuracoesGerais') {
    if (data.notificacoesAtivas !== undefined) {
      data.notificacoesAtivas = data.notificacoesAtivas === 'true';
    }
    await api('/proprietario/configuracoes-gerais', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    showMessage('Configurações salvas.');
    await navigate(state.route);
    return;
  }

  if (kind === 'meuPerfil') {
    const updated = await api('/auth/meu-perfil', {
      method: 'PUT',
      body: JSON.stringify({ nome: data.nome })
    });
    state.user = { ...state.user, nome: updated.nome, email: updated.email };
    localStorage.setItem('placar.user', JSON.stringify(state.user));
    state.formMessages.meuPerfil = { text: 'Dados atualizados com sucesso.', tone: 'success' };
    await navigate('perfil');
    return;
  }

  if (kind === 'minhaSenha') {
    if ((data.novaSenha || '') !== (data.confirmarNovaSenha || '')) {
      throw new Error('A confirmação da nova senha não confere.');
    }
    await api('/auth/minha-senha', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    state.formMessages.minhaSenha = { text: 'Senha atualizada com sucesso.', tone: 'success' };
    await navigate('perfil');
    return;
  }

  const config = {
    boloes: {
      create: '/proprietario/boloes',
      update: (itemId) => `/proprietario/boloes/${itemId}`
    },
    usuarios: {
      create: '/proprietario/usuarios',
      update: (itemId) => `/proprietario/usuarios/${itemId}`
    },
    participantes: {
      create: `/participantes/boloes/${state.activeBolaoId}`,
      update: (itemId) => `/participantes/boloes/${state.activeBolaoId}/${itemId}`
    },
    pagamentos: {
      create: `/pagamentos/boloes/${state.activeBolaoId}`,
      update: (itemId) => `/pagamentos/boloes/${state.activeBolaoId}/${itemId}`
    },
    fases: {
      create: `/fases/boloes/${state.activeBolaoId}`,
      update: (itemId) => `/fases/boloes/${state.activeBolaoId}/${itemId}`
    },
    times: {
      create: `/times/boloes/${state.activeBolaoId}`,
      update: (itemId) => `/times/boloes/${state.activeBolaoId}/${itemId}`
    },
    partidas: {
      create: `/partidas/boloes/${state.activeBolaoId}`,
      update: (itemId) => `/partidas/boloes/${state.activeBolaoId}/${itemId}`
    },
    bolaoConfig: {
      create: `/configuracoes-bolao/${state.activeBolaoId}/configuracao`,
      update: (itemId) => `/configuracoes-bolao/${state.activeBolaoId}/configuracao/${itemId}`
    },
    regrasPontuacao: {
      create: `/configuracoes-bolao/${state.activeBolaoId}/regras-pontuacao`,
      update: (itemId) => `/configuracoes-bolao/${state.activeBolaoId}/regras-pontuacao/${itemId}`
    },
    criteriosDesempate: {
      create: `/configuracoes-bolao/${state.activeBolaoId}/criterios-desempate`,
      update: (itemId) => `/configuracoes-bolao/${state.activeBolaoId}/criterios-desempate/${itemId}`
    },
    distribuicaoPremios: {
      create: `/configuracoes-bolao/${state.activeBolaoId}/distribuicao-premios`,
      update: (itemId) => `/configuracoes-bolao/${state.activeBolaoId}/distribuicao-premios/${itemId}`
    }
  }[kind];

  if (!config) return;

  await api(id ? config.update(id) : config.create, {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data)
  });

  if (RULE_FORM_KINDS.has(kind)) {
    state.formMessages[kind] = {
      text: id ? 'Registro atualizado com sucesso.' : 'Registro salvo com sucesso.',
      tone: 'success'
    };
    await navigate(state.route);
    return;
  }

  showMessage(id ? 'Registro atualizado.' : 'Registro criado.');
  await navigate(state.route);
}

function editCrud(kind, id) {
  const row = (state.data[kind] || []).find((item) => item.id === id);
  const form = document.querySelector(`[data-crud-form="${kind}"]`);
  if (!row || !form) return;
  setFormValues(form, row);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  if (route) {
    navigate(route);
    return;
  }

  const editButton = event.target.closest('[data-edit-kind]');
  if (editButton) {
    editCrud(editButton.dataset.editKind, editButton.dataset.id);
    return;
  }

  const moveRuleButton = event.target.closest('[data-move-rule]');
  if (moveRuleButton) {
    moveRulePriority(moveRuleButton.dataset.id, moveRuleButton.dataset.moveRule).catch((error) => {
      setFormMessage('regrasPontuacao', error.message, 'error');
    });
    return;
  }

  const resetButton = event.target.closest('[data-reset-form]');
  if (resetButton) {
    clearForm(resetButton.dataset.resetForm);
    clearFormMessage(resetButton.dataset.resetForm);
  }
});

content.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-crud-form]');
  if (!form) return;
  event.preventDefault();
  submitCrud(form.dataset.crudForm, form).catch((error) => {
    if (RULE_FORM_KINDS.has(form.dataset.crudForm) || PROFILE_FORM_KINDS.has(form.dataset.crudForm)) {
      setFormMessage(form.dataset.crudForm, error.message, 'error');
      return;
    }
    showMessage(error.message, 'error');
  });
});

document.querySelector('#menuButton').addEventListener('click', () => {
  shell.classList.toggle('menu-open');
});

document.querySelector('#logoutButton').addEventListener('click', () => {
  localStorage.removeItem('placar.token');
  localStorage.removeItem('placar.user');
  localStorage.removeItem('placar.boloes');
  localStorage.removeItem('placar.activeBolaoId');
  localStorage.removeItem('placar.activeBolaoNome');
  redirectLogin();
});

profileButton.addEventListener('click', () => {
  navigate('perfil');
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
  const status = card.querySelector('[data-save-status]');
  if (!partidaId) {
    status.textContent = 'Não foi possível identificar a partida.';
    return;
  }
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
      showMessage('Aposta salva.');
      await renderApostas();
    } catch (error) {
      status.textContent = error.message;
    }
  }, 650));
});

init().catch((error) => {
  content.innerHTML = `<section class="card">${empty(error.message)}</section>`;
});
