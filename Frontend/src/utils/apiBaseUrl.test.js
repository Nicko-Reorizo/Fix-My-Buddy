import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from './apiBaseUrl.js';
import { createJsonRequest } from './apiRequest.js';
import { createAuthApi } from './customerAccountApi.js';

test('customer and mechanic signup reach same-origin API without a build-time URL', async () => {
  for (const configured of [undefined, null, '', '  ']) {
    const calls = [];
    const auth = createAuthApi(createJsonRequest({
      baseUrl: resolveApiBaseUrl(configured),
      fetcher: async (url, options) => {
        calls.push({ url, options });
        const { role } = JSON.parse(options.body);
        return Response.json({ user: { id: 'account-1', name: 'Test User', role } });
      },
    }));
    await auth.signup({ role: 'customer' });
    await auth.signup({ role: 'mechanic' });
    assert.deepEqual(calls.map(call => call.url), ['/api/auth/signup', '/api/mechanics/auth/signup']);
    assert.ok(calls.every(call => call.options.credentials === 'include'));
  }
});

test('configured API origins and paths override the default without duplicate slashes', async () => {
  for (const [configured, expected] of [
    [' https://api.example.test/api/// ', 'https://api.example.test/api/auth/session'],
    ['https://api.example.test/', 'https://api.example.test/auth/session'],
    ['/services/api/', '/services/api/auth/session'],
    ['/', '/auth/session'],
  ]) {
    let requestedUrl;
    const request = createJsonRequest({
      baseUrl: resolveApiBaseUrl(configured),
      fetcher: async url => { requestedUrl = url; return Response.json({ user: null }); },
    });
    assert.equal(await createAuthApi(request).session(), null);
    assert.equal(requestedUrl, expected);
  }
});
