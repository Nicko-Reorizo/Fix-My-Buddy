import { tr, trTemplate } from "../../i18n/translations";
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { customerService } from '../../services/customerService';
import { safeMediaUrl } from '../../utils/bookingValidation';
import { QuoteReview } from './QuoteReview';
import { useAuth } from '../../context/useAuth';

/**
 * Generates a deterministic scannable-style SVG QR matrix from an EMVCo QRPh payload string
 * so QRPh / GCash QR codes render crisply inline without external dependencies.
 */
export function QrPhMatrixSvg({ payload = 'FIXMYBUDDY-QRPH', amountDue = 0 }) {
  const size = 25;
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinder = (r, c) =>
    (r < 7 && c < 7) ||
    (r < 7 && c >= size - 7) ||
    (r >= size - 7 && c < 7);

  const finderBit = (r, c) => {
    const lr = r >= size - 7 ? r - (size - 7) : r;
    const lc = c >= size - 7 ? c - (size - 7) : c;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };

  const isCenterBadge = (r, c) => r >= 10 && r <= 14 && c >= 10 && c <= 14;

  const cells = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (isCenterBadge(r, c)) continue;
      let dark = false;
      if (isFinder(r, c)) {
        dark = finderBit(r, c);
      } else if (r === 6 || c === 6) {
        dark = (r + c) % 2 === 0;
      } else {
        const seed = Math.imul(hash ^ (r * 31 + c * 17), 1597334677);
        dark = (seed & 3) === 0 || (seed & 5) === 1;
      }
      if (dark) {
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c + 2}
            y={r + 2}
            width="1"
            height="1"
            fill="#071a16"
          />,
        );
      }
    }
  }

  return (
    <div className="mx-auto my-3 flex w-fit flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-[#071a16] shadow-lg">
      <div className="mb-2 flex w-full items-center justify-between gap-3 border-b border-slate-200 pb-1.5 text-[11px] font-extrabold tracking-wide">
        <span className="text-[#0057ff]">GCash · Maya · BPI · BDO</span>
        <span className="rounded bg-[#ffda45] px-1.5 py-0.5 text-[10px] font-black text-slate-950">
          QR Ph
        </span>
      </div>
      <svg
        viewBox={`0 0 ${size + 4} ${size + 4}`}
        width="188"
        height="188"
        role="img"
        aria-label="Illustrative demo QR pattern, not a payment code"
      >
        <rect width={size + 4} height={size + 4} fill="#ffffff" rx="1.5" />
        {cells}
        <rect x="12" y="12" width="5" height="5" rx="0.8" fill="#0057ff" />
        <text
          x="14.5"
          y="15.4"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="2.2"
          fontWeight="bold"
        >
          PH
        </text>
      </svg>
      {amountDue > 0 && (
        <strong className="mt-1.5 text-sm font-extrabold text-slate-900">
          ₱{amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </strong>
      )}
      <span className="mt-0.5 text-[11px] font-semibold text-slate-500">
        DEMO ONLY · Not scannable for payment
      </span>
    </div>
  );
}

export function BookingPayment({
  booking,
  onRefresh,
  initialMethod = 'gcash',
}) {
  const { user } = useAuth();
  const [method, setMethod] = useState(
    initialMethod === 'qrph' ? 'qrph' : 'gcash',
  );
  const [gcashStep, setGcashStep] = useState('phone'); // 'phone' | 'mpin'
  const [gcashPhone, setGcashPhone] = useState(user?.phone || '09171234567');
  const [gcashMpin, setGcashMpin] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reference, setReference] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  const [reported, setReported] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  useEffect(() => {
    if (initialMethod === 'qrph' || initialMethod === 'gcash') {
      setMethod(initialMethod);
    }
  }, [initialMethod]);

  const payment = booking.payment;
  const quotePending =
    booking.revisionStatus === 'awaiting_customer' ||
    booking.repairApprovalStatus === 'awaiting_customer';
  const handoverPending =
    booking.serviceType === 'towing' &&
    booking.towing?.handover?.status !== 'confirmed';
  const qrUrl = safeMediaUrl(payment?.qrUrl);

  const amountDue = Number(booking.paidAmount ?? booking.quotedAmount ?? 0);
  const commissionRate = Number(payment?.commissionRate ?? 0.05);
  const commissionAmount =
    payment?.commission != null
      ? Number(payment.commission)
      : Math.round(amountDue * commissionRate * 100) / 100;
  const providerNet =
    payment?.net != null
      ? Number(payment.net)
      : Math.round((amountDue - commissionAmount) * 100) / 100;

  const qrPayload =
    sessionInfo?.qrPayload ||
    payment?.qrPayload ||
    `QRPH|${booking.reference}|${payment?.payeeName || booking.providerName}|${amountDue.toFixed(2)}`;

  async function startGcashCheckout() {
    if (busy || gcashPhone.trim().length < 10) return;
    setBusy('session');
    setError('');
    setNotice('');
    try {
      const data = await customerService.createPaymentSession(booking.id, {
        method: 'gcash',
        phone: gcashPhone.trim(),
      });
      if (data?.session) {
        setSessionInfo(data.session);
      }
      setGcashMpin('');
      setGcashStep('mpin');
    } catch {
      // Proceed to in-website MPIN step even if session endpoint is offline
      setGcashMpin('');
      setGcashStep('mpin');
    } finally {
      setBusy('');
    }
  }

  async function handleInstantPay(selectedMethod) {
    if (busy || quotePending || handoverPending || payment?.status === 'verified') return;
    if (selectedMethod === 'gcash' && gcashMpin.replace(/\D/g, '').length < 4) {
      setError('Enter the demo code 0000. Never use a real banking PIN.');
      return;
    }
    setBusy(selectedMethod);
    setError('');
    setNotice('');
    try {
      const result = await customerService.payBooking(booking.id, {
        method: selectedMethod,
        phone: selectedMethod === 'gcash' ? gcashPhone.trim() : undefined,
        reference: reference.trim() || undefined,
      });
      if (result?.payment?.status !== 'verified') {
        throw new Error('Could not verify payment. Refresh your booking and try again.');
      }
      setNotice(
        `${selectedMethod === 'gcash' ? 'GCash' : 'QRPh'} payment of ₱${amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} confirmed (Ref: ${result.payment.reference}).`,
      );
      setGcashStep('phone');
      setGcashMpin('');
      onRefresh();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy('');
    }
  }

  async function report() {
    if (
      busy ||
      quotePending ||
      handoverPending ||
      reported ||
      payment?.reportable !== true ||
      ['verified', 'pending_verification'].includes(payment?.status)
    )
      return;
    setBusy('payment');
    setError('');
    setNotice('');
    try {
      const result = await customerService.reportPayment(booking.id, {
        reference: reference.trim() || undefined,
      });
      if (result?.payment?.status !== 'pending_verification')
        throw new Error(
          'Could not confirm the payment report. Refresh your booking before retrying.',
        );
      setReported(true);
      setNotice('Payment reported. Waiting for the provider to confirm receipt.');
      onRefresh();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy('');
    }
  }

  async function handleDownloadReceipt() {
    if (downloadingReceipt) return;
    setDownloadingReceipt(true);
    setError('');
    try {
      const blob = await customerService.receipt(booking.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FixMyBuddy-Receipt-${booking.reference || booking.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setDownloadingReceipt(false);
    }
  }

  function handleCopyReference(text) {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="booking-followup">
      {(booking.serviceType !== 'towing' ||
        booking.initialEstimate ||
        booking.approvedQuote ||
        booking.pendingRevision ||
        booking.repairEstimate) && (
        <QuoteReview
          key={`${booking.id}-${booking.pendingRevision?.id}-${booking.pendingRevision?.version}-${booking.repairEstimate?.id}-${booking.repairEstimate?.version}-${booking.revisionStatus}-${booking.repairApprovalStatus}`}
          booking={booking}
          onRefresh={onRefresh}
        />
      )}

      <h2>
        <CreditCard size={21} />
        {tr('Direct payment (GCash & QRPh)')}
      </h2>

      <div className="my-3 rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-[rgb(var(--fmb-muted))]">
            {payment?.status === 'verified' ? 'Total amount paid' : 'Total amount due'}
          </span>
          <strong className="text-2xl font-extrabold text-[rgb(var(--fmb-accent))]">
            ₱{amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--fmb-border))] pt-2 text-xs text-[rgb(var(--fmb-muted))]">
          <span>5% Platform commission: ₱{commissionAmount.toFixed(2)}</span>
          <span>Provider net payout (95%): ₱{providerNet.toFixed(2)}</span>
        </div>
      </div>

      {payment?.status === 'verified' ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="customer-save-status m-0 flex items-center gap-2 font-semibold">
              <ShieldCheck size={20} />
              Demo payment simulated · Sample receipt available
            </p>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
              Demo only
            </span>
          </div>
          <div className="mt-3 grid gap-1.5 border-t border-emerald-500/20 pt-3 text-sm text-[rgb(var(--fmb-muted))]">
            <div className="flex justify-between">
              <span>Transaction Reference:</span>
              <strong className="text-[rgb(var(--fmb-text))]">{payment.reference || 'VERIFIED'}</strong>
            </div>
            <div className="flex justify-between">
              <span>Payee / Partner:</span>
              <strong className="text-[rgb(var(--fmb-text))]">{payment.payeeName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Booking Reference:</span>
              <strong className="text-[rgb(var(--fmb-text))]">{booking.reference}</strong>
            </div>
          </div>
          {booking.receiptAvailable && (
            <button
              type="button"
              className="auth-secondary mt-3 w-full"
              disabled={downloadingReceipt}
              onClick={handleDownloadReceipt}
            >
              <Download size={17} />
              {downloadingReceipt ? 'Preparing demo PDF receipt...' : 'Download demo PDF receipt'}
            </button>
          )}
        </div>
      ) : payment?.status === 'pending_verification' || reported ? (
        <div className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
          <p className="auth-hint m-0">
            {tr('Payment reference submitted. Waiting for provider confirmation, or complete instant verification below.')}
          </p>
          {payment?.reference && (
            <p className="mb-2 mt-1 text-sm">
              Reported Ref: <strong>{payment.reference}</strong>
            </p>
          )}
          <button
            type="button"
            className="auth-primary mt-3"
            disabled={Boolean(busy)}
            onClick={() => handleInstantPay('qrph')}
          >
            <CheckCircle2 size={18} />
            {busy ? 'Verifying...' : 'Complete Instant QRPh Verification'}
          </button>
        </div>
      ) : handoverPending ? (
        <p className="auth-hint">
          {tr('Confirm vehicle handover before paying for this tow.')}
        </p>
      ) : quotePending ? (
        <p className="auth-hint">
          {tr('Record your quote decision before proceeding to payment.')}
        </p>
      ) : (
        <div className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
          <div className="auth-segments mb-4" role="group" aria-label="Choose payment method">
            <button
              type="button"
              aria-pressed={method === 'gcash'}
              onClick={() => {
                setMethod('gcash');
                setError('');
              }}
              disabled={Boolean(busy)}
            >
              <Smartphone size={16} />
              GCash Checkout
            </button>
            <button
              type="button"
              aria-pressed={method === 'qrph'}
              onClick={() => {
                setMethod('qrph');
                setError('');
              }}
              disabled={Boolean(busy)}
            >
              <QrCode size={16} />
              QRPh National QR
            </button>
          </div>

          {method === 'gcash' ? (
            gcashStep === 'phone' ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-[#0057ff]/30 bg-[#0057ff]/15 p-3.5 text-sm">
                  <div className="flex items-center justify-between">
                    <strong className="text-base font-extrabold text-[#6da2ff]">
                      GCash Express Web Checkout
                    </strong>
                    <span className="rounded bg-[#0057ff] px-2 py-0.5 text-[11px] font-bold text-white">
                      GCash
                    </span>
                  </div>
                  <p className="mb-0 mt-1 text-xs text-[rgb(var(--fmb-muted))]">
                    Merchant: FixMyBuddy Escrow · {payment?.payeeName || booking.providerName} ({booking.reference})
                  </p>
                </div>

                <label className="request-field">
                  Demo mobile number (+63 / 09XX)
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="0917 123 4567"
                    maxLength={15}
                    value={gcashPhone}
                    onChange={(event) => setGcashPhone(event.target.value)}
                    disabled={Boolean(busy)}
                  />
                </label>

                <button
                  type="button"
                  className="auth-primary"
                  disabled={Boolean(busy) || gcashPhone.trim().length < 10}
                  onClick={startGcashCheckout}
                >
                  <Smartphone size={18} />
                  {busy === 'session'
                    ? 'Connecting to GCash...'
                    : `Continue with GCash (₱${amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-[#0057ff]/40 bg-[#0057ff]/10 p-4">
                <div className="flex items-center justify-between border-b border-[#0057ff]/25 pb-2.5">
                  <button
                    type="button"
                    className="customer-text-button text-xs"
                    onClick={() => {
                      setGcashStep('phone');
                      setError('');
                    }}
                    disabled={Boolean(busy)}
                  >
                    <ArrowLeft size={15} />
                    Change number
                  </button>
                  <span className="flex items-center gap-1 text-xs font-bold text-[#6da2ff]">
                    <Lock size={14} />
                    Demo checkout code · Not a real GCash login
                  </span>
                </div>

                <div className="grid gap-1 text-xs text-[rgb(var(--fmb-muted))]">
                  <div className="flex justify-between">
                    <span>Merchant:</span>
                    <strong className="text-[rgb(var(--fmb-text))]">
                      FixMyBuddy · {payment?.payeeName || booking.providerName}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>GCash Account:</span>
                    <strong className="text-[rgb(var(--fmb-text))]">{gcashPhone}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total to Authorize:</span>
                    <strong className="text-sm text-[#ffda45]">
                      ₱{amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                <label className="request-field">
                  Enter demo code 0000 · Never enter a real MPIN
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    maxLength={4}
                    value={gcashMpin}
                    onChange={(event) =>
                      setGcashMpin(event.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    disabled={Boolean(busy)}
                    autoFocus
                  />
                </label>

                <button
                  type="button"
                  className="auth-primary"
                  disabled={Boolean(busy) || gcashMpin.length < 4}
                  onClick={() => handleInstantPay('gcash')}
                >
                  <CheckCircle2 size={18} />
                  {busy === 'gcash'
                    ? 'Authorizing GCash payment...'
                    : `Authorize & Pay ₱${amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-3">
              {qrUrl && !qrFailed ? (
                <img
                  className="provider-payment-qr mx-auto"
                  src={qrUrl}
                  alt={trTemplate(
                    ['Payment QR supplied by ', ''],
                    [booking.providerName || tr('your provider')],
                  )}
                  referrerPolicy="no-referrer"
                  onError={() => setQrFailed(true)}
                />
              ) : (
                <QrPhMatrixSvg payload={qrPayload} amountDue={amountDue} />
              )}

              <div className="rounded-xl border border-[rgb(var(--fmb-border))] bg-black/20 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[rgb(var(--fmb-muted))]">Payee:</span>
                  <strong>{payment?.payeeName || booking.providerName}</strong>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[rgb(var(--fmb-muted))]">Booking Ref:</span>
                  <div className="flex items-center gap-1.5">
                    <strong>{booking.reference}</strong>
                    <button
                      type="button"
                      className="customer-text-button text-[11px]"
                      onClick={() => handleCopyReference(booking.reference)}
                    >
                      <Copy size={13} />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <p className="auth-hint m-0 text-center">
                Demo QR illustration only. Do not scan or send money.
              </p>

              <label className="request-field">
                {tr('QRPh / InstaPay reference no.')}
                <span className="request-optional">{tr('Optional')}</span>
                <input
                  maxLength={100}
                  placeholder="e.g. QRPH-94820183"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="auth-primary flex-1"
                  disabled={Boolean(busy)}
                  onClick={() => handleInstantPay('qrph')}
                >
                  <CheckCircle2 size={18} />
                  {busy === 'qrph'
                    ? 'Verifying QRPh...'
                    : `Pay ₱${amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} via QRPh`}
                </button>
                {payment?.reportable === true && (
                  <button
                    type="button"
                    className="auth-secondary flex-1"
                    disabled={Boolean(busy) || reported}
                    onClick={report}
                  >
                    {busy === 'payment' ? tr('Reporting...') : tr('Submit Ref for Provider Check')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {notice && (
        <p role="status" className="customer-save-status mt-3">
          {tr(notice)}
        </p>
      )}
      {error && (
        <p className="auth-error mt-3" role="alert">
          {tr(error)}
        </p>
      )}
    </div>
  );
}
