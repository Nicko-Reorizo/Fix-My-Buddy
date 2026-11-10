import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionRecheck } from './sessionRecheck.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('concurrent unauthorized polling responses share a session check and keep a valid user', async () => {
  const response = deferred();
  const users = [];
  let calls = 0;
  const check = createSessionRecheck({ loadSession: () => { calls++; return response.promise; }, onSession: user => users.push(user), onError: assert.fail });
  const first = check.check();
  assert.equal(check.check(), first);
  const user = { id: 'customer-1' };
  response.resolve(user);
  await first;
  assert.equal(calls, 1);
  assert.deepEqual(users, [user]);
});

test('network and service failures report a retryable error without invalidating the account', async () => {
  const failure = new Error('Service unavailable');
  const errors = [];
  const check = createSessionRecheck({ loadSession: async () => { throw failure; }, onSession: assert.fail, onError: error => errors.push(error) });
  await check.check();
  assert.deepEqual(errors, [failure]);
});

test('a session check from before a new login cannot sign the new account out', async () => {
  const old = deferred();
  const users = [];
  const currentUser = { id: 'mechanic-2' };
  let calls = 0;
  const check = createSessionRecheck({ loadSession: () => ++calls === 1 ? old.promise : currentUser, onSession: user => users.push(user), onError: assert.fail });
  const stale = check.check();
  await Promise.resolve();
  check.invalidate();
  await check.check();
  old.resolve(null);
  await stale;
  assert.deepEqual(users, [currentUser]);
});

test('a confirmed missing session still ends the account session', async () => {
  const users = [];
  const check = createSessionRecheck({ loadSession: async () => null, onSession: user => users.push(user), onError: assert.fail });
  await check.check();
  assert.deepEqual(users, [null]);
});
