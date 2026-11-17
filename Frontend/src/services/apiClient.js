import { createJsonRequest } from '../utils/apiRequest';
import { resolveApiBaseUrl } from '../utils/apiBaseUrl';
export const apiBaseUrl = resolveApiBaseUrl(import.meta.env?.VITE_API_BASE_URL);
export const apiRequest = createJsonRequest({ baseUrl: apiBaseUrl });
