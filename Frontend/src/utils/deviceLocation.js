import { validCoordinates } from './locationAddress.js';

export function getDeviceLocation(geolocation, signal, context = globalThis) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let attempt = 0;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      callback(value);
    };
    const abort = () => finish(reject, new DOMException('Location request cancelled.', 'AbortError'));
    if (signal?.aborted) return abort();
    if (context.isSecureContext === false) return finish(reject, new Error('Location access requires HTTPS. Open the secure website link, or choose your location on the map.'));
    const policy = context.document?.permissionsPolicy || context.document?.featurePolicy;
    if (policy?.allowsFeature && !policy.allowsFeature('geolocation')) return finish(reject, new Error('Location is blocked in this embedded browser. Open this page directly in your browser, or choose a map pin.'));
    if (!geolocation?.getCurrentPosition) return finish(reject, new Error('GPS is unavailable in this browser. Enter your address or choose a map pin manually.'));
    signal?.addEventListener('abort', abort, { once: true });
    function request(highAccuracy) {
      const currentAttempt = ++attempt;
      try {
        geolocation.getCurrentPosition(position => {
          if (settled || currentAttempt !== attempt) return;
          const timestamp = new Date(position?.timestamp);
          const next = {
            latitude: position?.coords?.latitude, longitude: position?.coords?.longitude,
            accuracy: position?.coords?.accuracy,
            updatedAt: Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : new Date().toISOString(),
            address: 'Current GPS location', source: 'GPS active',
          };
          if (!validCoordinates(next)) return finish(reject, new Error('GPS returned an invalid location. Try again or enter your address.'));
          finish(resolve, next);
        }, failure => {
          if (settled || currentAttempt !== attempt) return;
          // Desktops and devices indoors may have network location but no GPS fix.
          if (highAccuracy && [2, 3].includes(failure?.code)) return request(false);
          const messages = {
            1: 'Location access is blocked. Allow location for this website in your browser and device settings, or choose a map pin manually.',
            2: 'GPS could not find your position. Turn on device location, try again, or enter your address manually.',
            3: 'GPS took too long. Try again or enter your address manually.',
          };
          const error = new Error(messages[failure?.code] || messages[2]);
          error.code = failure?.code;
          finish(reject, error);
        }, { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 10000 : 15000, maximumAge: 15000 });
      } catch { finish(reject, new Error('GPS could not start. Try again or enter your address manually.')); }
    }
    request(true);
  });
}
