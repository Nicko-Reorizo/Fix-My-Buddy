import { useEffect, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { useBookingTracking } from '../../hooks/useBookingTracking';
import { mechanicService } from '../../services/mechanic/mechanicService';

export function JobLocationSharing({ jobId, active }) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(null);
  const { connection, error: socketError, sendPosition } = useBookingTracking(jobId, active && sharing);
  useEffect(() => {
    if (!active || !sharing) return;
    if (!navigator.geolocation) { setError('This browser does not support GPS.'); setSharing(false); return; }
    let disposed = false, pending = false, lastSent = 0;
    const controller = new AbortController();
    latest.current = null; setError('');
    const watch = navigator.geolocation.watchPosition(position => {
      latest.current = { latitude: position.coords.latitude, longitude: position.coords.longitude, receivedAt: Date.now() };
      setError('');
    }, failure => {
      setError(failure.code === 1 ? 'Location access was denied. Allow location in your browser to share GPS.' : 'Waiting for an accurate GPS signal.');
      latest.current = null;
      if (failure.code === 1) setSharing(false);
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
    async function send() {
      const current = latest.current;
      if (disposed || pending || !current || Date.now() - current.receivedAt > 30000 || Date.now() - lastSent < 3000) return;
      const position = { latitude: current.latitude, longitude: current.longitude };
      lastSent = Date.now();
      if (sendPosition(position)) return;
      pending = true;
      try { await mechanicService.updateJobLocation(jobId, position, controller.signal); if (!disposed) setError(''); }
      catch (failure) { if (!disposed) setError(failure.message); }
      finally { pending = false; }
    }
    const timer = setInterval(send, 3000);
    return () => { disposed = true; navigator.geolocation.clearWatch(watch); clearInterval(timer); controller.abort(); latest.current = null; };
  }, [jobId, active, sharing, sendPosition]);
  useEffect(() => { if (!active || connection === 'ended') setSharing(false); }, [active, connection]);
  return <div className="job-location-sharing">
    <p className="auth-hint">Share your device GPS with this customer while travelling. Keep this job open; phone browsers may pause updates in the background.</p>
    <button type="button" className="auth-secondary" disabled={!active} onClick={() => { setError(''); setSharing(value => !value); }}>
      <LocateFixed size={18} />{sharing ? 'Stop sharing GPS' : 'Start live GPS sharing'}
    </button>
    {sharing && <p role="status" className="auth-hint">{connection === 'connected' ? 'GPS sharing is on.' : 'Connecting live GPS; saved updates use the API while reconnecting.'}</p>}
    {(error || socketError) && <p className="auth-error" role="alert">{error || socketError}</p>}
  </div>;
}
