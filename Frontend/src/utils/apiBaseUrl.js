// The deployed app and Vite both serve the API on the same origin by default.
export function resolveApiBaseUrl(value) {
  const base = typeof value === 'string' ? value.trim() : '';
  return base ? base.replace(/\/+$/, '') || '/' : '/api';
}
