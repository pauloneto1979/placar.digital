(function () {
  const DEFAULT_LOCALE = 'pt-BR';
  const SUPPORTED_LOCALES = ['pt-BR', 'en-US', 'es-ES'];
  const STORAGE_KEY = 'placar.locale';
  const dictionaries = {};
  let currentLocale = localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE;

  function normalizeLocale(locale) {
    return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  }

  function readPath(source, key) {
    return key.split('.').reduce((value, part) => {
      if (value && Object.prototype.hasOwnProperty.call(value, part)) return value[part];
      return undefined;
    }, source);
  }

  async function loadDictionary(locale) {
    const normalized = normalizeLocale(locale);
    if (dictionaries[normalized]) return dictionaries[normalized];
    const response = await fetch(`/app/i18n/${normalized}.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`i18n:${normalized}`);
    dictionaries[normalized] = await response.json();
    return dictionaries[normalized];
  }

  function interpolate(text, params = {}) {
    return String(text).replace(/\{(\w+)\}/g, (match, name) => {
      return Object.prototype.hasOwnProperty.call(params, name) ? params[name] : match;
    });
  }

  function t(key, params = {}, fallback) {
    const active = readPath(dictionaries[currentLocale] || {}, key);
    const base = readPath(dictionaries[DEFAULT_LOCALE] || {}, key);
    const value = active ?? base ?? fallback ?? key;
    return interpolate(value, params);
  }

  async function setLocale(locale) {
    const normalized = normalizeLocale(locale);
    try {
      await loadDictionary(DEFAULT_LOCALE);
      await loadDictionary(normalized);
      currentLocale = normalized;
    } catch {
      currentLocale = DEFAULT_LOCALE;
      await loadDictionary(DEFAULT_LOCALE);
    }
    localStorage.setItem(STORAGE_KEY, currentLocale);
    document.documentElement.lang = currentLocale;
    applyI18n(document);
    window.dispatchEvent(new CustomEvent('placar:locale-changed', { detail: { locale: currentLocale } }));
    return currentLocale;
  }

  function getLocale() {
    return currentLocale;
  }

  function applyI18n(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      const value = t(key);
      const attr = element.dataset.i18nAttr;
      if (attr) {
        attr.split(',').map((item) => item.trim()).filter(Boolean).forEach((name) => {
          element.setAttribute(name, value);
        });
        return;
      }
      element.textContent = value;
    });

    root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
    });

    root.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.setAttribute('title', t(element.dataset.i18nTitle));
    });

    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });
  }

  window.PlacarI18n = {
    t,
    setLocale,
    getLocale,
    applyI18n,
    supportedLocales: SUPPORTED_LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    ready: setLocale(currentLocale)
  };
})();
