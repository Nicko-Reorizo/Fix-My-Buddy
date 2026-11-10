import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createJsonRequest } from './apiRequest.js';
import { createProviderApi, automaticProvider } from './providerApi.js';

const provider = { id: 'qa-provider', name: 'QA only', rating: 4.2, etaMinutes: 18, distanceKm: 3, verified: true };
const details = { serviceType: 'mechanic', vehicleId: 'qa-vehicle', issueType: 'Battery', notes: '', landmark: 'QA landmark', scheduledAt: null, location: { latitude: 13.62, longitude: 123.18, address: 'QA address' }, filters: { radiusKm: 5, minimumRating: 4, specialty: 'Battery', verifiedOnly: true, maximumVisitPrice: 600, sort: 'price' } };

test('provider search sends full request/filters with session, no cache and no retries', async () => {
  const calls = [];
  const api = createProviderApi(createJsonRequest({ baseUrl: '/api', fetcher: async (url, options) => {
    calls.push({ url, options }); return Response.json({ providers: [provider], recommendedProviderId: provider.id });
  } }));
  const data = await api.searchProviders(details);
  assert.equal(data.providers[0].etaMinutes, 18);
  assert.equal(data.providers[0].estimate, undefined); // Never fabricate a missing price.
  assert.equal(calls.length, 1); assert.equal(calls[0].url, '/api/providers/search');
  assert.equal(calls[0].options.credentials, 'include'); assert.equal(calls[0].options.cache, 'no-store');
  assert.deepEqual(JSON.parse(calls[0].options.body), details);
});
test('quote refresh posts request and pickup, accepts only the requested provider', async () => {
  const calls = [];
  const api = createProviderApi(async (url, options) => { calls.push({ url, options }); return { provider }; });
  await api.getProvider(provider.id, { request: details, location: details.location });
  assert.equal(calls[0].url, '/providers/qa-provider/quote');
  assert.equal(calls[0].options.expireSession, true);
  assert.deepEqual(calls[0].options.body.location, details.location);
  await assert.rejects(api.getProvider('wrong-provider', { request: details, location: details.location }), /could not be read/);
});
test('empty results are valid; malformed metrics, duplicate IDs and unknown recommendations are rejected', async () => {
  assert.deepEqual(await createProviderApi(async () => ({ providers: [], recommendedProviderId: null })).searchProviders(details), { providers: [], recommendedProviderId: null });
  for (const data of [
    { providers: [provider], recommendedProviderId: 'missing' },
    { providers: [provider, provider] },
    { providers: [{ ...provider, rating: 6 }] },
    { providers: [{ ...provider, etaMinutes: -1 }] },
    { providers: [{ ...provider, latitude: 91, longitude: 123 }] },
    { providers: [{ ...provider, distanceKm: '3' }] },
    { providers: null },
  ]) await assert.rejects(createProviderApi(async () => data).searchProviders(details), /could not be read/);
});
test('bad pickup, schedule or filters never reaches provider endpoints', async () => {
  let called = false;
  const api = createProviderApi(async () => { called = true; });
  for (const body of [
    { ...details, location: { address: 'Current GPS location' } },
    { ...details, scheduledAt: '2000-01-01' },
    { ...details, filters: { ...details.filters, sort: 'unknown' } },
    { ...details, filters: { ...details.filters, minimumRating: 7 } },
    { ...details, filters: { ...details.filters, radiusKm: 31 } },
  ]) await assert.rejects(api.searchProviders(body));
  assert.equal(called, false);
});
test('automatic matching uses only server recommendation and respects a valid manual choice', () => {
  const data = { providers: [provider], recommendedProviderId: provider.id };
  assert.equal(automaticProvider(data, 'manual', ''), null);
  assert.equal(automaticProvider(data, 'auto', provider.id), null);
  assert.equal(automaticProvider(data, 'auto', 'stale-provider'), provider);
  assert.equal(automaticProvider({ ...data, recommendedProviderId: null }, 'auto', ''), null);
  assert.equal(automaticProvider({ providers: [], recommendedProviderId: null }, 'auto', ''), null);
});
test('provider API preserves 401/429 errors, timeout and caller cancellation', async () => {
  for (const status of [401, 429]) {
    const api = createProviderApi(createJsonRequest({ baseUrl: '/api', fetcher: async () => Response.json({}, { status }) }));
    await assert.rejects(api.searchProviders(details), error => error.status === status);
  }
  const api = createProviderApi(createJsonRequest({ baseUrl: '/api', timeoutMs: 5, fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
  }) }));
  await assert.rejects(api.searchProviders(details), error => error.code === 'timeout');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(api.searchProviders(details, controller.signal), { name: 'AbortError' });
});
