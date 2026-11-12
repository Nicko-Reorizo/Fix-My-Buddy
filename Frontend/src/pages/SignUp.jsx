import { tr } from "../i18n/translations";
import { useEffect, useState } from 'react';
import { Mail, Phone, UserRound } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AccountLink, AuthField, AuthHeading, AuthNotice, AuthSubmit, LegalLinks, PasswordField } from '../components/auth/AuthControls';
import { useAuth } from '../context/useAuth';
import { authService } from '../services/authService';
import { isEmail, normalizePhone } from '../utils/authValidation';
import { useLocale } from '../context/useLocale';
import { authPaths } from '../utils/authRouting';
import { VehicleFields } from './customer/Vehicles';
import { normalizeVehicle, validateCustomerSetup } from '../utils/vehicleValidation';

export function SignUp({ role = 'customer' }) {
  const location = useLocation();
  if (role === 'customer' && location.pathname === '/signup') return <Navigate to="/signin?setup=1" replace />;
  return role === 'mechanic' ? <MechanicSignUp /> : <CustomerSetup />;
}

function CustomerSetup() {
  const [vehicle, setVehicle] = useState({ type: '', make: '', model: '', year: '', color: '', plate: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  useEffect(() => { if (errors.phone) setPhoneOpen(true); }, [errors.phone]);
  const { acceptUser } = useAuth();
  const navigate = useNavigate();
  function updateVehicle(event) {
    const { name, value } = event.target;
    setVehicle(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: '' }));
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const phoneInput = String(data.get('phone') || '').trim();
    const phone = phoneInput ? normalizePhone(phoneInput) : '';
    const nextErrors = validateCustomerSetup({ name, email, password, phone: phoneInput, vehicle, acceptedTerms: Boolean(data.get('terms')) });
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => form.elements.namedItem(Object.keys(nextErrors)[0])?.focus());
      return;
    }
    setBusy(true);
    try {
      // One local demo operation saves the account and vehicle together.
      const result = await authService.signup({
        name, email, password, phone, acceptedTerms: true, role: 'customer',
        vehicle: normalizeVehicle(vehicle),
      });
      acceptUser(result.user);
      navigate('/app', { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
      if (form.elements.password) form.elements.password.value = '';
    }
  }
  return <div className="auth-page">
    <AuthHeading title={tr('One setup. Ready for the road.')}>
      {tr('Save your account and first vehicle together, then request help.')}
    </AuthHeading>
    <AuthNotice>{tr('Local demo only. Use sample details and a sample password. No real authentication or verification is performed.')}</AuthNotice>
    <form className="auth-form" onSubmit={submit} noValidate onChange={event => {
      const name = event.target.name;
      if (name) setErrors(current => ({ ...current, [name]: '' }));
      setError('');
    }}>
      <fieldset className="customer-fieldset" disabled={busy}>
        <legend>{tr('Your account')}</legend>
        <AuthField id="name" name="name" label={tr('Name')} autoComplete="name" required maxLength={100} icon={UserRound} error={errors.name} />
        <AuthField id="email" name="email" label={tr('Email address')} type="email" autoComplete="email" required maxLength={254} icon={Mail} error={errors.email} />
        <PasswordField autoComplete="new-password" error={errors.password} hint={tr('Use at least 8 characters, including a number.')} />
        <details className="auth-field" open={phoneOpen} onToggle={event => setPhoneOpen(event.currentTarget.open)}>
          <summary>{tr('Mobile number (optional)')}</summary>
          <AuthField id="phone" name="phone" label={tr('Mobile number (optional)')} type="tel" inputMode="tel" autoComplete="tel" icon={Phone} error={errors.phone} />
        </details>
      </fieldset>
      <fieldset className="customer-fieldset" disabled={busy}>
        <legend>{tr('Your first vehicle')}</legend>
        <p className="auth-hint">{tr('Choose a type and enter its brand and model. Your vehicle will be saved and selected for future requests.')}</p>
        <VehicleFields fields={vehicle} errors={errors} onChange={updateVehicle} />
      </fieldset>
      <div>
        <div className="auth-consent">
          <input id="terms" name="terms" type="checkbox" disabled={busy} aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? 'terms-error' : undefined} />
          <label htmlFor="terms">{tr('I agree to the Terms and acknowledge the Privacy Policy.')}</label>
        </div>
        <LegalLinks />
        {errors.terms && <p id="terms-error" className="auth-field-error">{tr(errors.terms)}</p>}
      </div>
      {error && <AuthNotice error>{tr(error)}</AuthNotice>}
      <AuthSubmit busy={busy}>{tr('Save account & vehicle')}</AuthSubmit>
    </form>
    <AccountLink />
  </div>;
}

function MechanicSignUp({ role = 'mechanic' }) {
  const { t } = useLocale();
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { acceptUser } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = data.get('name').trim();
    const phone = normalizePhone(data.get('phone'));
    const email = data.get('email').trim();
    const password = data.get('password');
    const nextErrors = {};
    if (name.length < 2) nextErrors.name = 'Enter your full name.';
    if (!phone) nextErrors.phone = 'Enter a valid Philippine mobile number.';
    if (!isEmail(email)) nextErrors.email = 'Enter a valid email address.';
    if (password.length < 8 || !/[0-9]/.test(password)) nextErrors.password = 'Use at least 8 characters, including a number.';
    if (!data.get('terms')) nextErrors.terms = t('Please agree to the Terms and acknowledge the Privacy Policy.','Sumang-ayon sa Mga Tuntunin at kilalanin ang Patakaran sa Privacy.');
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) {
      form.elements.namedItem(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      const result = await authService.signup({
        name,
        phone,
        email,
        password,
        acceptedTerms: true,
        role: role === 'mechanic' ? 'mechanic' : 'customer',
      });
      acceptUser(result.user);
      navigate(authPaths(role).home, { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
      form.elements.password.value = '';
    }
  }

  return (
    <div className="auth-page">
      <AuthHeading title={tr("Let's get you ready.")}>
        {role === 'mechanic' ? 'Create your mechanic account.' : tr("Create your customer account.")}
      </AuthHeading>
      <form className="auth-form" onSubmit={submit}>
        <AuthField id="name" name="name" label={tr("Full name")} autoComplete="name" required maxLength={100} icon={UserRound} error={errors.name} />
        <AuthField id="phone" name="phone" label={tr("Mobile number")} type="tel" inputMode="tel" autoComplete="tel" placeholder={tr("09XX XXX XXXX")} required icon={Phone} error={errors.phone} />
        <AuthField id="email" name="email" label={tr("Email address")} type="email" autoComplete="email" required icon={Mail} error={errors.email} />
        <PasswordField autoComplete="new-password" error={errors.password} hint={tr("Use at least 8 characters, including a number.")} />
        <div>
          <div className="auth-consent">
            <input id="terms" type="checkbox" name="terms" aria-label={t('I agree to the Terms and acknowledge the Privacy Policy','Sumasang-ayon ako sa Mga Tuntunin at kinikilala ang Patakaran sa Privacy')} aria-describedby={errors.terms ? 'terms-error' : undefined} />
            <div>
              <label htmlFor="terms">{t('I agree to the Terms and acknowledge the Privacy Policy.','Sumasang-ayon ako sa Mga Tuntunin at kinikilala ang Patakaran sa Privacy.')}</label>{' '}
              <LegalLinks />.
            </div>
          </div>
          {errors.terms && (
            <p id="terms-error" className="auth-field-error">
              {errors.terms}
            </p>
          )}
        </div>
        <AuthNotice>{tr("Your password stays private. Choose one you don't use anywhere else.")}</AuthNotice>
        {error && <AuthNotice error>{tr(error)}</AuthNotice>}
        <div className="auth-actions">
          <AuthSubmit busy={busy}>{tr("Create account")}</AuthSubmit>
        </div>
      </form>
      <AccountLink to={role === 'mechanic' ? '/mechanic/signin' : '/signin'} />
    </div>
  );
}
