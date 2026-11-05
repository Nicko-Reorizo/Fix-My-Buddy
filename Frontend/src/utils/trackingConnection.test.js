import test from 'node:test';
import assert from 'node:assert/strict';
import { trackingUrl, locationEvent, latestPosition } from './trackingConnection.js';
import { authPaths } from './authRouting.js';

test('tracking URLs support same-origin dev and secure production WebSockets', () => {
  assert.equal(trackingUrl({ pageUrl: 'http://localhost:5173/app', bookingId: 'abc' }), 'ws://localhost:5173/api/ws/tracking?bookingId=abc');
  assert.equal(trackingUrl({ pageUrl: 'https://app.test/', apiBaseUrl: 'https://api.test/api', bookingId: 'abc' }), 'wss://api.test/api/ws/tracking?bookingId=abc');
});
test('map ignores other bookings and malformed positions and keeps the newest saved GPS', () => {
  const old = { latitude: 14, longitude: 121, updatedAt: '2026-11-03T00:00:00Z' };
  const recent = { ...old, latitude: 15, updatedAt: '2026-11-03T00:01:00Z' };
  assert.equal(locationEvent({ type: 'location:updated', bookingId: 'wrong', position: recent }, 'mine'), null);
  assert.equal(locationEvent({ type: 'location:updated', bookingId: 'mine', position: { ...recent, latitude: null } }, 'mine'), null);
  assert.equal(latestPosition(old, recent), recent);
  assert.equal(latestPosition(recent, old), recent);
});
test('mechanic and customer auth paths remain separate', () => {
  assert.equal(authPaths('mechanic').signin, '/mechanic/signin');
  assert.equal(authPaths('mechanic').home, '/mechanic/jobs');
  assert.equal(authPaths('customer').signin, '/signin');
  assert.equal(authPaths('customer').home, '/app');
});
