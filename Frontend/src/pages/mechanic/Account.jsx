import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, BriefcaseBusiness, ChevronRight, Clock3, LogOut, Mail, MapPin, Moon, Phone, Radio, ShieldCheck, Star, Sun, SunMoon, UserRound, Wallet } from 'lucide-react';
import { CustomerHeading } from '../../components/customer/CustomerHeading';
import { AuthField } from '../../components/auth/AuthControls';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../context/useAuth';
import { useTheme } from '../../context/useTheme';
import { mechanicService } from '../../services/mechanic/mechanicService';
import { ReceivedReviews } from '../../components/mechanic/ReceivedReviews';

export function Account() {
  const { signOut } = useAuth();
  const { preference, setTheme, storageError } = useTheme();
  const navigate = useNavigate();
  const dialog = useRef(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const load = useCallback(signal => mechanicService.getProfile(signal), []);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const next = await load(controller.signal);
        if (!controller.signal.aborted) { setProfile(next); setError(''); }
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
      finally { pending = false; }
    }
    void refresh();
    const timer = setInterval(refresh, 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [load, retry]);
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setNotice('');
    try {
      await mechanicService.updateProfile({ name: form.get('name').trim(), workingHours: form.get('workingHours').trim(), serviceRadiusKm: Number(form.get('radius')) });
      setProfile(await load()); setEditing(false); setNotice('Your profile has been saved.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await mechanicService.updateAvailability({ online: false });
      await signOut();
      dialog.current.close();
      navigate('/mechanic/signin', { replace: true });
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const rows = profile ? [
    ['/mechanic/availability', MapPin, 'Availability & service area', (profile.online ? 'Online' : 'Offline') + ' · ' + profile.serviceRadiusKm + ' km radius'],
    ['/mechanic/jobs', BriefcaseBusiness, 'My jobs', 'Requests, active jobs and customer chat'],
    ['/mechanic/earnings', Wallet, 'Earnings', 'Your recorded service earnings'],
  ] : [];
  return <div className="mechanic-account">
    <CustomerHeading title="Account & settings">Your skills. Your workspace. Your roadside buddies.</CustomerHeading>
    {error && <div className="auth-notice auth-notice-error" role="alert"><p>{error}</p><button type="button" className="provider-text-link" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
    {!profile && !error && <LoadingState />}
    {notice && <p className="customer-save-status" role="status">{notice}</p>}
    {profile && <>
      <section className="mechanic-account-profile" aria-labelledby="mechanic-profile-name">
        <div className="mechanic-account-identity">
          <span className="mechanic-account-avatar" aria-hidden="true">{profile.initials}</span>
          <div><p className="auth-eyebrow">FIXMYBUDDY PRO</p><h2 id="mechanic-profile-name">{profile.name}</h2>
            <span className="mechanic-account-status" data-online={profile.online}><Radio size={14} />{profile.online ? 'Online for requests' : 'Offline'}</span>
          </div>
        </div>
        <dl className="mechanic-account-contacts">
          <div><dt><Mail size={17} /><span className="sr-only">Email</span></dt><dd>{profile.email}</dd></div>
          <div><dt><Phone size={17} /><span className="sr-only">Mobile</span></dt><dd>{profile.mobile || 'No mobile number'}</dd></div>
        </dl>
        <div className="mechanic-account-stats">
          <div><BadgeCheck size={20} /><span>Identity verification</span><strong>{profile.identityVerified ? 'Verified provider' : 'Pending review'}</strong></div>
          <div><Star size={20} /><span>Customer rating</span><strong>{profile.reviewsCount > 0 && Number.isFinite(profile.rating) ? profile.rating.toFixed(1) + ' / 5' : 'No ratings yet'}</strong><small>{profile.reviewsCount} reviews</small></div>
        </div>
        <button type="button" className="auth-secondary" disabled={busy} onClick={() => setEditing(value => !value)}><UserRound size={18} />{editing ? 'Close profile editor' : 'Edit profile'}</button>
      </section>
      {editing && <form className="mechanic-account-editor auth-form" onSubmit={save}>
        <h2>Edit your profile</h2>
        <AuthField id="mechanic-name" name="name" label="Display name" required minLength={2} maxLength={100} defaultValue={profile.name} />
        <AuthField id="working-hours" name="workingHours" label="Working hours" required maxLength={150} defaultValue={profile.workingHours} />
        <AuthField id="service-radius" name="radius" label="Service radius (km)" type="number" min={1} max={50} required defaultValue={profile.serviceRadiusKm} />
        <button className="auth-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form>}
      <ul className="account-settings-group">{rows.map(([to, Icon, title, subtitle]) => <li key={to}><Link to={to}><Icon size={22} /><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronRight size={18} /></Link></li>)}</ul>
      <section className="mechanic-account-section" aria-labelledby="mechanic-services-title">
        <h2 id="mechanic-services-title">Your services</h2>
        {profile.specialties?.length ? <ul className="mechanic-account-chips">{profile.specialties.map(service => <li key={service}>{service}</li>)}</ul> : <p className="auth-hint">Choose your services on the availability page to receive matching requests.</p>}
        <p className="mechanic-account-hours"><Clock3 size={18} />{profile.workingHours}</p>
        <Link to="/mechanic/availability" className="provider-text-link">Manage services & location <ChevronRight size={16} /></Link>
      </section>
      <section className="mechanic-account-section" aria-labelledby="mechanic-appearance-title">
        <h2 id="mechanic-appearance-title">Appearance</h2><p className="auth-hint">Choose the look that works for you.</p>
        <div className="mechanic-account-themes" role="group" aria-label="Color theme">
          {[['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', SunMoon, 'Device']].map(([value, Icon, label]) => <button type="button" key={value} aria-pressed={preference === value} onClick={() => setTheme(value)}><Icon size={20} />{label}</button>)}
        </div>
        {storageError && <p className="auth-hint">This theme applies for now. Your browser could not save it.</p>}
      </section>
      <section className="mechanic-account-section"><ReceivedReviews /></section>
      <ul className="account-settings-group">
        <li><Link to="/terms"><ShieldCheck size={22} /><span><strong>Terms of service</strong><small>Our roadside service agreement</small></span><ChevronRight size={18} /></Link></li>
        <li><Link to="/privacy"><ShieldCheck size={22} /><span><strong>Privacy policy</strong><small>How your information is handled</small></span><ChevronRight size={18} /></Link></li>
      </ul>
      <button className="auth-secondary" type="button" disabled={busy} onClick={() => { setError(''); dialog.current.showModal(); }}><LogOut size={20} />Sign out</button>
      <p className="mechanic-account-footer">FixMyBuddy Pro · Here for your next move.</p>
    </>}
    <dialog ref={dialog} className="auth-policy" aria-labelledby="mechanic-signout-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2 id="mechanic-signout-title">Sign out of your workspace?</h2><p>We’ll set your availability to offline and end your session.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="customer-remove-actions"><button type="button" className="auth-secondary" disabled={busy} onClick={() => dialog.current.close()}>Stay signed in</button><button type="button" className="auth-primary" disabled={busy} onClick={logout}>{busy ? 'Signing out…' : 'Sign out'}</button></div>
    </dialog>
  </div>;
}
