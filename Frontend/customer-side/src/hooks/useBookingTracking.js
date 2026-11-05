import { useCallback, useEffect, useState } from 'react';
import { demoApi } from '../demo/localApi';

// The same hook interface, with browser-local updates instead of WebSockets.
export function useBookingTracking(bookingId, enabled = true) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setPosition(null); setError('');
    if (!enabled || !bookingId) return;
    const refresh = () => {
      const next = demoApi.read().bookings.find(item => item.id === bookingId)?.mechanic?.position;
      if (next) setPosition(previous => previous?.updatedAt === next.updatedAt ? previous : next);
    };
    refresh(); const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [bookingId, enabled]);
  const sendPosition = useCallback(next => {
    if (!enabled || !bookingId) return false;
    void demoApi.request(`/mechanics/me/jobs/${bookingId}/location`, { method: 'POST', body: next }).catch(failure => setError(failure.message));
    return true;
  }, [bookingId, enabled]);
  return { position, connection: enabled ? 'connected' : 'inactive', error, sendPosition };
}
