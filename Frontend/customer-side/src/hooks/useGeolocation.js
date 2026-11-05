import { useCallback, useEffect, useRef, useState } from 'react';
import { getDeviceLocation } from '../utils/deviceLocation';

export function useGeolocation() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const pending = useRef(null);
  useEffect(() => () => pending.current?.abort(), []);
  const cancelLocation = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    setStatus('idle'); setError('');
  }, []);
  const requestLocation = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setStatus('loading'); setError('');
    try {
      const next = await getDeviceLocation(globalThis.navigator?.geolocation, controller.signal);
      // Apply the pin immediately. Map components resolve its address separately.
      if (controller.signal.aborted) return null;
      setStatus('ready');
      return next;
    } catch (failure) {
      if (!controller.signal.aborted) { setStatus('error'); setError(failure.message); }
      return null;
    } finally { if (pending.current === controller) pending.current = null; }
  }, []);
  return { error, requestLocation, cancelLocation, status };
}
