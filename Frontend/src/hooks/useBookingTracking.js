import { useEffect, useRef, useState, useCallback } from 'react';
import { trackingUrl, locationEvent } from '../utils/trackingConnection';
import { apiBaseUrl } from '../services/apiClient';

export function useBookingTracking(bookingId, enabled = true) {
  const socket = useRef(null);
  const [position, setPosition] = useState(null);
  const [connection, setConnection] = useState('connecting');
  const [error, setError] = useState('');
  useEffect(() => {
    setPosition(null); setError('');
    if (!bookingId || !enabled) { setConnection('inactive'); return; }
    let disposed = false, reconnect, deadline, attempt = 0;
    function connect() {
      if (disposed) return;
      setConnection('connecting');
      let ws;
      try {
        ws = new WebSocket(trackingUrl({ apiBaseUrl, socketBaseUrl: import.meta.env.VITE_TRACKING_WS_URL, pageUrl: window.location.href, bookingId }));
      } catch { setConnection('unavailable'); return; }
      socket.current = ws;
      deadline = setTimeout(() => ws.close(), 8000);
      ws.onopen = () => { clearTimeout(deadline); attempt = 0; setConnection('connected'); setError(''); };
      ws.onmessage = event => {
        if (disposed) return;
        try {
          const data = JSON.parse(event.data);
          const next = locationEvent(data, bookingId);
          if (next) setPosition(previous => !previous || Date.parse(next.updatedAt) >= Date.parse(previous.updatedAt) ? next : previous);
          if (data.type === 'tracking:error') { setError(data.message); setConnection('error'); }
        } catch { /* Ignore invalid frames. */ }
      };
      ws.onclose = event => {
        clearTimeout(deadline);
        if (disposed) return;
        if (event.code === 1008) { setConnection('ended'); return; }
        setConnection('reconnecting');
        reconnect = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 15000));
      };
    }
    connect();
    return () => { disposed = true; clearTimeout(deadline); clearTimeout(reconnect); socket.current?.close(); socket.current = null; };
  }, [bookingId, enabled]);
  const sendPosition = useCallback(next => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(JSON.stringify({ type: 'location:update', position: next }));
    return true;
  }, []);
  return { position, connection, error, sendPosition };
}
