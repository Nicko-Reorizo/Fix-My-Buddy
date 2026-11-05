import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  KeyRound,
  MapPin,
  MessageCircle,
  Navigation,
  Radio,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../../customer-side/src/context/useAuth';
import { mechanicService } from '../services/mechanicService';
import { MechanicLocationEditor } from '../components/MechanicLocationEditor';
import { MechanicHeader } from '../components/MechanicHeader';
import { ReceivedReviews } from '../components/ReceivedReviews';
import { LiveTrackingMap } from '../../../customer-side/src/components/customer/LiveTrackingMap';
import { JobLocationSharing } from '../components/JobLocationSharing';

const php = (amount) =>
  `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function useLiveData(load) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setData(await load());
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }, [load]);

  useEffect(() => {
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function fetchData() {
      if (pending) return;
      pending = true;
      try {
        const next = await load(controller.signal);
        if (active) {
          setData(next);
          setError('');
        }
      } catch (failure) {
        if (active) setError(failure.message);
      } finally {
        pending = false;
      }
    }
    void fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  return { data, error, refresh };
}

function Message({ error, data, loadingLabel = 'Loading workspace…' }) {
  if (error) {
    return (
      <p role="alert" className="auth-error my-3">
        {error}
      </p>
    );
  }
  if (!data) {
    return (
      <div className="my-4 rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4 text-base text-[rgb(var(--fmb-muted))]" role="status">
        {loadingLabel}
      </div>
    );
  }
  return null;
}

export function LiveAccount({ availability = false }) {
  const { signOut } = useAuth();
  const load = useCallback((signal) => mechanicService.getProfile(signal), []);
  const { data: profile, error, refresh } = useLiveData(load);
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [locationDraft, setLocationDraft] = useState(null);
  const selectedLocation = locationDraft || profile?.location;

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setResult('');
    const form = new FormData(event.currentTarget);
    try {
      const online = form.get('online') === 'on';
      await mechanicService.updateAvailability({
        online,
        location: selectedLocation || undefined,
        serviceRadiusKm: Number(form.get('radius')),
        services: form.getAll('services'),
      });
      await refresh();
      setLocationDraft(null);
      setResult('Availability and service location saved.');
    } catch (failure) {
      setResult(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <MechanicHeader
        showBrand={false}
        title={availability ? 'Your availability' : 'Your mechanic account'}
        subtitle="Manage your live dispatch status, service radius, and specialties."
      />
      <Message error={error} data={profile} loadingLabel="Loading your mechanic profile…" />

      {profile && (
        <>
          <section className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[rgb(var(--fmb-accent))] text-lg font-extrabold text-[rgb(var(--fmb-bg))]">
                  {profile.initials || 'MP'}
                </span>
                <div>
                  <h2 className="m-0 text-lg font-bold">{profile.name}</h2>
                  <p className="m-0 text-sm text-[rgb(var(--fmb-muted))]">
                    {profile.email} {profile.mobile ? `· ${profile.mobile}` : ''}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  profile.online
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-500/20 text-[rgb(var(--fmb-muted))]'
                }`}
              >
                <Radio size={13} className={profile.online ? 'animate-pulse' : ''} />
                {profile.online ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[rgb(var(--fmb-border))] pt-3 text-sm">
              <div>
                <span className="block text-xs text-[rgb(var(--fmb-muted))]">Verification</span>
                <strong className="mt-0.5 inline-flex items-center gap-1 font-semibold">
                  <BadgeCheck size={16} className="text-[rgb(var(--fmb-accent))]" />
                  {profile.identityVerified ? 'Verified Provider' : 'Pending Verification'}
                </strong>
              </div>
              <div>
                <span className="block text-xs text-[rgb(var(--fmb-muted))]">Customer Rating</span>
                <strong className="mt-0.5 block font-semibold">
                  {profile.reviewsCount > 0
                    ? `${profile.rating.toFixed(2)} / 5 (${profile.reviewsCount})`
                    : 'No ratings yet'}
                </strong>
              </div>
            </div>

            {profile.credentials?.length > 0 && (
              <p className="mb-0 mt-3 text-xs text-[rgb(var(--fmb-muted))]">
                Credentials: {profile.credentials.join(' · ')}
              </p>
            )}
          </section>

          <form
            className="flex flex-col gap-4 rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4"
            key={`${profile.id}-${profile.online}-${profile.serviceRadiusKm}-${profile.specialties.join(',')}`}
            onSubmit={save}
          >
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[rgb(var(--fmb-selected))] p-3.5 font-semibold">
              <span>Available for new roadside requests</span>
              <input
                type="checkbox"
                name="online"
                defaultChecked={profile.online}
                className="h-5 w-5 accent-[rgb(var(--fmb-accent))]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Service radius (km)
              <input
                className="auth-input"
                type="number"
                name="radius"
                min="1"
                max="50"
                defaultValue={profile.serviceRadiusKm}
                required
              />
            </label>

            <fieldset className="m-0 rounded-xl border border-[rgb(var(--fmb-border))] p-3">
              <legend className="px-1 text-sm font-semibold text-[rgb(var(--fmb-accent))]">
                Services you provide
              </legend>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {[
                  'Battery',
                  'Flat tire',
                  'Overheating',
                  'Fuel delivery',
                  'Lockout',
                  'Not starting',
                  'Towing',
                ].map((service) => (
                  <label
                    key={service}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[rgb(var(--fmb-border))] px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="services"
                      value={service}
                      defaultChecked={profile.specialties.includes(service)}
                      className="h-4 w-4 accent-[rgb(var(--fmb-accent))]"
                    />
                    <span>{service}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <MechanicLocationEditor
              value={selectedLocation}
              onChange={setLocationDraft}
              disabled={busy}
            />

            <p className="m-0 text-xs text-[rgb(var(--fmb-muted))]">
              Distance pricing is automatically computed per 100 meters between your pinned GPS location and the customer.
            </p>

            <button className="auth-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save availability & location'}
            </button>
          </form>

          {result && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-200" role="status">
              {result}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Link to="/mechanic/jobs" className="auth-secondary">
              View my jobs
            </Link>
            <ReceivedReviews />
            <button
              type="button"
              className="auth-secondary"
              onClick={async () => {
                try {
                  await mechanicService.updateAvailability({ online: false });
                  await signOut();
                } catch (failure) {
                  setResult(failure.message);
                }
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function LiveJobs() {
  const load = useCallback((signal) => mechanicService.getJobs({ signal }), []);
  const { data: jobs, error } = useLiveData(load);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <MechanicHeader
        showBrand={false}
        title="Your roadside jobs"
        subtitle="Requests sent to your account. Updates refresh every 5 seconds."
      />
      <Link className="auth-secondary" to="/mechanic/availability">
        Manage availability & GPS pin
      </Link>
      <Message error={error} data={jobs} loadingLabel="Loading your roadside jobs…" />

      {jobs?.length === 0 && (
        <section className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-6 text-center">
          <BriefcaseBusiness size={32} className="mx-auto mb-2 text-[rgb(var(--fmb-accent))]" />
          <h2 className="m-0 text-lg font-bold">No jobs assigned yet</h2>
          <p className="mb-0 mt-1 text-sm text-[rgb(var(--fmb-muted))]">
            Go online and share your location to appear in nearby customer matches.
          </p>
        </section>
      )}

      <div className="flex flex-col gap-3">
        {jobs?.map((job) => (
          <Link
            key={job.id}
            className="block rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4 text-inherit no-underline transition hover:border-[rgb(var(--fmb-accent))]"
            to={`/mechanic/jobs/${encodeURIComponent(job.id)}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--fmb-accent))]">
                {job.reference} · {job.type === 'towing' ? 'Towing' : 'Mechanic'}
              </span>
              <span className="rounded-full bg-[rgb(var(--fmb-selected))] px-2.5 py-0.5 text-xs font-semibold capitalize">
                {String(job.status).replaceAll('_', ' ')}
              </span>
            </div>
            <h2 className="mb-1 mt-1.5 text-lg font-bold">{job.service}</h2>
            <p className="m-0 text-sm font-medium">
              {job.customer.name} · {job.vehicle}
            </p>
            <p className="mb-0 mt-1 flex items-center gap-1 text-xs text-[rgb(var(--fmb-muted))]">
              <MapPin size={14} className="shrink-0 text-[rgb(var(--fmb-accent))]" />
              <span className="truncate">{job.location}</span>
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-[rgb(var(--fmb-border))] pt-2.5 text-sm">
              <span>
                Gross: <strong>{php(job.visitEstimate)}</strong>
              </span>
              <span className="text-xs text-[rgb(var(--fmb-muted))]">
                Net (95%): <strong className="text-[rgb(var(--fmb-accent))]">{php(job.estimatedNet)}</strong>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function LiveJob() {
  const { jobId } = useParams();
  const load = useCallback((signal) => mechanicService.getJob(jobId, signal), [jobId]);
  const { data: job, error, refresh } = useLiveData(load);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  async function act(action, details) {
    if (busy) return;
    setBusy(true);
    setFeedback('');
    try {
      await mechanicService[action](jobId, details);
      await refresh();
      setFeedback('Saved.');
    } catch (failure) {
      setFeedback(failure.message);
    } finally {
      setBusy(false);
    }
  }

  const pending =
    job && ['requested', 'pending', 'confirmed', 'scheduled'].includes(job.status);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <MechanicHeader
        showBrand={false}
        title="Job workspace"
        subtitle={job ? `${job.reference} · ${String(job.status).replaceAll('_', ' ')}` : 'Loading job…'}
      />
      <Message error={error} data={job} loadingLabel="Loading job details…" />

      {job && (
        <div className="flex flex-col gap-4">
          {/* Customer & Vehicle Card */}
          <section className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-[rgb(var(--fmb-accent))]">
                  {job.service}
                </span>
                <h2 className="m-0 mt-0.5 text-xl font-bold">{job.customer.name}</h2>
                <p className="m-0 mt-0.5 text-sm text-[rgb(var(--fmb-muted))]">{job.vehicle}</p>
              </div>
              <span className="rounded-full bg-[rgb(var(--fmb-selected))] px-3 py-1 text-xs font-bold uppercase">
                {String(job.status).replaceAll('_', ' ')}
              </span>
            </div>
            <p className="mb-0 mt-3 text-sm leading-relaxed text-[rgb(var(--fmb-muted))]">
              {job.description}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[rgb(var(--fmb-selected))] p-3 text-center text-xs">
              <div>
                <span className="block text-[rgb(var(--fmb-muted))]">Total Quoted</span>
                <strong className="mt-0.5 block text-sm font-bold">{php(job.visitEstimate)}</strong>
              </div>
              <div>
                <span className="block text-[rgb(var(--fmb-muted))]">5% Platform Fee</span>
                <strong className="mt-0.5 block text-sm font-bold">
                  {php(job.platformCommission ?? job.visitEstimate * 0.05)}
                </strong>
              </div>
              <div>
                <span className="block text-[rgb(var(--fmb-muted))]">Your Net (95%)</span>
                <strong className="mt-0.5 block text-sm font-bold text-[rgb(var(--fmb-accent))]">
                  {php(job.estimatedNet)}
                </strong>
              </div>
            </div>

            {job.initialEstimate?.items?.length > 0 && (
              <div className="mt-3 border-t border-[rgb(var(--fmb-border))] pt-3 text-xs text-[rgb(var(--fmb-muted))]">
                {job.initialEstimate.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-0.5">
                    <span>{item.label}</span>
                    <span>{php(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="auth-secondary flex-1"
                to={`/mechanic/jobs/${encodeURIComponent(jobId)}/chat`}
              >
                <MessageCircle size={17} />
                Chat with customer
              </Link>
              {job.pickup?.latitude != null && job.pickup?.longitude != null && (
                <a
                  className="auth-secondary flex-1"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${job.pickup.latitude},${job.pickup.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation size={17} />
                  Google Maps
                </a>
              )}
            </div>
          </section>

          {/* Live Map & GPS Broadcast Controls for En Route / Active Jobs */}
          {(job.pickup?.latitude != null || job.providerLocation) && (
            <section className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
              <h3 className="m-0 text-base font-bold">Live Customer Tracking Map</h3>
              <p className="mb-2 mt-1 text-xs text-[rgb(var(--fmb-muted))]">
                Your live coordinates are shown on the customer’s screen in real time.
              </p>

              <LiveTrackingMap
                providerPosition={job.providerLocation}
                pickupPosition={job.pickup}
                providerName="You (Provider)"
                serviceType={job.type === 'towing' ? 'towing' : 'mechanic'}
                etaMinutes={job.etaMinutes}
                distanceMeters={job.distanceMeters}
                status={job.status}
                updatedAt={job.providerLocation?.updatedAt}
              />

              <JobLocationSharing jobId={jobId} active={['en_route', 'accepted', 'in_progress'].includes(job.status)} />
            </section>
          )}

          {/* Accept / Decline Offer */}
          {pending && (
            <section className="flex flex-col gap-2.5 rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
              <h3 className="m-0 text-base font-bold">Respond to dispatch request</h3>
              <button
                disabled={busy}
                className="auth-primary"
                onClick={() => act('acceptJob')}
              >
                <CheckCircle2 size={18} />
                Accept request & go en route
              </button>
              <button
                disabled={busy}
                className="auth-secondary"
                onClick={() => act('declineJob', 'Unavailable')}
              >
                Decline request
              </button>
            </section>
          )}

          {/* Arrival PIN Verification */}
          {job.status === 'en_route' && (
            <form
              className="flex flex-col gap-3 rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                act('verifyArrival', {
                  pin: new FormData(event.currentTarget).get('pin'),
                });
              }}
            >
              <h3 className="m-0 flex items-center gap-2 text-base font-bold">
                <KeyRound size={18} className="text-[rgb(var(--fmb-accent))]" />
                Verify arrival with customer PIN
              </h3>
              <p className="m-0 text-xs text-[rgb(var(--fmb-muted))]">
                Ask the customer for the 4-digit Arrival PIN displayed on their service screen.
              </p>
              <input
                className="auth-input"
                name="pin"
                placeholder="4-digit PIN"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                required
              />
              <button disabled={busy} className="auth-primary">
                Verify arrival & start service
              </button>
            </form>
          )}

          {/* In-Progress Service Controls */}
          {job.status === 'in_progress' && (
            <div className="flex flex-col gap-4">
              <form
                className="flex flex-col gap-3 rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  act('submitDiagnosis', {
                    findings: new FormData(event.currentTarget).get('findings'),
                  });
                }}
              >
                <h3 className="m-0 text-base font-bold">1. Vehicle Diagnosis</h3>
                <textarea
                  className="auth-input"
                  name="findings"
                  rows={3}
                  placeholder="Describe findings (e.g., dead 12V battery cell, alternator voltage normal)…"
                  defaultValue={job.mechanicState?.diagnosis?.summary || ''}
                  required
                />
                <button disabled={busy} className="auth-secondary">
                  Save diagnosis
                </button>
              </form>

              <form
                className="flex flex-col gap-3 rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  act('submitQuote', {
                    items: [
                      {
                        label: f.get('label'),
                        amount: Number(f.get('amount')),
                      },
                    ],
                  });
                }}
              >
                <h3 className="m-0 text-base font-bold">2. Repair Quote (Customer Approval)</h3>
                <input
                  className="auth-input"
                  name="label"
                  placeholder="Repair work / part item"
                  required
                />
                <input
                  className="auth-input"
                  type="number"
                  min="0"
                  step="0.01"
                  name="amount"
                  placeholder="Amount (PHP)"
                  required
                />
                <button disabled={busy} className="auth-secondary">
                  Send quote for customer approval
                </button>
                <p className="m-0 text-xs text-[rgb(var(--fmb-muted))]">
                  {job.approvedQuote
                    ? `Approved quote: ${php(job.approvedQuote.total)}`
                    : job.repairEstimate
                      ? 'Quote sent — awaiting customer decision.'
                      : 'No additional repair quote submitted.'}
                </p>
              </form>

              <form
                className="flex flex-col gap-3 rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  act('updateJobProgress', {
                    message: new FormData(event.currentTarget).get('message'),
                  });
                  event.currentTarget.reset();
                }}
              >
                <h3 className="m-0 text-base font-bold">3. Progress Updates</h3>
                <textarea
                  className="auth-input"
                  name="message"
                  rows={2}
                  placeholder="Send a live status update to the customer…"
                  required
                />
                <button disabled={busy} className="auth-secondary">
                  Send progress update
                </button>
                {job.mechanicState?.updates?.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 border-t border-[rgb(var(--fmb-border))] pt-2 text-xs">
                    {job.mechanicState.updates.map((update) => (
                      <div key={update.id} className="rounded-lg bg-[rgb(var(--fmb-selected))] p-2">
                        {update.body}
                      </div>
                    ))}
                  </div>
                )}
              </form>

              <button
                disabled={busy}
                className="auth-primary"
                onClick={() => act('completeJob', {})}
              >
                <CheckCircle2 size={18} />
                Mark service completed
              </button>
            </div>
          )}

          {/* GCash / QRPh Payment Status & Confirmation */}
          <section className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
            <h3 className="m-0 flex items-center gap-2 text-base font-bold">
              <Wallet size={18} className="text-[rgb(var(--fmb-accent))]" />
              GCash / QRPh Payment & 5% Commission
            </h3>
            <p className="mb-3 mt-1 text-xs text-[rgb(var(--fmb-muted))]">
              Status:{' '}
              <strong className="uppercase text-[rgb(var(--fmb-text))]">
                {String(job.paymentStatus || 'unverified').replaceAll('_', ' ')}
              </strong>
              {job.paymentReference ? ` · Ref: ${job.paymentReference}` : ''}
            </p>

            {job.paymentStatus === 'verified' ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                <strong className="flex items-center gap-1.5 text-emerald-300">
                  <ShieldCheck size={17} />
                  Payment Verified ({php(job.paidAmount || job.visitEstimate)})
                </strong>
                <span className="mt-1 block text-xs text-[rgb(var(--fmb-muted))]">
                  5% Platform Fee: {php(job.platformCommission)} · Credited Net Payout: {php(job.estimatedNet)}
                </span>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                className="auth-secondary w-full"
                onClick={() => act('confirmJobPayment', {})}
              >
                <CheckCircle2 size={17} />
                Confirm QRPh / GCash Payment Received ({php(job.visitEstimate)})
              </button>
            )}
          </section>

          {feedback && (
            <div className="rounded-xl border border-[rgb(var(--fmb-accent))] bg-[rgb(var(--fmb-selected))] p-3 text-sm font-semibold" role="status">
              {feedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LiveEarnings() {
  const load = useCallback((signal) => mechanicService.getEarnings({ signal }), []);
  const { data, error } = useLiveData(load);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <MechanicHeader
        showBrand={false}
        title="Your earnings"
        subtitle="Recorded services, GCash/QRPh payments, and 5% platform commission."
      />
      <Message error={error} data={data} loadingLabel="Loading your earnings…" />

      {data && (
        <>
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fmb-muted))]">
                Net Earnings (95%)
              </span>
              <strong className="mt-1 block text-2xl font-extrabold text-[rgb(var(--fmb-accent))]">
                {php(data.netEarnings)}
              </strong>
              <span className="mt-1 block text-xs text-[rgb(var(--fmb-muted))]">
                After 5% platform fee
              </span>
            </div>

            <div className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fmb-muted))]">
                Gross Collected
              </span>
              <strong className="mt-1 block text-2xl font-extrabold">
                {php(data.grossCollected)}
              </strong>
              <span className="mt-1 block text-xs text-[rgb(var(--fmb-muted))]">
                5% Fee: {php(data.platformCommission ?? data.grossCollected * 0.05)} · {data.completedJobs} completed
              </span>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="m-0 text-base font-bold">Transaction History</h2>
            {data.history?.length === 0 ? (
              <div className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-5 text-center text-sm text-[rgb(var(--fmb-muted))]">
                No completed transactions yet.
              </div>
            ) : (
              data.history.map((item) => (
                <Link
                  key={item.jobId}
                  to={`/mechanic/jobs/${encodeURIComponent(item.jobId)}`}
                  className="block rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4 text-inherit no-underline"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-base">{item.reference || item.jobId}</strong>
                    <span className="rounded-full bg-[rgb(var(--fmb-selected))] px-2.5 py-0.5 text-xs font-semibold capitalize">
                      {item.paymentStatus === 'verified' ? 'Paid · Verified' : String(item.status).replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className="mb-2 mt-1 text-sm text-[rgb(var(--fmb-muted))]">
                    {item.service} · {item.date}
                    {item.paymentReference ? ` · ${item.paymentReference}` : ''}
                  </p>
                  <div className="grid grid-cols-3 gap-2 border-t border-[rgb(var(--fmb-border))] pt-2 text-xs">
                    <div>
                      <span className="block text-[rgb(var(--fmb-muted))]">Gross</span>
                      <strong>{php(item.gross || item.quotedGross)}</strong>
                    </div>
                    <div>
                      <span className="block text-[rgb(var(--fmb-muted))]">5% Fee</span>
                      <strong>{php(item.commission ?? (item.gross || item.quotedGross) * 0.05)}</strong>
                    </div>
                    <div>
                      <span className="block text-[rgb(var(--fmb-muted))]">Net (95%)</span>
                      <strong className="text-[rgb(var(--fmb-accent))]">
                        {php(item.net ?? (item.gross || item.quotedGross) * 0.95)}
                      </strong>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function LiveUpdates() {
  const load = useCallback((signal) => mechanicService.getUpdates(signal), []);
  const { data, error } = useLiveData(load);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <MechanicHeader
        showBrand={false}
        title="Your updates"
        subtitle="Dispatch alerts, payment confirmations, and job notifications."
      />
      <Message error={error} data={data} loadingLabel="Loading notifications…" />

      {data?.length === 0 && (
        <div className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-6 text-center text-sm text-[rgb(var(--fmb-muted))]">
          No notifications yet.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data?.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-base font-bold">{item.title}</h2>
              {item.time && (
                <span className="inline-flex items-center gap-1 text-xs text-[rgb(var(--fmb-muted))]">
                  <Clock3 size={13} />
                  {item.time}
                </span>
              )}
            </div>
            <p className="mb-0 mt-1.5 text-sm leading-relaxed text-[rgb(var(--fmb-muted))]">
              {item.message}
            </p>
            {item.jobId && (
              <Link
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[rgb(var(--fmb-accent))]"
                to={`/mechanic/jobs/${encodeURIComponent(item.jobId)}`}
              >
                Open job {item.jobId} →
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
