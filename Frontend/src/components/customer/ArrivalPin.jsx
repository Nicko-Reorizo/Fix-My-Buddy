import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { getArrivalPin } from '../../services/mechanicService';
import { useLocale } from '../../context/useLocale';

export function ArrivalPin({ bookingId }) {
  const { t } = useLocale();
  const [pin, setPin] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!attempt) return;
    const controller = new AbortController();
    setBusy(true); setError('');
    getArrivalPin(bookingId, controller.signal).then(value => {
      if (!controller.signal.aborted && !document.hidden) setPin(value);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message);
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    const hide = () => { if (document.hidden) { controller.abort(); setPin(null); setBusy(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => { controller.abort(); document.removeEventListener('visibilitychange', hide); };
  }, [attempt, bookingId]);
  useEffect(() => {
    if (!pin) return;
    const timeout = setTimeout(() => setPin(null), Math.max(0, Date.parse(pin.expiresAt) - Date.now()));
    return () => clearTimeout(timeout);
  }, [pin]);
  return <section className="service-pin"><h2><KeyRound size={22} />{t('Arrival PIN', 'PIN sa pagdating')}</h2>
    <p className="auth-hint">{t('Check your assigned towing provider in person before sharing this PIN. It starts service, not payment.', 'Suriin muna ang nakatalagang towing provider bago ibahagi ang PIN. Para ito sa pagsisimula ng serbisyo, hindi bayad.')}</p>
    {pin ? <><strong className="service-pin-value">{pin.pin}</strong><p className="auth-hint">{t('Expires:', 'Mag-e-expire:')} {new Date(pin.expiresAt).toLocaleTimeString()}</p><button className="auth-secondary" type="button" onClick={() => setPin(null)}>{t('Hide PIN', 'Itago ang PIN')}</button></> : <button className="auth-secondary" type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)}>{busy ? t('Loading...', 'Kinukuha...') : t('Show arrival PIN', 'Ipakita ang arrival PIN')}</button>}
    {error && <p className="auth-error" role="alert">{error}</p>}
  </section>;
}
