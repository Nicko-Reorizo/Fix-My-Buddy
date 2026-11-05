import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const awaitingMigration = readFileSync(new URL('../src/pages/ActiveService.jsx', import.meta.url), 'utf8').includes('awaiting migration');

// Mount the actual service page and customer store with isolated API responses.
// No real booking, browser session, payment, or network request is used.
test('service polling and refresh preserve mounted controls, drafts and arrival PINs', { skip: awaitingMigration ? 'ActiveService is awaiting Member 3 migration' : false }, async t => {
  const vite = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../', import.meta.url)),
    plugins: [react(), {
      name: 'test-leaflet',
      enforce: 'pre',
      resolveId: source => source === 'leaflet' ? '\0test-leaflet' : undefined,
      load: id => id === '\0test-leaflet' ? 'export default {};' : undefined,
    }],
    server: { middlewareMode: true, watch: null },
    ssr: { noExternal: ['leaflet'] },
  });
  let tree;
  const originalDocument = globalThis.document;
  t.after(async () => {
    try { if (tree) await act(async () => tree.unmount()); }
    finally {
      t.mock.timers.reset();
      globalThis.document = originalDocument;
      await vite.close();
    }
  });
  const { CustomerProvider } = await vite.ssrLoadModule('/src/context/CustomerProvider.jsx');
  const { useCustomer } = await vite.ssrLoadModule('/src/context/useCustomer.js');
  const { AuthContext } = await vite.ssrLoadModule('/src/context/authContextValue.js');
  const { LocaleContext } = await vite.ssrLoadModule('/src/context/localeContext.js');
  const { ActiveService } = await vite.ssrLoadModule('/src/pages/ActiveService.jsx');
  const { customerService } = await vite.ssrLoadModule('/src/services/customerService.js');
  const { LoadingState } = await vite.ssrLoadModule('/src/components/ui/LoadingState.jsx');
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    bookingId: 'FMB-5607', pin: '1234', expiresAt: new Date(Date.now() + 600000).toISOString(),
  }), { headers: { 'content-type': 'application/json' } }));
  let booking = {
    id: 'FMB-5607', reference: 'FMB-5607', version: 1,
    serviceType: 'mechanic', status: 'en_route',
    mechanic: { arrivalPinAvailable: true, status: 'en_route' },
  };
  let loadBookings = async () => [booking];
  let bookingCalls = 0, vehicleCalls = 0, updateCalls = 0;
  t.mock.method(customerService, 'vehicles', async () => { vehicleCalls += 1; return []; });
  t.mock.method(customerService, 'bookings', () => { bookingCalls += 1; return loadBookings(); });
  t.mock.method(customerService, 'updates', async () => { updateCalls += 1; return []; });
  let store;
  function Page() {
    store = useCustomer();
    return React.createElement(ActiveService);
  }
  t.mock.timers.enable({ apis: ['setInterval'] });
  const user = { id: 'isolated-refresh-test', role: 'customer', phone: '+639170000000' };
  await act(async () => {
    tree = create(React.createElement(AuthContext.Provider, { value: { user } },
      React.createElement(LocaleContext.Provider, { value: { t: english => english, language: 'en' } },
        React.createElement(CustomerProvider, null,
          React.createElement(MemoryRouter, {
            initialEntries: ['/bookings/FMB-5607/service'],
            future: { v7_startTransition: true, v7_relativeSplatPath: true },
          }, React.createElement(Routes, null,
            React.createElement(Route, { path: '/bookings/:bookingId/service', element: React.createElement(Page) }),
          )),
        ),
      ),
    ));
  });
  assert.equal(store.bookingStatus, 'ready');
  assert.equal(bookingCalls, 1);
  const phoneInput = () => tree.root.findAllByType('input').find(input => input.props.type === 'tel');
  await act(async () => phoneInput().props.onChange({ target: { value: '09181234567' } }));
  const pinButton = () => tree.root.findAllByType('button').find(button => button.children.includes('Show arrival PIN'));
  await act(async () => pinButton().props.onClick());
  assert.ok(JSON.stringify(tree.toJSON()).includes('1234'));

  // Hold the next response across two polling ticks. The old page replaced its
  // controls with LoadingState every five seconds and also reloaded vehicles.
  let resolveBookings;
  loadBookings = () => new Promise(resolve => { resolveBookings = resolve; });
  await act(async () => t.mock.timers.tick(5000));
  assert.equal(bookingCalls, 2, 'exactly one poll requests bookings');
  assert.equal(vehicleCalls, 1, 'polling does not reload the garage');
  assert.equal(updateCalls, 2);
  assert.equal(store.bookingStatus, 'ready');
  assert.equal(tree.root.findAllByType(LoadingState).length, 0);
  assert.ok(JSON.stringify(tree.toJSON()).includes('1234'), 'PIN survives pending polling');
  assert.equal(phoneInput().props.value, '09181234567', 'polling preserves form drafts');
  await act(async () => t.mock.timers.tick(5000));
  assert.equal(bookingCalls, 2, 'a slow poll cannot overlap another poll');
  booking = { ...booking, version: 2, status: 'arrived', mechanic: { ...booking.mechanic, status: 'arrived' } };
  await act(async () => resolveBookings([booking]));
  assert.ok(JSON.stringify(tree.toJSON()).includes('Mechanic has arrived'));
  assert.ok(JSON.stringify(tree.toJSON()).includes('1234'), 'version/status updates do not remount progress');

  // Manual refreshes and action-triggered refreshes also preserve loaded UI,
  // including when a temporary connection error prevents an update.
  loadBookings = () => new Promise(resolve => { resolveBookings = resolve; });
  await act(async () => store.refreshData());
  assert.equal(store.bookingStatus, 'ready');
  assert.equal(tree.root.findAllByType(LoadingState).length, 0);
  assert.ok(JSON.stringify(tree.toJSON()).includes('1234'));
  assert.equal(phoneInput().props.value, '09181234567', 'manual refresh preserves form drafts');
  await act(async () => resolveBookings([booking]));
  loadBookings = async () => { throw new Error('temporary outage'); };
  await act(async () => store.refreshData());
  assert.equal(store.bookingStatus, 'ready');
  assert.ok(JSON.stringify(tree.toJSON()).includes('1234'));
  assert.equal(store.bookings[0].version, 2);

  globalThis.document.hidden = true;
  const beforeHidden = bookingCalls;
  await act(async () => t.mock.timers.tick(5000));
  assert.equal(bookingCalls, beforeHidden, 'hidden tabs do not poll');
});
