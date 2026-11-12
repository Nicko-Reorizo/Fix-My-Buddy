import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoApi, demoReceipt } from '../demo/localApi.js';
import { demoPages } from '../demo/pages.js';
import { createAuthApi, createVehicleApi } from './customerAccountApi.js';
import { createProviderApi } from './providerApi.js';
import { validEstimate } from './bookingValidation.js';
import { validQuoteDecision } from './quoteValidation.js';
import { validReview } from './afterServiceValidation.js';
import { validArrivalPin } from './activeServiceValidation.js';
import { sampleLocation } from '../demo/fixtures.js';
import { readFileSync, readdirSync } from 'node:fs';

const repository = new URL('../../../', import.meta.url);
const migrationPages = JSON.parse(readFileSync(new URL('migration-pages.json', repository), 'utf8'));
function pageFiles(folder) {
  return readdirSync(new URL(folder, repository), { withFileTypes: true }).flatMap(entry => {
    const file = `${folder}${entry.name}`;
    return entry.isDirectory() ? pageFiles(`${file}/`) : file.endsWith('.jsx') ? [file] : [];
  });
}

function storage() { const values = new Map(); return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; }
test('all 53 original page files have exactly one team owner and a demo route', () => {
  assert.equal(demoPages.length, 53);
  assert.equal(new Set(demoPages.map(page => page.file)).size, 53);
  assert.deepEqual([1, 2, 3, 4, 5].map(member => demoPages.filter(page => page.member === member).length), [6, 12, 6, 18, 11]);
  assert.deepEqual(demoPages, migrationPages.map(({ exports: requiredExports, ...page }) => { assert.ok(requiredExports.length); return page; }));
  const actual = pageFiles('Frontend/src/pages/');
  assert.deepEqual(actual.sort(), demoPages.map(page => page.file).sort(), 'every actual page has exactly one assignment');
  for (const page of migrationPages) {
    const source = readFileSync(new URL(page.file, repository), 'utf8');
    const exported = [...source.matchAll(/^export (?:async )?(?:function|const|class)\s+(\w+)/gm)].map(match => match[1]);
    for (const block of source.matchAll(/^export\s*\{([^}]+)\}/gm)) {
      exported.push(...block[1].split(',').map(part => part.trim().split(/\s+as\s+/).at(-1)));
    }
    if (/^export default/m.test(source)) exported.push('default');
    for (const name of page.exports) assert.ok(exported.includes(name), `${page.file} must preserve export ${name}`);
  }
});
test('browser-only authentication, vehicle DTOs and persistence work without a fetch server', async () => {
  const local = storage(), session = storage();
  const api = createDemoApi(local, session);
  const auth = createAuthApi(api.request);
  assert.equal(await auth.session(), null);
  const { user } = await auth.login('customer@example.demo', 'Demo1234', 'customer');
  assert.equal(user.role, 'customer');
  assert.equal((await createVehicleApi(api.request).vehicles())[0].id, 'demo-vehicle');
  assert.equal((await createAuthApi(createDemoApi(local, session).request).session()).id, user.id);
  assert.equal(JSON.stringify(api.read()).includes('Demo1234'), false, 'password is not persisted');
  await auth.logout(); assert.equal(await auth.session(), null);
  await assert.rejects(auth.login('customer@example.demo', 'Demo1234', 'mechanic'), /matching/);
});
test('matching, booking, mechanic acceptance, chat, quote approval and ratings use compatible DTOs', async () => {
  const api = createDemoApi(storage(), storage()); api.selectRole('customer');
  const request = { serviceType: 'mechanic', vehicleId: 'demo-vehicle', issueType: 'Battery', notes: '', landmark: '', location: sampleLocation, filters: { radiusKm: 5, minimumRating: 0, specialty: '', verifiedOnly: false, maximumVisitPrice: '', sort: 'eta' } };
  const results = await createProviderApi(api.request).searchProviders(request);
  assert.equal(results.providers.length, 1); assert.equal(validEstimate(results.providers[0].estimate), true);
  const p = results.providers[0];
  const { booking } = await api.request('/customers/me/bookings', { method: 'POST', body: { ...request, bookingRequestId: 'test-request-1', providerId: p.id, estimateId: p.estimate.id, estimateVersion: p.estimate.version, cancellationPolicyId: p.cancellationPolicy.id } });
  const path = `/mechanics/me/jobs/${booking.id}`;
  api.selectRole('mechanic');
  assert.equal((await api.request(`${path}/accept`, { method: 'POST' })).job.status, 'en_route');
  api.selectRole('customer');
  const pin = await api.request(`/customers/me/bookings/${booking.id}/mechanic/arrival-pin`);
  assert.equal(validArrivalPin(pin, booking.id), true);
  api.selectRole('mechanic');
  await assert.rejects(api.request(`${path}/arrival-verification`, { method: 'POST', body: { pin: '0000' } }), /Incorrect/);
  await api.request(`${path}/arrival-verification`, { method: 'POST', body: { pin: pin.pin } });
  const { quote } = await api.request(`${path}/quotes`, { method: 'POST', body: { items: [{ label: 'Sample part', amount: 500 }, { label: 'Sample labor', amount: 100 }] } });
  api.selectRole('customer');
  const pending = (await api.request('/customers/me/bookings')).bookings.find(item => item.id === booking.id);
  const decided = await api.request(`/customers/me/bookings/${booking.id}/quote-decision`, { method: 'POST', body: { decision: 'approve' } });
  assert.equal(validQuoteDecision(decided, pending, quote, 'approve'), true);
  api.selectRole('mechanic');
  await api.request(`${path}/completion`, { method: 'POST' });
  api.selectRole('customer');
  const saved = await api.request(`/customers/me/bookings/${booking.id}/review`, { method: 'PUT', body: { rating: 5, body: 'Local sample feedback', clientId: 'review-1' } });
  assert.equal(validReview(saved.review, booking.id), true);
  api.selectRole('mechanic');
  const sent = await api.request(`${path}/mechanic/messages`, { method: 'POST', body: { body: 'Sample message', clientId: 'message-1' } });
  const replay = await api.request(`${path}/mechanic/messages`, { method: 'POST', body: { body: 'Sample message', clientId: 'message-1' } });
  assert.equal(sent.message.id, replay.message.id);
  api.selectRole('customer');
  const messages = await api.request(`/customers/me/bookings/${booking.id}/mechanic/messages`);
  assert.ok(messages.messages.find(item => item.id === sent.message.id).readAt);
});
test('demo payments stay local and reset restores fixtures; receipt is explicitly a demo', async () => {
  const api = createDemoApi(storage(), storage());
  api.selectRole('customer');
  const result = await api.request('/customers/me/bookings/demo-active/pay', { method: 'POST', body: { method: 'gcash' } });
  assert.equal(result.payment.demo, true);
  assert.match(result.payment.reference, /^DEMO-PAYMENT/);
  assert.match(demoReceipt('DEMO-ACTIVE'), /DEMO RECEIPT - NOT PROOF OF PAYMENT/);
  api.reset();
  assert.equal(api.read().bookings.find(item => item.id === 'demo-active').payment.status, 'unverified');
  assert.equal(api.user(), null);
});
