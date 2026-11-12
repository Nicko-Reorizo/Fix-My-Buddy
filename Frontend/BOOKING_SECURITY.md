# Booking and security revision

The frontend demo requires a signed-in customer for customer and booking routes. The local demo adapter also rejects guest and cross-role requests and checks booking ownership. The page selector remains an explicit demo account switcher.

The default mechanic flow is pickup + issue on one screen, automatic provider matching with a fresh estimate, then one final confirmation. Towing keeps destination and vehicle-condition questions on its request screen. Notes and landmarks are optional. Matching creates no booking; the customer must accept pickup, estimate and cancellation terms, then press **Confirm & request help**. Payment is deferred to service. Provider browsing and scheduling remain available.

Each draft carries a persistent confirmation ID. Concurrent submissions and an identical retry after reload return the existing booking. Reusing an ID with changed details is rejected. The local adapter rechecks the provider's availability, vehicle, pickup and estimate identifiers before creating a booking. A failed list refresh does not repeat a successful booking.

After provider acceptance, the customer can reveal a booking-specific, 10-minute arrival PIN. The assigned provider must enter it before starting service. Five incorrect attempts lock the PIN until it expires; renewal is available from the customer screen. A used PIN cannot be reused. Arrival verification supports mechanic and towing bookings and does not authorize payment or additional repairs.

These are browser-local demonstrations. Demo login does not verify passwords, and sample accounts, records and PINs are stored in browser storage. Production authentication, authorization, idempotency, availability checks and PIN generation/verification must be implemented on a trusted backend. No real SMS, dispatch or payment is performed.

Validation:

- `npm test`: unit, API-contract and mounted service-state checks, including booking security regressions.
- `npm run lint` and `npm run build`: static checks and production bundle.
- `npm run test:browser`: 53-page smoke checks plus actual mechanic/towing request, guest redirects, explicit consent, double-click protection and arrival PIN UI flows in local Chrome.
- Browser screenshots are generated under ignored `Frontend/screenshots/`.
