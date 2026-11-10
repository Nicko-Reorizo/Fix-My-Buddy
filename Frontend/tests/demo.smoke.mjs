import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { demoPages } from '../src/demo/pages.js';
import { readFileSync } from 'node:fs';

// Stay useful during concurrent page migration; enable original flow checks once complete.
const pendingPages = demoPages.filter(item => readFileSync(new URL(`../../${item.file}`, import.meta.url), 'utf8').includes('awaiting migration'));

const directory = fileURLToPath(new URL('..', import.meta.url));
const base = process.env.DEMO_BASE_URL || 'http://127.0.0.1:5174';
const screenshots = new URL('../screenshots/', import.meta.url);
let server, browser;
const errors = [], apiRequests = [], visited = [];
try {
  if (!process.env.DEMO_BASE_URL) {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174', '--strictPort'], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let output = '';
    server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; process.stderr.write(data); });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(`Vite exited: ${output}`);
      try { ready = (await fetch(base)).ok; } catch { /* Wait for the development server. */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(ready, `Vite did not start: ${output}`);
  }
  browser = await chromium.launch({ channel: process.env.DEMO_BROWSER_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/\/(api|demo-api)\//.test(new URL(request.url()).pathname) || /fix-my-buddy\.vercel\.app/.test(request.url())) apiRequests.push(request.url());
  });
  // Demonstrate that application pages do not depend on public map services.
  await page.route('https://**/*', route => route.abort());
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Pages · 53' }).waitFor({ timeout: 60000 });
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('landing-mobile.png', screenshots)), fullPage: true });
  async function visit(item) {
    await page.getByRole('button', { name: 'Pages · 53' }).click();
    const group = page.locator('.demo-panel details').nth(item.member - 1);
    await group.locator('summary').click();
    const buttons = group.locator('button');
    const labels = await buttons.evaluateAll(nodes => nodes.map(node => node.firstChild.textContent));
    const index = labels.indexOf(item.label);
    assert.ok(index >= 0, `Missing menu entry ${item.file}`);
    await buttons.nth(index).click();
    const menuPath = demoPages.find(entry => entry.file === item.file)?.path;
    if (menuPath !== item.path) await page.goto(`${base}${item.path}`);
    await page.waitForTimeout(400);
    assert.equal(errors.length, 0, `${item.file}: ${errors.join('\n')}`);
    const text = await page.locator('body').innerText();
    assert.ok(text.length > 40, `Empty screen: ${item.file}`);
    const isPlaceholder = pendingPages.some(entry => entry.file === item.file);
    const expectedPath = item.label === 'Services' && !isPlaceholder ? '/request' : new URL(item.path, base).pathname;
    assert.equal(new URL(page.url()).pathname, expectedPath, `Unexpected redirect from ${item.file}`);
    if (isPlaceholder) assert.ok(text.includes(`Page assigned to Member ${item.member} — awaiting migration`), `Missing placeholder: ${item.file}`);
    assert.ok(!text.includes('FRONTEND DEMO'), 'Unexpected top demo banner');
    assert.ok(!/No local frontend fixture|Frontend demo action is unavailable|Could not check your session|We could not load your details/.test(text), `Failed local data: ${item.file}`);
    visited.push({ ...item, actualPath: new URL(page.url()).pathname });
    if (['Providers', 'ActiveService', 'Jobs', 'Account', 'PaymentCheckout'].includes(item.label)) {
      await page.screenshot({ path: fileURLToPath(new URL(`${item.member}-${item.label}-mobile.png`, screenshots)), fullPage: true });
    }
  }
  for (const item of demoPages) await visit(item);
  if (pendingPages.length === 0) {
  // Submit a booking through the existing confirmation screen.
  await visit(demoPages.find(item => item.label === 'ConfirmRequest'));
  await page.locator('.provider-consent input').check();
  await page.getByRole('button', { name: 'Confirm booking & pay during service', exact: true }).click();
  await page.waitForURL(/\/bookings\/demo-booking-[^/]+\/service$/);
  // Review editing uses the unchanged customer review form and local persistence.
  await visit({ ...demoPages.find(item => item.label === 'History'), path: '/history?booking=demo-completed' });
  await page.locator('.service-stars label').nth(4).click();
  await page.getByRole('button', { name: 'Update review', exact: true }).click();
  // Refresh remounts the original review form, so verify persisted state rather
  // than its transient success notice.
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fixmybuddy-copy-demo-v1')).bookings.find(item => item.id === 'demo-completed').review.rating === 5);
  await page.getByRole('radio', { name: '5 stars', exact: true }).isChecked().then(checked => assert.equal(checked, true));
  // The checkout is only a simulation and asks for a demo code, never a real MPIN.
  await visit(demoPages.find(item => item.label === 'PaymentCheckout'));
  await page.getByRole('button', { name: /Continue with GCash/ }).click();
  await page.locator('input[type=password]').fill('0000');
  await page.getByRole('button', { name: /Authorize & Pay/ }).click();
  await page.getByRole('button', { name: /Download.*receipt/i }).waitFor();
  // Exercise the existing customer chat UI and then read it on the mechanic side.
  await visit(demoPages.find(item => item.label === 'ProviderChat'));
  await page.locator('textarea').fill('Browser demo message from the customer');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByText('Browser demo message from the customer', { exact: true }).waitFor();
  await visit(demoPages.find(item => item.label === 'MechanicChat'));
  await page.getByText('Browser demo message from the customer', { exact: true }).waitFor();
  await page.locator('textarea').fill('Browser demo reply from the mechanic');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByText('Browser demo reply from the mechanic', { exact: true }).waitFor();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: fileURLToPath(new URL('mechanic-desktop.png', screenshots)), fullPage: true });
  assert.equal(apiRequests.length, 0, `Unexpected backend requests: ${apiRequests.join('\n')}`);
  assert.equal(errors.length, 0, errors.join('\n'));
  const complete = pendingPages.length === 0;
  await writeFile(new URL('smoke-report.json', screenshots), JSON.stringify({ pageFiles: demoPages.length, pendingPages: pendingPages.map(item => item.file), visited, pageErrors: errors, backendRequests: apiRequests, bookingSubmission: complete, reviewEdit: complete, simulatedCheckout: complete, chatRoundTrip: complete }, null, 2));
  console.log(`PASS: ${demoPages.length} page entries, ${pendingPages.length} placeholders, zero backend requests, zero page errors. Full flow assertions ${complete ? 'passed' : 'deferred until all pages migrate'}.`);
} finally {
  await browser?.close();
  server?.kill();
}
