const i18n = window.PlacarI18n;
const t = (key, params, fallback) => i18n.t(key, params, fallback);
const flow = document.body.dataset.tokenFlow;
const token = new URLSearchParams(window.location.search).get('token') || '';
const requestForm = document.querySelector('#requestForm');
const tokenForm = document.querySelector('#tokenForm');
const message = document.querySelector('#message');
const EYE_OPEN = '<span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5c5 0 8.7 4.4 9.7 5.8a2 2 0 0 1 0 2.4C20.7 14.6 17 19 12 19s-8.7-4.4-9.7-5.8a2 2 0 0 1 0-2.4C3.3 9.4 7 5 12 5Zm0 2c-4 0-7.1 3.5-8 5 0 0 3.4 5 8 5s8-5 8-5c-.9-1.5-4-5-8-5Zm0 2.5A2.5 2.5 0 1 1 12 14a2.5 2.5 0 0 1 0-5Z"/></svg></span>';
const EYE_CLOSED = '<span class="button-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m4.4 3 16.6 16.6-1.4 1.4-3-3A10.2 10.2 0 0 1 12 19c-5 0-8.7-4.4-9.7-5.8a2 2 0 0 1 0-2.4 18.5 18.5 0 0 1 3.1-3.3L3 4.4 4.4 3Zm2.5 5.9A16 16 0 0 0 4 12s3.4 5 8 5c1.1 0 2.1-.2 3-.6l-2-2a2.5 2.5 0 0 1-3.4-3.4L6.9 8.9ZM12 5c5 0 8.7 4.4 9.7 5.8a2 2 0 0 1 0 2.4 17.6 17.6 0 0 1-2.2 2.5l-3.1-3.1A2.5 2.5 0 0 0 13 9.5L10.7 7.2c.4-.1.8-.2 1.3-.2Zm0 2c-.1 0-.2 0-.3.1L14 9.4a2.5 2.5 0 0 1 .6.6l3.4 3.4A12 12 0 0 0 20 12s-3.4-5-8-5Z"/></svg></span>';

function showMessage(text) {
  message.textContent = text || '';
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

async function postJson(path, payload) {
  const response = await fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || t('accountActivation.genericError'));
  return body;
}

function passwordPayload(form) {
  const data = Object.fromEntries(new FormData(form));
  return { ...data, token };
}

i18n.ready.then(async () => {
  i18n.applyI18n(document);
  syncPasswordToggleLabels();

  if (flow === 'reset' && token) {
    requestForm.hidden = true;
    tokenForm.hidden = false;
  }

  if (flow === 'activation' && !token) {
    tokenForm.hidden = true;
    showMessage(t('accountActivation.invalidLink'));
  }

  if (token) {
    try {
      const result = await postJson('/auth/validar-token', { token });
      if (!result.valid) showMessage(t('accountActivation.invalidOrExpired'));
    } catch (error) {
      showMessage(error.message);
    }
  }

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-password-toggle]');
    if (!toggle) return;
    const input = toggle.closest('.password-field')?.querySelector('[data-password-toggle-input]');
    if (!input) return;
    input.type = input.type === 'text' ? 'password' : 'text';
    syncPasswordToggleLabels();
  });

  requestForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(t('passwordReset.sending'));
    try {
      await postJson('/auth/recuperar-senha', Object.fromEntries(new FormData(requestForm)));
      showMessage(t('passwordReset.sent'));
      requestForm.reset();
    } catch (error) {
      showMessage(error.message);
    }
  });

  tokenForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(t('common.loading'));
    try {
      if (flow === 'activation') {
        await postJson('/auth/ativar-conta', passwordPayload(tokenForm));
        showMessage(t('accountActivation.success'));
      } else {
        await postJson('/auth/redefinir-senha', passwordPayload(tokenForm));
        showMessage(t('passwordReset.success'));
      }
      tokenForm.reset();
    } catch (error) {
      showMessage(error.message);
    }
  });
});
