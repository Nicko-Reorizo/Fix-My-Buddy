import test from 'node:test';
import assert from 'node:assert/strict';
import { createJsonRequest } from './apiRequest.js';
import { createAuthApi, createVehicleApi } from './customerAccountApi.js';

const customer = { id: 'qa-customer', name: 'QA account', role: 'customer', phoneVerified: true, emergencyContact: null };
const vehicle = { id: 'qa-vehicle', type: 'car', make: 'QA brand', model: 'QA model', year: 2020, color: 'Silver', plate: 'QA 1234' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
test('API client sends same-origin JSON with credentials, no cache, and no automatic retries', async () => {
  const calls = [];
  const request = createJsonRequest({ baseUrl: '/api/', fetcher: async (...args) => { calls.push(args); return json({ error: 'Invalid credentials.' }, 401); } });
  await assert.rejects(request('/auth/login', { method: 'POST', body: { email: 'qa@example.test' } }), error => error.status === 401 && error.message === 'Invalid credentials.');
  assert.equal(calls.length, 1); assert.equal(calls[0][0], '/api/auth/login');
  assert.equal(calls[0][1].credentials, 'include'); assert.equal(calls[0][1].cache, 'no-store');
  assert.deepEqual(JSON.parse(calls[0][1].body), { email: 'qa@example.test' });
});
test('API client rejects HTML fallback and hides backend internal errors', async () => {
  const html = createJsonRequest({ baseUrl: '/api', fetcher: async () => new Response('<html>Wrong route</html>') });
  await assert.rejects(html('/auth/session'), error => error.code === 'invalid_response');
  const failed = createJsonRequest({ baseUrl: '/api', fetcher: async () => json({ error: 'Internal SQL and private diagnostic' }, 500) });
  await assert.rejects(failed('/customers/me'), error => error.status === 500 && !error.message.includes('SQL'));
});
test('API client handles timeout, caller cancellation, and 204 acknowledgements', async () => {
  const hangingFetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError')), { once: true }));
  const request = createJsonRequest({ baseUrl: '/api', fetcher: hangingFetch, timeoutMs: 5 });
  await assert.rejects(request('/customers/me'), error => error.code === 'timeout');
  const controller = new AbortController();
  const result = request('/customers/me', { signal: controller.signal }); controller.abort();
  await assert.rejects(result, error => error.name === 'AbortError');
  const logout = createJsonRequest({ baseUrl: '/api', fetcher: async () => new Response(null, { status: 204 }) });
  assert.equal(await logout('/auth/logout', { method: 'POST' }), null);
});
test('auth rejects malformed session and legacy signup challenges', async () => {
  await assert.rejects(createAuthApi(async () => ({})).session(), /confirm your session/);
  assert.equal(await createAuthApi(async () => ({ user: null })).session(), null);
  await assert.rejects(createAuthApi(async () => ({ challenge: { id: 'qa' } })).signup({}), /confirm your session/);
});
test('customer login includes the customer role and returns a session', async () => {
  const calls = [];
  const auth = createAuthApi(async (path, options) => { calls.push({ path, ...options }); return { user: customer }; });
  assert.deepEqual(await auth.login('qa@example.test','test-only','customer'), { user: customer });
  assert.equal(calls[0].body.role, 'customer');
});
test('signup accepts a complete authenticated user immediately', async () => {
  let sent;
  const auth = createAuthApi(async (path, options) => { sent = { path, ...options }; return { user: customer }; });
  const result = await auth.signup({ name: 'QA signup', email: 'qa@example.test', phone: '+639170000000', password: 'test-only', acceptedTerms: true, role: 'customer' });
  assert.deepEqual(result, { user: customer });
  assert.equal(sent.path, '/auth/signup'); assert.equal(sent.body.role, 'customer');
});

test('mechanic authentication uses dedicated endpoints and rejects customer sessions', async () => {
  const calls = [];
  const mechanic = { ...customer, role: 'mechanic' };
  const auth = createAuthApi(async (path, options) => { calls.push({ path, ...options }); return { user: mechanic }; });
  await auth.login('qa@example.test', 'secret1', 'mechanic');
  await auth.signup({ role: 'mechanic' });
  assert.equal(calls[0].path, '/mechanics/auth/login');
  assert.equal(calls[0].body.role, 'mechanic');
  assert.equal(calls[1].path, '/mechanics/auth/signup');
  await assert.rejects(createAuthApi(async () => ({ user: customer })).login('qa@example.test', 'secret1', 'mechanic'), /different workspace/);
});
test('profile rejects wrong account, unsaved names, and unconfirmed emergency contact changes', async () => {
  const auth = createAuthApi(async () => ({ user: customer }));
  await assert.rejects(auth.profile({ name: 'QA changed' }, customer.id), /profile change/);
  await assert.rejects(auth.profile({}, 'another-account'), /account update/);
  const emergencyContact = { name: 'QA contact', phone: '+639170000000', relationship: 'Friend' };
  await assert.rejects(auth.profile({ emergencyContact }, customer.id), /emergency contact/);
  assert.equal((await createAuthApi(async () => ({ user: { ...customer, emergencyContact } })).profile({ emergencyContact }, customer.id)).emergencyContact.name, 'QA contact');
  assert.equal((await auth.profile({ emergencyContact: null }, customer.id)).emergencyContact, null);
});
test('vehicle CRUD uses backend IDs, validates responses, and requires a successful delete acknowledgement', async () => {
  const calls = [];
  const api = createVehicleApi(async (path, options) => { calls.push({ path, ...options }); return path.endsWith('/vehicles') && !options ? { vehicles: [vehicle] } : options?.method === 'DELETE' ? null : { vehicle }; });
  assert.equal((await api.vehicles())[0].id, vehicle.id);
  assert.equal((await api.saveVehicle(vehicle)).id, vehicle.id);
  assert.equal((await api.saveVehicle(vehicle, vehicle.id)).id, vehicle.id);
  await api.removeVehicle(vehicle.id); assert.equal(calls[3].method, 'DELETE');
  await assert.rejects(createVehicleApi(async () => ({ vehicles: [{ id: 'broken' }] })).vehicles(), /incomplete vehicle/);
  await assert.rejects(createVehicleApi(async () => ({ vehicle })).saveVehicle(vehicle,'wrong-id'), /which vehicle/);
  await assert.rejects(createVehicleApi(async () => { throw new Error('Delete failed'); }).removeVehicle(vehicle.id), /Delete failed/);
  await assert.rejects(createVehicleApi(async () => ({ ok: false })).removeVehicle(vehicle.id), /confirm vehicle removal/);
  await assert.rejects(createAuthApi(async () => ({ ok: false })).logout(), /confirm sign-out/);
});
