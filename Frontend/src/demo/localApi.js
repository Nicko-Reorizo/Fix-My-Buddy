import { STORE_KEY, SESSION_KEY, REQUEST_KEY, demoUsers, initialState, createBooking, estimate, policy, sampleLocation } from './fixtures.js';
import { validateRequestDraft } from '../utils/requestDraft.js';
import { validEstimate } from '../utils/bookingValidation.js';
import { validateTowingDestination } from '../utils/towingDestination.js';
import { validTowingCondition } from '../utils/towingValidation.js';
import { normalizeVehicle, validateVehicle, validateCustomerSetup } from '../utils/vehicleValidation.js';
import { normalizePhone } from '../utils/authValidation.js';

const clone = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const id = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
const error = (message, status = 400) => Object.assign(new Error(message), { status });
export function createDemoApi(storage, sessionStorage) {
  let memory = initialState();
  let session = null;
  function read() {
    try {
      const saved = JSON.parse(storage?.getItem(STORE_KEY) || 'null');
      if (saved?.bookings && saved?.users && saved?.mechanic) memory = saved;
    } catch { /* Use memory if browser storage is blocked. */ }
    return memory;
  }
  function save(state) {
    memory = state;
    try { storage?.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* In-memory presentation remains usable. */ }
  }
  function user() {
    try { if (sessionStorage) session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { /* Retain memory. */ }
    return session;
  }
  function setUser(value) {
    session = value;
    try { sessionStorage?.setItem(SESSION_KEY, JSON.stringify(value)); } catch { /* Retain memory. */ }
    return value;
  }
  function selectRole(role) { return clone(setUser(read().users.find(item => item.id === demoUsers[role]?.id) || demoUsers[role] || null)); }
  function reset() {
    save(initialState()); setUser(null);
    try { storage?.removeItem(REQUEST_KEY); } catch { /* Retain memory. */ }
  }
  function profile(state) {
    const reviews = state.bookings.filter(item => item.review).map(item => item.review);
    return { ...state.mechanic, reviewsCount: reviews.length, rating: reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : null };
  }
  function provider(state, body = {}) {
    const p = profile(state);
    const location = body.location || sampleLocation;
    const request = body.request || body;
    return { id: p.id, name: p.name, verified: false, rating: p.rating, reviewsCount: p.reviewsCount, jobsCompleted: state.bookings.filter(item => item.status === 'completed').length,
      distanceKm: 0.65, distanceMeters: 650, etaMinutes: 8, specialties: p.specialties, credentials: p.credentials,
      latitude: location.latitude + 0.003, longitude: location.longitude + 0.003,
      estimate: estimate(), cancellationPolicy: policy,
      customerReviews: state.bookings.filter(item => item.review).map(item => ({ id: item.review.id, text: item.review.body, authorName: 'Demo Customer', rating: item.review.rating, createdAt: item.createdAt })),
      ...(request.serviceType === 'towing' ? { towingQuote: { routeId: 'demo-towing-route', version: 1, distanceKm: 2, pickupAddress: location.address || sampleLocation.address, destinationAddress: request.destination || 'Demo repair shop, Naga City', equipment: 'Demo flatbed truck' } } : {}),
    };
  }
  function job(b, state) {
    const amount = b.paidAmount ?? b.quotedAmount;
    return { ...b, type: b.serviceType === 'towing' ? 'towing' : 'repair', service: b.issueType,
      customer: { name: state.users.find(item => item.id === b.customerId)?.name || 'Demo Customer', initials: 'DC', verified: false },
      vehicle: b.vehicleLabel, description: `${b.pickup.address} · ${b.notes}`, location: b.pickup.address,
      providerLocation: b.mechanic?.position, distanceMeters: 650, etaMinutes: 8,
      visitEstimate: b.quotedAmount, platformCommissionRate: 0.05, platformCommission: amount * 0.05, estimatedNet: amount * 0.95,
      paymentStatus: b.payment.status, paymentReference: b.payment.reference, mechanicState: b.mechanic || {}, towingState: b.towing || {},
    };
  }
  async function request(path, { method = 'GET', body = {}, signal } = {}) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const url = new URL(path.replace(/^\/demo-api/, ''), 'https://demo.invalid');
    path = decodeURIComponent(url.pathname);
    if (typeof body === 'string') body = JSON.parse(body);
    if (typeof FormData !== 'undefined' && body instanceof FormData) body = JSON.parse(body.get('details') || '{}');
    body ||= {};
    const state = read();
    const finish = data => { save(state); return data === null ? null : clone(data); };
    if (path === '/auth/session') return { user: user() };
    if (path === '/auth/logout') { setUser(null); return null; }
    if (/\/(auth|mechanics\/auth)\/(login|signup)$/.test(path)) {
      const role = path.startsWith('/mechanics/') || body.role === 'mechanic' ? 'mechanic' : 'customer';
      if (!body.email?.trim() || !body.password) throw error('Enter a demo email and demo password.');
      let account = state.users.find(item => item.email.toLowerCase() === body.email.trim().toLowerCase());
      if (account && account.role !== role) throw error('Use the matching customer/mechanic sign-in page.', 403);
      if (path.endsWith('signup') && account) throw error('This demo email already exists. Sign in instead.', 409);
      const customerSetup = path.endsWith('signup') && role === 'customer';
      if (customerSetup) {
        const issues = validateCustomerSetup(body);
        if (Object.keys(issues).length) throw error(Object.values(issues)[0]);
      }
      if (!account) {
        account = { ...demoUsers[role], id: id('demo-user'), role, name: body.name || `Demo ${role}`, email: body.email.trim(), phone: body.phone || '', phoneVerified: true };
        state.users.push(account);
      }
      if (customerSetup) {
        account.name = body.name.trim();
        account.phone = body.phone ? normalizePhone(body.phone) : '';
        account.phoneVerified = false;
        account.emergencyContact = null;
        state.vehicles.push({ ...normalizeVehicle(body.vehicle), id: id('demo-vehicle'), customerId: account.id });
      }
      // Presentation identities only: passwords are neither stored nor verified.
      return finish({ user: setUser(account) });
    }
    if (path === '/auth/password/forgot') return { ok: true, demo: true };
    if (path === '/support/config') return { phone: '', email: '' };
    // These are local demo access checks, not production authentication.
    const currentUser = user();
    const customerPath = path.startsWith('/customers/') || path.startsWith('/providers/') || path.startsWith('/repair-shops/');
    const mechanicPath = path.startsWith('/mechanics/me');
    if (customerPath || mechanicPath) {
      if (!currentUser) throw error('Sign in before requesting or managing assistance.', 401);
      if (currentUser.role !== (mechanicPath ? 'mechanic' : 'customer')) throw error('Use the matching customer or provider account.', 403);
    }
    if (path === '/providers/search' || /^\/providers\/[^/]+\/quote$/.test(path)) {
      const item = provider(state, body);
      if (path.endsWith('/quote')) return { provider: item };
      const f = body.filters || {};
      const allowed = state.mechanic.online && !f.verifiedOnly && (!f.minimumRating || item.rating >= f.minimumRating) &&
        (!f.specialty || item.specialties.includes(f.specialty)) && (f.maximumVisitPrice === '' || f.maximumVisitPrice == null || item.estimate.total <= Number(f.maximumVisitPrice));
      return { providers: allowed ? [item] : [], recommendedProviderId: allowed ? item.id : null };
    }
    if (path === '/repair-shops/search') return { shops: [{ id: 'demo-shop', name: 'Demo Repair Shop', address: 'Demo repair shop, Magsaysay Avenue, Naga City', latitude: 13.63, longitude: 123.2, distanceKm: 2 }] };
    if (path === '/customers/me') {
      const current = user() || demoUsers.customer;
      const updated = { ...current, ...body };
      state.users = state.users.map(item => item.id === current.id ? updated : item);
      setUser(updated); return finish({ user: updated });
    }
    const collection = path.match(/^\/customers\/me\/(vehicles|reminders)(?:\/([^/]+))?$/);
    if (collection) {
      const [, key, itemId] = collection;
      if (key === 'vehicles') {
        const owner = user()?.id || demoUsers.customer.id;
        // Older demo fixtures without an owner belong to the sample customer.
        const vehicles = state.vehicles.filter(item => (item.customerId || demoUsers.customer.id) === owner);
        if (method === 'GET') return finish({ vehicles });
        const existing = vehicles.find(item => item.id === itemId);
        if (itemId && !existing) throw error('Vehicle not found in this account.', 404);
        if (method === 'DELETE') {
          state.vehicles = state.vehicles.filter(item => item.id !== itemId);
          return finish(null);
        }
        const details = { ...existing, ...body };
        const issues = validateVehicle(details, vehicles, itemId);
        if (Object.keys(issues).length) throw error(Object.values(issues)[0]);
        const vehicle = { ...normalizeVehicle(details), id: itemId || id('demo-vehicle'), customerId: owner };
        state.vehicles = [...state.vehicles.filter(item => item.id !== vehicle.id), vehicle];
        return finish({ vehicle });
      }
      if (method === 'GET') return finish({ [key]: state[key] });
      if (method === 'DELETE') { state[key] = state[key].filter(item => item.id !== itemId); return finish(null); }
      const item = { ...state[key].find(item => item.id === itemId), ...body, id: itemId || id('demo-item') };
      state[key] = [...state[key].filter(value => value.id !== item.id), item];
      return finish({ [key === 'vehicles' ? 'vehicle' : 'reminder']: item });
    }
    if (path === '/customers/me/bookings') {
      if (method === 'GET') return finish({ bookings: state.bookings.filter(item => item.customerId === currentUser.id) });
      if (method !== 'POST') throw error('Unsupported booking action.', 405);
      if (typeof body.bookingRequestId !== 'string' || body.bookingRequestId.length < 8 || body.bookingRequestId.length > 100) throw error('Start a new request before confirming.');
      const fingerprint = JSON.stringify(body);
      state.bookingRequests ||= {};
      const requestKey = `${currentUser.id}:${body.bookingRequestId}`;
      const previous = state.bookingRequests[requestKey];
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw error('This confirmation was already used. Start a new request.', 409);
        return finish({ booking: state.bookings.find(item => item.id === previous.bookingId) });
      }
      const problem = validateRequestDraft(body, body.location);
      if (problem) throw error(problem);
      if (!state.vehicles.some(item => item.id === body.vehicleId)) throw error('Choose an available vehicle.');
      const quoted = provider(state, body);
      if (!state.mechanic.online || body.providerId !== quoted.id) throw error('This provider is unavailable. Find help again.', 409);
      if (!validEstimate(quoted.estimate) || body.estimateId !== quoted.estimate.id || body.estimateVersion !== quoted.estimate.version || body.cancellationPolicyId !== policy.id) throw error('Review the current estimate and cancellation terms.', 409);
      if (body.serviceType === 'towing' && (validateTowingDestination(body, body.location) || !validTowingCondition(body.towingCondition) || body.towingRouteId !== quoted.towingQuote?.routeId || body.towingRouteVersion !== quoted.towingQuote?.version)) throw error('Confirm the towing destination, vehicle condition and route.');
      const b = createBooking(id('demo-booking'), 'requested', body.serviceType || 'mechanic');
      Object.assign(b, { customerId: currentUser.id, vehicleId: body.vehicleId, pickup: body.location, issueType: body.issueType, notes: body.notes || '', scheduledAt: body.scheduledAt || null, initialEstimate: quoted.estimate, quotedAmount: quoted.estimate.total });
      b.vehicleLabel = state.vehicles.find(item => item.id === b.vehicleId)?.model || b.vehicleLabel;
      if (b.towing) Object.assign(b.towing, { destinationAddress: body.destination, status: 'requested', canConfirmHandover: false, etaMinutes: 8 });
      state.bookings.unshift(b);
      state.bookingRequests[requestKey] = { fingerprint, bookingId: b.id };
      return finish({ booking: b });
    }
    if (/^\/customers\/me\/updates/.test(path)) {
      if (method === 'GET') return finish({ updates: state.updates });
      state.updates.forEach(item => { if (body.ids?.includes(item.id)) item.readAt = now(); }); return finish({ readIds: body.ids || [] });
    }
    if (path === '/customers/me/support/messages') {
      if (method === 'GET') return finish({ messages: state.support });
      const message = { id: id('demo-message'), sender: 'customer', body: body.body, clientId: body.clientId, createdAt: now() };
      state.support.push(message); return finish({ message });
    }
    if (path === '/customers/me/disputes') {
      if (method === 'GET') return finish({ disputes: state.disputes });
      const dispute = { ...body, id: id('demo-concern'), status: 'submitted', createdAt: now(), evidenceCount: 0 };
      state.disputes.unshift(dispute); return finish({ dispute });
    }
    if (path === '/mechanics/me' || path === '/mechanics/me/profile' || path === '/mechanics/me/availability' || path === '/mechanics/me/location' || path === '/mechanics/me/presence') {
      if (method !== 'GET') {
        Object.assign(state.mechanic, body);
        if (body.services) state.mechanic.specialties = body.services;
        if (path.endsWith('/location') && Number.isFinite(body.latitude)) state.mechanic.location = { ...body, source: 'gps', address: 'Demo device position' };
      }
      return finish({ mechanic: profile(state), availability: profile(state), ok: true });
    }
    if (path === '/mechanics/me/reviews') return finish({ reviews: state.bookings.filter(b => b.review).map(b => ({ ...b.review, customerName: 'Demo Customer', updatedAt: now() })) });
    if (path === '/mechanics/me/updates') return finish({ updates: state.updates.map(item => ({ ...item, jobId: item.bookingId })) });
    if (path === '/mechanics/me/earnings') {
      const completed = state.bookings.filter(item => item.status === 'completed');
      const history = completed.map(b => ({ jobId: b.id, reference: b.reference, status: b.status, paymentStatus: b.payment.status, paymentReference: b.payment.reference, gross: b.payment.status === 'verified' ? b.quotedAmount : 0, quotedGross: b.quotedAmount, commission: b.quotedAmount * 0.05, net: b.quotedAmount * 0.95, completedAt: b.completedAt }));
      return { earnings: { completedJobs: completed.length, grossCollected: history.reduce((sum, b) => sum + b.gross, 0), commission: history.reduce((sum, b) => sum + b.gross * 0.05, 0), netEarnings: history.reduce((sum, b) => sum + b.gross * 0.95, 0), commissionRate: 0.05, history } };
    }
    if (path === '/mechanics/me/jobs') {
      const status = url.searchParams.get('status');
      return finish({ jobs: state.bookings.filter(b => b.providerId === state.mechanic.id && currentUser.id === demoUsers.mechanic.id && (!status || b.status === status)).map(b => job(b, state)) });
    }
    const match = path.match(/^\/(customers\/me\/bookings|mechanics\/me\/jobs)\/([^/]+)(?:\/(.*))?$/);
    if (match) {
      const [, area, bookingId, action = ''] = match;
      const b = state.bookings.find(item => item.id === bookingId);
      if (!b) throw error('This demo booking was not found. Reset demo data to restore the examples.', 404);
      const fromMechanic = area.startsWith('mechanics');
      if (fromMechanic ? b.providerId !== state.mechanic.id || currentUser.id !== demoUsers.mechanic.id : b.customerId !== currentUser.id) throw error('This booking belongs to another account.', 403);
      const customerActions = ['mechanic/arrival-pin', 'review', 'sharing', 'cancel', 'reschedule', 'quote-decision', 'repair-approval', 'towing/handover', 'inspection-request', 'payment/session', 'pay', 'payment', 'payment-confirm'];
      const mechanicActions = ['accept', 'decline', 'arrival-verification', 'diagnosis', 'quotes', 'additional-work', 'progress', 'location', 'completion', 'handover'];
      if (action && ((fromMechanic && customerActions.includes(action)) || (!fromMechanic && mechanicActions.includes(action)))) throw error('This action requires the other participant.', 403);
      if ([...customerActions.filter(item => item !== 'mechanic/arrival-pin'), ...mechanicActions].includes(action) && method === 'GET') throw error('Confirmation is required for this action.', 405);
      if (['diagnosis', 'quotes', 'additional-work', 'progress', 'completion', 'handover'].includes(action) && b.status !== 'in_progress') throw error('Verify arrival with the customer before starting service.', 409);
      if (!action) return finish(fromMechanic ? { job: job(b, state) } : { booking: b });
      const channel = action.match(/^(mechanic|towing)\/messages$/);
      if (channel) {
        const key = `${b.id}:${channel[1]}`;
        const messages = state.messages[key] ||= [{ id: `hello-${b.id}`, sender: 'provider', body: 'Demo conversation. Messages are saved only in this browser.', createdAt: b.createdAt, clientId: 'welcome' }];
        const sender = fromMechanic ? 'provider' : 'customer';
        messages.forEach(item => { if (item.sender !== sender) item.readAt = now(); });
        if (method === 'GET') return finish({ messages });
        if (!body.body?.trim()) throw error('Enter a message.');
        let message = messages.find(item => item.clientId === body.clientId && item.sender === sender);
        if (message && message.body !== body.body) throw error('This message ID was already used.', 409);
        if (!message) { message = { id: id('demo-message'), sender, body: body.body, clientId: body.clientId, createdAt: now(), readAt: null }; messages.push(message); }
        return finish({ message });
      }
      if (action === 'mechanic/arrival-pin') {
        if (b.status !== 'en_route') throw error('Arrival verification is only available after the provider accepts.', 409);
        state.arrivalPins ||= {};
        let verification = state.arrivalPins[b.id];
        if (!verification || Date.parse(verification.expiresAt) <= Date.now()) {
          const random = new Uint32Array(1); globalThis.crypto.getRandomValues(random);
          verification = { pin: String(1000 + random[0] % 9000), expiresAt: new Date(Date.now() + 600000).toISOString(), attempts: 0 };
          state.arrivalPins[b.id] = verification;
        }
        return finish({ bookingId: b.id, pin: verification.pin, expiresAt: verification.expiresAt });
      }
      if (action === 'review') {
        if (b.status !== 'completed' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) throw error('Rate a completed demo service from 1 to 5.');
        b.review = { ...body, id: b.review?.id || id('demo-review'), bookingId: b.id, version: (b.review?.version || 0) + 1 };
        return finish({ review: b.review });
      }
      if (action === 'sharing') { b.sharing = { enabled: Boolean(body.enabled) }; return finish({ sharing: b.sharing }); }
      if (action === 'receipt') return finish({ booking: b });
      if (action === 'cancel') b.status = 'cancelled';
      else if (action === 'reschedule') b.scheduledAt = body.scheduledAt;
      else if (action === 'accept') { if (b.status !== 'requested') throw error('This request is no longer available.', 409); b.status = 'en_route'; b.mechanic.arrivalPinAvailable = true; b.dispatchedAt = now(); b.canCancel = false; b.canReschedule = false; }
      else if (action === 'decline') b.status = 'rejected';
      else if (action === 'arrival-verification') {
        const verification = state.arrivalPins?.[b.id];
        if (b.status !== 'en_route' || !verification || Date.parse(verification.expiresAt) <= Date.now()) throw error('Ask the customer to show a current arrival PIN.', 409);
        if (verification.attempts >= 5) throw error('Too many attempts. Wait for the PIN to expire, then ask the customer for a new one.', 429);
        if (body.pin !== verification.pin) { verification.attempts++; save(state); throw error('Incorrect arrival PIN. Check with the customer in person.'); }
        b.status = 'in_progress'; b.mechanic.arrivalPinAvailable = false; delete state.arrivalPins[b.id];
      }
      else if (action === 'diagnosis') { b.mechanic.diagnosis = { summary: body.findings }; save(state); return { diagnosis: b.mechanic.diagnosis }; }
      else if (action === 'quotes' || action === 'additional-work') {
        const items = body.items?.map(item => ({ label: String(item.label || '').trim(), amount: Number(item.amount) }));
        if (!items?.length || items.some(item => !item.label || !Number.isFinite(item.amount) || item.amount < 0)) throw error('Enter valid quote items.');
        const quote = { ...estimate(items, id('demo-quote')), warrantySummary: body.warrantySummary || '' };
        if (action === 'additional-work') { quote.baseQuoteId = b.approvedQuote?.id; quote.baseQuoteVersion = b.approvedQuote?.version; b.pendingRevision = quote; b.revisionStatus = 'awaiting_customer'; }
        else { b.repairEstimate = quote; b.repairApprovalStatus = 'awaiting_customer'; }
        b.mechanic.workPaused = true; return finish({ quote, request: quote });
      }
      else if (action === 'quote-decision' || action === 'repair-approval') {
        const quote = b.revisionStatus === 'awaiting_customer' ? b.pendingRevision : b.repairEstimate;
        const decision = body.decision || 'approve';
        if (!quote) throw error('No demo quote is waiting for approval.', 409);
        const key = b.revisionStatus === 'awaiting_customer' ? 'revisionStatus' : 'repairApprovalStatus';
        b[key] = decision === 'approve' ? 'approved' : 'rejected';
        if (decision === 'approve') b.approvedQuote = quote;
        b.mechanic.workPaused = false; b.version++;
        return finish({ booking: b, decision: { quoteId: quote.id, quoteVersion: quote.version, decision } });
      }
      else if (action === 'progress') { b.mechanic.updates.unshift({ id: id('demo-progress'), title: 'Demo progress update', body: body.message, createdAt: now() }); }
      else if (action === 'location') { b.mechanic.position = { ...body, updatedAt: now() }; }
      else if (action === 'completion') { b.status = 'completed'; b.completedAt = now(); b.canReview = true; }
      else if (action === 'handover') { b.towing ||= {}; b.towing.status = 'at_destination'; b.towing.canConfirmHandover = true; }
      else if (action === 'towing/handover') { b.towing.handover = { ...body, id: id('demo-handover'), status: 'confirmed' }; b.towing.canConfirmHandover = false; return finish({ handover: b.towing.handover }); }
      else if (action === 'inspection-request') b.inspectionStatus = 'requested';
      else if (action === 'payment/session') return { session: { sessionId: id('demo-checkout'), method: body.method, amount: b.quotedAmount, currency: 'PHP', qrPayload: 'DEMO-ONLY-NOT-PAYABLE', expiresAt: new Date(Date.now() + 900000).toISOString() } };
      else if (action === 'pay' || action === 'payment' || action === 'payment-confirm') {
        b.payment = { ...b.payment, status: 'verified', reference: id('DEMO-PAYMENT'), demo: true }; b.paidAmount = b.quotedAmount; b.receiptAvailable = true;
      }
      else if (action === 'payment-reports') b.payment.status = 'pending_verification';
      else throw error(`Frontend demo action is unavailable: ${action}`, 501);
      b.version++; b.mechanic.status = b.status; b.mechanic.updatedAt = now();
      if (b.towing && ['accept', 'arrival-verification'].includes(action)) b.towing.status = b.status;
      return finish({ booking: b, job: job(b, state), payment: b.payment });
    }
    throw error(`No local frontend fixture for ${method} ${path}`, 404);
  }
  return { request, read, selectRole, reset, user, provider: body => provider(read(), body) };
}

function browserStorage(name) { try { return globalThis[name]; } catch { return undefined; } }
export const demoApi = createDemoApi(browserStorage('localStorage'), browserStorage('sessionStorage'));
export function initializeDemo() {
  try {
    if (!localStorage.getItem(REQUEST_KEY)) localStorage.setItem(REQUEST_KEY, JSON.stringify({ location: sampleLocation, request: { serviceType: 'mechanic', issueType: 'Battery', vehicleId: 'demo-vehicle', notes: '', landmark: 'Demo pickup point', matchingMode: 'auto', scheduledAt: null }, selectedProviderId: '' }));
  } catch { /* The demo adapter also works in memory. */ }
}
export function demoReceipt(reference) {
  const text = `DEMO RECEIPT - NOT PROOF OF PAYMENT: ${reference}`.replace(/[^A-Za-z0-9 :.-]/g, '');
  const stream = `BT /F1 12 Tf 40 740 Td (${text}) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}
export async function demoFetch(input, options = {}) {
  const path = String(input).replace(/^\/demo-api/, '');
  try {
    const result = await demoApi.request(path, options);
    if (path.endsWith('/receipt')) return new Response(demoReceipt(result.booking.reference), { headers: { 'Content-Type': 'application/pdf' } });
    return result === null ? new Response(null, { status: 204 }) : Response.json(result);
  } catch (failure) {
    if (failure.name === 'AbortError') throw failure;
    return Response.json({ error: failure.message }, { status: failure.status || 500 });
  }
}
