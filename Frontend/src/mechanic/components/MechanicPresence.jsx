import { useEffect, useState } from 'react';
import { mechanicService } from '../services/mechanicService';
import { getPosition } from '../services/location';

export function MechanicPresence() {
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function ping() {
      if (pending) return;
      pending = true;
      try {
        const profile = await mechanicService.getProfile(controller.signal);
        if (profile.online && active) {
          if (profile.location?.source === 'manual') {
            await mechanicService.keepPresence(controller.signal);
          } else {
            const position = await getPosition(controller.signal);
            if (active) await mechanicService.sendLocation(position, controller.signal);
          }
        }
        if (active) setError('');
      } catch (failure) { if (active) setError(failure.message); }
      finally { pending = false; }
    }
    void ping();
    const timer = setInterval(ping, 30000);
    return () => { active = false; clearInterval(timer); controller.abort(); };
  }, []);
  return error ? <p role="alert" className="auth-error">{error}</p> : null;
}
