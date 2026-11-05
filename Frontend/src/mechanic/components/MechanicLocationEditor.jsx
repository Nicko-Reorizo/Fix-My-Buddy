import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { getPosition } from '../services/location';
import { validCoordinates } from '../../../customer-side/src/utils/locationAddress';
import { sampleLocation } from '../../../customer-side/src/demo/fixtures';

export function MechanicLocationEditor({ value, onChange, disabled }) {
  const canvas = useRef(null);
  const map = useRef(null);
  const initial = useRef(value);
  const select = useRef(onChange);
  const selection = useRef(value);
  const locked = useRef(disabled);
  const programmatic = useRef(false);
  const request = useRef(null);
  const revision = useRef(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  select.current = onChange;
  selection.current = value;
  locked.current = disabled;

  useEffect(() => {
    const instance = L.map(canvas.current);
    map.current = instance;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(instance);
    if (validCoordinates(initial.current)) instance.setView([initial.current.latitude, initial.current.longitude], 16);
    else instance.fitBounds([[4.5,116],[21.2,127]]);
    instance.on('moveend', () => {
      if (programmatic.current || locked.current) return;
      const center = instance.getCenter();
      if (validCoordinates(selection.current) && center.equals([selection.current.latitude, selection.current.longitude], 1e-7)) return;
      revision.current += 1;
      select.current({ latitude: center.lat, longitude: center.wrap().lng, source: 'manual', address: '' });
    });
    instance.on('click', event => instance.panTo(event.latlng, { animate: false }));
    const observer = new ResizeObserver(() => {
      programmatic.current = true;
      instance.invalidateSize({ pan: false });
      programmatic.current = false;
    });
    observer.observe(canvas.current);
    return () => {
      revision.current += 1;
      request.current?.abort();
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !validCoordinates(value)) return;
    const center = map.current.getCenter();
    if (center.equals([value.latitude,value.longitude], 1e-7)) return;
    programmatic.current = true;
    map.current.setView([value.latitude,value.longitude], 16, { animate: false });
    programmatic.current = false;
  }, [value]);

  async function search() {
    if (query.trim().length < 3) { setError('Enter at least three characters to search for an address.'); return; }
    const attempt = ++revision.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setBusy(true); setError(''); setResults([]);
    try {
      const places = [{ ...sampleLocation, source: 'manual', address: `${query.trim()} · Sample address, Naga City` }];
      if (attempt !== revision.current) return;
      setResults(places);
      if (!places.length) setError('No addresses found. Try a city and street, or choose a map pin.');
    } catch (failure) {
      if (attempt === revision.current) setError(failure.name === 'AbortError' ? 'Address search timed out. Choose a map pin or try again.' : failure.message);
    } finally { clearTimeout(timeout); if (request.current === controller) setBusy(false); }
  }

  async function locate() {
    const attempt = ++revision.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); setResults([]);
    try {
      const position = await getPosition(controller.signal);
      if (attempt === revision.current) onChange({ ...position, source: 'gps', address: '' });
    } catch (failure) { if (attempt === revision.current) setError(failure.message); }
    finally { if (request.current === controller) setBusy(false); }
  }

  return <fieldset className="mechanic-location-editor" disabled={disabled}>
    <legend className="font-semibold">Your service location</legend>
    <p className="text-[rgb(var(--fmb-muted))]">Use GPS, search for your address, or move the map to place your pin.</p>
    <label htmlFor="mechanic-address-search">Find an address</label>
    <div className="flex gap-2">
      <input id="mechanic-address-search" className="auth-input min-w-0 flex-1" value={query} placeholder="Street, barangay, city" onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} />
      <button type="button" className="auth-secondary" style={{ width: 'auto' }} disabled={busy} onClick={search} aria-label="Search address"><Search size={20} /></button>
    </div>
    {results.length > 0 && <ul className="list-none p-0" aria-label="Address results">{results.map((place,index) => <li key={`${place.latitude}-${place.longitude}-${index}`}><button type="button" className="text-left w-full border-b border-[rgb(var(--fmb-border))] py-3" onClick={() => { revision.current += 1; onChange(place); setResults([]); setError(''); }}>{place.address}</button></li>)}</ul>}
    <button type="button" className="auth-secondary my-3" disabled={busy} onClick={locate}><LocateFixed size={19} />{busy ? 'Finding location…' : 'Use my GPS location'}</button>
    <div className="relative overflow-hidden rounded-xl border border-[rgb(var(--fmb-border))]">
      <div ref={canvas} style={{ height: 280, width: '100%' }} role="region" aria-label="Mechanic location map. Drag the map, click a place, or use the arrow keys to position your pin." />
      <MapPin className="location-picker-pin" size={42} aria-hidden="true" />
    </div>
    <p className="text-sm">{validCoordinates(value) ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)} · ${value.source === 'gps' ? 'GPS location' : 'Selected map pin'}` : 'No location selected. Move the map, select an address result, or use GPS.'}</p>
    <label htmlFor="mechanic-location-address">Address / landmark (optional)</label>
    <input id="mechanic-location-address" className="auth-input" value={value?.address || ''} maxLength={300} disabled={!validCoordinates(value) || disabled} onChange={event => onChange({ ...value, address: event.target.value })} />
    <p className="text-sm text-[rgb(var(--fmb-muted))]">An address search result sets the pin. Typing an address label alone does not change coordinates. Save availability to apply changes.</p>
    {value?.source === 'manual' && <p className="text-sm">Customers will be matched to this pin. GPS will not replace it. Update the pin whenever you move, or choose GPS for automatic location updates.</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
  </fieldset>;
}
