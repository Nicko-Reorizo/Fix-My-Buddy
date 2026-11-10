import { tr, trTemplate } from "../../i18n/translations";
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Clock3, Wrench, Star, LoaderCircle, RefreshCw } from 'lucide-react';
import { RequestFrame } from '../../components/app/RequestFrame';
import { ProviderIdentity } from '../../components/app/ProviderIdentity';
import { VisitEstimate } from '../../components/app/VisitEstimate';
import { useApp } from '../../context/useApp';
import { getProvider } from '../../services/providerService';
import { validTowingCondition, validTowingQuote } from '../../utils/towingValidation';
import { TowingRouteSummary } from '../../components/customer/TowingRouteSummary';
import { validEstimate } from '../../utils/bookingValidation';

export function ProviderProfile() {
  const { providerId } = useParams();
  const { request, location, setSearchProviders, setSelectedProviderId } = useApp();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    setProfile(null);
    setError('');
    getProvider(providerId, { request, location }, controller.signal)
      .then((provider) => {
        if (controller.signal.aborted) return;
        setProfile(provider);
        setSearchProviders((current) => [
          ...current.filter((item) => String(item.id) !== String(provider.id)),
          provider,
        ]);
      })
      .catch((problem) => {
        if (!controller.signal.aborted) setError(problem.message);
      });
    return () => controller.abort();
  }, [providerId, request, location, retry, setSearchProviders]);

  const provider = profile?.id === providerId ? profile : null;
  const canReview = Boolean(
    provider &&
      validEstimate(provider.estimate) &&
      provider.cancellationPolicy?.id &&
      provider.cancellationPolicy.text &&
      (request.serviceType !== 'towing' ||
        (validTowingCondition(request.towingCondition) &&
          validTowingQuote(provider.towingQuote))),
  );

  const metersLabel =
    provider && Number.isFinite(provider.distanceKm)
      ? `${Math.max(100, Math.round(provider.distanceKm * 1000)).toLocaleString('en-PH')} m (${provider.distanceKm} km)`
      : '';

  return (
    <RequestFrame
      title={
        request.serviceType === 'towing'
          ? tr('Meet your towing buddy')
          : tr('Meet your mechanic')
      }
      subtitle={tr('Get to know your provider before booking.')}
      backTo="/providers"
    >
      <div className="request-form">
        {error && (
          <div className="provider-empty" role="alert">
            <h2>{tr('Could not load this profile')}</h2>
            <p>{tr(error)}</p>
            <button
              className="auth-secondary"
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              <RefreshCw size={18} />
              {tr('Try again')}
            </button>
          </div>
        )}
        {!profile && !error && (
          <p className="provider-loading" role="status">
            <LoaderCircle size={24} className="auth-spin" />
            {tr('Loading profile and current estimate...')}
          </p>
        )}
        {provider && (
          <>
            <section className="provider-profile-summary">
              <ProviderIdentity provider={provider} />
              <dl>
                <div>
                  <dt>
                    <Clock3 size={18} />
                    {tr('Estimated arrival')}
                    {metersLabel ? ` · ${metersLabel} away` : ''}
                  </dt>
                  <dd>
                    {Number.isFinite(provider.etaMinutes)
                      ? trTemplate(['', ' min'], [provider.etaMinutes])
                      : tr('Pending')}
                  </dd>
                </div>
                {Number.isFinite(provider.jobsCompleted) && (
                  <div>
                    <dt>
                      <Wrench size={18} />
                      {tr('Jobs completed')}
                    </dt>
                    <dd>{provider.jobsCompleted}</dd>
                  </div>
                )}
              </dl>
              {provider.verified === true &&
                Array.isArray(provider.credentials) && (
                  <p className="provider-credentials">
                    {provider.credentials.join(' · ')}
                  </p>
                )}
            </section>
            {Array.isArray(provider.specialties) && (
              <div className="provider-tools">
                {provider.specialties.map((item) => (
                  <span className="provider-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            )}
            {request.serviceType === 'towing' && (
              <TowingRouteSummary quote={provider.towingQuote} />
            )}
            <VisitEstimate
              estimate={provider.estimate}
              service={request.serviceType}
            />
            <section className="provider-reviews">
              <h2>{tr('What customers say')}</h2>
              {Array.isArray(provider.customerReviews) &&
              provider.customerReviews.length ? (
                provider.customerReviews.map((review, index) => (
                  <article key={review.id || index}>
                    <header>
                      <span>
                        {review.authorName || tr('Customer')}
                        {review.createdAt &&
                        Number.isFinite(Date.parse(review.createdAt))
                          ? trTemplate(
                              [' · ', ''],
                              [
                                new Date(review.createdAt).toLocaleDateString(
                                  'en-PH',
                                ),
                              ],
                            )
                          : ''}
                      </span>
                      {Number.isFinite(review.rating) && (
                        <strong>
                          {review.rating.toFixed(1)} <Star size={13} />
                        </strong>
                      )}
                    </header>
                    <p>{review.text}</p>
                  </article>
                ))
              ) : (
                <p className="auth-hint">
                  {tr(
                    'No customer reviews have been returned for this profile.',
                  )}
                </p>
              )}
            </section>
          </>
        )}
        <button
          type="button"
          className="auth-primary request-continue"
          disabled={!canReview}
          onClick={() => {
            setSelectedProviderId(profile.id);
            navigate('/confirm-request');
          }}
        >
          <Check size={20} />
          {tr('Review booking')}
        </button>
        {profile && !canReview && (
          <p className="auth-hint" role="status">
            {tr(
              'A current estimate, provider terms and any required towing route are needed before booking.',
            )}
          </p>
        )}
        <Link className="provider-text-link" to="/providers">
          {tr('See other buddies')}
        </Link>
      </div>
    </RequestFrame>
  );
}
