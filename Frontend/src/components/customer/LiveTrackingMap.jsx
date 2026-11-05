import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock3, MapPin, Navigation, Radio } from 'lucide-react';
import { validPosition } from '../../utils/towingValidation';
import { useBookingTracking } from '../../hooks/useBookingTracking';
import { latestPosition } from '../../utils/trackingConnection';

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function LiveTrackingMap({
  providerPosition: initialPosition,
  bookingId,
  trackingEnabled = false,
  pickupPosition,
  providerName = 'Your provider',
  serviceType = 'mechanic',
  etaMinutes,
  distanceMeters: reportedMeters,
  updatedAt: initialUpdatedAt,
}) {
  const { position: streamedPosition, connection } = useBookingTracking(bookingId, trackingEnabled);
  const providerPosition = latestPosition(streamedPosition, initialPosition);
  const updatedAt = providerPosition?.updatedAt || initialUpdatedAt;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  const fresh = Number.isFinite(Date.parse(updatedAt)) && now - Date.parse(updatedAt) < 60000;
  const live = trackingEnabled && connection === 'connected' && fresh;
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const providerMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const hasFitBoundsRef = useRef(false);

  const hasProvider = validPosition(providerPosition);
  const hasPickup = validPosition(pickupPosition);

  const computedMeters =
    hasProvider && hasPickup
      ? haversineMeters(
          Number(providerPosition.latitude),
          Number(providerPosition.longitude),
          Number(pickupPosition.latitude),
          Number(pickupPosition.longitude),
        )
      : reportedMeters != null && Number.isFinite(Number(reportedMeters))
        ? Number(reportedMeters)
        : null;

  const liveEta =
    Number.isFinite(Number(etaMinutes)) && Number(etaMinutes) > 0
      ? Number(etaMinutes)
      : null;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    map.setView([14.5995, 120.9842], 14);

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      providerMarkerRef.current = null;
      pickupMarkerRef.current = null;
      routeLineRef.current = null;
      hasFitBoundsRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const providerIcon = L.divIcon({
      className: 'fmb-live-provider-pin',
      html: `<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#f5b82e;color:#081c18;font-weight:800;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,0.45);border:2px solid #ffffff;white-space:nowrap;">
        <span>${serviceType === 'towing' ? '🛻' : '🔧'}</span>
        <span>${serviceType === 'towing' ? 'Tow' : 'Mechanic'}</span>
      </div>`,
      iconSize: [96, 32],
      iconAnchor: [48, 16],
    });

    const pickupIcon = L.divIcon({
      className: 'fmb-live-pickup-pin',
      html: `<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#3dd6a3;color:#062019;font-weight:800;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,0.45);border:2px solid #ffffff;white-space:nowrap;">
        <span>📍</span>
        <span>You</span>
      </div>`,
      iconSize: [72, 32],
      iconAnchor: [36, 16],
    });

    const points = [];
    let frame;

    if (hasProvider) {
      const latLng = [
        Number(providerPosition.latitude),
        Number(providerPosition.longitude),
      ];
      points.push(latLng);
      if (!providerMarkerRef.current) {
        providerMarkerRef.current = L.marker(latLng, { icon: providerIcon })
          .addTo(map)
          .bindPopup(document.createTextNode(`${providerName} (${serviceType === 'towing' ? 'Tow truck' : 'Mechanic'})`));
      } else {
        const marker = providerMarkerRef.current;
        const from = marker.getLatLng();
        const start = performance.now();
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
        function animate(time) {
          const progress = duration === 0 ? 1 : Math.min(1, (time - start) / duration);
          marker.setLatLng([from.lat + (latLng[0] - from.lat) * progress, from.lng + (latLng[1] - from.lng) * progress]);
          if (progress < 1) frame = requestAnimationFrame(animate);
        }
        frame = requestAnimationFrame(animate);
      }
    }

    if (hasPickup) {
      const latLng = [
        Number(pickupPosition.latitude),
        Number(pickupPosition.longitude),
      ];
      points.push(latLng);
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker(latLng, { icon: pickupIcon })
          .addTo(map)
          .bindPopup(document.createTextNode(pickupPosition.address || 'Your pickup location'));
      } else {
        pickupMarkerRef.current.setLatLng(latLng);
      }
    }

    if (points.length === 2) {
      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline(points, {
          color: '#3dd6a3',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.9,
        }).addTo(map);
      } else {
        routeLineRef.current.setLatLngs(points);
      }

      if (!hasFitBoundsRef.current) {
        map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 16 });
        hasFitBoundsRef.current = true;
      } else {
        map.panTo(points[0], { animate: true });
      }
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
    return () => cancelAnimationFrame(frame);
  }, [
    hasProvider,
    hasPickup,
    providerPosition?.latitude,
    providerPosition?.longitude,
    pickupPosition?.latitude,
    pickupPosition?.longitude,
    pickupPosition?.address,
    providerName,
    serviceType,
  ]);

  const timeString =
    updatedAt && Number.isFinite(Date.parse(updatedAt))
      ? new Date(updatedAt).toLocaleTimeString('en-PH', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
        })
      : null;

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-[rgb(var(--fmb-border))] bg-[rgb(var(--fmb-panel))]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--fmb-border))] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--fmb-selected))] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[rgb(var(--fmb-success))]">
            <Radio size={14} className={live ? 'motion-safe:animate-pulse' : ''} />
            {live ? 'Live GPS · On the way' : trackingEnabled ? fresh ? 'Saved GPS · reconnecting' : 'Waiting for fresh GPS' : 'Saved service location'}
          </span>
          <span className="text-sm font-semibold">{providerName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[rgb(var(--fmb-muted))]">
          {computedMeters != null && (
            <span className="inline-flex items-center gap-1 font-semibold text-[rgb(var(--fmb-text))]">
              <Navigation size={15} className="text-[rgb(var(--fmb-accent))]" />
              Straight-line: {computedMeters >= 1000
                ? `${(computedMeters / 1000).toFixed(2)} km (${computedMeters.toLocaleString('en-PH')} m)`
                : `${computedMeters.toLocaleString('en-PH')} m away`}
            </span>
          )}
          {liveEta != null && (
            <span className="inline-flex items-center gap-1 font-semibold text-[rgb(var(--fmb-accent))]">
              <Clock3 size={15} />Estimated ~{liveEta} min{liveEta === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ height: '250px', width: '100%' }}
        aria-label="Live provider and customer tracking map"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--fmb-border))] px-4 py-2.5 text-xs text-[rgb(var(--fmb-muted))]">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} className="text-[rgb(var(--fmb-accent))]" />
          {pickupPosition?.address || 'Pinned customer pickup'}
        </span>
        <span>
          {timeString ? `Last GPS ping: ${timeString}${fresh ? '' : ' · may be out of date'}` : 'Waiting for device GPS'}
        </span>
      </div>
    </div>
  );
}
