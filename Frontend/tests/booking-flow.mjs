import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export async function checkEmergencyBooking(page, base, screenshots) {
  async function demo(role) {
    await page.getByRole('button', { name: 'Pages · 53' }).click();
    await page.getByRole('button', { name: `${role} demo`, exact: true }).click();
    await page.waitForURL(role === 'Customer' ? /\/app$/ : /\/mechanic\/jobs$/);
  }
  async function count() {
    return page.evaluate(() => JSON.parse(localStorage.getItem('fixmybuddy-copy-demo-v1')).bookings.length);
  }
  // The public welcome entry signs out. Direct URLs must still require a session.
  await page.getByRole('button', { name: 'Pages · 53' }).click();
  const member = page.locator('.demo-panel details').first();
  await member.locator('summary').click();
  await member.getByRole('button', { name: /^SignIn/ }).click();
  for (const route of ['/request', '/request/towing', '/confirm-request', '/providers', '/app']) {
    await page.goto(`${base}${route}`);
    await page.waitForURL(/\/signin$/);
  }
  await demo('Customer');
  const before = await count();
  await page.getByRole('button', { name: 'Request Mechanic', exact: true }).click();
  await page.waitForURL(/\/request\?service=mechanic$/);
  await page.getByLabel('Pickup location', { exact: true }).fill('Panganiban Drive, Naga City');
  await page.locator('input[name=issue][value=Battery]').check();
  await page.screenshot({ path: fileURLToPath(new URL('booking-request-mobile.png', screenshots)), fullPage: true });
  await page.getByRole('button', { name: 'Find help & review estimate', exact: true }).click();
  await page.waitForURL(/\/confirm-request$/);
  assert.equal(await count(), before, 'Matching must never create a booking');
  const confirm = page.getByRole('button', { name: 'Confirm & request help', exact: true });
  assert.equal(await confirm.isDisabled(), true, 'Explicit confirmation is required');
  await page.locator('.provider-consent input').check();
  await page.screenshot({ path: fileURLToPath(new URL('booking-review-mobile.png', screenshots)), fullPage: true });
  await confirm.evaluate(button => { button.click(); button.click(); });
  await page.waitForURL(/\/bookings\/demo-booking-[^/]+\/service$/);
  assert.equal(await count(), before + 1, 'Double click must create only one booking');
  const bookingId = new URL(page.url()).pathname.split('/')[2];

  // Complete arrival verification through the actual provider and customer UIs.
  await demo('Mechanic');
  await page.goto(`${base}/mechanic/jobs/${bookingId}`);
  await page.getByRole('button', { name: 'Accept request & go en route', exact: true }).click();
  await page.getByRole('button', { name: 'Verify arrival & start service', exact: true }).waitFor();
  await demo('Customer');
  await page.goto(`${base}/bookings/${bookingId}/service`);
  await page.getByRole('button', { name: 'Show arrival PIN', exact: true }).click();
  const pinValue = await page.locator('.service-pin-value').innerText();
  assert.match(pinValue, /^[0-9]{4}$/);
  await demo('Mechanic');
  await page.goto(`${base}/mechanic/jobs/${bookingId}`);
  await page.getByPlaceholder('4-digit PIN').fill(pinValue);
  await page.getByRole('button', { name: 'Verify arrival & start service', exact: true }).click();
  await page.waitForFunction(id => JSON.parse(localStorage.getItem('fixmybuddy-copy-demo-v1')).bookings.find(item => item.id === id).status === 'in_progress', bookingId);

  // Towing keeps only the destination and condition questions needed for safe dispatch.
  await demo('Customer');
  await page.getByRole('button', { name: 'Request Towing', exact: true }).click();
  await page.waitForURL(/\/request\/towing$/);
  await page.getByLabel('Destination', { exact: true }).fill('Magsaysay Avenue repair shop, Naga City');
  await page.getByRole('group', { name: 'Does it start/run?' }).getByRole('button', { name: 'No', exact: true }).click();
  await page.getByRole('group', { name: 'Does it roll freely?' }).getByRole('button', { name: 'Yes', exact: true }).click();
  await page.getByRole('group', { name: 'Is there collision damage?' }).getByRole('button', { name: 'No', exact: true }).click();
  await page.getByRole('button', { name: 'Find towing providers', exact: true }).click();
  await page.waitForURL(/\/confirm-request$/);
  await page.locator('.provider-consent input').check();
  await page.getByRole('button', { name: 'Confirm & request help', exact: true }).click();
  await page.waitForURL(/\/history\?booking=demo-booking-/);
  const towingId = new URL(page.url()).searchParams.get('booking');
  await demo('Mechanic');
  await page.goto(`${base}/mechanic/jobs/${towingId}`);
  await page.getByRole('button', { name: 'Accept request & go en route', exact: true }).click();
  await page.getByRole('button', { name: 'Verify arrival & start service', exact: true }).waitFor();
  await demo('Customer');
  await page.goto(`${base}/history?booking=${towingId}`);
  await page.getByRole('button', { name: 'Show arrival PIN', exact: true }).click();
  await page.locator('.service-pin-value').waitFor();
  await page.screenshot({ path: fileURLToPath(new URL('towing-arrival-mobile.png', screenshots)), fullPage: true });
  assert.equal(await page.locator('body').evaluate(node => node.scrollWidth <= window.innerWidth), true, 'Mobile content must fit the viewport');
  console.log('PASS: guest guards, two-step mechanic/towing booking, explicit consent, double click protection and arrival verification.');
}
