import { isProviderRecord, validateFilters } from './bookingValidation.js';
import { validateRequestDraft } from './requestDraft.js';

export function automaticProvider(data, mode, selectedId) {
  if (mode !== 'auto' || data.providers.some(provider => provider.id === selectedId)) return null;
  return data.providers.find(provider => provider.id === data.recommendedProviderId) || null;
}

export function createProviderApi(request) {
  return {
    async searchProviders(details, signal) {
      const problem = validateRequestDraft(details, details.location) || validateFilters(details.filters);
      if (problem) throw new Error(problem);
      const data = await request('/providers/search', { method: 'POST', body: details, signal, expireSession: true });
      if (!Array.isArray(data?.providers) || !data.providers.every(isProviderRecord) ||
          new Set(data.providers.map(provider => provider.id)).size !== data.providers.length ||
          (data.recommendedProviderId != null && !data.providers.some(provider => provider.id === data.recommendedProviderId))) {
        throw new Error('Provider results could not be read. Please try again.');
      }
      return data;
    },
    async getProvider(id, details, signal) {
      const problem = validateRequestDraft(details.request, details.location);
      if (problem) throw new Error(problem);
      const data = await request(`/providers/${encodeURIComponent(id)}/quote`, { method: 'POST', body: details, signal, expireSession: true });
      if (!isProviderRecord(data?.provider) || data.provider.id !== id) throw new Error('This provider profile could not be read.');
      return data.provider;
    },
  };
}
