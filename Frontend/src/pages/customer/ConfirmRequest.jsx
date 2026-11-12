import { useRef, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Check, Info, ShieldCheck } from 'lucide-react';
import { RequestFrame } from '../../components/app/RequestFrame';
import { RequestVehicle } from '../../components/app/RequestVehicle';
import { ProviderIdentity } from '../../components/app/ProviderIdentity';
import { VisitEstimate } from '../../components/app/VisitEstimate';
import { useApp } from '../../context/useApp';
import { useCustomer } from '../../context/useCustomer';
import { validEstimate } from '../../utils/bookingValidation';
import { validTowingCondition, validTowingQuote } from '../../utils/towingValidation';
import { TowingRouteSummary } from '../../components/customer/TowingRouteSummary';
import { useLocale } from '../../context/useLocale';

export function ConfirmRequest() {
  const { request, selectedProvider } = useApp();
  const { selectedVehicle, vehicleStatus } = useCustomer();
  if (vehicleStatus === 'loading') return <RequestFrame title="Review your booking" subtitle="Loading vehicle..." />;
  if (!selectedProvider) return <Navigate to="/providers" replace />;
  if (!selectedVehicle || selectedVehicle.id !== request.vehicleId) return <Navigate to="/request" replace />;
  return <BookingReview key={`${selectedProvider.id}-${selectedProvider.estimate?.id}-${selectedProvider.estimate?.version}-${selectedProvider.cancellationPolicy?.id}`} />;
}

function BookingReview() {
  const { t } = useLocale();
  const { confirmRequest, request, location, selectedProvider, attachments } = useApp();
  const { selectedVehicle, refreshData } = useCustomer();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const navigate = useNavigate();
  const policy = selectedProvider.cancellationPolicy;
  const editPath = request.serviceType === 'towing' ? '/request/towing' : '/request';
  const canBook = validEstimate(selectedProvider.estimate) && Boolean(policy?.id && policy.text) && attachments.length === 0 &&
    (request.serviceType !== 'towing' || (validTowingCondition(request.towingCondition) && validTowingQuote(selectedProvider.towingQuote)));

  async function submit(event) {
    event.preventDefault();
    if (!confirmed || submitting.current || !canBook) return;
    submitting.current = true;
    setBusy(true); setError('');
    try {
      const booking = await confirmRequest({ estimateId: selectedProvider.estimate.id, cancellationPolicyId: policy.id });
      // A refresh failure must not turn a successful booking into a retry.
      void Promise.resolve().then(refreshData).catch(() => {});
      navigate(booking.serviceType === 'mechanic' ? `/bookings/${encodeURIComponent(booking.id)}/service` : `/history?booking=${encodeURIComponent(booking.id)}`, { replace: true });
    } catch (failure) {
      setError(failure.message);
      submitting.current = false;
      setBusy(false);
    }
  }

  return <RequestFrame title={t('Confirm roadside help', 'Kumpirmahin ang roadside assistance')} subtitle={t('One final check. No payment is required to request help.', 'Huling pagsusuri. Walang kailangang bayaran para humiling ng tulong.')} backTo={editPath}>
    <form className="request-form" onSubmit={submit} aria-busy={busy}>
      <ProviderIdentity provider={selectedProvider} />
      <Link className="provider-text-link" to={`/providers/${encodeURIComponent(selectedProvider.id)}`}>{t('View provider or choose another', 'Tingnan ang provider o pumili ng iba')}</Link>
      <p className="auth-hint">{request.scheduledAt ? new Date(request.scheduledAt).toLocaleString() : t('Help now', 'Tulong ngayon')}{Number.isFinite(selectedProvider.etaMinutes) ? ` · ${selectedProvider.etaMinutes} min ETA` : ''}</p>
      <RequestVehicle vehicle={selectedVehicle} service={request.serviceType} />
      <div className="request-summary"><strong>{request.issueType}</strong><p>{t('Pickup:', 'Pickup:')} {location.address}</p>{request.landmark && <p>{request.landmark}</p>}{request.notes && <p>{request.notes}</p>}<Link className="provider-text-link" to={editPath}>{t('Edit request', 'Baguhin ang request')}</Link></div>
      {request.serviceType === 'towing' && <TowingRouteSummary quote={selectedProvider.towingQuote} />}
      <VisitEstimate estimate={selectedProvider.estimate} service={request.serviceType} />
      <div className="request-safety"><Info size={20} /><p>{policy?.text || t('Current cancellation terms are required before booking.', 'Kailangan ang kasalukuyang tuntunin ng pagkansela bago mag-book.')}</p></div>
      <div className="request-safety"><ShieldCheck size={20} /><p>{t('Pay during service. Check your assigned provider when they arrive, then share your arrival PIN. Extra work needs your separate approval.', 'Magbayad sa serbisyo. Suriin ang nakatalagang provider sa pagdating bago ibahagi ang arrival PIN. Kailangan ng hiwalay na pahintulot ang dagdag na trabaho.')}</p></div>
      {attachments.length > 0 && <p className="auth-error" role="alert">{t('Remove attachments to continue. Media upload is unavailable in this demo.', 'Alisin ang attachments para magpatuloy. Hindi available ang media upload sa demo.')} <Link to="/request/details">{t('Edit attachments', 'Baguhin ang attachments')}</Link></p>}
      <label className="provider-consent"><input type="checkbox" checked={confirmed} disabled={!canBook || busy} onChange={event => setConfirmed(event.target.checked)} /><span>{t('I confirm this pickup, service estimate and cancellation terms. This requests provider assistance.', 'Kinukumpirma ko ang pickup, tantiya at tuntunin ng pagkansela para humiling ng tulong.')}</span></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-primary request-continue" type="submit" disabled={!confirmed || busy || !canBook}><Check size={20} />{busy ? t('Requesting help...', 'Humihiling ng tulong...') : t('Confirm & request help', 'Kumpirmahin at humiling ng tulong')}</button>
      <p className="auth-hint" role="status">{t('Demo only. No real provider is dispatched or charged.', 'Demo lamang. Walang totoong provider na ipapadala o sisingilin.')}</p>
    </form>
  </RequestFrame>;
}
