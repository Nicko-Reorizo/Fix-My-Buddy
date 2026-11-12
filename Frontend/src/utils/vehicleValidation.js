import { isEmail, normalizePhone } from './authValidation.js';

export function cleanPlate(value = '') {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function validateVehicle(vehicle, vehicles = [], editingId = null) {
  const errors = {};
  if (!['car', 'motorcycle'].includes(vehicle.type))
    errors.type = 'Choose a vehicle type.';
  if (typeof vehicle.make !== 'string' || !vehicle.make.trim() || vehicle.make.length > 60) errors.make = 'Enter the vehicle brand (up to 60 characters).';
  if (typeof vehicle.model !== 'string' || !vehicle.model.trim() || vehicle.model.length > 80) errors.model = 'Enter the model (up to 80 characters).';
  const year = Number(vehicle.year);
  if (vehicle.year != null && String(vehicle.year).trim() !== '' && (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > new Date().getFullYear() + 1
  ))
    errors.year = 'Enter a valid model year.';
  if (vehicle.color != null && (typeof vehicle.color !== 'string' || vehicle.color.length > 40)) errors.color = 'Use up to 40 characters for the color.';
  const plate = cleanPlate(vehicle.plate);
  if (plate && !/^[A-Z0-9 -]{2,15}$/.test(plate))
    errors.plate = 'Use 2 to 15 letters, numbers, spaces, or hyphens.';
  if (
    plate &&
    vehicles.some(
      (item) =>
        item.id !== editingId &&
        cleanPlate(item.plate).replace(/[ -]/g, '') ===
          plate.replace(/[ -]/g, ''),
    )
  )
    errors.plate = 'A vehicle with this plate is already saved.';
  return errors;
}

export function normalizeVehicle(vehicle) {
  return {
    type: vehicle.type,
    make: vehicle.make.trim(),
    model: vehicle.model.trim(),
    year: vehicle.year == null || String(vehicle.year).trim() === '' ? null : Number(vehicle.year),
    color: vehicle.color?.trim() || '',
    plate: cleanPlate(vehicle.plate),
  };
}

export function validateSchedule(value, now = Date.now()) {
  return !value || Number.isNaN(Date.parse(value)) || Date.parse(value) <= now
    ? 'Choose a date and time in the future.'
    : '';
}

export function localDateTime(date = new Date()) {
  const part = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

export function validateCustomerSetup(details) {
  const errors = {};
  const name = typeof details.name === 'string' ? details.name.trim() : '';
  const email = typeof details.email === 'string' ? details.email.trim() : '';
  if (name.length < 2 || name.length > 100) errors.name = 'Enter your name (2 to 100 characters).';
  if (!isEmail(email) || email.length > 254) errors.email = 'Enter a valid email address.';
  if (typeof details.password !== 'string' || details.password.length < 8 || !/[0-9]/.test(details.password)) errors.password = 'Use at least 8 characters, including a number.';
  if (details.phone && !normalizePhone(details.phone)) errors.phone = 'Enter a valid Philippine mobile number.';
  Object.assign(errors, validateVehicle(details.vehicle || {}));
  if (details.acceptedTerms !== true) errors.terms = 'Please agree to the Terms and acknowledge the Privacy Policy.';
  return errors;
}
