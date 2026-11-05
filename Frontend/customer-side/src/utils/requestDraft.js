import { validCoordinates, hasStreetAddress } from './locationAddress.js';
import { validateSchedule } from './vehicleValidation.js';

export function validateRequestDraft(request, location, now = Date.now()) {
  if (!['mechanic', 'towing'].includes(request.serviceType) || !request.vehicleId || !request.issueType?.trim()) return 'Choose a vehicle and service issue before booking.';
  if (!validCoordinates(location) && !hasStreetAddress(location?.address)) return 'Use GPS or enter a full pickup address.';
  if (request.scheduledAt && validateSchedule(request.scheduledAt, now)) return 'Choose a date and time in the future.';
  if (typeof request.notes !== 'string' || request.notes.length > 2000) return 'Keep your issue description within 2,000 characters.';
  if (typeof request.landmark !== 'string' || request.landmark.length > 500) return 'Keep your landmark instructions within 500 characters.';
  return '';
}
