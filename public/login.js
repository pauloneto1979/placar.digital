const form = document.querySelector('#loginForm');
const message = document.querySelector('#message');
const localeSelect = document.querySelector('#localeSelect');
const localeCurrentLabel = document.querySelector('#localeCurrentLabel');
const i18n = window.PlacarI18n;
const t = (key, params, fallback) => i18n.t(key, params, fallback);
const EYE_OPEN = '<span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5c5 0 8.7 4.4 9.7 5.8a2 2 0 0 1 0 2.4C20.7 14.6 17 19 12 19s-8.7-4.4-9.7-5.8a2 2 0 0 1 0-2.4C3.3 9.4 7 5 12 5Zm0 2c-4 0-7.1 3.5-8 5 0 0 3.4 5 8 5s8-5 8-5c-.9-1.5-4-5-8-5Zm0 2.5A2.5 2.5 0 1 1 12 14a2.5 2.5 0 0 1 0-5Z"/></svg></span>';
const EYE_CLOSED = '<span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m4.4 3 16.6 16.6-1.4 1.4-3-3A10.2 10.2 0 0 1 12 19c-5 0-8.7-4.4-9.7-5.8a2 2 0 0 1 0-2.4 18.5 18.5 0 0 1 3.1-3.3L3 4.4 4.4 3Zm2.5 5.9A16 16 0 0 0 4 12s3.4 5 8 5c1.1 0 2.1-.2 3-.6l-2-2a2.5 2.5 0 0 1-3.4-3.4L6.9 8.9ZM12 5c5 0 8.7 4.4 9.7 5.8a2 2 0 0 1 0 2.4 17.6 17.6 0 0 1-2.2 2.5l-3.1-3.1A2.5 2.5 0 0 0 13 9.5L10.7 7.2c.4-.1.8-.2 1.3-.2Zm0 2c-.1 0-.2 0-.3.1L14 9.4a2.5 2.5 0 0 1 .6.6l3.4 3.4A12 12 0 0 0 20 12s-3.4-5-8-5Z"/></svg></span>';
let messageTimer = null;

function showMessage(text, tone = 'warning', autoHide = false) {
  window.clearTimeout(messageTimer);
  message.classList.remove('is-hiding');
  message.textContent = text;
  message.dataset.tone = tone;
  if (autoHide) {
    messageTimer = window.setTimeout(() => {
      message.classList.add('is-hiding');
      window.setTimeout(() => {
        message.textContent = '';
        message.classList.remove('is-hiding');
      }, 260);
    }, 4200);
  }
}

function syncLocaleControl() {
  const locale = i18n.getLocale();
  localeSelect.value = locale;
  if (localeCurrentLabel) {
    localeCurrentLabel.textContent = ({ 'pt-BR': 'PT', 'en-US': 'EN', 'es-ES': 'ES' })[locale] || locale;
  }
}

function syncPasswordToggleLabels() {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    const input = button.closest('.password-field')?.querySelector('[data-password-toggle-input]');
    const visible = input?.type === 'text';
    const label = visible ? t('common.hidePassword') : t('common.showPassword');
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.innerHTML = visible ? EYE_CLOSED : EYE_OPEN;
  });
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
  if (!response.ok) throw new Error(body?.message || t('auth.loginError'));
  return body;
}

i18n.ready.then(() => {
  i18n.applyI18n(document);
  syncLocaleControl();
  syncPasswordToggleLabels();
  const loginMessage = sessionStorage.getItem('placar.loginMessage');
  if (loginMessage) {
    sessionStorage.removeItem('placar.loginMessage');
    showMessage(loginMessage, 'success', true);
  }

  localeSelect.addEventListener('change', () => {
    i18n.setLocale(localeSelect.value).then(() => {
      syncLocaleControl();
      syncPasswordToggleLabels();
    });
  });

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-password-toggle]');
    if (!toggle) return;
    const input = toggle.closest('.password-field')?.querySelector('[data-password-toggle-input]');
    if (!input) return;
    input.type = input.type === 'text' ? 'password' : 'text';
    syncPasswordToggleLabels();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(t('auth.validating'));

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
});
