import { apiBaseUrl, apiRequest } from './apiClient';
import { createProviderApi } from '../utils/providerApi';
export const isProviderApiConfigured = Boolean(apiBaseUrl);
export const { searchProviders, getProvider } = createProviderApi(apiRequest);
