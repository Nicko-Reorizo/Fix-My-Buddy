import { tr } from "../../i18n/translations";
import { useEffect, useState } from 'react';
import { MapPin, LocateFixed, ArrowRight } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RequestFrame } from '../../components/app/RequestFrame';
import { PickupPreview } from '../Welcome';
import { useApp } from '../../context/useApp';
import { useCustomer } from '../../context/useCustomer';
import { validCoordinates, hasStreetAddress } from '../../utils/locationAddress';
import { useGeolocation } from '../../hooks/useGeolocation';
export function ConfirmLocation() {
  const {
    request,
    updateRequest,
    location,
    setLocation
  } = useApp();
  const {
    selectedVehicle,
    vehicleStatus
  } = useCustomer();
  const {
    requestLocation,
    cancelLocation,
    status,
    error: gpsError
  } = useGeolocation();
  const [address, setAddress] = useState(location.address === 'Use current location' ? '' : location.address);

  const [error, setError] = useState('');
  useEffect(() => {
    setAddress(location.address === 'Use current location' ? '' : location.address);

  }, [location.address, location.latitude, location.longitude]);
  const navigate = useNavigate();
  const hasCoordinates = validCoordinates(location);
  if (vehicleStatus === 'loading') return <RequestFrame title={tr("Your vehicle")} subtitle={tr("Loading...")} />;
  if (request.serviceType === 'towing') return <Navigate to="/request/towing" replace />;
  if (!selectedVehicle || !request.issueType || request.serviceType === 'towing' && request.destination.trim().length < 5) return <Navigate to="/request" replace />;
  async function locate() {
    const result = await requestLocation();
    if (result) {
      setLocation(result);
      setAddress(result.address);

      setError('');
    }
  }
  function submit(event) {
    event.preventDefault();

    if (!hasCoordinates && !hasStreetAddress(address)) {
      setError('Use GPS or enter a full pickup address.');
      return;
    }
    setLocation(current => ({
      ...current,
      address: address.trim() || 'Selected map location',
      landmark: request.landmark.trim()
    }));
    updateRequest({
      vehicleId: selectedVehicle.id
    });
    navigate('/providers');
  }
  return <RequestFrame backTo="/request/details" title={tr("Confirm your location")} subtitle={tr("We'll send your buddy to this spot.")}>
    <form className="request-form" onSubmit={submit}>
      <PickupPreview compact onLocate={locate} locating={status === 'loading'} />
      <label className="request-field"><span className="request-label-icon"><MapPin size={19} />{tr("Pickup location")}</span>
        <input value={address} maxLength={300} placeholder={tr("Street, barangay and city")} autoComplete="street-address" onChange={event => {
          cancelLocation();
          setAddress(event.target.value);
          setLocation({
            address: event.target.value,
            latitude: null,
            longitude: null,
            source: 'Manual address'
          });
          setError('');
        }} />
      </label>
      <div className="request-location-actions"><button type="button" className="auth-secondary" onClick={locate} disabled={status === 'loading'}><LocateFixed size={18} />{status === 'loading' ? tr("Locating...") : tr("Use GPS")}</button></div>      {!hasCoordinates && <p className="auth-hint">{tr("A typed address has no confirmed map pin. Check the full address carefully, or use GPS to confirm the pickup spot.")}</p>}
      <label className="request-field">{tr("Landmark / instructions")}<span className="request-optional">{tr("Optional")}</span><textarea rows={3} maxLength={500} value={request.landmark} placeholder={tr("Nearby landmark, road side, or access instructions")} onChange={event => updateRequest({
          landmark: event.target.value
        })} /></label>
      <p className="auth-hint">{tr("Check your pickup location and stay clear of moving traffic.")}</p>
      {(error || gpsError) && <p className="auth-error" role="alert">{error || gpsError}</p>}
      <button type="submit" disabled={status === 'loading'} className="auth-primary request-continue"><ArrowRight size={20} />{tr("Confirm & find providers")}</button>
    </form>
  </RequestFrame>;
}
