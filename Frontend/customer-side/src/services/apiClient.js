import { createJsonRequest } from '../utils/apiRequest';
// This presentation copy always uses browser-local data, never the live API.
export const apiBaseUrl = '/demo-api';
export const apiRequest = createJsonRequest({ baseUrl: apiBaseUrl });
