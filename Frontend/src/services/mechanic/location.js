import { getDeviceLocation } from '../../utils/deviceLocation.js';

export async function getPosition(signal) {
  const { latitude, longitude } = await getDeviceLocation(globalThis.navigator?.geolocation, signal);
  return { latitude, longitude };
}
