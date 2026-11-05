export const STORE_KEY = 'fixmybuddy-copy-demo-v1';
export const SESSION_KEY = 'fixmybuddy-copy-session-v1';
export const REQUEST_KEY = 'fixmybuddy-copy-request';
export const sampleLocation = { latitude: 13.6218, longitude: 123.1948, address: 'Demo pickup, Panganiban Drive, Naga City', city: 'Naga City', source: 'manual' };
export const demoUsers = {
  customer: { id: 'demo-customer', name: 'Demo Customer', role: 'customer', email: 'customer@example.demo', phone: '+639170000001', phoneVerified: true, emergencyContact: { name: 'Demo Contact', phone: '+639170000003', relationship: 'Family' } },
  mechanic: { id: 'demo-mechanic', name: 'Demo Mechanic', role: 'mechanic', email: 'mechanic@example.demo', phone: '+639170000002', phoneVerified: true },
};
export function estimate(items = [{ label: 'Demo call-out and diagnosis', amount: 450 }], id = 'demo-estimate') {
  return { id, version: 1, currency: 'PHP', items, total: items.reduce((sum, item) => sum + item.amount, 0), expiresAt: new Date(Date.now() + 86400000).toISOString() };
}
export const policy = { id: 'demo-policy', text: 'Presentation only. No actual service or cancellation fee is charged.' };
export function createBooking(id, status, serviceType = 'mechanic') {
  const now = new Date().toISOString();
  return {
    id, customerId: demoUsers.customer.id, providerId: 'demo-provider', reference: `DEMO-${id.replace('demo-', '').toUpperCase()}`, version: 1,
    serviceType, issueType: serviceType === 'towing' ? 'Towing' : 'Battery', vehicleId: 'demo-vehicle', vehicleLabel: 'Toyota Vios · DEMO 01',
    pickup: { ...sampleLocation }, createdAt: now, completedAt: status === 'completed' ? now : null,
    scheduledAt: null, dispatchedAt: status === 'requested' ? null : now, status, providerName: 'Demo Mechanic', quotedAmount: 450,
    notes: 'Sample booking for the frontend presentation.', canCancel: status === 'requested', canReschedule: status === 'requested', cancellationPolicy: policy,
    payment: { status: 'unverified', payeeName: 'DEMO ONLY - DO NOT PAY', payeePhone: '', reference: '', reportable: true, methods: ['gcash', 'qrph'], commissionRate: 0.05, commission: 22.5, net: 427.5, qrPayload: 'DEMO-NOT-A-PAYMENT-CODE' },
    initialEstimate: estimate(), repairApprovalStatus: 'not_requested', revisionStatus: null, inspectionStatus: null, receiptAvailable: false,
    sharing: { enabled: false }, canReview: status === 'completed', canEditReview: true,
    warranties: status === 'completed' ? [{ id: 'demo-warranty', title: 'Sample workmanship warranty', status: 'active', startsAt: now, endsAt: new Date(Date.now() + 30 * 86400000).toISOString(), coverage: 'Illustrative coverage only.', exclusions: 'No actual warranty is provided by this demo.' }] : [],
    mechanic: { status, updatedAt: now, provider: { id: 'demo-provider', name: 'Demo Mechanic', phone: '', verified: false, chatEnabled: true, rating: 4, reviewsCount: 1 }, position: { latitude: 13.625, longitude: 123.197, updatedAt: now }, etaMinutes: 8, distanceMeters: 650, arrivalPinAvailable: status === 'en_route', workPaused: false,
      timeline: [{ id: 'confirmed', label: 'Booking confirmed', status: 'completed', at: now }, { id: 'service', label: 'Roadside service', status: status === 'completed' ? 'completed' : 'current' }], updates: [] },
    towing: serviceType === 'towing' ? { status: 'at_destination', destinationAddress: 'Demo repair shop, Naga City', distanceKm: 2, etaMinutes: 0, equipment: 'Demo flatbed', provider: { name: 'Demo Mechanic', chatEnabled: true, phone: '' }, canConfirmHandover: true, handover: { requiresPin: true } } : undefined,
  };
}
export function initialState() {
  const completed = createBooking('demo-completed', 'completed');
  completed.review = { id: 'demo-review', bookingId: completed.id, rating: 4, body: 'Sample feedback for the presentation.', version: 1 };
  return {
    users: [demoUsers.customer, demoUsers.mechanic],
    vehicles: [{ id: 'demo-vehicle', type: 'car', make: 'Toyota', model: 'Vios', year: 2022, color: 'Silver', plate: 'DEMO 01' }],
    mechanic: { id: 'demo-provider', name: 'Demo Mechanic', initials: 'DM', email: demoUsers.mechanic.email, mobile: demoUsers.mechanic.phone, identityVerified: false, credentials: ['Sample training record'], online: true, serviceRadiusKm: 15, workingHours: 'Mon–Sat · 8 AM–6 PM', specialties: ['Battery', 'Flat tire', 'Overheating', 'Fuel delivery', 'Lockout', 'Not starting', 'Towing'], location: { ...sampleLocation, source: 'manual' }, baseVisitFee: 450, diagnosisFee: 0, rating: 4, reviewsCount: 1 },
    bookings: [createBooking('demo-active', 'en_route'), createBooking('demo-repair', 'in_progress'), createBooking('demo-pending', 'requested'), createBooking('demo-towing', 'in_progress', 'towing'), completed],
    reminders: [{ id: 'demo-reminder', vehicleId: 'demo-vehicle', title: 'Sample oil change reminder', dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), targetMileage: 10000, currentMileage: 8500 }],
    updates: [{ id: 'demo-update', title: 'Welcome to the frontend demo', message: 'All records are sample data saved in this browser.', body: 'Sample notification.', bookingId: 'demo-active', createdAt: new Date().toISOString(), readAt: null }],
    messages: {}, support: [{ id: 'demo-support', sender: 'support', body: 'This is a local sample conversation. No support agent is connected.', createdAt: new Date().toISOString() }], disputes: [],
  };
}
