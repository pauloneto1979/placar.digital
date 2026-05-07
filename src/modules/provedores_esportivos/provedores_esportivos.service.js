const { getProviderDefinition, listSupportedProviders } = require('./provider-catalog');
const { HttpError } = require('../../shared/errors/http-error');

const MIN_SYNC_INTERVAL_SECONDS = 60;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function maskToken(token) {
  const value = String(token || '');
  if (!value) return '';
  const visible = value.slice(-3);
  return `${'*'.repeat(Math.max(8, value.length - visible.length))}${visible}`;
}

function mergeWithDefinition(config) {
  if (!config) return null;
  const definition = getProviderDefinition(config.provider);
  const apiToken = config.apiToken || '';
  const sanitized = { ...config };
  delete sanitized.apiToken;
  return {
    ...sanitized,
    supported: Boolean(definition),
    displayName: definition ? definition.displayName : config.provider,
    authType: definition ? definition.authType : 'custom',
    supportStatus: definition ? definition.status : 'unknown',
    baseUrlDefault: definition ? definition.baseUrlDefault : '',
    apiTokenConfigured: Boolean(apiToken),
    apiTokenMasked: maskToken(apiToken)
  };
}

function ensureKnownProvider(provider) {
  if (!getProviderDefinition(provider)) {
    throw new HttpError(404, 'sports_provider_not_supported', 'Provedor esportivo nao suportado.');
  }
}

function parseBoolean(value, fieldName) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new HttpError(400, 'invalid_sports_provider_boolean', `${fieldName} deve ser boolean.`);
}

function buildUpdatePayload(payload) {
  const data = {};

  if (payload.enabled !== undefined) {
    data.enabled = parseBoolean(payload.enabled, 'enabled');
  }

  if (payload.syncIntervalSeconds !== undefined || payload.sync_interval_seconds !== undefined) {
    const value = Number(payload.syncIntervalSeconds ?? payload.sync_interval_seconds);
    if (!Number.isInteger(value) || value < MIN_SYNC_INTERVAL_SECONDS) {
      throw new HttpError(400, 'invalid_sports_provider_interval', 'Intervalo de sincronizacao deve ser de no minimo 60 segundos.');
    }
    data.syncIntervalSeconds = value;
  }

  if (payload.baseUrl !== undefined || payload.base_url !== undefined) {
    const baseUrl = clean(payload.baseUrl ?? payload.base_url);
    try {
      const parsed = new URL(baseUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('invalid_protocol');
      }
    } catch (error) {
      throw new HttpError(400, 'invalid_sports_provider_base_url', 'base_url invalida.');
    }
    data.baseUrl = baseUrl.replace(/\/$/, '');
  }

  if (payload.apiToken !== undefined || payload.api_token !== undefined) {
    const apiToken = clean(payload.apiToken ?? payload.api_token);
    if (apiToken) {
      data.apiToken = apiToken;
      data.updateApiToken = true;
    }
  }

  return data;
}

function createProvedoresEsportivosService(repository, footballDataClientService = null) {
  return {
    getStatus() {
      return {
        module: 'provedores_esportivos',
        implemented: true,
        supportedProviders: listSupportedProviders()
      };
    },

    async listConfiguracoes() {
      const items = await repository.list({ includeSecret: true });
      return items.map(mergeWithDefinition);
    },

    async getConfiguracao(provider) {
      ensureKnownProvider(provider);
      const config = await repository.findByProvider(provider, { includeSecret: true });
      return mergeWithDefinition(config);
    },

    async getConfiguracaoAtiva() {
      const enabledItems = await repository.listEnabled();
      if (!enabledItems.length) return null;
      return mergeWithDefinition(enabledItems[0]);
    },

    async updateConfiguracao(provider, payload) {
      ensureKnownProvider(provider);
      const existing = await repository.findByProvider(provider, { includeSecret: true });
      if (!existing) {
        throw new HttpError(404, 'sports_provider_not_configured', 'Provedor esportivo nao configurado.');
      }
      const updated = await repository.updateProvider(provider, buildUpdatePayload(payload || {}));
      return mergeWithDefinition(updated);
    },

    async updateStatus(provider, payload) {
      ensureKnownProvider(provider);
      const enabled = parseBoolean(payload.enabled, 'enabled');
      if (enabled === undefined) {
        throw new HttpError(400, 'missing_sports_provider_status', 'Informe enabled.');
      }
      const updated = await repository.updateProvider(provider, { enabled });
      if (!updated) {
        throw new HttpError(404, 'sports_provider_not_configured', 'Provedor esportivo nao configurado.');
      }
      return mergeWithDefinition(updated);
    },

    async listFootballDataPartidas(query) {
      if (!footballDataClientService) {
        throw new HttpError(500, 'football_data_client_not_configured', 'Cliente football-data nao configurado.');
      }
      return footballDataClientService.listarPartidas(query);
    },

    listSupportedProviders
  };
}

module.exports = {
  createProvedoresEsportivosService
};
