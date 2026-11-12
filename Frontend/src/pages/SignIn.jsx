import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SignUp } from './SignUp';
import { AccountLink, AuthField, AuthHeading, AuthNotice, AuthSubmit, LegalLinks, PasswordField } from '../components/auth/AuthControls';
import { useAuth } from '../context/useAuth';
import { authService } from '../services/authService';
import { isEmail } from '../utils/authValidation';
import { authPaths } from '../utils/authRouting';
import { tr } from '../i18n/translations';

export function SignIn({ role = 'customer' }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { acceptUser } = useAuth();
  const navigate = useNavigate();
  const paths = authPaths(role);
  const [params] = useSearchParams();
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    if (!isEmail(email)) { setError('Enter a valid email address.'); return; }
    setBusy(true); setError('');
    try {
      const result = await authService.login(email, data.get('password'), role);
      acceptUser(result.user);
      navigate(paths.home, { replace: true });
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); if (form.elements.password) form.elements.password.value = ''; }
  }
  if (role === 'customer' && params.get('setup') === '1') return <SignUp />;
  return <div className="auth-page">
    <AuthHeading eyebrow={role === 'mechanic' ? 'MECHANIC NETWORK' : tr('GOOD TO HAVE YOU HERE')} title={role === 'mechanic' ? 'Put your skills to work.' : tr('Your roadside buddy.')}>
      {role === 'mechanic' ? 'Sign in to your roadside workspace.' : tr('When your ride stops, we get you moving.')}
    </AuthHeading>
    <form onSubmit={submit} className="auth-form">
      <AuthField id="email" name="email" label={tr('Email address')} type="email" autoComplete="username" required icon={Mail} />
      <PasswordField />
      <Link to={paths.forgot} className="auth-forgot">{tr('Forgot password?')}</Link>
      {error && <AuthNotice error>{tr(error)}</AuthNotice>}
      <div className="auth-actions">
        <AuthSubmit busy={busy}>{tr('Sign in')}</AuthSubmit>
        <Link to={role === 'mechanic' ? paths.signup : '/signin?setup=1'} className="auth-secondary">{role === 'mechanic' ? 'Create a mechanic account' : tr('New here? Set up account & vehicle')}</Link>
      </div>
    </form>
    <p className="auth-legal">{tr('By continuing, you agree to our')} <LegalLinks />.</p>
    <AccountLink to={role === 'mechanic' ? '/signin' : '/mechanic/signin'} label={role === 'mechanic' ? 'Customer sign in' : 'Mechanic sign in'}>Switch workspace?</AccountLink>
  </div>;
}
