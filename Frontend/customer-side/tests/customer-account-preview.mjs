// TEST ONLY. Isolated in-memory API for customer frontend acceptance checks.
// No database, SMS, email, payment or real accounts are used.
import http from 'node:http';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const origin = 'http://127.0.0.1:5186';
let signedIn = false, vehicles = [], sequence = 0, pending = null;
let user = { id: 'qa-account-only', role: 'customer', name: 'QA customer (test only)', email: 'qa.customer@example.test', phone: '+639170000000', phoneVerified: true, emergencyContact: null };
const challenge = () => ({ id: `qa-challenge-${++sequence}`, expiresAt: new Date(Date.now() + 600000).toISOString(), resendAt: new Date(Date.now() + 1000).toISOString() });
const api = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  let raw = ''; for await (const part of req) raw += part;
  const body = raw ? JSON.parse(raw) : {};
  const reply = (data, status = 200) => { res.writeHead(status).end(JSON.stringify(data)); };
  const cookie = () => res.setHeader('Set-Cookie','qa_customer=1; HttpOnly; SameSite=Lax; Path=/');
  if (req.url === '/auth/session') return reply({ user: signedIn && req.headers.cookie?.includes('qa_customer=1') ? user : null });
  if (req.url === '/auth/login') {
    if (body.email !== 'qa.customer@example.test' || body.password !== 'QA-test-only-123' || body.role !== 'customer') return reply({ error: 'Invalid credentials.' },401);
    signedIn = true; cookie(); return reply({ user });
  }
  if (req.url === '/auth/signup') { pending = { ...body, id: 'qa-signup-only', phoneVerified: true, emergencyContact: null }; delete pending.password; return reply({ challenge: challenge() },201); }
  if (req.url === '/auth/phone/start' || req.url === '/auth/phone/resend') return reply({ challenge: challenge() });
  if (req.url === '/auth/phone/verify') {
    if (body.code !== '246810') return reply({ error: 'Incorrect verification code.' },401);
    if (pending) { user = pending; pending = null; }
    signedIn = true; cookie(); return reply({ user });
  }
  if (req.url === '/auth/password/forgot') return reply({ ok: true });
  if (req.url === '/auth/logout') { signedIn = false; res.setHeader('Set-Cookie','qa_customer=; Max-Age=0; Path=/'); res.writeHead(204).end(); return; }
  if (!signedIn || !req.headers.cookie?.includes('qa_customer=1')) return reply({ error: 'Please sign in to continue.' },401);
  if (req.url === '/customers/me' && req.method === 'PATCH') { user = { ...user, ...body }; return reply({ user }); }
  if (req.url === '/customers/me/vehicles' && req.method === 'GET') return reply({ vehicles });
  if (req.url === '/customers/me/vehicles' && req.method === 'POST') { const vehicle = { ...body, id: `qa-vehicle-${++sequence}` }; vehicles.push(vehicle); return reply({ vehicle },201); }
  const vehicleId = req.url?.match(/^\/customers\/me\/vehicles\/([^/]+)$/)?.[1];
  if (vehicleId && req.method === 'PATCH') { const vehicle = vehicles.find(item => item.id === vehicleId); if (!vehicle) return reply({ error: 'Vehicle not found.' },404); Object.assign(vehicle, body); return reply({ vehicle }); }
  if (vehicleId && req.method === 'DELETE') { vehicles = vehicles.filter(item => item.id !== vehicleId); res.writeHead(204).end(); return; }
  if (req.url === '/customers/me/bookings') return reply({ bookings: [] });
  if (req.url === '/customers/me/updates') return reply({ updates: [] });
  return reply({ error: 'This endpoint is outside the isolated account test.' },404);
});
api.listen(5986, '127.0.0.1');
process.env.VITE_API_BASE_URL = 'http://127.0.0.1:5986';
const vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { host: '127.0.0.1', port: 5186, strictPort: true } });
await vite.listen();
console.log('TEST ONLY http://127.0.0.1:5186/signin — QA customer API; no real accounts or delivery.');
async function stop() { await vite.close(); api.close(); process.exit(); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
