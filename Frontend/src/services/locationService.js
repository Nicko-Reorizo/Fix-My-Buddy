import { validCoordinates } from '../utils/locationAddress';

export async function lookupAddress(position) {
  if (!validCoordinates(position)) throw new Error('Choose a valid location.');
  return `Demo pin, Naga City (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)})`;
}
