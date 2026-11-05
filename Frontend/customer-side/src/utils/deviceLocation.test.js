import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDeviceLocation } from './deviceLocation.js';

test('GPS unavailable, denied, unavailable position and timeout offer manual recovery', async () => {
  await assert.rejects(getDeviceLocation(null), /unavailable.*manually/);
  for (const [code, message] of [[1, /blocked/], [2, /find your position/], [3, /too long/]]) {
    await assert.rejects(getDeviceLocation({ getCurrentPosition: (_ok, fail) => fail({ code }) }), message);
  }
});
test('GPS success preserves coordinates, timestamp and measured accuracy', async () => {
  const position = { coords: { latitude: 13.62, longitude: 123.18, accuracy: 32 }, timestamp: 1700000000000 };
  const result = await getDeviceLocation({ getCurrentPosition: (ok, _fail, options) => {
    assert.equal(options.timeout, 10000); ok(position);
  } });
  assert.equal(result.latitude, 13.62); assert.equal(result.longitude, 123.18);
  assert.equal(result.accuracy, 32); assert.equal(result.updatedAt, new Date(position.timestamp).toISOString());
  await assert.rejects(getDeviceLocation({ getCurrentPosition: ok => ok({ ...position, coords: { latitude: 91, longitude: 123 } }) }), /invalid location/);
});
test('cancelled GPS ignores a late result after manual edits or navigation', async () => {
  const controller = new AbortController(); let deliver;
  const result = getDeviceLocation({ getCurrentPosition: ok => { deliver = ok; } }, controller.signal);
  controller.abort();
  deliver({ coords: { latitude: 13.62, longitude: 123.18 }, timestamp: 1700000000000 });
  await assert.rejects(result, { name: 'AbortError' });
});

test('GPS timeout and unavailable fix retry using network location', async () => {
  for (const code of [2, 3]) {
    const options = [];
    const result = await getDeviceLocation({ getCurrentPosition: (ok, fail, settings) => {
      options.push(settings);
      if (settings.enableHighAccuracy) fail({ code });
      else ok({ coords: { latitude: 13.62, longitude: 123.18, accuracy: 750 }, timestamp: 1700000000000 });
    } });
    assert.equal(options.length, 2);
    assert.equal(options[0].enableHighAccuracy, true);
    assert.equal(options[1].enableHighAccuracy, false);
    assert.equal(result.latitude, 13.62);
    assert.equal(result.accuracy, 750);
  }
});

test('denied permission is actionable and does not retry', async () => {
  let requests = 0;
  await assert.rejects(getDeviceLocation({ getCurrentPosition: (_ok, fail) => {
    requests += 1;
    fail({ code: 1 });
  } }), error => error.code === 1 && /browser and device settings/.test(error.message));
  assert.equal(requests, 1);
});

test('insecure and blocked embedded pages explain how to enable location', async () => {
  const geolocation = { getCurrentPosition: () => assert.fail('Blocked context must not start GPS') };
  await assert.rejects(getDeviceLocation(geolocation, undefined, { isSecureContext: false }), /HTTPS/);
  await assert.rejects(getDeviceLocation(geolocation, undefined, { document: { permissionsPolicy: { allowsFeature: name => {
    assert.equal(name, 'geolocation'); return false;
  } } } }), /Open this page directly/);
});

test('cancelled fallback and superseded callbacks cannot return stale locations', async () => {
  const callbacks = [];
  const controller = new AbortController();
  const result = getDeviceLocation({ getCurrentPosition: (ok, fail) => callbacks.push({ ok, fail }) }, controller.signal);
  callbacks[0].fail({ code: 3 });
  callbacks[0].ok({ coords: { latitude: 1, longitude: 2 }, timestamp: 1700000000000 });
  controller.abort();
  callbacks[1].ok({ coords: { latitude: 3, longitude: 4 }, timestamp: 1700000000000 });
  await assert.rejects(result, { name: 'AbortError' });
  assert.equal(callbacks.length, 2);
});

test('missing timestamps do not leave valid coordinates stuck in loading', async () => {
  const result = await getDeviceLocation({ getCurrentPosition: ok => ok({ coords: { latitude: 13.62, longitude: 123.18 } }) });
  assert.ok(Number.isFinite(Date.parse(result.updatedAt)));
});

test('mechanic GPS uses the same network fallback and returns API coordinates', async t => {
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  t.after(() => {
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator);
    else delete globalThis.navigator;
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { getCurrentPosition: (ok, fail, options) => {
    if (options.enableHighAccuracy) fail({ code: 2 });
    else ok({ coords: { latitude: 13.62, longitude: 123.18, accuracy: 250 } });
  } } } });
  const { getPosition } = await import('../../../src/mechanic/services/location.js');
  assert.deepEqual(await getPosition(), { latitude: 13.62, longitude: 123.18 });
});
