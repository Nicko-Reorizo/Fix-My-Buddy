import { tr } from "../../i18n/translations";
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, LocateFixed, ShieldCheck } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import { useCustomer } from '../../context/useCustomer';
import { issuesFor } from '../../data/requestIssues';
import { validateSchedule } from '../../utils/vehicleValidation';
import { RequestFrame } from '../../components/app/RequestFrame';
import { RequestVehicle } from '../../components/app/RequestVehicle';
import { useGeolocation } from '../../hooks/useGeolocation';
import { validateRequestDraft } from '../../utils/requestDraft';
export function RequestAssistance() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    request,
    updateRequest,
    location,
    setLocation
  } = useApp();
  const {
    selectedVehicle,
    vehicleStatus,
    vehicleError
  } = useCustomer();
  const [error, setError] = useState('');
  const { requestLocation, cancelLocation, status: gpsStatus, error: gpsError } = useGeolocation();
  async function locate() {
    const next = await requestLocation();
    if (next) { setLocation(next); setError(''); }
  }
  const service = ['mechanic', 'towing'].includes(params.get('service')) ? params.get('service') : request.serviceType;
  const options = issuesFor(service);
  const selected = options.some(item => item.title === request.issueType) ? request.issueType : '';
  useEffect(() => {
    if (service !== request.serviceType) updateRequest({
      serviceType: service,
      issueType: ''
    });
  }, [service, request.serviceType, updateRequest]);
  if (service === 'towing') return <Navigate to="/request/towing" replace />;
  if (vehicleStatus === 'loading') return <RequestFrame title={tr("Your vehicle")} subtitle={tr("Loading your vehicles...")} />;
  if (vehicleStatus === 'error') return <RequestFrame title={tr("Could not load vehicles")} subtitle={vehicleError || tr("Please return home and try again.")} />;
  if (!selectedVehicle) return <Navigate to={`/vehicles?continue=${service}`} replace />;
  function submit(event) {
    event.preventDefault();
    if (!selected) {
      setError('Choose the closest match to continue.');
      return;
    }
    if (request.scheduledAt && validateSchedule(request.scheduledAt)) {
      setError('Your scheduled time has passed. Return home to choose a new time.');
      return;
    }
    const problem = validateRequestDraft({ ...request, vehicleId: selectedVehicle.id }, location);
    if (problem) { setError(problem); return; }
    updateRequest({ vehicleId: selectedVehicle.id, matchingMode: 'auto' });
    navigate('/providers');
  }
  return <RequestFrame title={tr("Get roadside help")} subtitle={tr("Check your pickup and choose the closest issue. Review the estimate before booking.")}>
    <form onSubmit={submit} className="request-form">
      <RequestVehicle vehicle={selectedVehicle} service={service} />
      <label className="request-field">{tr('Pickup location')}
        <input required maxLength={300} autoComplete="street-address" value={location.address === 'Use current location' ? '' : location.address || ''} placeholder={tr('Street, barangay and city')} onChange={event => {
          cancelLocation();
          setLocation({ address: event.target.value, latitude: null, longitude: null, source: 'Manual address' });
          setError('');
        }} />
      </label>
      <button type="button" className="auth-secondary" onClick={locate} disabled={gpsStatus === 'loading'}><LocateFixed size={20} />{tr(gpsStatus === 'loading' ? 'Locating...' : 'Use my current location')}</button>
      {gpsError && <p className="auth-error" role="alert">{tr(gpsError)}</p>}
      <fieldset className="request-issues"><legend className="sr-only">{tr("Choose your issue")}</legend>
        {options.map(({
          title,
          description,
          icon: Icon
        }) => <label key={title} className={`request-issue ${selected === title ? 'is-selected' : ''}`}>
          <input type="radio" name="issue" value={title} checked={selected === title} onChange={() => {
            updateRequest({
              issueType: title
            });
            setError('');
          }} />
          <Icon size={24} /><span><strong>{tr(title)}</strong><small>{tr(description)}</small></span>{selected === title ? <CheckCircle2 size={20} /> : <ChevronRight size={20} />}
        </label>)}
      </fieldset>
      <details className="towing-more"><summary>{tr('Notes or landmark (optional)')}</summary>
        <label className="request-field">{tr('Issue description')}<textarea rows={2} maxLength={2000} value={request.notes} onChange={event => updateRequest({ notes: event.target.value })} /></label>
        <label className="request-field">{tr('Landmark / instructions')}<textarea rows={2} maxLength={500} value={request.landmark} onChange={event => updateRequest({ landmark: event.target.value })} /></label>
      </details>
      <div className="request-safety"><ShieldCheck size={20} /><p>{tr('Stay clear of traffic. Check your assigned provider before sharing your arrival PIN in person. Booking does not approve repairs or payment.')}</p></div>
      {error && <p className="auth-error" role="alert">{tr(error)}</p>}
      <button className="auth-primary request-continue" type="submit" disabled={gpsStatus === 'loading'}><ArrowRight size={20} />{tr('Find help & review estimate')}</button>
    </form>
  </RequestFrame>;
}
