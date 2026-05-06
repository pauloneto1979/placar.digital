const SUPPORTED_PROVIDERS = Object.freeze({
  'football-data': {
    provider: 'football-data',
    displayName: 'Football-Data.org',
    baseUrlDefault: 'https://api.football-data.org/v4',
    authType: 'header-token',
    status: 'supported'
  },
  'api-football': {
    provider: 'api-football',
    displayName: 'API-Football',
    baseUrlDefault: 'https://v3.football.api-sports.io',
    authType: 'header-token',
    status: 'planned'
  },
  rapidapi: {
    provider: 'rapidapi',
    displayName: 'RapidAPI',
    baseUrlDefault: 'https://api-football-v1.p.rapidapi.com/v3',
    authType: 'header-token',
    status: 'planned'
  },
  outros: {
    provider: 'outros',
    displayName: 'Outros',
    baseUrlDefault: '',
    authType: 'custom',
    status: 'planned'
  }
});

function getProviderDefinition(provider) {
  return SUPPORTED_PROVIDERS[provider] || null;
}

function listSupportedProviders() {
  return Object.values(SUPPORTED_PROVIDERS);
}

function isSupportedProvider(provider) {
  return Boolean(getProviderDefinition(provider));
}

module.exports = {
  getProviderDefinition,
  listSupportedProviders,
  isSupportedProvider
};
