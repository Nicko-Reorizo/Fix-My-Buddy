export function trackingUrl({ apiBaseUrl = '/api', socketBaseUrl, pageUrl, bookingId }) {
  const url = new URL(socketBaseUrl || `${apiBaseUrl.replace(/\/$/, '')}/ws/tracking`, pageUrl);
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) throw new Error('Invalid tracking URL.');
  url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'wss:' : 'ws:';
  url.searchParams.set('bookingId', bookingId);
  return url.href;
}

export function locationEvent(data, bookingId) {
  if (data?.type !== 'location:updated' || data.bookingId !== String(bookingId)) return null;
  const p = data.position;
  if (!Number.isFinite(p?.latitude) || Math.abs(p.latitude) > 90 || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180 || !Number.isFinite(Date.parse(p.updatedAt))) return null;
  return p;
}

export function latestPosition(stream, fallback) {
  if (!stream) return fallback;
  if (!fallback) return stream;
  return Date.parse(stream.updatedAt) >= (Date.parse(fallback.updatedAt) || 0) ? stream : fallback;
}
