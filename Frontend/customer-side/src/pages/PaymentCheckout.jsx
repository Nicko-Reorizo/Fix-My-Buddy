import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { CustomerHeading } from '../components/customer/CustomerHeading';
import { BookingSummary } from '../components/customer/BookingSummary';
import { BookingPayment } from '../components/customer/BookingPayment';
import { VisitEstimate } from '../components/app/VisitEstimate';
import { LoadingState } from '../components/ui/LoadingState';
import { useCustomer } from '../context/useCustomer';
import { useLocale } from '../context/useLocale';

export function PaymentCheckout() {
  const { bookingId } = useParams();
  const [params] = useSearchParams();
  const { bookings, bookingStatus, refreshData } = useCustomer();
  const { t } = useLocale();

  const methodParam = params.get('method') === 'qrph' ? 'qrph' : 'gcash';
  const booking = bookings.find((item) => String(item.id) === String(bookingId));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [bookingId]);

  const backPath =
    booking?.serviceType === 'mechanic'
      ? `/bookings/${encodeURIComponent(booking.id)}/service`
      : booking
        ? `/history?booking=${encodeURIComponent(booking.id)}`
        : '/history';

  return (
    <>
      <CustomerHeading
        title={t('GCash & QRPh Checkout', 'GCash at QRPh Checkout')}
        backTo={backPath}
      >
        {booking?.reference
          ? `${booking.reference} · ${t('Direct in-website payment with 5% platform escrow protection.', 'Direktang bayad sa website na may 5% platform protection.')}`
          : t('Complete your roadside service payment securely.', 'Kumpletuhin ang bayad sa iyong serbisyo.')}
      </CustomerHeading>

      {bookingStatus === 'loading' ? (
        <LoadingState label={t('Loading checkout...', 'Binubuksan ang checkout...')} />
      ) : !booking ? (
        <div className="history-notice">
          <p>
            {t(
              'We could not find this booking for checkout.',
              'Hindi mahanap ang booking na ito para sa checkout.',
            )}
          </p>
          <Link className="auth-secondary" to="/history">
            {t('Go to bookings', 'Pumunta sa mga booking')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <BookingSummary booking={booking} detailed />

          {(booking.approvedQuote || booking.initialEstimate) && (
            <VisitEstimate
              estimate={booking.approvedQuote || booking.initialEstimate}
              service={booking.serviceType}
            />
          )}

          <BookingPayment
            key={`${booking.id}-${booking.payment?.status}-${methodParam}`}
            booking={booking}
            onRefresh={refreshData}
            initialMethod={methodParam}
          />

          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
            <Link className="auth-primary flex-1" to={backPath}>
              {booking.serviceType === 'mechanic'
                ? t('Track live mechanic location', 'Subaybayan ang live na lokasyon ng mekaniko')
                : t('Track live towing journey', 'Subaybayan ang live na towing')}
              <ArrowRight size={19} />
            </Link>
            <Link
              className="auth-secondary flex-1"
              to={`/history?booking=${encodeURIComponent(booking.id)}`}
            >
              <ShieldCheck size={18} />
              {t('Booking details & receipt', 'Detalye ng booking at resibo')}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
