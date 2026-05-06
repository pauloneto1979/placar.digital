const { getProviderDefinition } = require('./provider-catalog');

const warnedMessages = new Set();

function warnControlled(code, message, logger = console) {
  if (warnedMessages.has(code)) return;
  warnedMessages.add(code);
  logger.warn(`[sports-data-provider] ${message}`);
}

function hasToken(config) {
  return Boolean(String(config.apiToken || '').trim());
}

function createSportsDataProviderFactory(repository, options = {}) {
  const logger = options.logger || console;

  async function resolveActiveProvider() {
    const enabledItems = await repository.listEnabled({ includeSecret: true });

    if (!enabledItems.length) {
      warnControlled(
        'sports-data-provider:none-enabled',
        'Nenhum provedor esportivo esta habilitado. Sincronizacao automatica ignorada.',
        logger
      );
      return null;
    }

    const supportedItems = enabledItems.filter((item) => getProviderDefinition(item.provider));

    if (!supportedItems.length) {
      warnControlled(
        'sports-data-provider:no-supported-enabled',
        'Ha provedores esportivos habilitados, mas nenhum deles e suportado pela factory atual.',
        logger
      );
      return null;
    }

    if (supportedItems.length > 1) {
      warnControlled(
        'sports-data-provider:multiple-enabled',
        `Ha mais de um provedor esportivo habilitado. O sistema usara ${supportedItems[0].provider}.`,
        logger
      );
    }

    const config = supportedItems[0];
    const definition = getProviderDefinition(config.provider);

    if (!hasToken(config)) {
      warnControlled(
        `sports-data-provider:missing-token:${config.provider}`,
        `O provedor ${config.provider} esta habilitado, mas sem api_token configurado. Sincronizacao ignorada.`,
        logger
      );
      return null;
    }

    return {
      provider: config.provider,
      definition,
      config
    };
  }

  async function markSync(provider, lastSyncAt = new Date()) {
    return repository.touchLastSync(provider, lastSyncAt);
  }

  return {
    resolveActiveProvider,
    markSync
  };
}

module.exports = {
  createSportsDataProviderFactory
};
