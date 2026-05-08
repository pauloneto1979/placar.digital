const state = {
  token: localStorage.getItem('placar.token') || '',
  user: JSON.parse(localStorage.getItem('placar.user') || '{}'),
  boloes: JSON.parse(localStorage.getItem('placar.boloes') || '[]'),
  activeBolaoId: localStorage.getItem('placar.activeBolaoId') || '',
  activeBolaoNome: localStorage.getItem('placar.activeBolaoNome') || '',
  route: 'home',
  data: {},
  formMessages: {},
  externalMatchLink: {
    localId: '',
    externalId: '',
    filters: {},
    externalMatches: []
  },
  externalMatchImport: {
    open: false,
    filters: {},
    matches: [],
    selectedIds: [],
    summary: null
  },
  providerTokens: {},
  userEditorId: '',
  mobileMoreOpen: false
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
const localeCurrentLabel = document.querySelector('#localeCurrentLabel');
const mobileBottomNav = document.querySelector('#mobileBottomNav');
const mobileMoreDrawer = document.querySelector('#mobileMoreDrawer');
const mobileMoreList = document.querySelector('#mobileMoreList');
const mobileMoreClose = document.querySelector('#mobileMoreClose');
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

const FOOTBALL_COMPETITIONS = [
  { value: '', labelKey: 'externalMatches.allCompetitions' },
  { value: 'WC', label: 'WC - FIFA World Cup' },
  { value: 'CL', label: 'CL - UEFA Champions League' },
  { value: 'BL1', label: 'BL1 - Bundesliga' },
  { value: 'DED', label: 'DED - Eredivisie' },
  { value: 'BSA', label: 'BSA - Campeonato Brasileiro Série A' },
  { value: 'PD', label: 'PD - Primera División' },
  { value: 'FL1', label: 'FL1 - Ligue 1' },
  { value: 'ELC', label: 'ELC - Championship' },
  { value: 'PPL', label: 'PPL - Primeira Liga' },
  { value: 'EC', label: 'EC - European Championship' },
  { value: 'SA', label: 'SA - Serie A' },
  { value: 'PL', label: 'PL - Premier League' }
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

const MOBILE_ICONS = {
  home: '<svg viewBox="0 0 24 24" role="presentation"><path d="M3 11.5 12 4l9 7.5-1.3 1.5-1.7-1.4V20h-5v-5h-2v5H6v-8.4L4.3 13 3 11.5Z"/></svg>',
  apostas: '<svg viewBox="0 0 24 24" role="presentation"><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2Zm5 3v8h2V8h-2Z"/></svg>',
  ranking: '<svg viewBox="0 0 24 24" role="presentation"><path d="M5 20V9h4v11H5Zm5 0V4h4v16h-4Zm5 0v-7h4v7h-4Z"/></svg>',
  jogos: '<svg viewBox="0 0 24 24" role="presentation"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm1 2.1V7l2.4 1.7 2.6-.8A8 8 0 0 0 13 4.1ZM6 7.9l2.6.8L11 7V4.1a8 8 0 0 0-5 3.8Zm1.1 8.4 1-2.9-1.7-2.4-2.3.1a8 8 0 0 0 3 5.2Zm9.8 0a8 8 0 0 0 3-5.2l-2.3-.1-1.7 2.4 1 2.9ZM10 10l-1.4 3 2.2 2h2.4l2.2-2L14 10h-4Zm2 9.9a8 8 0 0 0 3.3-.7l-.8-2.2H9.5l-.8 2.2a8 8 0 0 0 3.3.7Z"/></svg>',
  partidas: '<svg viewBox="0 0 24 24" role="presentation"><path d="M4 5h16v14H4V5Zm2 2v10h12V7H6Zm2 2h3v2H8V9Zm5 0h3v2h-3V9Zm-5 4h8v2H8v-2Z"/></svg>',
  more: '<svg viewBox="0 0 24 24" role="presentation"><path d="M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg>'
};

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

function localeLabel(locale) {
  return ({ 'pt-BR': 'PT', 'en-US': 'EN', 'es-ES': 'ES' })[locale] || locale;
}

function syncLocaleControl() {
  localeSelect.value = i18n.getLocale();
  if (localeCurrentLabel) {
    localeCurrentLabel.textContent = localeLabel(i18n.getLocale());
  }
}

function roleLabelText() {
  return t(`roles.${state.user.perfilGlobal}`, {}, t('common.session'));
}

function money(value) {
  return Number(value || 0).toLocaleString(i18n.getLocale(), { style: 'currency', currency: 'BRL' });
}

function currency(value, currencyCode = 'BRL') {
  return Number(value || 0).toLocaleString(i18n.getLocale(), {
    style: 'currency',
    currency: currencyCode || 'BRL'
  });
}

function dateTime(value) {
  if (!value) return t('common.noDate');
  return new Date(value).toLocaleString(i18n.getLocale(), { dateStyle: 'short', timeStyle: 'short' });
}

function gameDateValue(game) {
  return game?.dataHora || game?.inicioAt || game?.inicio_at || game?.data_hora || '';
}

function officialScore(game) {
  const mandante = game?.placarMandante ?? game?.placar_mandante ?? game?.placarOficial?.mandante;
  const visitante = game?.placarVisitante ?? game?.placar_visitante ?? game?.placarOficial?.visitante;
  const hasScore = mandante !== null && mandante !== undefined && visitante !== null && visitante !== undefined;
  return hasScore ? { mandante, visitante } : null;
}

function countdownText(value) {
  if (!value) return t('home.noCountdown');
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return t('home.noCountdown');
  const diff = target - Date.now();
  if (diff <= 0) return t('home.startsSoon');
  const totalMinutes = Math.ceil(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return t('home.countdownDays', { days, hours });
  if (hours > 0) return t('home.countdownHours', { hours, minutes });
  return t('home.countdownMinutes', { minutes });
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

function isSelectableBolao(bolao) {
  if (!bolao) return false;
  if (bolao.ativo === false) return false;
  if (bolao.status && String(bolao.status).toLowerCase() !== 'ativo') return false;
  return true;
}

function selectableBoloes(boloes = []) {
  return (boloes || []).filter(isSelectableBolao);
}

function persistBolaoContext() {
  localStorage.setItem('placar.boloes', JSON.stringify(state.boloes));
  localStorage.setItem('placar.activeBolaoId', state.activeBolaoId || '');
  localStorage.setItem('placar.activeBolaoNome', state.activeBolaoNome || '');
}

function syncActiveBolaoWithAvailable() {
  state.boloes = selectableBoloes(state.boloes);
  const active = state.boloes.find((bolao) => String(bolao.id) === String(state.activeBolaoId));
  if (active) {
    state.activeBolaoId = active.id;
    state.activeBolaoNome = active.nome;
  } else if (state.boloes.length) {
    state.activeBolaoId = state.boloes[0].id;
    state.activeBolaoNome = state.boloes[0].nome;
  } else {
    state.activeBolaoId = '';
    state.activeBolaoNome = '';
  }
  persistBolaoContext();
}

function redirectLogin() {
  window.location.href = '/app/login.html';
}

function saveAuth(result, options = {}) {
  state.token = result.accessToken || state.token;
  state.user = result.user || state.user;
  if (Array.isArray(result.boloes) && (result.boloes.length > 0 || !options.keepBoloesWhenEmpty)) {
    state.boloes = selectableBoloes(result.boloes);
  }
  state.activeBolaoId = result.selectedBolao?.id || state.activeBolaoId;
  state.activeBolaoNome = result.selectedBolao?.nome || state.activeBolaoNome;
  syncActiveBolaoWithAvailable();
  localStorage.setItem('placar.token', state.token);
  localStorage.setItem('placar.user', JSON.stringify(state.user));
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

function routeById(id) {
  return routes.find((item) => item.id === id) || null;
}

function mobilePrimaryRoutes() {
  const gameRoute = routeAllowed(routeById('partidas')) ? 'partidas' : 'jogos';
  return ['home', 'apostas', 'ranking', gameRoute]
    .map(routeById)
    .filter((route, index, list) => route && !route.hidden && routeAllowed(route) && list.findIndex((item) => item?.id === route.id) === index);
}

function renderMobileNavigation() {
  if (!mobileBottomNav || !mobileMoreDrawer || !mobileMoreList) return;
  const primaryRoutes = mobilePrimaryRoutes();
  const primaryIds = new Set(primaryRoutes.map((route) => route.id));
  const isMoreActive = !primaryIds.has(state.route) && state.route !== 'perfil';
  mobileBottomNav.innerHTML = [
    ...primaryRoutes.map((route) => `
      <button class="mobile-nav-item ${route.id === state.route ? 'active' : ''}" type="button" data-mobile-route="${escapeHtml(route.id)}" aria-label="${escapeHtml(t(route.labelKey))}">
        <span class="mobile-nav-icon" aria-hidden="true">${MOBILE_ICONS[route.id] || MOBILE_ICONS.more}</span>
        <span>${escapeHtml(t(route.labelKey))}</span>
      </button>
    `),
    `<button class="mobile-nav-item ${isMoreActive ? 'active' : ''}" type="button" data-mobile-more aria-label="${escapeHtml(t('common.more'))}">
      <span class="mobile-nav-icon" aria-hidden="true">${MOBILE_ICONS.more}</span>
      <span>${escapeHtml(t('common.more'))}</span>
    </button>`
  ].join('');

  const moreRoutes = routes.filter((route) => !route.hidden && routeAllowed(route) && !primaryIds.has(route.id));
  mobileMoreList.innerHTML = moreRoutes.map((route) => `
    <button class="mobile-more-item ${route.id === state.route ? 'active' : ''}" type="button" data-mobile-route="${escapeHtml(route.id)}">
      <span class="mobile-more-dot" aria-hidden="true"></span>
      <span>${escapeHtml(t(route.labelKey))}</span>
    </button>
  `).join('') || empty(t('messages.noActivePool'));
  mobileMoreDrawer.hidden = !state.mobileMoreOpen;
  mobileMoreDrawer.classList.toggle('open', state.mobileMoreOpen);
}

function renderMenu() {
  menu.innerHTML = routes.filter((item) => !item.hidden && routeAllowed(item)).map((item) => `
    <button class="nav-item ${item.id === state.route ? 'active' : ''}" type="button" data-route="${item.id}">
      ${escapeHtml(t(item.labelKey))}
    </button>
  `).join('');
}

function renderChrome() {
  syncActiveBolaoWithAvailable();
  const route = currentRoute();
  pageTitle.textContent = t(route.labelKey);
  pageSubtitle.textContent = state.activeBolaoNome || t(route.subtitleKey);
  roleLabel.textContent = roleLabelText();
  shell.dataset.role = state.user.perfilGlobal || 'sessao';
  profileButton.classList.toggle('active', state.route === 'perfil');
  i18n.applyI18n(document);
  syncLocaleControl();
  renderMenu();
  renderMobileNavigation();

  const availableBoloes = selectableBoloes(state.boloes);
  if (availableBoloes.length > 1) {
    bolaoSwitcher.hidden = false;
    bolaoSelect.innerHTML = availableBoloes.map((bolao) => `
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
      ${escapeHtml(option.labelKey ? t(option.labelKey, {}, option.label || option.value) : (option.label || option.value))}
    </option>
  `).join('');
}

const ICONS = {
  save: '<span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h12l2 2v16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 2v5h10V5H6Zm2 12h8v-5H8v5Zm6-11h-2v3h2V6Z"/></svg></span>',
  plus: '<span class="button-icon button-icon--add" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg></span>',
  plugOff: '<span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7.6 3 1.4 1.4L7.4 6H10V3h2v5h1.2l2.4 2.4L21 15.8 19.6 17.2 3 4.4 4.4 3l2 2L7.6 3Zm7.8 11.2L16 14v-2.6L18.6 14 17.2 15.4l-1.8-1.2ZM8.8 10H6v4a5 5 0 0 0 4 4.9V22h2v-3.1a5 5 0 0 0 2.2-.9l-1.5-1.5A3 3 0 0 1 8 14v-2.8l.8-1.2ZM17 3h-2v3h2V3Z"/></svg></span>',
  eye: '<span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5c5 0 8.7 4.4 9.7 5.8a2 2 0 0 1 0 2.4C20.7 14.6 17 19 12 19s-8.7-4.4-9.7-5.8a2 2 0 0 1 0-2.4C3.3 9.4 7 5 12 5Zm0 2c-4 0-7.1 3.5-8 5 0 0 3.4 5 8 5s8-5 8-5c-.9-1.5-4-5-8-5Zm0 2.5A2.5 2.5 0 1 1 12 14a2.5 2.5 0 0 1 0-5Z"/></svg></span>',
  copy: '<span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 7a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-1v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h1V7Zm2 1h4a3 3 0 0 1 3 3v4h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v1Zm-3 2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H7Z"/></svg></span>',
  upload: '<span class="button-icon button-icon--upload" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M11 16h2V8.8l2.6 2.6L17 10l-5-5-5 5 1.4 1.4L11 8.8V16Zm-5 4h12a2 2 0 0 0 2-2v-3h-2v3H6v-3H4v3a2 2 0 0 0 2 2Z"/></svg></span>',
  x: '<span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z"/></svg></span>'
};

function withIcon(name, label) {
  return `${ICONS[name] || ''}<span class="button-text">${escapeHtml(label)}</span>`;
}

function iconOnly(name, label, attrs = '') {
  return `${ICONS[name] || ''}<span class="sr-only">${escapeHtml(label)}</span>`;
}

function iconOnlyButton(name, label, attrs = '') {
  return `<button class="ghost icon-action" type="button" ${attrs} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${iconOnly(name, label)}</button>`;
}

function submitIconButton(name, label) {
  return `<button type="submit" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${withIcon(name, label)}</button>`;
}

function optionLabel(options, value, fallback = '') {
  const option = options.find((item) => item.value === value);
  if (option) return option.labelKey ? t(option.labelKey, {}, option.label || option.value) : (option.label || option.value);
  return fallback || value || '';
}

function setFormMessage(kind, text, tone = 'warning', root = document) {
  state.formMessages[kind] = { text, tone };
  const el = root.querySelector(`[data-form-message="${kind}"]`) || document.querySelector(`[data-form-message="${kind}"]`);
  if (!el) return;
  el.hidden = false;
  el.dataset.tone = tone;
  el.textContent = text;
}

function clearFormMessage(kind, root = document) {
  delete state.formMessages[kind];
  const el = root.querySelector(`[data-form-message="${kind}"]`) || document.querySelector(`[data-form-message="${kind}"]`);
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
  const data = {};
  const multiKeys = new Set();
  form.querySelectorAll('[data-multi-value]').forEach((field) => {
    if (field.name) multiKeys.add(field.name);
  });
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    if (multiKeys.has(key)) {
      data[key] = data[key] || [];
      if (value) data[key].push(value);
    } else {
      data[key] = value;
    }
  }
  Object.keys(data).forEach((key) => {
    if (Array.isArray(data[key])) {
      data[key] = [...new Set(data[key].filter(Boolean))];
      return;
    }
    if (data[key] === '') delete data[key];
  });
  return data;
}

function isSystemPasswordValid(password) {
  return String(password || '').length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function ensureSystemPassword(password) {
  if (!isSystemPasswordValid(password)) {
    throw new Error(t('security.systemPasswordPolicy'));
  }
}

function ensureRequiredPassword(password, messageKey = 'security.passwordRequired') {
  if (!String(password || '')) {
    throw new Error(t(messageKey));
  }
}

function setFormValues(form, row) {
  form.reset();
  Object.entries(row).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (field instanceof RadioNodeList || (field.length && field[0]?.type === 'checkbox')) {
      const values = new Set((Array.isArray(value) ? value : [value]).map(String));
      Array.from(field).forEach((item) => {
        if (item.type === 'checkbox') item.checked = values.has(String(item.value));
      });
      return;
    }
    if (field.type === 'checkbox') {
      field.checked = Array.isArray(value) ? value.map(String).includes(String(field.value)) : Boolean(value);
      return;
    }
    if (field.type === 'datetime-local') {
      field.value = dateTimeInput(value);
      return;
    }
    field.value = value ?? '';
  });
}

function renderCheckboxGroup(name, options, selectedValues = [], emptyMessage = '') {
  const selected = new Set((selectedValues || []).map(String));
  if (!options.length) return empty(emptyMessage || t('common.noDescription'));
  return `
    <div class="checkbox-grid">
      <input type="hidden" name="${escapeHtml(name)}" value="" data-multi-value>
      ${options.map((option) => `
        <label class="modern-checkbox">
          <input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(option.id)}" data-multi-value ${selected.has(String(option.id)) ? 'checked' : ''}>
          <span class="modern-checkbox__box" aria-hidden="true"></span>
          <span class="modern-checkbox__text">
            <strong>${escapeHtml(option.nome)}</strong>
            ${option.email ? `<small>${escapeHtml(option.email)}</small>` : ''}
          </span>
        </label>
      `).join('')}
    </div>
  `;
}

function clearForm(kind) {
  const form = document.querySelector(`[data-crud-form="${kind}"]`);
  if (!form) return;
  form.reset();
  if (form.elements.id) form.elements.id.value = '';
  if (kind === 'usuarios') syncAdminLinksVisibility(form);
  if (kind === 'times') {
    form.dataset.uploadedShield = '';
    updateTeamShieldPreview(form);
  }
}

function syncAdminLinksVisibility(form) {
  const section = form?.querySelector('[data-admin-links-section]');
  if (!section) return;
  const isAdmin = form.elements.perfil?.value === 'administrador';
  section.hidden = !isAdmin;
  section.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.disabled = !isAdmin;
  });
}

function updateTeamShieldPreview(form) {
  const preview = form?.querySelector('[data-team-shield-preview]');
  const input = form?.elements?.escudoUrl;
  if (!preview || !input) return;
  const value = input.value || '';
  const isUpload = value.startsWith('data:image/');
  input.readOnly = isUpload;
  if (value) {
    preview.innerHTML = `<img src="${escapeHtml(value)}" alt="${escapeHtml(t('admin.shieldPreview'))}" onerror="this.hidden=true;this.nextElementSibling.hidden=false;"><span class="team-avatar__fallback" hidden>PD</span>`;
    return;
  }
  preview.innerHTML = '<span class="team-avatar__fallback">PD</span>';
}

function readTeamShieldFile(input) {
  const file = input.files?.[0];
  const form = input.closest('[data-crud-form="times"]');
  if (!file || !form) return;
  const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
  if (!allowedTypes.has(file.type) || file.size > 512 * 1024) {
    input.value = '';
    setFormMessage('times', t('admin.invalidShieldUpload'), 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    form.elements.escudoUrl.value = String(reader.result || '');
    form.dataset.uploadedShield = 'true';
    clearFormMessage('times');
    updateTeamShieldPreview(form);
  };
  reader.onerror = () => setFormMessage('times', t('admin.invalidShieldUpload'), 'error');
  reader.readAsDataURL(file);
}

function removeTeamShieldUpload(form) {
  if (!form) return;
  if (form.elements.escudoUpload) form.elements.escudoUpload.value = '';
  if (form.elements.escudoUrl?.value?.startsWith('data:image/')) {
    form.elements.escudoUrl.readOnly = false;
    form.elements.escudoUrl.value = '';
  }
  form.dataset.uploadedShield = '';
  updateTeamShieldPreview(form);
}

function getRankMedal(position) {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return String(position || '-');
}

function getParticipantName(item) {
  return item.participante || item.nome || t('ranking.unknownBettor');
}

function participantInitials(item) {
  const name = getParticipantName(item);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'PD';
}

function renderParticipantAvatar(item) {
  const imageUrl = item.fotoUrl || item.foto_url || item.avatarUrl || item.avatar_url || '';
  const name = getParticipantName(item);
  const initials = participantInitials(item);
  return `
    <span class="participant-avatar">
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">` : ''}
      <span class="participant-avatar__fallback" ${imageUrl ? 'hidden' : ''}>${escapeHtml(initials)}</span>
    </span>
  `;
}

function metricValue(value) {
  return value ?? 0;
}

function renderRankingMetric(label, value) {
  return `
    <span class="ranking-metric">
      <span class="ranking-metric__label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(metricValue(value))}</strong>
    </span>
  `;
}

function renderRankingHistory(item) {
  const previousPosition = item.posicaoAnterior ?? item.posicao_anterior ?? null;
  if (previousPosition === null || previousPosition === undefined || previousPosition === '') {
    return `<span class="ranking-history ranking-history--empty">${escapeHtml(t('ranking.noHistory'))}</span>`;
  }
  return `<span class="ranking-history">${escapeHtml(t('ranking.previousPosition', { position: previousPosition }))}</span>`;
}

function renderRankingGap(item, leaderPoints) {
  const currentPoints = Number(item.pontosAtuais ?? item.pontos_atuais ?? 0);
  const gap = Math.max(0, Number(leaderPoints || 0) - currentPoints);
  if (!gap) {
    return `<span class="ranking-gap ranking-gap--leader">${escapeHtml(t('ranking.leader'))}</span>`;
  }
  return `<span class="ranking-gap">${escapeHtml(t('ranking.gapToLeader', { points: gap }))}</span>`;
}

function renderRankingHeader() {
  return `
    <div class="ranking-header" aria-hidden="true">
      <span>${escapeHtml(t('ranking.position'))}</span>
      <span>${escapeHtml(t('ranking.bettor'))}</span>
      <span>${escapeHtml(t('ranking.summary'))}</span>
      <span>${escapeHtml(t('ranking.points'))}</span>
    </div>
  `;
}

async function loadBaseData() {
  syncActiveBolaoWithAvailable();
  if (!state.activeBolaoId && !isOwner()) {
    content.innerHTML = empty(t('messages.noActivePool'));
    return false;
  }

  if (isOwner()) {
    const ownerBoloes = await api('/proprietario/boloes').catch(() => []);
    state.boloes = ownerBoloes
      .filter(isSelectableBolao)
      .map((bolao) => ({
        id: bolao.id,
        nome: bolao.nome,
        status: bolao.status,
        papel: 'proprietario'
      }));
    syncActiveBolaoWithAvailable();
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
  const leaderPoints = ranking.length ? Number(ranking[0].pontosAtuais ?? ranking[0].pontos_atuais ?? 0) : 0;
  const meusPontos = Number(meuRanking.pontosAtuais ?? meuRanking.pontos_atuais ?? 0);
  const gap = Math.max(0, leaderPoints - meusPontos);
  const apostasPorPartida = new Map(minhas.map((item) => [String(item.partidaId), item]));
  const palpitesPendentes = minhas.filter((item) => item.statusAposta === 'sem_aposta' && item.podeAlterar).length;
  const jogosOrdenados = [...jogos].sort((a, b) => new Date(gameDateValue(a)).getTime() - new Date(gameDateValue(b)).getTime());
  const proximosJogos = jogosOrdenados.filter((game) => {
    const score = officialScore(game);
    const status = game.status || '';
    return !score && !['finalizada', 'cancelada', 'inativa'].includes(status);
  });
  const proximoJogo = proximosJogos[0] || jogosOrdenados.find((game) => !officialScore(game));
  const resultados = jogosOrdenados
    .filter((game) => officialScore(game))
    .sort((a, b) => new Date(gameDateValue(b)).getTime() - new Date(gameDateValue(a)).getTime())
    .slice(0, 3);

  content.innerHTML = `
    <section class="dashboard-hero card">
      <div>
        <span class="pill">${escapeHtml(state.activeBolaoNome || t('common.pool'))}</span>
        <h2>${escapeHtml(t('home.dashboardTitle'))}</h2>
        <p class="muted">${escapeHtml(t('home.dashboardSubtitle'))}</p>
      </div>
      <div class="dashboard-countdown">
        <span>${escapeHtml(t('home.nextKickoff'))}</span>
        <strong>${escapeHtml(countdownText(gameDateValue(proximoJogo)))}</strong>
      </div>
    </section>

    <section class="dashboard-kpis">
      <article class="card stat-card">
        <span>${escapeHtml(t('home.currentPosition'))}</span>
        <strong>${escapeHtml(meuRanking.posicao || '-')}</strong>
        <p>${escapeHtml(t('home.positionHint'))}</p>
      </article>
      <article class="card stat-card">
        <span>${escapeHtml(t('home.totalPoints'))}</span>
        <strong>${escapeHtml(meusPontos)}</strong>
        <p>${escapeHtml(t('home.pointsInRanking', { points: meusPontos }))}</p>
      </article>
      <article class="card stat-card">
        <span>${escapeHtml(t('home.gapToLeader'))}</span>
        <strong>${escapeHtml(gap)}</strong>
        <p>${escapeHtml(gap ? t('home.pointsBehindLeader', { points: gap }) : t('home.youAreLeader'))}</p>
      </article>
      <article class="card stat-card">
        <span>${escapeHtml(t('home.pendingGuesses'))}</span>
        <strong>${escapeHtml(isApostador() ? palpitesPendentes : '-')}</strong>
        <p>${escapeHtml(isApostador() ? t('home.pendingGuessesHint') : t('home.pendingOnlyBettor'))}</p>
      </article>
    </section>

    <section class="grid two">
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('home.nextGame'))}</h2><button class="secondary" data-route="${isApostador() ? 'apostas' : 'jogos'}" type="button">${escapeHtml(isApostador() ? t('home.bet') : t('home.viewGames'))}</button></div>
        ${proximoJogo ? renderDashboardGameCard(proximoJogo, apostasPorPartida.get(String(proximoJogo.partidaId || proximoJogo.id))) : empty(t('home.noGames'))}
      </article>
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('home.top3'))}</h2><button class="secondary" data-route="ranking" type="button">${escapeHtml(t('home.viewFull'))}</button></div>
        <div class="list ranking-list">${ranking.slice(0, 3).map((item) => renderRankingRow(item, { leaderPoints, compact: true })).join('') || empty(t('home.rankingEmpty'))}</div>
      </article>
    </section>

    <section class="grid two">
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('home.nextGames'))}</h2><button class="secondary" data-route="${isApostador() ? 'apostas' : 'jogos'}" type="button">${escapeHtml(isApostador() ? t('home.bet') : t('home.viewGames'))}</button></div>
        <div class="list dashboard-games">${proximosJogos.slice(0, 4).map((game) => renderDashboardGameCard(game, apostasPorPartida.get(String(game.partidaId || game.id)))).join('') || empty(t('home.noGames'))}</div>
      </article>
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('home.lastResults'))}</h2><span class="pill">${escapeHtml(t('home.participants', { count: dashboard?.participantesTotal || 0 }))}</span></div>
        <div class="list">${resultados.map(renderDashboardResultCard).join('') || empty(t('home.noRecentResult'))}</div>
      </article>
    </section>
  `;
}

function dashboardGuessStatus(bet) {
  if (!isApostador()) return t('home.adminView');
  if (!bet || bet.statusAposta === 'sem_aposta') return t('home.guessPending');
  if (bet.podeAlterar) return t('home.guessOpen');
  return t('home.guessLocked');
}

function renderDashboardGameCard(game, bet) {
  const mandante = game.mandante?.nome || game.mandante || game.timeMandante || t('games.homeTeam');
  const visitante = game.visitante?.nome || game.visitante || game.timeVisitante || t('games.awayTeam');
  const date = gameDateValue(game);
  return `
    <article class="dashboard-game">
      <div class="dashboard-game__teams">
        ${renderTeamName(game.mandante || { nome: mandante }, mandante)}
        <span class="score">${escapeHtml(t('common.scoreSeparator'))}</span>
        ${renderTeamName(game.visitante || { nome: visitante }, visitante)}
      </div>
      <div class="dashboard-game__meta">
        <span>${escapeHtml(dateTime(date))}</span>
        <span>${escapeHtml(statusLabel(game.status))}</span>
        <span class="pill">${escapeHtml(dashboardGuessStatus(bet))}</span>
      </div>
      <div class="dashboard-game__countdown">${escapeHtml(countdownText(date))}</div>
    </article>
  `;
}

function renderDashboardResultCard(game) {
  const mandante = game.mandante?.nome || game.mandante || game.timeMandante || t('games.homeTeam');
  const visitante = game.visitante?.nome || game.visitante || game.timeVisitante || t('games.awayTeam');
  const score = officialScore(game);
  return `
    <article class="dashboard-result">
      ${renderTeamName(game.mandante || { nome: mandante }, mandante, 'sm')}
      <span class="score score--inline">${score ? `${escapeHtml(score.mandante)} ${escapeHtml(t('common.scoreSeparator'))} ${escapeHtml(score.visitante)}` : escapeHtml(t('common.scoreSeparator'))}</span>
      ${renderTeamName(game.visitante || { nome: visitante }, visitante, 'sm')}
      <span class="muted">${escapeHtml(dateTime(gameDateValue(game)))}</span>
    </article>
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

function teamMeta(team) {
  if (!team || typeof team !== 'object') {
    return {
      nome: typeof team === 'string' ? team : '',
      sigla: '',
      codigoFifa: '',
      escudoUrl: '',
      bandeiraUrl: ''
    };
  }

  return {
    nome: team.nome || team.name || team.shortName || '',
    sigla: team.sigla || team.tla || '',
    codigoFifa: team.codigoFifa || team.codigo_fifa || team.tla || '',
    escudoUrl: team.escudoUrl || team.escudo_url || team.crest || '',
    bandeiraUrl: team.bandeiraUrl || team.bandeira_url || ''
  };
}

function teamFallbackLabel(team, fallbackName = '') {
  const data = teamMeta(team);
  if (data.codigoFifa) return data.codigoFifa.slice(0, 3).toUpperCase();
  if (data.sigla) return data.sigla.slice(0, 3).toUpperCase();
  const base = data.nome || fallbackName || '';
  return base
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'PD';
}

function renderTeamAvatar(team, fallbackName = '', size = 'md') {
  const data = teamMeta(team);
  const imageUrl = data.escudoUrl || data.bandeiraUrl;
  const fallback = teamFallbackLabel(team, fallbackName);
  const alt = data.nome || fallbackName || t('admin.teams');
  return `
    <span class="team-avatar team-avatar--${size}">
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">` : ''}
      <span class="team-avatar__fallback" ${imageUrl ? 'hidden' : ''}>${escapeHtml(fallback)}</span>
    </span>
  `;
}

function renderTeamName(team, fallbackName = '', size = 'md') {
  const data = teamMeta(team);
  const nome = data.nome || fallbackName || t('common.game');
  return `<span class="team-name team-name--${size}">${renderTeamAvatar(team, nome, size)}<span>${escapeHtml(nome)}</span></span>`;
}

function externalScore(row) {
  const home = row.placar?.fullTime?.home;
  const away = row.placar?.fullTime?.away;
  return home !== null && home !== undefined && away !== null && away !== undefined
    ? `${home} ${t('common.scoreSeparator')} ${away}`
    : t('common.scoreSeparator');
}

function competitionName(row) {
  return row.competition?.name || row.competition?.code || t('externalMatches.noCompetition');
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
          ${renderTeamName(game.mandante || { nome: mandante }, mandante)}
          <span class="score">${hasScore ? `${escapeHtml(placarMandante)} ${escapeHtml(t('common.scoreSeparator'))} ${escapeHtml(placarVisitante)}` : escapeHtml(t('common.scoreSeparator'))}</span>
          ${renderTeamName(game.visitante || { nome: visitante }, visitante)}
        </div>
        <p class="muted">${escapeHtml(game.fase || game.faseNome || '')} ${dateTime(game.dataHora || game.inicioAt || game.inicio_at)} - ${escapeHtml(statusLabel(game.status))}</p>
      </div>
      <span class="pill">${escapeHtml(game.estadio || t('common.game'))}</span>
    </article>
  `;
}

function renderExternalImportPanel(localMatches) {
  const filters = state.externalMatchImport.filters || {};
  const externalMatches = state.externalMatchImport.matches || [];
  const selectedIds = new Set((state.externalMatchImport.selectedIds || []).map(String));
  const importedIds = new Set((localMatches || []).map((row) => String(row.footballDataMatchId || '')).filter(Boolean));
  const summary = state.externalMatchImport.summary;
  const selectableMatches = externalMatches.filter((row) => !importedIds.has(String(row.externalMatchId || row.id || '')));
  const allSelected = selectableMatches.length > 0 && selectableMatches.every((row) => selectedIds.has(String(row.externalMatchId || row.id || '')));
  return `
    <section class="card external-import-panel">
      <div class="card-title">
        <h2>${escapeHtml(t('externalMatches.importTitle'))}</h2>
        <span class="pill">${escapeHtml(state.activeBolaoNome || t('common.pool'))}</span>
      </div>
      <form class="form-card" data-external-match-import-search>
        <label>${escapeHtml(t('externalMatches.dateFrom'))}<input name="dateFrom" type="date" value="${escapeHtml(filters.dateFrom || '')}"></label>
        <label>${escapeHtml(t('externalMatches.dateTo'))}<input name="dateTo" type="date" value="${escapeHtml(filters.dateTo || '')}"></label>
        <label>${escapeHtml(t('externalMatches.competition'))}
          <select name="competition">${staticOptionList(FOOTBALL_COMPETITIONS, filters.competition || '')}</select>
        </label>
        <label>${escapeHtml(t('externalMatches.status'))}
          <select name="status">
            <option value="">${escapeHtml(t('common.select'))}</option>
            ${['SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED', 'POSTPONED', 'SUSPENDED', 'CANCELLED', 'AWARDED'].map((status) => `<option value="${status}" ${filters.status === status ? 'selected' : ''}>${escapeHtml(statusLabel(status))}</option>`).join('')}
          </select>
        </label>
        <div class="form-actions">
          <button class="ghost" type="submit">${escapeHtml(t('externalMatches.search'))}</button>
          <button class="ghost" type="button" data-clear-external-import-filters>${escapeHtml(t('externalMatches.clearFilters'))}</button>
        </div>
        ${scopedMessage('externalMatchImport')}
      </form>
      ${summary ? `
        ${renderExternalImportSummary(summary)}
      ` : ''}
      <div class="form-actions external-import-toolbar">
        <label class="checkbox-pill">
          <input type="checkbox" data-toggle-all-import-matches ${allSelected ? 'checked' : ''} ${selectableMatches.length ? '' : 'disabled'}>
          <span>${escapeHtml(t('externalMatches.selectAll'))}</span>
        </label>
        <span class="pill">${escapeHtml(t('externalMatches.selectedCount', { count: selectedIds.size }))}</span>
        <button class="ghost" type="button" data-import-external-matches ${selectedIds.size ? '' : 'disabled'}>${escapeHtml(t('externalMatches.importSelected'))}</button>
      </div>
      <div class="list external-import-list">
        ${externalMatches.map((row) => renderExternalImportRow(row, importedIds, selectedIds)).join('') || empty(t('externalMatches.noExternalResults'))}
      </div>
    </section>
  `;
}

function externalIgnoredReason(item = {}) {
  return t(`externalMatches.skipReasons.${item.reason || item.motivo}`, {}, item.reason || item.motivo || t('externalMatches.skipReasons.unknown'));
}

function externalIgnoredTitle(item = {}) {
  const teams = [item.mandante, item.visitante].filter(Boolean).join(` ${t('common.scoreSeparator')} `);
  return teams || t('externalMatches.externalId', { id: item.externalMatchId || '-' });
}

function renderExternalImportSummary(summary = {}) {
  const ignoradas = Array.isArray(summary.ignoradas) ? summary.ignoradas : [];
  const avisos = Array.isArray(summary.avisos) ? summary.avisos : [];
  return `
    <div class="message card-message import-summary" data-tone="success">
      <strong>${escapeHtml(t('externalMatches.importSummary', {
        created: summary.partidasCriadas || 0,
        skipped: summary.partidasIgnoradas || 0,
        teams: summary.timesCriados || 0,
        warnings: avisos.length
      }))}</strong>
      ${ignoradas.length ? `
        <div class="import-summary__details">
          <span>${escapeHtml(t('externalMatches.ignoredReasonsTitle'))}</span>
          ${ignoradas.slice(0, 8).map((item) => `
            <p>
              <strong>${escapeHtml(externalIgnoredTitle(item))}</strong>
              <span>${escapeHtml(t('externalMatches.ignoredReasonLine', {
                id: item.externalMatchId || '-',
                reason: externalIgnoredReason(item)
              }))}</span>
            </p>
          `).join('')}
          ${ignoradas.length > 8 ? `<small>${escapeHtml(t('externalMatches.moreIgnored', { count: ignoradas.length - 8 }))}</small>` : ''}
        </div>
      ` : ''}
      ${avisos.length ? `
        <div class="import-summary__details">
          <span>${escapeHtml(t('externalMatches.warningsTitle'))}</span>
          ${avisos.slice(0, 5).map((item) => `<p>${escapeHtml(item.message || item.code || '')}</p>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderExternalImportRow(row, importedIds, selectedIds) {
  const id = String(row.externalMatchId || row.id || '');
  const imported = importedIds.has(id);
  const selected = selectedIds.has(id);
  return `
    <article class="external-link-card external-import-card ${selected ? 'selected' : ''} ${imported ? 'linked' : ''}" data-toggle-import-match="${escapeHtml(id)}" ${imported ? 'aria-disabled="true"' : ''}>
      <label class="external-import-check">
        <input type="checkbox" data-toggle-import-match="${escapeHtml(id)}" ${selected ? 'checked' : ''} ${imported ? 'disabled' : ''}>
        <span class="sr-only">${escapeHtml(imported ? t('externalMatches.alreadyImported') : t('externalMatches.selectMatch'))}</span>
      </label>
      <span class="match-inline">${renderTeamName(row.mandante, row.mandante?.name, 'sm')}<span class="score score--inline">${escapeHtml(externalScore(row))}</span>${renderTeamName(row.visitante, row.visitante?.name, 'sm')}</span>
      <span class="muted">${escapeHtml(`${competitionName(row)} - ${dateTime(row.utcDate)} - ${statusLabel(row.status)}`)}</span>
      <span class="external-link-card__meta">
        <span class="pill">${escapeHtml(t('externalMatches.externalId', { id }))}</span>
        ${imported ? `<span class="pill">${escapeHtml(t('externalMatches.alreadyImported'))}</span>` : ''}
      </span>
    </article>
  `;
}

function validateExternalMatchFilters(data) {
  if (data.dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(data.dateFrom)) {
    throw new Error(t('externalMatches.invalidDateFrom'));
  }
  if (data.dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(data.dateTo)) {
    throw new Error(t('externalMatches.invalidDateTo'));
  }
  if (data.dateFrom && data.dateTo && data.dateTo < data.dateFrom) {
    throw new Error(t('externalMatches.invalidDateRange'));
  }
}

function renderRankingRow(item, context = {}) {
  const me = item.participanteId === currentParticipanteId();
  const position = item.posicao || '-';
  const exact = item.acertosExatos ?? item.acertos_placar_exato;
  const results = item.acertosResultado ?? item.acertos_resultado;
  const goals = item.diferencaGolsTotal ?? item.diferenca_gols_total;
  const showExact = exact !== null && exact !== undefined;
  const showResults = results !== null && results !== undefined;
  const showGoalDiff = goals !== null && goals !== undefined;
  const leaderPoints = context.leaderPoints ?? item.pontosAtuais ?? 0;
  const compact = Boolean(context.compact);
  const prize = Number(item.valorPremioPrevisto ?? item.premioPrevisto ?? item.premio_previsto ?? 0);
  const rowClass = [
    'ranking-row',
    me ? 'me' : '',
    prize > 0 ? 'ranking-row--prized' : '',
    position === 1 ? 'ranking-row--gold' : '',
    position === 2 ? 'ranking-row--silver' : '',
    position === 3 ? 'ranking-row--bronze' : '',
    compact ? 'ranking-row--compact' : ''
  ].filter(Boolean).join(' ');
  const metrics = [
    showExact ? renderRankingMetric(t('ranking.exact'), exact) : '',
    showResults ? renderRankingMetric(t('ranking.results'), results) : '',
    showGoalDiff ? renderRankingMetric(t('ranking.goalDiff'), goals) : ''
  ].filter(Boolean).join('');
  return `
    <article class="${rowClass}">
      <div class="ranking-position">
        <span class="medal">${getRankMedal(position)}</span>
        <span class="ranking-position__number">#${escapeHtml(position)}</span>
      </div>
      <div class="ranking-identity">
        ${renderParticipantAvatar(item)}
        <div class="ranking-identity__text">
          <strong>${escapeHtml(getParticipantName(item))}</strong>
          <div class="ranking-meta">
            ${renderRankingHistory(item)}
            ${me ? `<span class="ranking-tag">${escapeHtml(t('ranking.you'))}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="ranking-summary">
        <div class="ranking-metrics">${metrics}</div>
        <div class="ranking-subtext">
          ${renderRankingGap(item, leaderPoints)}
          ${prize > 0 ? `<span class="ranking-prize">${escapeHtml(t('ranking.prizeEstimated', { value: currency(prize) }))}</span>` : ''}
        </div>
      </div>
      <div class="score-block">
        <div class="score">${escapeHtml(item.pontosAtuais || 0)} ${escapeHtml(t('ranking.pointsAbbr'))}</div>
      </div>
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
  const mandante = aposta.mandante?.nome || aposta.mandante || t('games.homeTeam');
  const visitante = aposta.visitante?.nome || aposta.visitante || t('games.awayTeam');
  return `
    <article class="match-card" data-partida-id="${escapeHtml(aposta.partidaId)}">
      <div>
        <div class="team-line">
          ${renderTeamName(aposta.mandante || { nome: mandante }, mandante)}
          <div class="bet-inputs">
            <input type="number" min="0" inputmode="numeric" value="${escapeHtml(left)}" data-bet-side="mandante" ${canEdit ? '' : 'disabled'}>
            <span class="score">${escapeHtml(t('common.scoreSeparator'))}</span>
            <input type="number" min="0" inputmode="numeric" value="${escapeHtml(right)}" data-bet-side="visitante" ${canEdit ? '' : 'disabled'}>
          </div>
          ${renderTeamName(aposta.visitante || { nome: visitante }, visitante)}
        </div>
        <p class="muted">${escapeHtml(aposta.fase || '')} · ${dateTime(aposta.dataHora)} · ${escapeHtml(aposta.estadio || '')}</p>
      </div>
      <span class="pill" data-save-status>${escapeHtml(status)}</span>
    </article>
  `;
}

async function renderRanking() {
  const ranking = await api(`/ranking/boloes/${state.activeBolaoId}/atual`);
  const leaderPoints = ranking.length ? Number(ranking[0].pontosAtuais ?? ranking[0].pontos_atuais ?? 0) : 0;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('ranking.full'))}</h2></div>
      ${ranking.length ? renderRankingHeader() : ''}
      <div class="list ranking-list">${ranking.map((item) => renderRankingRow(item, { leaderPoints })).join('') || empty(t('ranking.empty'))}</div>
    </section>
  `;
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

function usuarioRow(row, boloes) {
  const poolMap = new Map((boloes || []).map((bolao) => [String(bolao.id), bolao.nome]));
  const linkedPools = (row.bolaoIds || [])
    .map((id) => poolMap.get(String(id)))
    .filter(Boolean);
  const isAdmin = row.perfil === 'administrador';
  return `
    <article class="row-card user-row">
      <div class="user-row__main">
        <strong>${escapeHtml(row.nome)}</strong>
        <p class="muted">${escapeHtml(row.email || '')}</p>
        <div class="pill-list">
          <span class="pill">${escapeHtml(badgeLabel(row.perfil || row.status))}</span>
          <span class="pill">${escapeHtml(statusLabel(row.ativo !== false ? 'ativo' : 'inativo'))}</span>
          ${isAdmin
            ? (linkedPools.length
              ? linkedPools.map((nome) => `<span class="pill admin-pool-pill">${escapeHtml(nome)}</span>`).join('')
              : `<span class="pill admin-pool-pill admin-pool-pill--empty">${escapeHtml(t('owner.noLinkedPools'))}</span>`)
            : ''}
        </div>
      </div>
      <div class="actions">
        <button class="secondary" type="button" data-edit-kind="usuarios" data-id="${escapeHtml(row.id)}">${escapeHtml(t('common.edit'))}</button>
      </div>
    </article>
  `;
}

function renderUsuarioEditorModal(row, boloes) {
  if (!row) return '';
  const isAdmin = row.perfil === 'administrador';
  return `
    <div class="modal-backdrop" data-close-user-editor>
      <section class="modal-card user-editor-modal" role="dialog" aria-modal="true" aria-labelledby="userEditorTitle" data-modal-card>
        <div class="card-title">
          <div>
            <h2 id="userEditorTitle">${escapeHtml(t('owner.editUser'))}</h2>
            <p class="muted">${escapeHtml(row.email || '')}</p>
          </div>
          ${iconOnlyButton('x', t('common.close'), 'data-close-user-editor')}
        </div>
        <form class="form-card" data-crud-form="usuarios">
          <input name="id" type="hidden" value="${escapeHtml(row.id)}">
          <label>${escapeHtml(t('owner.name'))} <input name="nome" required value="${escapeHtml(row.nome || '')}"></label>
          <label>${escapeHtml(t('auth.email'))} <input name="email" type="email" required value="${escapeHtml(row.email || '')}"></label>
          <label>${escapeHtml(t('owner.newPassword'))} <input name="senha" type="password" autocomplete="new-password" placeholder="${escapeHtml(t('owner.passwordPlaceholder'))}"></label>
          <label>${escapeHtml(t('owner.confirmNewPassword'))} <input name="confirmarSenha" type="password" autocomplete="new-password" placeholder="${escapeHtml(t('owner.passwordPlaceholder'))}"></label>
          <label>${escapeHtml(t('owner.profile'))}
            <select name="perfil">
              <option value="administrador" ${row.perfil === 'administrador' ? 'selected' : ''}>${escapeHtml(t('roles.administrador'))}</option>
              <option value="proprietario" ${row.perfil === 'proprietario' ? 'selected' : ''}>${escapeHtml(t('roles.proprietario'))}</option>
            </select>
          </label>
          <label>${escapeHtml(t('owner.status'))}
            <select name="status">
              <option value="ativo" ${row.ativo !== false ? 'selected' : ''}>${escapeHtml(statusLabel('ativo'))}</option>
              <option value="inativo" ${row.ativo === false ? 'selected' : ''}>${escapeHtml(statusLabel('inativo'))}</option>
            </select>
          </label>
          <fieldset class="link-fieldset" data-admin-links-section ${isAdmin ? '' : 'hidden'}>
            <legend>${escapeHtml(t('owner.linkedPools'))}</legend>
            <p class="muted">${escapeHtml(t('owner.linkedPoolsHelp'))}</p>
            ${renderCheckboxGroup('bolaoIds', boloes || [], row.bolaoIds || [], t('owner.noPools'))}
          </fieldset>
          <div class="form-actions">
            ${submitIconButton('save', t('owner.saveUser'))}
            <button class="ghost" type="button" data-close-user-editor>${escapeHtml(t('common.cancel'))}</button>
          </div>
          ${scopedMessage('usuarios')}
        </form>
      </section>
    </div>
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
          <div class="form-actions">${submitIconButton('save', t('profile.saveData'))}</div>
          ${scopedMessage('meuPerfil')}
        </form>
      </article>
      <article class="card">
        <div class="card-title"><h2>${escapeHtml(t('profile.changePassword'))}</h2></div>
        <form class="form-grid" data-crud-form="minhaSenha">
          <label>${escapeHtml(t('profile.currentPassword'))} <input name="senhaAtual" type="password" required></label>
          <label>${escapeHtml(t('profile.newPassword'))} <input name="novaSenha" type="password" required></label>
          <label>${escapeHtml(t('profile.confirmPassword'))} <input name="confirmarNovaSenha" type="password" required></label>
          <div class="form-actions">${submitIconButton('save', t('profile.updatePassword'))}</div>
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
          ${submitIconButton('save', t('owner.savePool'))}
          ${iconOnlyButton('plus', t('common.new'), 'data-reset-form="boloes"')}
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('boloes', row, row.nome, row.descricao, row.status)).join('') || empty(t('owner.noPools'))}</div></section>
  `;
}

async function renderUsuariosOwner() {
  const [rows, boloes] = await Promise.all([
    api('/proprietario/usuarios'),
    api('/proprietario/boloes')
  ]);
  state.data.usuarios = rows;
  state.data.boloes = boloes;
  const activeBoloes = selectableBoloes(boloes);
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('owner.users'))}</h2><span class="pill">${escapeHtml(t('common.owner'))}</span></div>
      <form class="form-card" data-crud-form="usuarios">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('owner.name'))} <input name="nome" required></label>
        <label>${escapeHtml(t('auth.email'))} <input name="email" type="email" required></label>
        <label>${escapeHtml(t('admin.initialPassword'))} <input name="senha" type="password" autocomplete="new-password" placeholder="${escapeHtml(t('owner.passwordPlaceholder'))}"></label>
        <label>${escapeHtml(t('admin.confirmInitialPassword'))} <input name="confirmarSenha" type="password" autocomplete="new-password" placeholder="${escapeHtml(t('owner.passwordPlaceholder'))}"></label>
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
          ${submitIconButton('save', t('owner.saveUser'))}
          ${iconOnlyButton('plus', t('common.new'), 'data-reset-form="usuarios"')}
        </div>
        ${scopedMessage('usuarios')}
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => usuarioRow(row, activeBoloes)).join('') || empty(t('owner.noUsers'))}</div></section>
    ${renderUsuarioEditorModal(findById(rows, state.userEditorId), activeBoloes)}
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
        <label>${escapeHtml(t('admin.initialPassword'))} <input name="senhaInicial" type="password" autocomplete="new-password" placeholder="${escapeHtml(t('admin.requiredForNewCredential'))}"></label>
        <label>${escapeHtml(t('admin.confirmInitialPassword'))} <input name="confirmarSenhaInicial" type="password" autocomplete="new-password"></label>
        <label>${escapeHtml(t('owner.status'))}
          <select name="status">
            <option value="ativo">${escapeHtml(statusLabel('ativo'))}</option>
            <option value="convidado">${escapeHtml(statusLabel('convidado'))}</option>
            <option value="bloqueado">${escapeHtml(statusLabel('bloqueado'))}</option>
            <option value="removido">${escapeHtml(statusLabel('removido'))}</option>
          </select>
        </label>
        <div class="form-actions">
          ${submitIconButton('save', t('admin.saveParticipant'))}
          ${iconOnlyButton('plus', t('common.new'), 'data-reset-form="participantes"')}
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
          ${submitIconButton('save', t('admin.savePayment'))}
          ${iconOnlyButton('plus', t('common.new'), 'data-reset-form="pagamentos"')}
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
          ${submitIconButton('save', t('admin.savePhase'))}
          ${iconOnlyButton('plus', t('common.newFemale'), 'data-reset-form="fases"')}
        </div>
      </form>
    </section>
    <section class="card"><div class="list">${rows.map((row) => editableRow('fases', row, row.nome, `${t('admin.orderValue', { order: row.ordem })} · ${statusLabel(row.tipo)}`, row.status)).join('') || empty(t('admin.noPhases'))}</div></section>
  `;
}

async function renderTimesAdmin() {
  const rows = await api(`/times/boloes/${state.activeBolaoId}`);
  state.data.times = rows;
  const teamSummary = (row) => [row.sigla || row.codigoFifa || '', row.pais || ''].filter(Boolean).join(' · ');
  const teamRow = (row) => `
    <article class="row-card">
      <div>
        <strong>${renderTeamName(row, row.nome, 'sm')}</strong>
        <p class="muted">${escapeHtml(teamSummary(row))}</p>
      </div>
      <div class="actions">
        <span class="pill">${escapeHtml(badgeLabel(row.status))}</span>
        <button class="secondary" type="button" data-edit-kind="times" data-id="${escapeHtml(row.id)}">${escapeHtml(t('common.edit'))}</button>
      </div>
    </article>
  `;
  content.innerHTML = `
    <section class="card">
      <div class="card-title"><h2>${escapeHtml(t('admin.teams'))}</h2><span class="pill">${escapeHtml(t('common.administration'))}</span></div>
      <form class="form-card" data-crud-form="times">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('owner.name'))} <input name="nome" required></label>
        <label>${escapeHtml(t('admin.abbreviation'))} <input name="sigla"></label>
        <label>${escapeHtml(t('admin.fifaCode'))} <input name="codigoFifa"></label>
        <label>${escapeHtml(t('admin.badgeUrl'))} <input name="escudoUrl" type="text" inputmode="url" data-team-shield-url></label>
        <label class="upload-card" title="${escapeHtml(t('admin.shieldUpload'))}">
          <span class="upload-card__icon">${ICONS.upload}</span>
          <span class="team-avatar team-avatar--preview" data-team-shield-preview><span class="team-avatar__fallback">PD</span></span>
          <input name="escudoUpload" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-team-shield-upload>
          <button class="ghost upload-remove" type="button" data-team-shield-remove aria-label="${escapeHtml(t('admin.removeShieldUpload'))}" title="${escapeHtml(t('admin.removeShieldUpload'))}">×</button>
        </label>
        <label class="flag-field">${escapeHtml(t('admin.flagUrl'))} <input name="bandeiraUrl" type="url"></label>
        <label>${escapeHtml(t('admin.country'))} <input name="pais"></label>
        <label>${escapeHtml(t('owner.status'))}
          <select name="status">
            <option value="ativo">${escapeHtml(statusLabel('ativo'))}</option>
            <option value="inativo">${escapeHtml(statusLabel('inativo'))}</option>
          </select>
        </label>
        <div class="form-actions">
          ${submitIconButton('save', t('admin.saveTeam'))}
          ${iconOnlyButton('plus', t('common.new'), 'data-reset-form="times"')}
        </div>
        ${scopedMessage('times')}
      </form>
    </section>
    <section class="card"><div class="list">${rows.map(teamRow).join('') || empty(t('admin.noTeams'))}</div></section>
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
  const partidaRow = (row) => {
    const mandante = findById(times, row.timeMandanteId) || { nome: row.timeMandanteId };
    const visitante = findById(times, row.timeVisitanteId) || { nome: row.timeVisitanteId };
    const score = row.placarMandante !== null && row.placarMandante !== undefined && row.placarVisitante !== null && row.placarVisitante !== undefined
      ? `${row.placarMandante} ${t('common.scoreSeparator')} ${row.placarVisitante}`
      : t('common.scoreSeparator');
    const fase = findById(fases, row.faseId)?.nome || t('games.noPhase');
    return `
      <article class="row-card">
        <div>
          <strong class="match-inline">${renderTeamName(mandante, mandante.nome, 'sm')}<span class="score score--inline">${escapeHtml(score)}</span>${renderTeamName(visitante, visitante.nome, 'sm')}</strong>
          <p class="muted">${escapeHtml(`${fase} - ${dateTime(row.dataHora)} - ${row.estadio || t('games.noStadium')}`)}</p>
        </div>
        <div class="actions">
          <span class="pill">${escapeHtml(badgeLabel(row.status))}</span>
          <button class="secondary" type="button" data-edit-kind="partidas" data-id="${escapeHtml(row.id)}">${escapeHtml(t('common.edit'))}</button>
        </div>
      </article>
    `;
  };
  content.innerHTML = `
    <section class="card">
      <div class="card-title">
        <h2>${escapeHtml(t('admin.matches'))}</h2>
        <div class="actions">
          <span class="pill">${escapeHtml(t('common.administration'))}</span>
          <button class="secondary" type="button" data-toggle-external-import>${escapeHtml(t('externalMatches.searchImportButton'))}</button>
        </div>
      </div>
      <form class="form-card" data-crud-form="partidas">
        <input name="id" type="hidden">
        <label>${escapeHtml(t('admin.phase'))} <select name="faseId"><option value="">${escapeHtml(t('games.noPhase'))}</option>${optionList(fases)}</select></label>
        <label>${escapeHtml(t('admin.home'))} <select name="timeMandanteId" required><option value="">${escapeHtml(t('common.select'))}</option>${optionList(times)}</select></label>
        <label>${escapeHtml(t('admin.away'))} <select name="timeVisitanteId" required><option value="">${escapeHtml(t('common.select'))}</option>${optionList(times)}</select></label>
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
          ${submitIconButton('save', t('admin.saveMatch'))}
          ${iconOnlyButton('plus', t('common.newFemale'), 'data-reset-form="partidas"')}
        </div>
      </form>
    </section>
    ${state.externalMatchImport.open ? renderExternalImportPanel(rows) : ''}
    <section class="card"><div class="list">${rows.map(partidaRow).join('') || empty(t('admin.noMatches'))}</div></section>
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
        <div class="form-actions">${submitIconButton('save', t('rules.saveConfig'))}</div>
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
          <div class="form-actions">${submitIconButton('save', t('rules.saveRule'))}${iconOnlyButton('plus', t('common.newFemale'), 'data-reset-form="regrasPontuacao"')}</div>
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
          <div class="form-actions">${submitIconButton('save', t('rules.saveTiebreaker'))}${iconOnlyButton('plus', t('common.new'), 'data-reset-form="criteriosDesempate"')}</div>
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
          <div class="form-actions">${submitIconButton('save', t('rules.savePrize'))}${iconOnlyButton('plus', t('common.new'), 'data-reset-form="distribuicaoPremios"')}</div>
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
  const [config, provedores, emailConfig] = await Promise.all([
    isOwner() ? api('/proprietario/configuracoes-gerais').catch(() => ({})) : Promise.resolve(null),
    api('/provedores-esportivos').catch(() => []),
    isOwner() ? api('/email/configuracao').catch(() => ({ configured: false })) : Promise.resolve(null)
  ]);
  const footballData = provedores.find((item) => item.provider === 'football-data') || provedores[0] || {};
  content.innerHTML = `
    ${isOwner() ? `<section class="card">
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
        <div class="form-actions">${submitIconButton('save', t('owner.saveSettings'))}</div>
      </form>
    </section>` : ''}
    ${isOwner() ? renderEmailConfigSection(emailConfig || {}) : ''}
    <section class="card">
      <div class="card-title">
        <h2>${escapeHtml(t('sportsProviders.title'))}</h2>
        <span class="pill">${escapeHtml(footballData.enabled ? statusLabel('ativo') : statusLabel('inativo'))}</span>
      </div>
      ${footballData.provider ? renderSportsProviderForm(footballData) : empty(t('sportsProviders.empty'))}
    </section>
  `;
}

function renderEmailConfigSection(config) {
  const statusKey = config.configured ? (config.smtpEnabled ? 'email.statusEnabled' : 'email.statusConfigured') : 'email.statusNotConfigured';
  const passwordMask = config.smtpPasswordMasked || '';
  return `
    <section class="card">
      <div class="card-title">
        <h2>${escapeHtml(t('email.title'))}</h2>
        <span class="pill">${escapeHtml(t(statusKey))}</span>
      </div>
      <form class="form-card email-config-form" data-crud-form="emailConfiguracao">
        <label>${escapeHtml(t('email.provider'))}
          <input name="providerName" value="${escapeHtml(config.providerName || 'HostGator')}">
        </label>
        <label>${escapeHtml(t('email.smtpHost'))}
          <input name="smtpHost" required value="${escapeHtml(config.smtpHost || '')}" placeholder="smtp.seudominio.com.br">
        </label>
        <label>${escapeHtml(t('email.smtpPort'))}
          <input name="smtpPort" type="number" min="1" max="65535" required value="${escapeHtml(config.smtpPort || 587)}">
        </label>
        <label>${escapeHtml(t('email.smtpSecure'))}
          <select name="smtpSecure">
            <option value="true" ${config.smtpSecure === true ? 'selected' : ''}>SSL/TLS</option>
            <option value="false" ${config.smtpSecure !== true ? 'selected' : ''}>STARTTLS</option>
          </select>
        </label>
        <label>${escapeHtml(t('email.smtpUser'))}
          <input name="smtpUser" required value="${escapeHtml(config.smtpUser || '')}">
        </label>
        <label>${escapeHtml(t('email.smtpPassword'))}
          <input name="smtpPassword" type="password" autocomplete="new-password" value="${escapeHtml(passwordMask)}" data-password-mask="${escapeHtml(passwordMask)}" placeholder="${escapeHtml(t('email.passwordPlaceholder'))}">
        </label>
        <label>${escapeHtml(t('email.fromName'))}
          <input name="smtpFromName" required value="${escapeHtml(config.smtpFromName || 'Placar.digital')}">
        </label>
        <label>${escapeHtml(t('email.fromEmail'))}
          <input name="smtpFromEmail" type="email" required value="${escapeHtml(config.smtpFromEmail || '')}">
        </label>
        <label>${escapeHtml(t('email.replyTo'))}
          <input name="smtpReplyTo" type="email" value="${escapeHtml(config.smtpReplyTo || '')}">
        </label>
        <label>${escapeHtml(t('email.enabled'))}
          <select name="smtpEnabled">
            <option value="true" ${config.smtpEnabled !== false ? 'selected' : ''}>${escapeHtml(t('common.yes'))}</option>
            <option value="false" ${config.smtpEnabled === false ? 'selected' : ''}>${escapeHtml(t('common.no'))}</option>
          </select>
        </label>
        <div class="email-status-line">
          <span>${escapeHtml(config.updatedAt ? t('email.lastUpdate', { date: dateTime(config.updatedAt) }) : t('email.noPreviousConfig'))}</span>
        </div>
        <div class="form-actions">${submitIconButton('save', t('email.save'))}</div>
        ${scopedMessage('emailConfiguracao')}
      </form>
      <form class="form-card email-test-form" data-crud-form="emailTeste">
        <div class="card-title card-title--compact"><h3>${escapeHtml(t('email.testTitle'))}</h3></div>
        <label>${escapeHtml(t('email.testTo'))}
          <input name="destino" type="email" required placeholder="destino@dominio.com">
        </label>
        <div class="form-actions">${submitIconButton('save', t('email.sendTest'))}</div>
        ${scopedMessage('emailTeste')}
      </form>
    </section>
  `;
}

function renderSportsProviderForm(provider) {
  const tokenState = state.providerTokens[provider.provider] || {};
  const tokenVisible = Boolean(tokenState.visible && tokenState.token);
  const tokenFieldValue = tokenVisible ? tokenState.token : (provider.apiTokenMasked || '');
  return `
    <form class="form-card sports-provider-form" data-crud-form="provedorEsportivo">
      <input name="provider" type="hidden" value="${escapeHtml(provider.provider)}">
      <label>${escapeHtml(t('sportsProviders.baseUrl'))}
        <input name="baseUrl" type="url" required value="${escapeHtml(provider.baseUrl || '')}">
      </label>
      <label>${escapeHtml(t('sportsProviders.syncInterval'))}
        <input name="syncIntervalSeconds" type="number" min="60" step="1" required value="${escapeHtml(provider.syncIntervalSeconds || 300)}">
      </label>
      <label class="token-field">${escapeHtml(t('sportsProviders.newToken'))}
        <span class="token-control-row">
          <span class="token-input-group">
            <input name="apiToken" type="${tokenVisible ? 'text' : 'password'}" autocomplete="new-password" value="${escapeHtml(tokenFieldValue)}" data-token-mask="${escapeHtml(provider.apiTokenMasked || '')}" placeholder="${escapeHtml(t('sportsProviders.tokenPlaceholder'))}">
          </span>
          ${iconOnlyButton('eye', tokenVisible ? t('sportsProviders.hideToken') : t('sportsProviders.showToken'), `data-provider-token-toggle="${escapeHtml(provider.provider)}"`)}
          ${iconOnlyButton('copy', t('sportsProviders.copyToken'), `data-provider-token-copy="${escapeHtml(provider.provider)}" ${provider.apiTokenConfigured || tokenState.token ? '' : 'disabled'}`)}
        </span>
      </label>
      <div class="provider-meta">
        <span>${escapeHtml(t('sportsProviders.lastSync', { date: provider.lastSyncAt ? dateTime(provider.lastSyncAt) : t('sportsProviders.neverSynced') }))}</span>
        <span>${escapeHtml(t('sportsProviders.providerStatus', { status: provider.enabled ? t('sportsProviders.active') : t('sportsProviders.inactive') }))}</span>
      </div>
      <div class="form-actions">
        ${submitIconButton('save', t('sportsProviders.save'))}
        ${iconOnlyButton('plugOff', provider.enabled ? t('sportsProviders.disable') : t('sportsProviders.enable'), `data-provider-toggle="${escapeHtml(provider.provider)}" data-enabled="${provider.enabled ? 'false' : 'true'}"`)}
      </div>
      ${scopedMessage('provedorEsportivo')}
    </form>
  `;
}

function renderLocalMatchLinkRow(row, times) {
  const mandante = findById(times, row.timeMandanteId) || { nome: row.timeMandanteId };
  const visitante = findById(times, row.timeVisitanteId) || { nome: row.timeVisitanteId };
  const selected = state.externalMatchLink.localId === row.id;
  const linked = Boolean(row.footballDataMatchId);
  const score = row.placarMandante !== null && row.placarMandante !== undefined && row.placarVisitante !== null && row.placarVisitante !== undefined
    ? `${row.placarMandante} ${t('common.scoreSeparator')} ${row.placarVisitante}`
    : t('common.scoreSeparator');
  return `
    <button class="external-link-card ${selected ? 'selected' : ''} ${linked ? 'linked' : ''}" type="button" data-select-local-match="${escapeHtml(row.id)}">
      <span class="match-inline">${renderTeamName(mandante, mandante.nome, 'sm')}<span class="score score--inline">${escapeHtml(score)}</span>${renderTeamName(visitante, visitante.nome, 'sm')}</span>
      <span class="muted">${escapeHtml(`${dateTime(row.dataHora)} - ${row.estadio || t('games.noStadium')}`)}</span>
      <span class="external-link-card__meta">
        <span class="pill">${escapeHtml(statusLabel(row.status))}</span>
        <span class="pill">${escapeHtml(row.footballDataMatchId ? t('externalMatches.linkedId', { id: row.footballDataMatchId }) : t('externalMatches.notLinked'))}</span>
      </span>
    </button>
  `;
}

function renderExternalMatchRow(row, usedExternalIds) {
  const selected = String(state.externalMatchLink.externalId || '') === String(row.externalMatchId || '');
  const duplicate = usedExternalIds.has(String(row.externalMatchId));
  const score = row.placar?.fullTime?.home !== null && row.placar?.fullTime?.home !== undefined && row.placar?.fullTime?.away !== null && row.placar?.fullTime?.away !== undefined
    ? `${row.placar.fullTime.home} ${t('common.scoreSeparator')} ${row.placar.fullTime.away}`
    : t('common.scoreSeparator');
  const competition = row.competition?.name || row.competition?.code || t('externalMatches.noCompetition');
  return `
    <button class="external-link-card ${selected ? 'selected' : ''} ${duplicate ? 'linked' : ''}" type="button" data-select-external-match="${escapeHtml(row.externalMatchId)}" ${duplicate ? 'disabled' : ''}>
      <span class="match-inline">${renderTeamName(row.mandante, row.mandante?.name, 'sm')}<span class="score score--inline">${escapeHtml(score)}</span>${renderTeamName(row.visitante, row.visitante?.name, 'sm')}</span>
      <span class="muted">${escapeHtml(`${competition} - ${dateTime(row.utcDate)} - ${statusLabel(row.status)}`)}</span>
      <span class="external-link-card__meta">
        <span class="pill">${escapeHtml(t('externalMatches.externalId', { id: row.externalMatchId }))}</span>
        ${duplicate ? `<span class="pill">${escapeHtml(t('externalMatches.alreadyLinked'))}</span>` : ''}
      </span>
    </button>
  `;
}

function renderExternalMatchLinking(partidas, times) {
  const filters = state.externalMatchLink.filters || {};
  const externalMatches = state.externalMatchLink.externalMatches || [];
  const usedExternalIds = new Set(partidas.map((partida) => String(partida.footballDataMatchId || '')).filter(Boolean));
  return `
    <form class="form-card" data-external-match-search>
      <label>${escapeHtml(t('externalMatches.dateFrom'))}<input name="dateFrom" type="date" value="${escapeHtml(filters.dateFrom || '')}"></label>
      <label>${escapeHtml(t('externalMatches.dateTo'))}<input name="dateTo" type="date" value="${escapeHtml(filters.dateTo || '')}"></label>
      <label>${escapeHtml(t('externalMatches.competition'))}
        <select name="competition">${staticOptionList(FOOTBALL_COMPETITIONS, filters.competition || '')}</select>
      </label>
      <label>${escapeHtml(t('externalMatches.status'))}
        <select name="status">
          <option value="">${escapeHtml(t('common.select'))}</option>
          ${['SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED', 'POSTPONED', 'SUSPENDED', 'CANCELLED', 'AWARDED'].map((status) => `<option value="${status}" ${filters.status === status ? 'selected' : ''}>${escapeHtml(statusLabel(status))}</option>`).join('')}
        </select>
      </label>
      <div class="form-actions"><button type="submit">${escapeHtml(t('externalMatches.search'))}</button></div>
      ${scopedMessage('externalMatchLink')}
    </form>
    <div class="external-linking-grid">
      <article>
        <h3>${escapeHtml(t('externalMatches.localMatches'))}</h3>
        <div class="list">${partidas.map((row) => renderLocalMatchLinkRow(row, times)).join('') || empty(t('admin.noMatches'))}</div>
      </article>
      <article>
        <h3>${escapeHtml(t('externalMatches.externalMatches'))}</h3>
        <div class="list">${externalMatches.map((row) => renderExternalMatchRow(row, usedExternalIds)).join('') || empty(t('externalMatches.noExternalResults'))}</div>
      </article>
    </div>
    <div class="form-actions external-linking-actions">
      <button type="button" data-link-external-match ${state.externalMatchLink.localId && state.externalMatchLink.externalId ? '' : 'disabled'}>${escapeHtml(t('externalMatches.link'))}</button>
      <button class="secondary" type="button" data-unlink-external-match ${state.externalMatchLink.localId && findById(partidas, state.externalMatchLink.localId)?.footballDataMatchId ? '' : 'disabled'}>${escapeHtml(t('externalMatches.unlink'))}</button>
    </div>
  `;
}

function localMatchName(partida) {
  const times = state.data.times || [];
  const mandante = findById(times, partida?.timeMandanteId)?.nome || t('games.homeTeam');
  const visitante = findById(times, partida?.timeVisitanteId)?.nome || t('games.awayTeam');
  return `${mandante} ${t('common.scoreSeparator')} ${visitante}`;
}

function externalMatchName(partida) {
  if (!partida) return '';
  return `${partida.mandante?.name || t('games.homeTeam')} ${t('common.scoreSeparator')} ${partida.visitante?.name || t('games.awayTeam')}`;
}

async function searchExternalMatches(form) {
  clearFormMessage('externalMatchLink');
  const data = formPayload(form);
  validateExternalMatchFilters(data);
  state.externalMatchLink.filters = data;
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const result = await api(`/provedores-esportivos/football-data/partidas${params.toString() ? `?${params}` : ''}`);
  state.externalMatchLink.externalMatches = result.partidas || [];
  state.formMessages.externalMatchLink = { text: t('externalMatches.searchLoaded', { count: state.externalMatchLink.externalMatches.length }), tone: 'success' };
  await navigate('configuracoes');
}

async function searchExternalMatchesForImport(form) {
  clearFormMessage('externalMatchImport');
  const data = formPayload(form);
  validateExternalMatchFilters(data);
  state.externalMatchImport.filters = data;
  state.externalMatchImport.selectedIds = [];
  state.externalMatchImport.summary = null;
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const result = await api(`/provedores-esportivos/football-data/partidas${params.toString() ? `?${params}` : ''}`);
  state.externalMatchImport.matches = result.partidas || [];
  state.formMessages.externalMatchImport = {
    text: t('externalMatches.searchLoaded', { count: state.externalMatchImport.matches.length }),
    tone: 'success'
  };
  await navigate('partidas');
}

async function importSelectedExternalMatches() {
  const selectedIds = new Set((state.externalMatchImport.selectedIds || []).map(String));
  const matches = (state.externalMatchImport.matches || []).filter((row) => selectedIds.has(String(row.externalMatchId || row.id || '')));
  if (!matches.length) {
    setFormMessage('externalMatchImport', t('externalMatches.selectAtLeastOne'), 'error');
    return;
  }
  const result = await api('/partidas/importar-externas', {
    method: 'POST',
    body: JSON.stringify({
      bolaoId: state.activeBolaoId,
      provider: 'football-data',
      matches
    })
  });
  state.externalMatchImport.selectedIds = [];
  state.externalMatchImport.summary = result;
  state.formMessages.externalMatchImport = {
    text: t('externalMatches.imported'),
    tone: 'success'
  };
  await navigate('partidas');
}

async function linkSelectedExternalMatch() {
  const local = findById(state.data.partidas || [], state.externalMatchLink.localId);
  const external = (state.externalMatchLink.externalMatches || []).find((row) => String(row.externalMatchId || '') === String(state.externalMatchLink.externalId || ''));
  if (!local || !external) {
    setFormMessage('externalMatchLink', t('externalMatches.selectBoth'), 'error');
    return;
  }
  const used = (state.data.partidas || []).find((partida) => String(partida.footballDataMatchId || '') === String(external.externalMatchId) && partida.id !== local.id);
  if (used) {
    setFormMessage('externalMatchLink', t('externalMatches.duplicateBlocked'), 'error');
    return;
  }
  if (!window.confirm(t('externalMatches.confirmLink', { local: localMatchName(local), external: externalMatchName(external) }))) return;
  const externalMatchId = Number.isNaN(Number(external.externalMatchId)) ? external.externalMatchId : Number(external.externalMatchId);
  await api(`/partidas/${local.id}/vinculo-externo`, {
    method: 'PATCH',
    body: JSON.stringify({ provider: 'football-data', externalMatchId })
  });
  state.externalMatchLink.localId = local.id;
  state.externalMatchLink.externalId = '';
  state.formMessages.externalMatchLink = { text: t('externalMatches.linked'), tone: 'success' };
  await navigate('configuracoes');
}

async function unlinkSelectedExternalMatch() {
  const local = findById(state.data.partidas || [], state.externalMatchLink.localId);
  if (!local || !local.footballDataMatchId) {
    setFormMessage('externalMatchLink', t('externalMatches.selectLinkedLocal'), 'error');
    return;
  }
  if (!window.confirm(t('externalMatches.confirmUnlink', { local: localMatchName(local) }))) return;
  await api(`/partidas/${local.id}/vinculo-externo`, { method: 'DELETE' });
  state.externalMatchLink.externalId = '';
  state.formMessages.externalMatchLink = { text: t('externalMatches.unlinked'), tone: 'success' };
  await navigate('configuracoes');
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
  state.mobileMoreOpen = false;
  if (state.route !== 'usuarios') state.userEditorId = '';
  renderChrome();
  content.innerHTML = loadingMarkup();
  try {
    await renderers[state.route]();
    renderChrome();
  } catch (error) {
    content.innerHTML = `<section class="card">${empty(error.message)}</section>`;
  }
}

function loadingMarkup() {
  return `
    <section class="card app-loading" aria-live="polite" aria-label="${escapeHtml(t('common.loading'))}">
      <img src="/app/logo-placar-digital.jpeg" alt="Placar.digital">
      <strong>Placar.digital</strong>
      <span class="loading-spinner" aria-hidden="true"></span>
      <div class="loading-skeleton" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </section>
  `;
}

async function switchBolao(bolaoId) {
  const previous = {
    token: state.token,
    user: { ...state.user },
    boloes: [...state.boloes],
    activeBolaoId: state.activeBolaoId,
    activeBolaoNome: state.activeBolaoNome
  };
  const target = selectableBoloes(state.boloes).find((bolao) => String(bolao.id) === String(bolaoId));
  if (!target) {
    showMessage(t('messages.noActivePool'), 'warning');
    syncActiveBolaoWithAvailable();
    await navigate(state.route);
    return;
  }
  try {
    const result = await api('/auth/trocar-bolao', {
      method: 'POST',
      body: JSON.stringify({ bolaoId })
    });
    saveAuth(result, { keepBoloesWhenEmpty: true });
    const active = selectableBoloes(state.boloes).find((bolao) => String(bolao.id) === String(state.activeBolaoId));
    state.activeBolaoNome = active?.nome || result.selectedBolao?.nome || '';
    persistBolaoContext();
    await navigate(state.route);
  } catch (error) {
    state.token = previous.token;
    state.user = previous.user;
    state.boloes = previous.boloes;
    state.activeBolaoId = previous.activeBolaoId;
    state.activeBolaoNome = previous.activeBolaoNome;
    persistBolaoContext();
    renderChrome();
    throw error;
  }
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

  if (kind === 'provedorEsportivo') {
    clearFormMessage(kind);
    const provider = data.provider;
    const tokenMask = form.elements.apiToken?.dataset.tokenMask || '';
    delete data.provider;
    if (data.syncIntervalSeconds !== undefined) {
      data.syncIntervalSeconds = Math.max(60, Number(data.syncIntervalSeconds || 60));
    }
    if (!data.apiToken || data.apiToken === tokenMask) delete data.apiToken;
    await api(`/provedores-esportivos/${provider}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    delete state.providerTokens[provider];
    state.formMessages.provedorEsportivo = { text: t('sportsProviders.saved'), tone: 'success' };
    await navigate(state.route);
    return;
  }

  if (kind === 'emailConfiguracao') {
    clearFormMessage(kind);
    const passwordMask = form.elements.smtpPassword?.dataset.passwordMask || '';
    if (!data.smtpPassword || data.smtpPassword === passwordMask) delete data.smtpPassword;
    data.smtpPort = Number(data.smtpPort || 0);
    data.smtpSecure = data.smtpSecure === 'true';
    data.smtpEnabled = data.smtpEnabled === 'true';
    await api('/email/configuracao', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    state.formMessages.emailConfiguracao = { text: t('email.saved'), tone: 'success' };
    await navigate(state.route);
    return;
  }

  if (kind === 'emailTeste') {
    clearFormMessage(kind);
    await api('/email/teste', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    state.formMessages.emailTeste = { text: t('email.testSent'), tone: 'success' };
    await navigate(state.route);
    return;
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
    if (isApostador()) {
      ensureRequiredPassword(data.novaSenha, 'security.bettorPasswordRequired');
    } else {
      ensureSystemPassword(data.novaSenha);
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

  if (kind === 'usuarios') {
    clearFormMessage(kind, form);
    if (!id) {
      ensureRequiredPassword(data.senha, 'security.systemPasswordRequired');
      ensureSystemPassword(data.senha);
    } else if (data.senha) {
      ensureSystemPassword(data.senha);
    }
    if ((data.senha || data.confirmarSenha) && (data.senha || '') !== (data.confirmarSenha || '')) {
      throw new Error(t('security.passwordConfirmationMismatch'));
    }
    delete data.confirmarSenha;
  }

  if (kind === 'participantes') {
    if (!id) {
      ensureRequiredPassword(data.senhaInicial, 'security.bettorPasswordRequired');
    }
    if ((data.senhaInicial || data.confirmarSenhaInicial) && (data.senhaInicial || '') !== (data.confirmarSenhaInicial || '')) {
      throw new Error(t('security.passwordConfirmationMismatch'));
    }
  }

  if (kind === 'times') {
    delete data.escudoUpload;
  }

  if (kind === 'usuarios') {
    data.bolaoIds = data.perfil === 'administrador' ? (data.bolaoIds || []) : [];
  }

  if (kind === 'partidas') {
    if (!data.timeMandanteId || !data.timeVisitanteId) {
      throw new Error(t('admin.matchTeamsRequired'));
    }
    if (data.timeMandanteId === data.timeVisitanteId) {
      throw new Error(t('admin.matchTeamsDifferent'));
    }
  }

  const saved = await api(id ? config.update(id) : config.create, {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data)
  });

  if (kind === 'boloes') {
    await loadBaseData();
    if (!id && saved?.id && isSelectableBolao(saved)) {
      await switchBolao(saved.id);
    } else {
      showMessage(id ? t('messages.recordUpdated') : t('messages.recordCreated'));
      await navigate(state.route);
    }
    return;
  }

  if (RULE_FORM_KINDS.has(kind)) {
    state.formMessages[kind] = {
      text: id ? t('messages.recordUpdatedSuccess') : t('messages.recordSavedSuccess'),
      tone: 'success'
    };
    await navigate(state.route);
    return;
  }

  if (kind === 'usuarios') {
    state.userEditorId = '';
    state.formMessages.usuarios = { text: id ? t('messages.recordUpdated') : t('messages.recordCreated'), tone: 'success' };
    await navigate(state.route);
    return;
  }

  showMessage(id ? t('messages.recordUpdated') : t('messages.recordCreated'));
  await navigate(state.route);
}

function editCrud(kind, id) {
  if (kind === 'usuarios') {
    state.userEditorId = id;
    clearFormMessage('usuarios');
    navigate('usuarios');
    return;
  }
  const row = (state.data[kind] || []).find((item) => item.id === id);
  const form = document.querySelector(`[data-crud-form="${kind}"]`);
  if (!row || !form) return;
  setFormValues(form, row);
  if (kind === 'times') updateTeamShieldPreview(form);
  if (kind === 'usuarios') syncAdminLinksVisibility(form);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleExternalImportSelection(id) {
  const selected = new Set((state.externalMatchImport.selectedIds || []).map(String));
  if (selected.has(id)) {
    selected.delete(id);
  } else {
    selected.add(id);
  }
  state.externalMatchImport.selectedIds = [...selected];
  clearFormMessage('externalMatchImport');
  navigate(state.route);
}

function toggleAllExternalImportSelection() {
  const importedIds = new Set((state.data.partidas || []).map((row) => String(row.footballDataMatchId || '')).filter(Boolean));
  const selectable = (state.externalMatchImport.matches || [])
    .map((row) => String(row.externalMatchId || row.id || ''))
    .filter((id) => id && !importedIds.has(id));
  const selected = new Set((state.externalMatchImport.selectedIds || []).map(String));
  const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));
  state.externalMatchImport.selectedIds = allSelected ? [] : selectable;
  clearFormMessage('externalMatchImport');
  navigate(state.route);
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

mobileBottomNav?.addEventListener('click', (event) => {
  const route = event.target.closest('[data-mobile-route]')?.dataset.mobileRoute;
  if (route) {
    navigate(route);
    return;
  }
  if (event.target.closest('[data-mobile-more]')) {
    state.mobileMoreOpen = true;
    renderChrome();
  }
});

mobileMoreDrawer?.addEventListener('click', (event) => {
  const route = event.target.closest('[data-mobile-route]')?.dataset.mobileRoute;
  if (route) {
    navigate(route);
    return;
  }
  if (event.target.closest('[data-mobile-more-close]')) {
    state.mobileMoreOpen = false;
    renderChrome();
  }
});

mobileMoreClose?.addEventListener('click', () => {
  state.mobileMoreOpen = false;
  renderChrome();
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

  const closeUserEditor = event.target.closest('[data-close-user-editor]');
  if (closeUserEditor && !event.target.closest('[data-modal-card]')) {
    state.userEditorId = '';
    clearFormMessage('usuarios');
    navigate('usuarios');
    return;
  }

  if (event.target.closest('button[data-close-user-editor]')) {
    state.userEditorId = '';
    clearFormMessage('usuarios');
    navigate('usuarios');
    return;
  }

  const providerToggle = event.target.closest('[data-provider-toggle]');
  if (providerToggle) {
    const provider = providerToggle.dataset.providerToggle;
    const enabled = providerToggle.dataset.enabled === 'true';
    api(`/provedores-esportivos/${provider}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled })
    })
      .then(() => {
        state.formMessages.provedorEsportivo = {
          text: enabled ? t('sportsProviders.enabled') : t('sportsProviders.disabled'),
          tone: 'success'
        };
        return navigate(state.route);
      })
      .catch((error) => setFormMessage('provedorEsportivo', error.message, 'error'));
    return;
  }

  const tokenToggle = event.target.closest('[data-provider-token-toggle]');
  if (tokenToggle) {
    const provider = tokenToggle.dataset.providerTokenToggle;
    const current = state.providerTokens[provider] || {};
    if (current.visible) {
      state.providerTokens[provider] = { ...current, visible: false };
      navigate(state.route);
      return;
    }
    api(`/provedores-esportivos/${provider}/token`)
      .then((result) => {
        state.providerTokens[provider] = { token: result.apiToken || '', visible: true };
        return navigate(state.route);
      })
      .catch((error) => setFormMessage('provedorEsportivo', error.message, 'error'));
    return;
  }

  const tokenCopy = event.target.closest('[data-provider-token-copy]');
  if (tokenCopy) {
    const provider = tokenCopy.dataset.providerTokenCopy;
    const copyToken = (token) => (navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(token)
      : Promise.reject(new Error('clipboard_unavailable')))
      .then(() => setFormMessage('provedorEsportivo', t('sportsProviders.tokenCopied'), 'success'))
      .catch(() => setFormMessage('provedorEsportivo', t('sportsProviders.copyTokenError'), 'error'));
    const token = state.providerTokens[provider]?.token || '';
    if (token) {
      copyToken(token);
      return;
    }
    api(`/provedores-esportivos/${provider}/token`)
      .then((result) => {
        state.providerTokens[provider] = { token: result.apiToken || '', visible: false };
        return copyToken(result.apiToken || '');
      })
      .catch((error) => setFormMessage('provedorEsportivo', error.message, 'error'));
    return;
  }

  const shieldRemove = event.target.closest('[data-team-shield-remove]');
  if (shieldRemove) {
    event.preventDefault();
    removeTeamShieldUpload(shieldRemove.closest('[data-crud-form="times"]'));
    return;
  }

  const externalImportToggle = event.target.closest('[data-toggle-external-import]');
  if (externalImportToggle) {
    state.externalMatchImport.open = !state.externalMatchImport.open;
    clearFormMessage('externalMatchImport');
    navigate(state.route);
    return;
  }

  const clearExternalImportFilters = event.target.closest('[data-clear-external-import-filters]');
  if (clearExternalImportFilters) {
    state.externalMatchImport.filters = {};
    state.externalMatchImport.matches = [];
    state.externalMatchImport.selectedIds = [];
    state.externalMatchImport.summary = null;
    clearFormMessage('externalMatchImport');
    navigate(state.route);
    return;
  }

  const importMatchToggle = event.target.closest('[data-toggle-import-match]');
  if (importMatchToggle && !importMatchToggle.disabled && importMatchToggle.getAttribute('aria-disabled') !== 'true') {
    if (event.target.matches('input[data-toggle-import-match]')) return;
    toggleExternalImportSelection(String(importMatchToggle.dataset.toggleImportMatch || ''));
    return;
  }

  const toggleAllImport = event.target.closest('[data-toggle-all-import-matches]');
  if (toggleAllImport) {
    if (event.target.matches('input[data-toggle-all-import-matches]')) return;
    toggleAllExternalImportSelection();
    return;
  }

  const importExternalButton = event.target.closest('[data-import-external-matches]');
  if (importExternalButton) {
    importSelectedExternalMatches().catch((error) => setFormMessage('externalMatchImport', error.message, 'error'));
    return;
  }

  const localMatchButton = event.target.closest('[data-select-local-match]');
  if (localMatchButton) {
    state.externalMatchLink.localId = localMatchButton.dataset.selectLocalMatch;
    clearFormMessage('externalMatchLink');
    navigate(state.route);
    return;
  }

  const externalMatchButton = event.target.closest('[data-select-external-match]');
  if (externalMatchButton && !externalMatchButton.disabled) {
    state.externalMatchLink.externalId = externalMatchButton.dataset.selectExternalMatch;
    clearFormMessage('externalMatchLink');
    navigate(state.route);
    return;
  }

  const linkExternalButton = event.target.closest('[data-link-external-match]');
  if (linkExternalButton) {
    linkSelectedExternalMatch().catch((error) => setFormMessage('externalMatchLink', error.message, 'error'));
    return;
  }

  const unlinkExternalButton = event.target.closest('[data-unlink-external-match]');
  if (unlinkExternalButton) {
    unlinkSelectedExternalMatch().catch((error) => setFormMessage('externalMatchLink', error.message, 'error'));
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

content.addEventListener('change', (event) => {
  const shieldUpload = event.target.closest('[data-team-shield-upload]');
  if (shieldUpload) {
    readTeamShieldFile(shieldUpload);
    return;
  }

  const importMatchCheckbox = event.target.closest('input[data-toggle-import-match]');
  if (importMatchCheckbox && !importMatchCheckbox.disabled) {
    toggleExternalImportSelection(String(importMatchCheckbox.dataset.toggleImportMatch || ''));
    return;
  }

  const toggleAllImportCheckbox = event.target.closest('input[data-toggle-all-import-matches]');
  if (toggleAllImportCheckbox && !toggleAllImportCheckbox.disabled) {
    toggleAllExternalImportSelection();
    return;
  }

  const perfilUsuario = event.target.closest('[data-crud-form="usuarios"] [name="perfil"]');
  if (perfilUsuario) {
    syncAdminLinksVisibility(perfilUsuario.closest('[data-crud-form="usuarios"]'));
  }
});

content.addEventListener('dragover', (event) => {
  const uploadCard = event.target.closest('.upload-card');
  if (!uploadCard) return;
  event.preventDefault();
  uploadCard.classList.add('drag-over');
});

content.addEventListener('dragleave', (event) => {
  const uploadCard = event.target.closest('.upload-card');
  if (!uploadCard) return;
  uploadCard.classList.remove('drag-over');
});

content.addEventListener('drop', (event) => {
  const uploadCard = event.target.closest('.upload-card');
  if (!uploadCard) return;
  event.preventDefault();
  uploadCard.classList.remove('drag-over');
  const input = uploadCard.querySelector('[data-team-shield-upload]');
  if (!input || !event.dataTransfer?.files?.length) return;
  input.files = event.dataTransfer.files;
  readTeamShieldFile(input);
});

content.addEventListener('submit', (event) => {
  const externalMatchImportSearchForm = event.target.closest('[data-external-match-import-search]');
  if (externalMatchImportSearchForm) {
    event.preventDefault();
    searchExternalMatchesForImport(externalMatchImportSearchForm).catch((error) => {
      setFormMessage('externalMatchImport', error.message || t('externalMatches.searchError'), 'error');
    });
    return;
  }

  const externalMatchSearchForm = event.target.closest('[data-external-match-search]');
  if (externalMatchSearchForm) {
    event.preventDefault();
    searchExternalMatches(externalMatchSearchForm).catch((error) => {
      setFormMessage('externalMatchLink', error.message, 'error');
    });
    return;
  }

  const form = event.target.closest('[data-crud-form]');
  if (!form) return;
  event.preventDefault();
  submitCrud(form.dataset.crudForm, form).catch((error) => {
    if (RULE_FORM_KINDS.has(form.dataset.crudForm) || PROFILE_FORM_KINDS.has(form.dataset.crudForm) || ['provedorEsportivo', 'emailConfiguracao', 'emailTeste', 'usuarios'].includes(form.dataset.crudForm)) {
      setFormMessage(form.dataset.crudForm, error.message, 'error', form);
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
  const shieldUrlInput = event.target.closest('[data-team-shield-url]');
  if (shieldUrlInput) {
    updateTeamShieldPreview(shieldUrlInput.closest('[data-crud-form="times"]'));
    return;
  }

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

