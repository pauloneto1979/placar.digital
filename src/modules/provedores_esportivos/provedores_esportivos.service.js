const { getProviderDefinition, listSupportedProviders } = require('./provider-catalog');

function mergeWithDefinition(config) {
  if (!config) return null;
  const definition = getProviderDefinition(config.provider);
  return {
    ...config,
    supported: Boolean(definition),
    displayName: definition ? definition.displayName : config.provider,
    authType: definition ? definition.authType : 'custom',
    supportStatus: definition ? definition.status : 'unknown',
    baseUrlDefault: definition ? definition.baseUrlDefault : ''
  };
}

function createProvedoresEsportivosService(repository) {
  return {
    getStatus() {
      return {
        module: 'provedores_esportivos',
        implemented: true,
        supportedProviders: listSupportedProviders()
      };
    },

    async listConfiguracoes() {
      const items = await repository.list();
      return items.map(mergeWithDefinition);
    },

    async getConfiguracao(provider) {
      const config = await repository.findByProvider(provider);
      return mergeWithDefinition(config);
    },

    async getConfiguracaoAtiva() {
      const enabledItems = await repository.listEnabled();
      if (!enabledItems.length) return null;
      return mergeWithDefinition(enabledItems[0]);
    },

    listSupportedProviders
  };
}

module.exports = {
  createProvedoresEsportivosService
};
