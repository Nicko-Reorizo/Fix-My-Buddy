import { networkFetch } from './networkFetch.js';

export class ApiError extends Error {
  constructor(message, status = 0, code = 'http') {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code;
  }
}
export function createJsonRequest({ baseUrl, fetcher = networkFetch, timeoutMs = 15000 }) {
  return async function request(path, { method = 'GET', body, signal, expireSession = false } = {}) {
    if (!baseUrl) throw new ApiError('This service is not connected yet. Nothing has been submitted.', 0, 'unconfigured');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
    const timeout = setTimeout(abort, multipart ? 120000 : timeoutMs);
    try {
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json', ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}),
      });
      const data = response.status === 204 ? null : await response.json().catch(() => undefined);
      if (!response.ok) {
        if (response.status === 401 && expireSession && typeof window !== 'undefined') window.dispatchEvent(new Event('fixmybuddy:session-expired'));
        const defaults = {
          401: 'Please sign in to continue.', 403: 'This account cannot access this customer feature.',
          404: 'This feature or record is not available on the server.',
          409: 'These details changed. Refresh before trying again.', 429: 'Too many attempts. Please wait before trying again.',
        };
        const safeError = response.status < 500 && typeof data?.error === 'string' && data.error.length <= 250 ? data.error : '';
        throw new ApiError(safeError || defaults[response.status] || 'The service is unavailable. Please try again later.', response.status);
      }
      if (data === undefined) throw new ApiError('The server returned an unreadable response. Check the result before retrying.', response.status, 'invalid_response');
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error.name === 'AbortError') throw new ApiError('The request timed out. Check its status before retrying.', 0, 'timeout');
      if (error instanceof TypeError) throw new ApiError('Cannot connect right now. Check your connection and try again.', 0, 'network');
      throw error;
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  };
}
