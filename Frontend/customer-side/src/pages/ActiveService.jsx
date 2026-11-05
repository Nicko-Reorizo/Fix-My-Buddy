import { Link, useParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { CustomerHeading } from '../components/customer/CustomerHeading';
import { MechanicProgress } from '../components/customer/MechanicProgress';
import { BookingPayment } from '../components/customer/BookingPayment';
import { BookingSharing } from '../components/customer/BookingSharing';
import { AfterService } from '../components/customer/AfterService';
import { LoadingState } from '../components/ui/LoadingState';
import { useCustomer } from '../context/useCustomer';
import { useLocale } from '../context/useLocale';

export function ActiveService() {
  const { bookingId } = useParams();
  const { bookings, bookingStatus, refreshData } = useCustomer();
  const { t } = useLocale();
  const booking = bookings.find(
    (item) => String(item.id) === bookingId && item.serviceType === 'mechanic',
  );

  return (
    <>
      <CustomerHeading
        title={t('Your mechanic service', 'Serbisyo ng iyong mekaniko')}
        backTo="/history"
      >
        {booking?.reference ||
          t(
            'Follow your service and stay in touch.',
            'Subaybayan ang serbisyo at makipag-ugnayan.',
          )}
      </CustomerHeading>
      {bookingStatus === 'loading' ? (
        <LoadingState />
      ) : bookingStatus !== 'ready' ? (
        <div className="history-notice">
          <p>
            {t(
              'Your service could not be loaded. Sign in or try again.',
              'Hindi makuha ang serbisyo. Mag-sign in o subukan muli.',
            )}
          </p>
          <button className="auth-secondary" type="button" onClick={refreshData}>
            {t('Try again', 'Subukan muli')}
          </button>
          <Link to="/signin" className="provider-text-link">
            {t('Sign in', 'Mag-sign in')}
          </Link>
        </div>
      ) : !booking ? (
        <p className="history-notice">
          {t(
            'This mechanic booking is not available to your account.',
            'Hindi available sa iyong account ang booking na ito.',
          )}
        </p>
      ) : (
        <>
          {booking.payment?.status !== 'verified' && !['cancelled', 'rejected'].includes(booking.status) && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ffda45]/40 bg-[#ffda45]/10 p-3.5">
              <div>
                <strong className="block text-sm font-bold text-[#ffda45]">
                  {t('Direct GCash & QRPh Checkout Ready', 'Handa na ang GCash at QRPh Checkout')}
                </strong>
                <span className="text-xs text-[rgb(var(--fmb-muted))]">
                  {t('Pay directly in the website with 5% platform escrow protection.', 'Magbayad diretso sa website.')}
                </span>
              </div>
              <Link
                className="auth-primary"
                to={`/bookings/${encodeURIComponent(booking.id)}/pay`}
              >
                <CreditCard size={17} />
                {t('Pay with GCash / QRPh', 'Magbayad sa GCash / QRPh')}
              </Link>
            </div>
          )}
          <MechanicProgress
            key={booking.id}
            booking={booking}
            onRefresh={refreshData}
          />
          {booking.mechanic?.workPaused === true && (
            <p className="request-safety">
              {booking.revisionStatus === 'awaiting_customer' ||
              booking.repairApprovalStatus === 'awaiting_customer'
                ? t(
                    'Your provider reports that work is paused. Review any pending quote below.',
                    'Ayon sa provider, nakahinto ang trabaho. Suriin ang quote na naghihintay ng pasya.',
                  )
                : t(
                    'Your provider reports that work is paused. Contact them for the next step.',
                    'Ayon sa provider, nakahinto ang trabaho. Makipag-ugnayan para sa susunod na hakbang.',
                  )}
            </p>
          )}
          <BookingPayment
            key={`${booking.id}-${booking.payment?.status}-${booking.pendingRevision?.id}-${booking.repairEstimate?.id}-${booking.revisionStatus}-${booking.repairApprovalStatus}`}
            booking={booking}
            onRefresh={refreshData}
          />
          <AfterService
            key={`${booking.id}-${booking.review?.id}-${booking.review?.version}-${booking.receiptAvailable}`}
            booking={booking}
            onRefresh={refreshData}
          />
          <BookingSharing
            key={`${booking.id}-${booking.sharing?.enabled}`}
            booking={booking}
          />
          <Link
            className="auth-secondary"
            to={`/history?booking=${encodeURIComponent(booking.id)}`}
          >
            {t(
              'Booking details, payment and receipts',
              'Detalye ng booking, bayad at resibo',
            )}
          </Link>
        </>
      )}
    </>
  );
}
