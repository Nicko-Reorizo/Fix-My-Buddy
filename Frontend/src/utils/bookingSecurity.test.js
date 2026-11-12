import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoApi } from '../demo/localApi.js';
import { sampleLocation, STORE_KEY } from '../demo/fixtures.js';

function storage() {
  const entries = new Map();
  return { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
}
function setup() {
  const local = storage(), session = storage();
  const api = createDemoApi(local, session);
  api.selectRole('customer');
  const provider = api.provider();
  const body = { bookingRequestId: 'security-request-1', serviceType: 'mechanic', vehicleId: 'demo-vehicle', issueType: 'Battery', notes: '', landmark: '', location: sampleLocation, providerId: provider.id, estimateId: provider.estimate.id, estimateVersion: provider.estimate.version, cancellationPolicyId: provider.cancellationPolicy.id };
  const book = details => api.request('/customers/me/bookings', { method: 'POST', body: details || body });
  return { api, local, session, body, book };
}

test('guests and provider accounts cannot book; other customers cannot read or change a booking', async () => {
  const { api, book } = setup();
  api.reset();
  await assert.rejects(book(), { status: 401 });
  api.selectRole('mechanic');
  await assert.rejects(book(), { status: 403 });
  api.selectRole('customer');
  const { booking } = await book();
  await api.request('/auth/login', { method: 'POST', body: { email: 'another@example.demo', password: 'demo-only' } });
  assert.equal((await api.request('/customers/me/bookings')).bookings.length, 0);
  await assert.rejects(api.request(`/customers/me/bookings/${booking.id}`), { status: 403 });
  await assert.rejects(api.request(`/customers/me/bookings/${booking.id}/cancel`, { method: 'POST' }), { status: 403 });
  await api.request('/mechanics/auth/login', { method: 'POST', body: { email: 'other-provider@example.demo', password: 'demo-only' } });
  assert.equal((await api.request('/mechanics/me/jobs')).jobs.length, 0);
  await assert.rejects(api.request(`/mechanics/me/jobs/${booking.id}/accept`, { method: 'POST' }), { status: 403 });
});

test('double submission and retry after reload return the same booking; changed confirmation is rejected', async () => {
  const { api, local, session, body, book } = setup();
  const results = await Promise.all([book(), book()]);
  assert.equal(results[0].booking.id, results[1].booking.id);
  const reloaded = createDemoApi(local, session);
  assert.equal((await reloaded.request('/customers/me/bookings', { method: 'POST', body })).booking.id, results[0].booking.id);
  await assert.rejects(book({ ...body, notes: 'Changed after confirmation' }), { status: 409 });
  assert.equal(api.read().bookings.filter(item => item.id === results[0].booking.id).length, 1);
});

test('booking requires valid pickup, vehicle, provider and accepted current estimate', async () => {
  const { api, body, book } = setup();
  await assert.rejects(book({ ...body, location: { address: '' } }), /pickup/);
  await assert.rejects(book({ ...body, vehicleId: 'missing' }), /vehicle/);
  await assert.rejects(book({ ...body, estimateId: 'outdated' }), /estimate/);
  await assert.rejects(book({ ...body, cancellationPolicyId: '' }), /terms/);
  api.selectRole('mechanic');
  await api.request('/mechanics/me/availability', { method: 'PATCH', body: { online: false } });
  api.selectRole('customer');
  await assert.rejects(book(), /unavailable/);
});

test('arrival PIN is customer-only, expires, limits attempts, and cannot be reused to start service', async () => {
  const { api, local, book } = setup();
  const { booking } = await book();
  const customerPath = `/customers/me/bookings/${booking.id}`;
  const providerPath = `/mechanics/me/jobs/${booking.id}`;
  await assert.rejects(api.request(`${customerPath}/accept`, { method: 'POST' }), { status: 403 });
  api.selectRole('mechanic');
  await assert.rejects(api.request(`${providerPath}/completion`, { method: 'POST' }), /Verify arrival/);
  await api.request(`${providerPath}/accept`, { method: 'POST' });
  await assert.rejects(api.request(`${providerPath}/mechanic/arrival-pin`), { status: 403 });
  api.selectRole('customer');
  const first = await api.request(`${customerPath}/mechanic/arrival-pin`);
  assert.match(first.pin, /^[0-9]{4}$/);
  assert.equal((await api.request(`${customerPath}/mechanic/arrival-pin`)).pin, first.pin);
  api.selectRole('mechanic');
  for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(api.request(`${providerPath}/arrival-verification`, { method: 'POST', body: { pin: '0000' } }), /Incorrect/);
  await assert.rejects(api.request(`${providerPath}/arrival-verification`, { method: 'POST', body: { pin: first.pin } }), { status: 429 });
  const state = api.read(); state.arrivalPins[booking.id].expiresAt = new Date(Date.now() - 1000).toISOString();
  local.setItem(STORE_KEY, JSON.stringify(state));
  await assert.rejects(api.request(`${providerPath}/arrival-verification`, { method: 'POST', body: { pin: first.pin } }), /current arrival PIN/);
  api.selectRole('customer');
  const renewed = await api.request(`${customerPath}/mechanic/arrival-pin`);
  api.selectRole('mechanic');
  const verified = await api.request(`${providerPath}/arrival-verification`, { method: 'POST', body: { pin: renewed.pin } });
  assert.equal(verified.job.status, 'in_progress');
  await assert.rejects(api.request(`${providerPath}/arrival-verification`, { method: 'POST', body: { pin: renewed.pin } }), { status: 409 });
});
