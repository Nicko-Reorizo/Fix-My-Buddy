import { apiBaseUrl, apiRequest } from './apiClient';
import { createAuthApi } from '../utils/customerAccountApi';
export const isAuthConfigured = Boolean(apiBaseUrl);
export const authService = createAuthApi(apiRequest);