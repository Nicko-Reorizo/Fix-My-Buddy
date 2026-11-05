import { tr, trTemplate } from "../i18n/translations";
import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Check, QrCode, Info, CalendarDays, Smartphone, CreditCard } from 'lucide-react';
import { RequestFrame } from '../components/app/RequestFrame';
import { RequestVehicle } from '../components/app/RequestVehicle';
import { ProviderIdentity } from '../components/app/ProviderIdentity';
import { VisitEstimate } from '../components/app/VisitEstimate';
import { useApp } from '../context/useApp';
import { useCustomer } from '../context/useCustomer';
import { validEstimate } from '../utils/bookingValidation';
import { validTowingCondition, validTowingQuote } from '../utils/towingValidation';
import { TowingRouteSummary } from '../components/customer/TowingRouteSummary';
import { useLocale } from '../context/useLocale';

export function ConfirmRequest() {
  const {
    request,
    selectedProvider
  } = useApp();
  const {
    selectedVehicle,
    vehicleStatus
  } = useCustomer();
  if (vehicleStatus === 'loading') return <RequestFrame title={tr("Review your booking")} subtitle={tr("Loading vehicle...")} />;
  if (!selectedProvider) return <Navigate to="/providers" replace />;
  if (!selectedVehicle || selectedVehicle.id !== request.vehicleId) return <Navigate to="/request" replace />;
  return <BookingReview key={`${selectedProvider.id}-${selectedProvider.estimate?.id}-${selectedProvider.estimate?.version}-${selectedProvider.cancellationPolicy?.id}`} />;
}

function BookingReview() {
  const { t } = useLocale();
  const {
    confirmRequest,
    request,
    location,
    selectedProvider,
    attachments
  } = useApp();
  const {
    selectedVehicle,
    refreshData
  } = useCustomer();
  const [confirmed, setConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const policy = selectedProvider.cancellationPolicy;
  const canBook = validEstimate(selectedProvider.estimate) && Boolean(policy?.id && policy.text) && attachments.length === 0 && (request.serviceType !== 'towing' || (validTowingCondition(request.towingCondition) && validTowingQuote(selectedProvider.towingQuote)));
  const totalAmount = Number(selectedProvider.estimate?.total || 0);

  async function handleConfirm(payImmediately = true) {
    if (!confirmed || busy || !canBook) return;
    setBusy(payImmediately ? 'pay_now' : 'pay_later');
    setError('');
    try {
      const booking = await confirmRequest({
        estimateId: selectedProvider.estimate.id,
        cancellationPolicyId: policy.id
      });
      await refreshData();
      if (payImmediately) {
        navigate(`/bookings/${encodeURIComponent(booking.id)}/pay?method=${encodeURIComponent(paymentMethod)}`);
      } else if (booking.serviceType === 'mechanic') {
        navigate(`/bookings/${encodeURIComponent(booking.id)}/service`);
      } else {
        navigate(`/history?booking=${encodeURIComponent(booking.id)}`);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy('');
    }
  }

  function submit(event) {
    event.preventDefault();
    handleConfirm(true);
  }

  return <RequestFrame title={tr("Review your booking")} subtitle={trTemplate(["", " \xB7 ", " assistance"], [request.issueType, request.serviceType === 'towing' ? tr("Towing") : tr("Mechanic")])} backTo={`/providers/${encodeURIComponent(selectedProvider.id)}`}>
    <form className="request-form" onSubmit={submit}>
      <ProviderIdentity provider={selectedProvider} />
      <div className="provider-tools"><span className="provider-chip" data-selected="true">{request.scheduledAt ? tr("Scheduled request") : Number.isFinite(selectedProvider.etaMinutes) ? trTemplate(["Now \xB7 ", " min ETA"], [selectedProvider.etaMinutes]) : tr("Now \xB7 ETA pending")}</span><Link className="provider-chip" to="/provider-filters?schedule=1"><CalendarDays size={15} />{request.scheduledAt ? tr("Change time") : tr("Schedule")}</Link></div>
      {request.scheduledAt && <p className="auth-hint">{tr("Requested time:")} {new Date(request.scheduledAt).toLocaleString()} {tr(". Provider availability must be confirmed.")}</p>}
      <RequestVehicle vehicle={selectedVehicle} service={request.serviceType} />
      {request.serviceType === 'towing' && <TowingRouteSummary quote={selectedProvider.towingQuote} />}
      <VisitEstimate estimate={selectedProvider.estimate} service={request.serviceType} />
      <div className="request-summary"><p>{tr("Pickup:")} {location.address}</p>{request.landmark && <p>{request.landmark}</p>}{request.notes && <p>{request.notes}</p>}{request.serviceType === 'towing' && <p>{tr("Destination:")} {request.destination}</p>}<Link className="provider-text-link" to="/request/details">{tr("Edit request details")}</Link></div>

      <div className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
        <div className="mb-2.5 flex items-center gap-2 text-sm font-bold">
          <CreditCard size={18} className="text-[rgb(var(--fmb-accent))]" />
          <span>{t('Choose direct payment method', 'Piliin ang paraan ng bayad')}</span>
        </div>
        <div className="auth-segments mb-3" role="group" aria-label="Payment method">
          <button
            type="button"
            aria-pressed={paymentMethod === 'gcash'}
            onClick={() => setPaymentMethod('gcash')}
            disabled={Boolean(busy)}
          >
            <Smartphone size={16} />
            GCash Express
          </button>
          <button
            type="button"
            aria-pressed={paymentMethod === 'qrph'}
            onClick={() => setPaymentMethod('qrph')}
            disabled={Boolean(busy)}
          >
            <QrCode size={16} />
            QRPh National QR
          </button>
        </div>
        <p className="m-0 text-xs text-[rgb(var(--fmb-muted))]">
          {paymentMethod === 'gcash'
            ? t(
                'Pay directly inside the website using your GCash mobile number & 4-digit MPIN. Includes 5% platform protection.',
                'Magbayad diretso sa website gamit ang iyong GCash mobile number at 4-digit MPIN.',
              )
            : t(
                'Generate an instant EMVCo QRPh code scannable with GCash, Maya, BPI, BDO, or any QRPh app.',
                'Mag-generate ng QRPh code na pwedeng i-scan sa GCash, Maya, BPI, o BDO.',
              )}
        </p>
      </div>

      <div className="request-safety"><Info size={20} /><p>{policy?.text || tr("Cancellation terms have not been provided. Booking is unavailable until the provider supplies them.")}</p></div>
      {attachments.length > 0 && <p className="auth-hint">{attachments.length} {tr("attachments selected. Upload is not connected yet, so requests with attachments cannot be submitted.")}</p>}
      <label className="provider-consent"><input type="checkbox" checked={confirmed} disabled={!canBook || Boolean(busy)} onChange={event => setConfirmed(event.target.checked)} /><span>{request.serviceType === 'towing' ? t('I agree to the route, towing estimate and provider terms. Additional work needs my approval.','Sumasang-ayon ako sa ruta, tantiya at tuntunin ng provider. Kailangan ang pag-apruba ko sa dagdag na trabaho.') : tr("I agree to this visit estimate and the cancellation terms. Parts and repairs require my separate approval.")}</span></label>
      {error && <p className="auth-error" role="alert">{tr(error)}</p>}

      <div className="flex flex-col gap-2.5">
        <button
          className="auth-primary request-continue"
          type="submit"
          disabled={!confirmed || Boolean(busy) || !canBook}
        >
          {paymentMethod === 'gcash' ? <Smartphone size={20} /> : <QrCode size={20} />}
          {busy === 'pay_now'
            ? tr("Opening checkout...")
            : `Confirm & Pay ₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with ${paymentMethod === 'gcash' ? 'GCash' : 'QRPh'}`}
        </button>
        <button
          className="auth-secondary"
          type="button"
          disabled={!confirmed || Boolean(busy) || !canBook}
          onClick={() => handleConfirm(false)}
        >
          <Check size={19} />
          {busy === 'pay_later'
            ? tr("Confirming...")
            : t('Confirm booking & pay during service', 'Kumpirmahin muna at magbayad sa serbisyo')}
        </button>
      </div>
    </form>
  </RequestFrame>;
}
