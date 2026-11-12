import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

test('provider loading keeps fresh-quote confirmation, unavailable and retry states after merge', async t => {
  const vite = await createServer({ configFile: false, root: fileURLToPath(new URL('../', import.meta.url)), plugins: [react()], server: { middlewareMode: true, watch: null } });
  let tree;
  const originalWindow = globalThis.window;
  globalThis.window = { setTimeout, clearTimeout, dispatchEvent() {} };
  t.after(async () => {
    if (tree) await act(async () => tree.unmount());
    globalThis.window = originalWindow;
    await vite.close();
  });
  const { Providers } = await vite.ssrLoadModule('/src/pages/customer/Providers.jsx');
  const { AppContext } = await vite.ssrLoadModule('/src/context/appContextValue.js');
  const { demoApi } = await vite.ssrLoadModule('/src/demo/localApi.js');
  const { sampleLocation } = await vite.ssrLoadModule('/src/demo/fixtures.js');
  const provider = demoApi.provider();
  const fresh = { ...provider, estimate: { ...provider.estimate, id: 'fresh-quote' } };
  let mode = 'auto', resolveQuote;
  const saved = [], selected = [];
  const api = t.mock.method(demoApi, 'request', async path => {
    if (mode === 'error') throw new Error('Provider search unavailable.');
    if (path.endsWith('/quote')) return new Promise(resolve => { resolveQuote = resolve; });
    return { providers: mode === 'empty' ? [] : [provider], recommendedProviderId: mode === 'empty' ? null : provider.id };
  });
  const value = {
    request: { serviceType: 'mechanic', vehicleId: 'demo-vehicle', issueType: 'Battery', notes: '', landmark: '', matchingMode: 'auto' },
    location: sampleLocation, providerFilters: { radiusKm: 5, minimumRating: 0, maximumVisitPrice: '', verifiedOnly: false, specialty: '', sort: 'eta' },
    providers: [], selectedProviderId: '', setSearchProviders: records => saved.push(records), setSelectedProviderId: id => selected.push(id), setProviderFilters() {},
  };
  async function mount() {
    if (tree) await act(async () => tree.unmount());
    await act(async () => {
      tree = create(React.createElement(AppContext.Provider, { value }, React.createElement(MemoryRouter, { initialEntries: ['/providers'] }, React.createElement(Routes, null,
        React.createElement(Route, { path: '/providers', element: React.createElement(Providers) }),
        React.createElement(Route, { path: '/confirm-request', element: React.createElement('p', null, 'Final confirmation') }),
      ))));
    });
  }
  const rendered = () => JSON.stringify(tree.toJSON());
  await mount();
  assert.match(rendered(), /Looking for available buddies/);
  assert.equal(typeof resolveQuote, 'function');
  assert.doesNotMatch(rendered(), /Final confirmation/);
  await act(async () => { resolveQuote({ provider: fresh }); await new Promise(resolve => setTimeout(resolve, 950)); });
  assert.match(rendered(), /Final confirmation/);
  assert.equal(selected.at(-1), fresh.id);
  assert.equal(saved.at(-1)[0].estimate.id, 'fresh-quote');

  mode = 'empty';
  await mount();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 950)); });
  assert.doesNotMatch(rendered(), /Looking for available buddies|Final confirmation/);
  assert.match(rendered(), /No buddies|No available|No providers/i);

  mode = 'error';
  await mount();
  assert.match(rendered(), /Could not load buddies/);
  const retry = tree.root.findAllByType('button').find(button => button.props.children?.includes?.('Try again'));
  assert.ok(retry);
  const beforeRetry = api.mock.calls.length;
  await act(async () => retry.props.onClick());
  assert.ok(api.mock.calls.length > beforeRetry);

  mode = 'auto'; resolveQuote = null;
  await mount();
  const countBeforeUnmount = saved.length;
  await act(async () => tree.unmount()); tree = null;
  await act(async () => { resolveQuote({ provider: fresh }); await new Promise(resolve => setTimeout(resolve, 950)); });
  assert.equal(saved.length, countBeforeUnmount, 'A cancelled quote must not update the draft or redirect');
});
