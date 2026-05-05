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
const localeSelect = document.querySelector('#localeSelect');
const i18n = window.PlacarI18n;
const t = (key, params, fallback) => i18n.t(key, params, fallback);

const SCORE_RULE_OPTIONS = [
  { value: 'PLACAR_EXATO', labelKey: 'options.scoreRules.PLACAR_EXATO' },
  { value: 'RESULTADO_CORRETO', labelKey: 'options.scoreRules.RESULTADO_CORRETO' },
  { value: 'PLACAR_INVERTIDO', labelKey: 'options.scoreRules.PLACAR_INVERTIDO' }
];

const TIEBREAKER_OPTIONS = [
  { value: 'PLACARES_EXATOS', labelKey: 'options.tiebreakers.PLACARES_EXATOS' },
  { value: 'RESULTADOS_CORRETOS', labelKey: 'options.tiebreakers.RESULTADOS_CORRETOS' },
  { value: 'PLACARES_INVERTIDOS', labelKey: 'options.tiebreakers.PLACARES_INVERTIDOS' },
  { value: 'MENOR_DIFERENCA_GOLS', labelKey: 'options.tiebreakers.MENOR_DIFERENCA_GOLS' },
  { value: 'ORDEM_PAGAMENTO', labelKey: 'options.tiebreakers.ORDEM_PAGAMENTO' },
  { value: 'ORDEM_ALFABETICA', labelKey: 'options.tiebreakers.ORDEM_ALFABETICA' }
];

const PRIZE_DISTRIBUTION_OPTIONS = [
  { value: 'percentual', labelKey: 'options.prizeDistribution.percentual' },
  { value: 'fixo', labelKey: 'options.prizeDistribution.fixo' },
  { value: 'vencedor_leva_tudo', labelKey: 'options.prizeDistribution.vencedor_leva_tudo' }
];

const RULE_FORM_KINDS = new Set(['bolaoConfig', 'regrasPontuacao', 'criteriosDesempate', 'distribuicaoPremios']);
const PROFILE_FORM_KINDS = new Set(['meuPerfil', 'minhaSenha']);

const routes = [
  { id: 'home', labelKey: 'nav.home', subtitleKey: 'subtitles.home' },
  { id: 'apostas', labelKey: 'nav.apostas', subtitleKey: 'subtitles.apostas', roles: ['apostador'] },
  { id: 'ranking', labelKey: 'nav.ranking', subtitleKey: 'subtitles.ranking' },
  { id: 'jogos', labelKey: 'nav.jogos', subtitleKey: 'subtitles.jogos' },
  { id: 'regras', labelKey: 'nav.regras', subtitleKey: 'subtitles.regras' },
  { id: 'notificacoes', labelKey: 'nav.notificacoes', subtitleKey: 'subtitles.notificacoes' },
  { id: 'participantes', labelKey: 'nav.participantes', subtitleKey: 'subtitles.participantes', admin: true },
  { id: 'pagamentos', labelKey: 'nav.pagamentos', subtitleKey: 'subtitles.pagamentos', admin: true },
  { id: 'fases', labelKey: 'nav.fases', subtitleKey: 'subtitles.fases', admin: true },
  { id: 'times', labelKey: 'nav.times', subtitleKey: 'subtitles.times', admin: true },
  { id: 'partidas', labelKey: 'nav.partidas', subtitleKey: 'subtitles.partidas', admin: true },
  { id: 'boloes', labelKey: 'nav.boloes', subtitleKey: 'subtitles.boloes', owner: true },
  { id: 'usuarios', labelKey: 'nav.usuarios', subtitleKey: 'subtitles.usuarios', owner: true },
  { id: 'configuracoes', labelKey: 'nav.configuracoes', subtitleKey: 'subtitles.configuracoes', owner: true },
  { id: 'perfil', labelKey: 'nav.perfil', subtitleKey: 'subtitles.perfil', hidden: true }
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
  return t(`roles.${state.user.perfilGlobal}`, {}, t('common.session'));
}

function money(value) {
  return Number(value || 0).toLocaleString(i18n.getLocale(), { style: 'currency', currency: 'BRL' });
}

function dateTime(value) {
  if (!value) return t('common.noDate');
  return new Date(value).toLocaleString(i18n.getLocale(), { dateStyle: 'short', timeStyle: 'short' });
}

function statusLabel(value) {
  return t(`status.${value}`, {}, value || '');
}

function badgeLabel(value) {
  return t(`status.${value}`, {}, t(`roles.${value}`, {}, value || ''));
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
  if (!response.ok) throw new Error(body?.message || t('messages.apiError'));
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
      ${escapeHtml(t(item.labelKey))}
    </button>
  `).join('');
}

function renderChrome() {
  const route = currentRoute();
  pageTitle.textContent = t(route.labelKey);
  pageSubtitle.textContent = state.activeBolaoNome || t(route.subtitleKey);
  roleLabel.textContent = roleLabelText();
  shell.dataset.role = state.user.perfilGlobal || 'sessao';
  profileButton.classList.toggle('active', state.route === 'perfil');
  localeSelect.value = i18n.getLocale();
  i18n.applyI18n(document);
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
      ${escapeHtml(t(option.labelKey, {}, option.label || option.value))}
    </option>
  `).join('');
}

function optionLabel(options, value, fallback = '') {
  const option = options.find((item) => item.value === value);
  if (option) return t(option.labelKey, {}, option.label || option.value);
  return fallback || value || '';
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
    content.innerHTML = empty(t('messages.noActivePool'));
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
        <div class="card-title"><h2>${escapeHtml(t('home.performance'))}</h2><span class="pill">${escapeHtml(state.activeBolaoNome || t('common.pool'))}</span></div>
        <div class="kpi">${escapeHtml(meuRanking.posicao || '-')}</div>
        <p class="muted">${escapeHtml(t('home.pointsInRanking', { points: meuRanking.pontosAtuais ?? 0 }))}</p>
      </article>
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('home.collected'))}</h2></div>
        <div class="kpi">${money(dashboard?.totalArrecadado)}</div>
        <p class="muted">${escapeHtml(t('home.participants', { count: dashboard?.participantesTotal || 0 }))}</p>
      </article>
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('home.lastResult'))}</h2></div>
        ${ultimoResultado ? `
          <strong>${escapeHtml(ultimoResultado.mandante)} ${ultimoResultado.placarOficial.mandante} x ${ultimoResultado.placarOficial.visitante} ${escapeHtml(ultimoResultado.visitante)}</strong>
          <p class="muted">${escapeHtml(t('home.yourBet', { bet: ultimoResultado.meuPalpite ? `${ultimoResultado.meuPalpite.mandante} x ${ultimoResultado.meuPalpite.visitante}` : t('common.noBet') }))}</p>
        ` : empty(t('home.noRecentResult'))}
      </article>
    </section>
    <section class="grid two">
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('home.top3'))}</h2><button class="secondary" data-route="ranking" type="button">${escapeHtml(t('home.viewFull'))}</button></div>
        <div class="list">${ranking.slice(0, 3).map(renderRankingRow).join('') || empty(t('home.rankingEmpty'))}</div>
      </article>
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('home.nextGames'))}</h2><button class="secondary" data-route="${isApostador() ? 'apostas' : 'jogos'}" type="button">${escapeHtml(isApostador() ? t('home.bet') : t('home.viewGames'))}</button></div>
        <div class="list">${jogos.slice(0, 4).map(renderGameCard).join('') || empty(t('home.noGames'))}</div>
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
  const mandante = game.mandante?.nome || game.mandante || game.timeMandante || t('games.homeTeam');
  const visitante = game.visitante?.nome || game.visitante || game.timeVisitante || t('games.awayTeam');
  const placarMandante = game.placarMandante ?? game.placar_mandante;
  const placarVisitante = game.placarVisitante ?? game.placar_visitante;
  const hasScore = placarMandante !== null && placarMandante !== undefined && placarVisitante !== null && placarVisitante !== undefined;
  return `
    <article class="match-card">
      <div>
        <div class="team-line">
          <strong>${escapeHtml(mandante)}</strong>
          <span class="score">${hasScore ? `${escapeHtml(placarMandante)} ${escapeHtml(t('common.scoreSeparator'))} ${escapeHtml(placarVisitante)}` : escapeHtml(t('common.scoreSeparator'))}</span>
          <strong>${escapeHtml(visitante)}</strong>
        </div>
        <p class="muted">${escapeHtml(game.fase || game.faseNome || '')} ${dateTime(game.dataHora || game.inicioAt || game.inicio_at)} - ${escapeHtml(statusLabel(game.status))}</p>
      </div>
      <span class="pill">${escapeHtml(game.estadio || t('common.game'))}</span>
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
        <p class="muted">${escapeHtml(t('ranking.exact'))} ${item.acertosExatos || 0} · ${escapeHtml(t('ranking.results'))} ${item.acertosResultado || 0} · ${escapeHtml(t('ranking.goalDiff'))} ${item.diferencaGolsTotal || 0}</p>
      </div>
      <div class="score">${escapeHtml(item.pontosAtuais || 0)} ${escapeHtml(t('ranking.pointsAbbr'))}</div>
    </article>
  `;
}

async function renderApostas() {
  if (!isApostador()) {
    content.innerHTML = empty(t('bets.onlyBettors'));
    return;
  }
  const apostas = await api(`/apostas/boloes/${state.activeBolaoId}/minhas`);
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('bets.myGuesses'))}</h2><span class="pill">${escapeHtml(t('bets.autosave'))}</span></div>
      <div class="list">${apostas.map(renderBetCard).join('') || empty(t('bets.none'))}</div>
    </section>
  `;
}

function renderBetCard(aposta) {
  const canEdit = Boolean(aposta.podeAlterar);
  const left = aposta.meuPalpite?.mandante ?? '';
  const right = aposta.meuPalpite?.visitante ?? '';
  const status = canEdit ? t('bets.savedAutomatically') : (aposta.statusAposta === 'sem_aposta' ? t('bets.notAvailable') : t('bets.closed'));
  return `
    <article class="match-card" data-partida-id="${escapeHtml(aposta.partidaId)}">
      <div>
        <div class="team-line">
          <strong>${escapeHtml(aposta.mandante)}</strong>
          <div class="bet-inputs">
            <input type="number" min="0" inputmode="numeric" value="${escapeHtml(left)}" data-bet-side="mandante" ${canEdit ? '' : 'disabled'}>
            <span class="score">${escapeHtml(t('common.scoreSeparator'))}</span>
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
  content.innerHTML = `<section class="card"><div class="card-title"><h2>${escapeHtml(t('ranking.full'))}</h2></div><div class="list">${ranking.map(renderRankingRow).join('') || empty(t('ranking.empty'))}</div></section>`;
}

async function renderJogos() {
  const jogos = await api(`/apostas/boloes/${state.activeBolaoId}/jogos`);
  content.innerHTML = `<section class="card"><div class="card-title"><h2>${escapeHtml(t('games.title'))}</h2></div><div class="list">${jogos.map(renderGameCard).join('') || empty(t('games.none'))}</div></section>`;
}

async function renderRegras() {
  if (!state.activeBolaoId) {
    content.innerHTML = `<section class="card">${empty(t('rules.selectPool'))}</section>`;
    return;
  }

  if (isAdmin()) {
    await renderRegrasAdmin();
    return;
  }

  const regras = await api(`/ranking/boloes/${state.activeBolaoId}/regras`);
  const configuracao = regras.configuracaoBolao;
  const configRows = configuracao ? [
    t('rules.minutes', { minutes: configuracao.minutosAntecedenciaAposta ?? 0 }),
    t('rules.prizeType', { type: optionLabel(PRIZE_DISTRIBUTION_OPTIONS, configuracao.tipoDistribuicaoPremio, configuracao.tipoDistribuicaoPremio) }),
    configuracao.observacoesRegras ? t('rules.observations', { text: configuracao.observacoesRegras }) : null
  ].filter(Boolean) : [];

  const regrasRows = (regras.regrasPontuacao || []).map((item) => ({
    title: optionLabel(SCORE_RULE_OPTIONS, item.codigo, item.codigo),
    subtitle: t('rules.pointsPriority', { description: item.descricao, points: item.pontos, priority: item.prioridade })
  }));
  const criteriosRows = (regras.criteriosDesempate || []).map((item) => ({
    title: optionLabel(TIEBREAKER_OPTIONS, item.codigo, item.codigo),
    subtitle: t('rules.order', { description: item.descricao, order: item.ordem })
  }));
  const premiosRows = (regras.distribuicaoPremios || []).map((item) => ({
    title: t('rules.place', { position: item.posicao }),
    subtitle: t('rules.prizePercent', { percent: item.percentual, description: item.descricao || t('common.noDescription') })
  }));

  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('rules.configTitle'))}</h2><span class="pill">${escapeHtml(t('common.readOnly'))}</span></div>
      <div class="list">
        ${configRows.map((text) => `<article class="row-card"><div><strong>${escapeHtml(text)}</strong></div></article>`).join('') || empty(t('rules.noConfig'))}
      </div>
    </section>

    <section class="grid three">
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('rules.scoreRules'))}</h2></div>
        <div class="list">${regrasRows.map((item) => `<article class="row-card"><div><strong>${escapeHtml(item.title)}</strong><p class="muted">${escapeHtml(item.subtitle)}</p></div></article>`).join('') || empty(t('rules.noScoreRules'))}</div>
      </article>
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('rules.tiebreakers'))}</h2></div>
        <div class="list">${criteriosRows.map((item) => `<article class="row-card"><div><strong>${escapeHtml(item.title)}</strong><p class="muted">${escapeHtml(item.subtitle)}</p></div></article>`).join('') || empty(t('rules.noTiebreakers'))}</div>
      </article>
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('rules.prizes'))}</h2></div>
        <div class="list">${premiosRows.map((item) => `<article class="row-card"><div><strong>${escapeHtml(item.title)}</strong><p class="muted">${escapeHtml(item.subtitle)}</p></div></article>`).join('') || empty(t('rules.noPrizes'))}</div>
      </article>
    </section>
  `;
}

async function renderNotificacoes() {
  if (!state.activeBolaoId) {
    content.innerHTML = `<section class="card">${empty(t('notifications.selectPool'))}</section>`;
    return;
  }

  const path = isApostador() ? `/notificacoes/boloes/${state.activeBolaoId}/minhas` : `/notificacoes/boloes/${state.activeBolaoId}`;
  const rows = await api(path);
  const emptyMessage = isApostador()
    ? t('notifications.emptyMine')
    : t('notifications.emptyAdmin');
  content.innerHTML = `<section class="card"><div class="card-title"><h2>${escapeHtml(t('notifications.title'))}</h2><span class="pill">${escapeHtml(state.activeBolaoNome || t('common.pool'))}</span></div><div class="list">${rows.map((item) => `<article class="row-card"><div><strong>${escapeHtml(item.titulo)}</strong><p class="muted">${escapeHtml(item.mensagem || item.tipo || '')}</p></div><span class="pill">${escapeHtml(statusLabel(item.status))}</span></article>`).join('') || empty(emptyMessage)}</div></section>`;
}

function editableRow(kind, row, title, subtitle, badge = '') {
  return `
    <article class="row-card">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p class="muted">${escapeHtml(subtitle || '')}</p>
      </div>
      <div class="actions">
        ${badge ? `<span class="pill">${escapeHtml(badgeLabel(badge))}</span>` : ''}
        <button class="secondary" type="button" data-edit-kind="${kind}" data-id="${escapeHtml(row.id)}">${escapeHtml(t('common.edit'))}</button>
      </div>
    </article>
  `;
}

function regraActions(row, index, rows) {
  const buttons = [];
  if (index > 0) {
    buttons.push(`<button class="ghost" type="button" data-move-rule="up" data-id="${escapeHtml(row.id)}">${escapeHtml(t('rules.moveUp'))}</button>`);
  }
  if (index < rows.length - 1) {
    buttons.push(`<button class="ghost" type="button" data-move-rule="down" data-id="${escapeHtml(row.id)}">${escapeHtml(t('rules.moveDown'))}</button>`);
  }
  buttons.push(`<button class="secondary" type="button" data-edit-kind="regrasPontuacao" data-id="${escapeHtml(row.id)}">${escapeHtml(t('common.edit'))}</button>`);
  return buttons.join('');
}

function regraRow(row, index, rows) {
  return `
    <article class="row-card">
      <div>
        <strong>${escapeHtml(optionLabel(SCORE_RULE_OPTIONS, row.codigo, row.codigo))}</strong>
        <p class="muted">${escapeHtml(t('rules.pointsPriority', { description: row.descricao, points: row.pontos, priority: row.prioridade }))}</p>
      </div>
      <div class="actions">
        <span class="pill">${escapeHtml(statusLabel(row.ativo ? 'ativo' : 'inativo'))}</span>
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
        <div class="card-title"><h2>${escapeHtml(t('profile.myData'))}</h2><span class="pill">${escapeHtml(roleLabelText())}</span></div>
        <form class="form-grid" data-crud-form="meuPerfil">
          <label>${escapeHtml(t('profile.name'))} <input name="nome" value="${escapeHtml(perfil.nome || '')}" required></label>
          <label>${escapeHtml(t('profile.email'))} <input name="email" type="email" value="${escapeHtml(perfil.email || '')}" readonly></label>
          <div class="form-actions"><button type="submit">${escapeHtml(t('profile.saveData'))}</button></div>
          ${scopedMessage('meuPerfil')}
        </form>
      </article>
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('profile.changePassword'))}</h2></div>
        <form class="form-grid" data-crud-form="minhaSenha">
          <label>${escapeHtml(t('profile.currentPassword'))} <input name="senhaAtual" type="password" required></label>
          <label>${escapeHtml(t('profile.newPassword'))} <input name="novaSenha" type="password" required></label>
          <label>${escapeHtml(t('profile.confirmPassword'))} <input name="confirmarNovaSenha" type="password" required></label>
          <div class="form-actions"><button type="submit">${escapeHtml(t('profile.updatePassword'))}</button></div>
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
      <div class="card-title"><h2>${escapeHtml(t('owner.pools'))}</h2><span class="pill">${escapeHtml(t('common.owner'))}</span></div>
      <form class="form-card" data-crud-form="boloes">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('owner.name'))} <input name="nome" required></label>
        <label>${escapeHtml(t('owner.description'))} <input name="descricao"></label>
        <label>${escapeHtml(t('owner.startDate'))} <input name="dataInicio" type="datetime-local"></label>
        <label>${escapeHtml(t('owner.endDate'))} <input name="dataFim" type="datetime-local"></label>
        <label>${escapeHtml(t('owner.status'))}
          <select name="status">
            <option value="ativo">${escapeHtml(statusLabel('ativo'))}</option>
            <option value="fechado">${escapeHtml(statusLabel('fechado'))}</option>
            <option value="inativo">${escapeHtml(statusLabel('inativo'))}</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">${escapeHtml(t('owner.savePool'))}</button>
          <button class="ghost" type="button" data-reset-form="boloes">${escapeHtml(t('common.new'))}</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('boloes', row, row.nome, row.descricao, row.status)).join('') || empty(t('owner.noPools'))}</div></section>
  `;
}

async function renderUsuariosOwner() {
  const rows = await api('/proprietario/usuarios');
  state.data.usuarios = rows;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('owner.users'))}</h2><span class="pill">${escapeHtml(t('common.owner'))}</span></div>
      <form class="form-card" data-crud-form="usuarios">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('owner.name'))} <input name="nome" required></label>
        <label>${escapeHtml(t('auth.email'))} <input name="email" type="email" required></label>
        <label>${escapeHtml(t('owner.password'))} <input name="senha" type="password" placeholder="${escapeHtml(t('owner.passwordPlaceholder'))}"></label>
        <label>${escapeHtml(t('owner.profile'))}
          <select name="perfil">
            <option value="administrador">${escapeHtml(t('roles.administrador'))}</option>
            <option value="proprietario">${escapeHtml(t('roles.proprietario'))}</option>
          </select>
        </label>
        <label>${escapeHtml(t('owner.status'))}
          <select name="status">
            <option value="ativo">${escapeHtml(statusLabel('ativo'))}</option>
            <option value="inativo">${escapeHtml(statusLabel('inativo'))}</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">${escapeHtml(t('owner.saveUser'))}</button>
          <button class="ghost" type="button" data-reset-form="usuarios">${escapeHtml(t('common.new'))}</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('usuarios', row, row.nome, row.email, row.perfil || row.status)).join('') || empty(t('owner.noUsers'))}</div></section>
  `;
}

async function renderParticipantesAdmin() {
  const rows = await api(`/participantes/boloes/${state.activeBolaoId}`);
  state.data.participantes = rows;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('admin.participants'))}</h2><span class="pill">${escapeHtml(t('common.administration'))}</span></div>
      <form class="form-card" data-crud-form="participantes">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('owner.name'))} <input name="nome" required></label>
        <label>${escapeHtml(t('auth.email'))} <input name="email" type="email" required></label>
        <label>${escapeHtml(t('admin.phone'))} <input name="telefone"></label>
        <label>${escapeHtml(t('admin.initialPassword'))} <input name="senhaInicial" type="password" placeholder="${escapeHtml(t('admin.optional'))}"></label>
        <label>${escapeHtml(t('owner.status'))}
          <select name="status">
            <option value="ativo">${escapeHtml(statusLabel('ativo'))}</option>
            <option value="convidado">${escapeHtml(statusLabel('convidado'))}</option>
            <option value="bloqueado">${escapeHtml(statusLabel('bloqueado'))}</option>
            <option value="removido">${escapeHtml(statusLabel('removido'))}</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">${escapeHtml(t('admin.saveParticipant'))}</button>
          <button class="ghost" type="button" data-reset-form="participantes">${escapeHtml(t('common.new'))}</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('participantes', row, row.nome, `${row.email} ${row.telefone || ''}`, row.status)).join('') || empty(t('admin.noParticipants'))}</div></section>
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
    if (row.statusGateway) gatewayInfo.push(t('admin.gateway', { status: row.statusGateway }));
    if (row.orderNsu) gatewayInfo.push(t('admin.order', { order: row.orderNsu }));
    const checkoutParts = [];
    if (gatewayInfo.length) checkoutParts.push(escapeHtml(gatewayInfo.join(' · ')));
    if (row.checkoutUrl) checkoutParts.push(`<a href="${escapeHtml(row.checkoutUrl)}" target="_blank" rel="noreferrer">${escapeHtml(t('admin.openCheckout'))}</a>`);
    return `
      <article class="row-card">
        <div>
          <strong>${escapeHtml(participante?.nome || row.participanteId)}</strong>
          <p class="muted">
            ${escapeHtml([
              money(row.valor),
              statusLabel(row.formaPagamento || 'manual'),
              row.dataPagamento ? t('admin.paidAt', { date: dateTime(row.dataPagamento) }) : t('admin.noPaymentDate'),
              row.observacao || ''
            ].filter(Boolean).join(' · '))}
          </p>
          ${checkoutParts.length ? `<p class="muted">${checkoutParts.join(' · ')}</p>` : ''}
        </div>
        <div class="actions">
          <span class="pill">${escapeHtml(statusLabel(row.status || 'pendente'))}</span>
          <button class="secondary" type="button" data-edit-kind="pagamentos" data-id="${escapeHtml(row.id)}">${escapeHtml(t('common.edit'))}</button>
        </div>
      </article>
    `;
  };
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('admin.payments'))}</h2><span class="pill">${escapeHtml(t('common.administration'))}</span></div>
      <form class="form-card" data-crud-form="pagamentos">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('admin.participant'))} <select name="participanteId" required>${optionList(participantes)}</select></label>
        <label>${escapeHtml(t('admin.value'))} <input name="valor" type="number" min="0" step="0.01" required></label>
        <label>${escapeHtml(t('owner.status'))}
          <select name="status">
            <option value="pendente">${escapeHtml(statusLabel('pendente'))}</option>
            <option value="pago">${escapeHtml(statusLabel('pago'))}</option>
            <option value="cancelado">${escapeHtml(statusLabel('cancelado'))}</option>
          </select>
        </label>
        <label>${escapeHtml(t('admin.form'))}
          <select name="formaPagamento">
            <option value="manual">${escapeHtml(statusLabel('manual'))}</option>
            <option value="pix">${escapeHtml(statusLabel('pix'))}</option>
            <option value="dinheiro">${escapeHtml(statusLabel('dinheiro'))}</option>
            <option value="outro">${escapeHtml(statusLabel('outro'))}</option>
          </select>
        </label>
        <label>${escapeHtml(t('admin.paymentDate'))} <input name="dataPagamento" type="datetime-local"></label>
        <label>${escapeHtml(t('admin.observation'))} <input name="observacao"></label>
        <div class="form-actions">
          <button type="submit">${escapeHtml(t('admin.savePayment'))}</button>
          <button class="ghost" type="button" data-reset-form="pagamentos">${escapeHtml(t('common.new'))}</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map(paymentRow).join('') || empty(t('admin.noPayments'))}</div></section>
  `;
}

async function renderFasesAdmin() {
  const rows = await api(`/fases/boloes/${state.activeBolaoId}`);
  state.data.fases = rows;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('admin.phases'))}</h2><span class="pill">${escapeHtml(t('common.administration'))}</span></div>
      <form class="form-card" data-crud-form="fases">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('owner.name'))} <input name="nome" required></label>
        <label>${escapeHtml(t('admin.orderLabel'))} <input name="ordem" type="number" min="0" value="0"></label>
        <label>${escapeHtml(t('admin.type'))}
          <select name="tipo">
            <option value="grupos">${escapeHtml(statusLabel('grupos'))}</option>
            <option value="oitavas">${escapeHtml(statusLabel('oitavas'))}</option>
            <option value="quartas">${escapeHtml(statusLabel('quartas'))}</option>
            <option value="semifinal">${escapeHtml(statusLabel('semifinal'))}</option>
            <option value="final">${escapeHtml(statusLabel('final'))}</option>
            <option value="outro">${escapeHtml(statusLabel('outro'))}</option>
          </select>
        </label>
        <label>${escapeHtml(t('owner.status'))}
          <select name="status">
            <option value="pendente">${escapeHtml(statusLabel('pendente'))}</option>
            <option value="ativa">${escapeHtml(statusLabel('ativa'))}</option>
            <option value="encerrada">${escapeHtml(statusLabel('encerrada'))}</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">${escapeHtml(t('admin.savePhase'))}</button>
          <button class="ghost" type="button" data-reset-form="fases">${escapeHtml(t('common.newFemale'))}</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('fases', row, row.nome, `${t('admin.orderValue', { order: row.ordem })} · ${statusLabel(row.tipo)}`, row.status)).join('') || empty(t('admin.noPhases'))}</div></section>
  `;
}

async function renderTimesAdmin() {
  const rows = await api(`/times/boloes/${state.activeBolaoId}`);
  state.data.times = rows;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('admin.teams'))}</h2><span class="pill">${escapeHtml(t('common.administration'))}</span></div>
      <form class="form-card" data-crud-form="times">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('owner.name'))} <input name="nome" required></label>
        <label>${escapeHtml(t('admin.abbreviation'))} <input name="sigla"></label>
        <label>${escapeHtml(t('admin.country'))} <input name="pais"></label>
        <label>${escapeHtml(t('owner.status'))}
          <select name="status">
            <option value="ativo">${escapeHtml(statusLabel('ativo'))}</option>
            <option value="inativo">${escapeHtml(statusLabel('inativo'))}</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">${escapeHtml(t('admin.saveTeam'))}</button>
          <button class="ghost" type="button" data-reset-form="times">${escapeHtml(t('common.new'))}</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('times', row, row.nome, `${row.sigla || ''} ${row.pais || ''}`, row.status)).join('') || empty(t('admin.noTeams'))}</div></section>
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
    const fase = findById(fases, row.faseId)?.nome || t('games.noPhase');
    return `${fase} - ${dateTime(row.dataHora)} - ${row.estadio || t('games.noStadium')}`;
  };
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('admin.matches'))}</h2><span class="pill">${escapeHtml(t('common.administration'))}</span></div>
      <form class="form-card" data-crud-form="partidas">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('admin.phase'))} <select name="faseId"><option value="">${escapeHtml(t('games.noPhase'))}</option>${optionList(fases)}</select></label>
        <label>${escapeHtml(t('admin.home'))} <select name="timeMandanteId" required>${optionList(times)}</select></label>
        <label>${escapeHtml(t('admin.away'))} <select name="timeVisitanteId" required>${optionList(times)}</select></label>
        <label>${escapeHtml(t('admin.dateTime'))} <input name="dataHora" type="datetime-local" required></label>
        <label>${escapeHtml(t('admin.stadium'))} <input name="estadio"></label>
        <label>${escapeHtml(t('admin.homeScore'))} <input name="placarMandante" type="number" min="0"></label>
        <label>${escapeHtml(t('admin.awayScore'))} <input name="placarVisitante" type="number" min="0"></label>
        <label>${escapeHtml(t('owner.status'))}
          <select name="status">
            <option value="agendada">${escapeHtml(statusLabel('agendada'))}</option>
            <option value="em_andamento">${escapeHtml(statusLabel('em_andamento'))}</option>
            <option value="finalizada">${escapeHtml(statusLabel('finalizada'))}</option>
            <option value="cancelada">${escapeHtml(statusLabel('cancelada'))}</option>
            <option value="inativa">${escapeHtml(statusLabel('inativa'))}</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit">${escapeHtml(t('admin.saveMatch'))}</button>
          <button class="ghost" type="button" data-reset-form="partidas">${escapeHtml(t('common.newFemale'))}</button>
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('partidas', row, partidaTitle(row), partidaSubtitle(row), row.status)).join('') || empty(t('admin.noMatches'))}</div></section>
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
      <div class="card-title"><h2>${escapeHtml(t('rules.configTitle'))}</h2><span class="pill">${escapeHtml(t('common.administration'))}</span></div>
      <form class="form-card" data-crud-form="bolaoConfig">
        <input name="id" type="hidden" value="${escapeHtml(configuracao.id || '')}">
        <label>${escapeHtml(t('rules.minutesBeforeBet'))} <input name="minutosAntecedenciaAposta" type="number" min="0" value="${escapeHtml(configuracao.minutosAntecedenciaAposta ?? 0)}"></label>
        <label>${escapeHtml(t('rules.prizeTypeLabel'))}
          <select name="tipoDistribuicaoPremio">
            ${staticOptionList(PRIZE_DISTRIBUTION_OPTIONS, configuracao.tipoDistribuicaoPremio || 'percentual')}
          </select>
        </label>
        <label>${escapeHtml(t('rules.observationsLabel'))} <textarea name="observacoesRegras">${escapeHtml(configuracao.observacoesRegras || '')}</textarea></label>
        <label>${escapeHtml(t('rules.active'))}
          <select name="ativo">
            <option value="true" ${configuracao.ativo !== false ? 'selected' : ''}>${escapeHtml(t('common.yes'))}</option>
            <option value="false" ${configuracao.ativo === false ? 'selected' : ''}>${escapeHtml(t('common.no'))}</option>
          </select>
        </label>
        <div class="form-actions"><button type="submit">${escapeHtml(t('rules.saveConfig'))}</button></div>
        ${scopedMessage('bolaoConfig')}
      </form>
    </section>

    <section class="grid three">
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('rules.scoreRules'))}</h2></div>
        <form class="form-grid" data-crud-form="regrasPontuacao">
          <input name="id" type="hidden">
          <label>${escapeHtml(t('rules.code'))}
            <select name="codigo" required>
              <option value="">${escapeHtml(t('common.select'))}</option>
              ${staticOptionList(SCORE_RULE_OPTIONS)}
            </select>
          </label>
          <label>${escapeHtml(t('rules.description'))} <input name="descricao" required></label>
          <label>${escapeHtml(t('rules.points'))} <input name="pontos" type="number" min="0" required></label>
          <label>${escapeHtml(t('rules.priority'))} <input name="prioridade" type="number" min="1" value="1" required></label>
          <p class="help-text">${escapeHtml(t('rules.priorityHelp'))}</p>
          <label>${escapeHtml(t('rules.active'))} <select name="ativo"><option value="true">${escapeHtml(t('common.yes'))}</option><option value="false">${escapeHtml(t('common.no'))}</option></select></label>
          <div class="form-actions"><button type="submit">${escapeHtml(t('rules.saveRule'))}</button><button class="ghost" type="button" data-reset-form="regrasPontuacao">${escapeHtml(t('common.newFemale'))}</button></div>
          ${scopedMessage('regrasPontuacao')}
        </form>
      </article>

      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('rules.tiebreakers'))}</h2></div>
        <form class="form-grid" data-crud-form="criteriosDesempate">
          <input name="id" type="hidden">
          <label>${escapeHtml(t('rules.code'))}
            <select name="codigo" required>
              <option value="">${escapeHtml(t('common.select'))}</option>
              ${staticOptionList(TIEBREAKER_OPTIONS)}
            </select>
          </label>
          <label>${escapeHtml(t('rules.description'))} <input name="descricao" required></label>
          <label>${escapeHtml(t('admin.orderLabel'))} <input name="ordem" type="number" min="1" value="1" required></label>
          <label>${escapeHtml(t('rules.active'))} <select name="ativo"><option value="true">${escapeHtml(t('common.yes'))}</option><option value="false">${escapeHtml(t('common.no'))}</option></select></label>
          <div class="form-actions"><button type="submit">${escapeHtml(t('rules.saveTiebreaker'))}</button><button class="ghost" type="button" data-reset-form="criteriosDesempate">${escapeHtml(t('common.new'))}</button></div>
          ${scopedMessage('criteriosDesempate')}
        </form>
      </article>

      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('rules.prizes'))}</h2></div>
        <form class="form-grid" data-crud-form="distribuicaoPremios">
          <input name="id" type="hidden">
          <label>${escapeHtml(t('rules.position'))} <input name="posicao" type="number" min="1" required></label>
          <label>${escapeHtml(t('rules.percent'))} <input name="percentual" type="number" min="0" max="100" step="0.01" required></label>
          <label>${escapeHtml(t('rules.description'))} <input name="descricao"></label>
          <label>${escapeHtml(t('rules.active'))} <select name="ativo"><option value="true">${escapeHtml(t('common.yes'))}</option><option value="false">${escapeHtml(t('common.no'))}</option></select></label>
          <div class="form-actions"><button type="submit">${escapeHtml(t('rules.savePrize'))}</button><button class="ghost" type="button" data-reset-form="distribuicaoPremios">${escapeHtml(t('common.new'))}</button></div>
          ${scopedMessage('distribuicaoPremios')}
        </form>
      </article>
    </section>

    <section class="grid three">
      <article class="card"><div class="card-title"><h3>${escapeHtml(t('rules.registeredRules'))}</h3></div><div class="list">${regras.map((row, index) => regraRow(row, index, regras)).join('') || empty(t('rules.noRegisteredRules'))}</div></article>
      <article class="card"><div class="card-title"><h3>${escapeHtml(t('rules.registeredTiebreakers'))}</h3></div><div class="list">${criterios.map((row) => editableRow('criteriosDesempate', row, optionLabel(TIEBREAKER_OPTIONS, row.codigo, row.codigo), t('rules.order', { description: row.descricao, order: row.ordem }), row.ativo ? 'ativo' : 'inativo')).join('') || empty(t('rules.noRegisteredTiebreakers'))}</div></article>
      <article class="card"><div class="card-title"><h3>${escapeHtml(t('rules.registeredPrizes'))}</h3></div><div class="list">${premios.map((row) => editableRow('distribuicaoPremios', row, t('rules.place', { position: row.posicao }), t('rules.prizePercent', { percent: row.percentual, description: row.descricao || '' }), row.ativo ? 'ativo' : 'inativo')).join('') || empty(t('rules.noRegisteredPrizes'))}</div></article>
    </section>
  `;
}

async function renderConfiguracoesOwner() {
  const config = await api('/proprietario/configuracoes-gerais').catch(() => ({}));
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('owner.generalSettings'))}</h2><span class="pill">${escapeHtml(t('common.platform'))}</span></div>
      <form class="form-card" data-crud-form="configuracoesGerais">
        <label>${escapeHtml(t('owner.sessionTime'))} <input name="tempoSessao" type="number" min="1" value="${escapeHtml(config.tempoSessao || '')}"></label>
        <label>${escapeHtml(t('owner.senderEmail'))} <input name="emailRemetente" type="email" value="${escapeHtml(config.emailRemetente || '')}"></label>
        <label>${escapeHtml(t('owner.notificationsActive'))}
          <select name="notificacoesAtivas">
            <option value="true" ${config.notificacoesAtivas !== false ? 'selected' : ''}>${escapeHtml(t('common.yes'))}</option>
            <option value="false" ${config.notificacoesAtivas === false ? 'selected' : ''}>${escapeHtml(t('common.no'))}</option>
          </select>
        </label>
        <label>${escapeHtml(t('owner.paymentGateway'))} <input name="gatewayPagamento" value="${escapeHtml(config.gatewayPagamento || '')}"></label>
        <div class="form-actions"><button type="submit">${escapeHtml(t('owner.saveSettings'))}</button></div>
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

  state.formMessages.regrasPontuacao = { text: t('rules.priorityUpdated'), tone: 'success' };
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
  content.innerHTML = `<section class="card"><div class="empty">${escapeHtml(t('common.loading'))}</div></section>`;
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
    showMessage(t('owner.settingsSaved'));
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
    state.formMessages.meuPerfil = { text: t('profile.updated'), tone: 'success' };
    await navigate('perfil');
    return;
  }

  if (kind === 'minhaSenha') {
    if ((data.novaSenha || '') !== (data.confirmarNovaSenha || '')) {
      throw new Error(t('profile.passwordMismatch'));
    }
    await api('/auth/minha-senha', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    state.formMessages.minhaSenha = { text: t('profile.passwordUpdated'), tone: 'success' };
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
      text: id ? t('messages.recordUpdatedSuccess') : t('messages.recordSavedSuccess'),
      tone: 'success'
    };
    await navigate(state.route);
    return;
  }

  showMessage(id ? t('messages.recordUpdated') : t('messages.recordCreated'));
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

localeSelect.addEventListener('change', () => {
  i18n.setLocale(localeSelect.value)
    .then(() => navigate(state.route))
    .catch(() => showMessage(t('messages.apiError'), 'error'));
});

const pendingSaves = new Map();
content.addEventListener('input', (event) => {
  const input = event.target.closest('[data-bet-side]');
  if (!input) return;
  const card = input.closest('[data-partida-id]');
  const partidaId = card?.dataset.partidaId;
  const status = card.querySelector('[data-save-status]');
  if (!partidaId) {
    status.textContent = t('bets.cannotIdentifyMatch');
    return;
  }
  status.textContent = t('bets.saving');
  clearTimeout(pendingSaves.get(partidaId));
  pendingSaves.set(partidaId, window.setTimeout(async () => {
    const mandante = card.querySelector('[data-bet-side="mandante"]').value;
    const visitante = card.querySelector('[data-bet-side="visitante"]').value;
    if (mandante === '' || visitante === '') {
      status.textContent = t('bets.fillBothScores');
      return;
    }
    try {
      await api(`/apostas/boloes/${state.activeBolaoId}`, {
        method: 'POST',
        body: JSON.stringify({ partidaId, palpiteMandante: Number(mandante), palpiteVisitante: Number(visitante) })
      });
      status.textContent = t('bets.savedAutomatically');
      showMessage(t('bets.saved'));
      await renderApostas();
    } catch (error) {
      status.textContent = error.message;
    }
  }, 650));
});

i18n.ready.then(() => init()).catch((error) => {
  content.innerHTML = `<section class="card">${empty(error.message)}</section>`;
});
