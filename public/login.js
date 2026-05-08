const form = document.querySelector('#loginForm');
const message = document.querySelector('#message');
const localeSelect = document.querySelector('#localeSelect');
const localeCurrentLabel = document.querySelector('#localeCurrentLabel');
const i18n = window.PlacarI18n;
const t = (key, params, fallback) => i18n.t(key, params, fallback);

function showMessage(text) {
  message.textContent = text;
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
    const label = input?.type === 'text' ? t('common.hidePassword') : t('common.showPassword');
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
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
