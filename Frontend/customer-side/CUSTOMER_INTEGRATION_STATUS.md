# Customer account integration handoff

Checked locally: 2 November 2026. Scope: customer API integration, authentication, profile/emergency contact, vehicles, location handling and assistance-request drafts. No backend or mechanic files were changed.

## Configuration

- `.env.development` sets `VITE_API_BASE_URL=/api`. The existing Vite middleware mounts the real backend under the same origin, avoiding a separate CORS setup for local customer development.
- Install dependencies in both `backend/` and `Frontend/customer-side/`, then run the customer development server. Restart Vite after changing environment settings.
- Production defaults to `/api`. The frontend Vercel configuration proxies requests to the separately deployed backend at `https://fix-my-buddy.vercel.app`; the frontend origin is `https://fixmybuddy.vercel.app`. Keep `VITE_API_BASE_URL` unset or `/api` for same-origin sessions. Vite development middleware is not part of the static production build.
- Local database check returned **configured=false**. The backend owner must populate `backend/.env` privately, verify connectivity, and run migrations. A successful unauthenticated `/api/auth/session` response does not prove database connectivity.

## Existing backend contracts connected

| Feature | Endpoint | Frontend handling |
|---|---|---|
| Restore session | GET `/auth/session` | Accepts explicit `{user:null}` or valid user; distinguishes failed/malformed response from a guest session; offers retry. |
| Email login | POST `/auth/login` | Sends `role:customer`; displays validation/credential errors; only authenticates from a returned user. |
| Signup | POST `/auth/signup` | Sends customer role and form details; requires a challenge with ID, expiry and resend timestamp; does not treat signup as verified login. |
| Phone login | POST `/auth/phone/start` | Uses backend challenge; phone-based role enforcement still needs backend review. |
| Verify/resend | POST `/auth/phone/verify`, `/auth/phone/resend` | Handles incorrect/expired code, backend cooldown and replacement challenge; requires `phoneVerified:true`. Development codes are displayed only in Vite development mode. |
| Logout | POST `/auth/logout` | Clears the local session only after successful server acknowledgement. |
| Forgot password | POST `/auth/password/forgot` | Requires `{ok:true}`; acknowledges the request without asserting that email was delivered. |
| Profile | PATCH `/customers/me` | Sends name or emergency contact; checks returned user ID and saved fields before showing success. |
| Vehicle list | GET `/customers/me/vehicles` | Validates actual returned records; hides stale records during load/failure. |
| Create/edit vehicle | POST `/customers/me/vehicles`, PATCH `/customers/me/vehicles/:id` | Uses backend IDs, validates required fields, and checks edit acknowledgement ID. |
| Delete vehicle | DELETE `/customers/me/vehicles/:id` | Removes the record locally only after a successful response. |

All JSON account/customer calls include credentials, disable caching, time out, and do not automatically retry mutations. A protected API 401 clears authenticated state and offers sign-in; 403 does not silently log the user out. Guest vehicles remain device-only and are not silently uploaded on login.

## Backend owner action items

1. Configure database credentials and schema locally. Live signup, login, saved profiles, and vehicle CRUD remain unverified until that is done.
2. Implement actual SMS delivery. Current auth code logs development codes and includes a non-production universal OTP bypass. The frontend no longer advertises that bypass. Review deployment mode and remove/strictly gate test behavior before public use.
3. Complete password reset: the current forgot endpoint creates a hashed reset token but does not deliver the raw token by email. There is no reset-token validation/password-update endpoint or agreed response contract yet. Supply the reset URL format, validation/completion endpoints, token expiry behavior and delivery status semantics before adding a customer reset-password completion page.
4. Confirm verified phone/email update endpoints. The customer profile deliberately leaves these identifiers read-only.
5. Confirm phone-login role handling: email login has a customer role hint, but phone-start/verify currently do not constrain a customer role. Shared verification currently routes actual mechanic accounts to their workspace, and customer RoleGuard blocks cross-role pages; server authorization remains required.
6. Verify expired sessions, user ownership, duplicate plate conflicts, emergency-contact sharing revocation, and invalid vehicle updates against the real database. Backend validation must enforce the rules independently of the UI.
7. Finalize published Terms/Privacy versions and record actual acceptance version/time server-side. Current draft policy content is not a substitute for a finalized agreement or privacy notice.

## Validation performed

- Automated API tests cover credentials, JSON payloads, no caching/no retries, malformed HTML fallback, 5xx error redaction, timeout/cancellation, 204 responses, invalid session/challenge data, customer-role login, signup challenge, resend payload, profile/contact acknowledgement and vehicle CRUD responses.
- Browser checks against an isolated in-memory API passed: invalid and successful email login, restore after reload, profile save, emergency contact add/reload/remove, vehicle add/select/edit/reload/delete, logout, invalid OTP, resend, verified phone login, reset-request acknowledgement, and session-expiry recovery after an API 401.
- This is frontend contract testing, **not** proof of real SMS/email delivery, PostgreSQL persistence, or a complete customer-to-mechanic journey. Signup account creation and all live database-backed cases must be repeated with the configured backend.

## Reproduce isolated frontend checks

From `Frontend/customer-side/`:

```powershell
node tests/customer-account-preview.mjs
```

Use `http://127.0.0.1:5186/signin`. The test API runs on port 5986 and uses in-memory QA records only. Test-only email login: `qa.customer@example.test` / `QA-test-only-123`. Test-only OTP: `246810`. These values are never imported by production code, and no SMS/email is sent. Stop the harness after testing. Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` for automated checks.

## Location and assistance requests (#4â€“5)

- GPS requests distinguish permission denial, unavailable position, timeout and unsupported browser, with manual-address recovery. Cancelling or starting another request ignores late GPS results; manual edits cancel the outstanding GPS request. Confirm is disabled during GPS lookup.
- The full-screen map keeps pin/address/landmark edits separate until Confirm. Back/Escape dismiss the draft. Failed address lookup offers a retry or manual address with the same coordinates. Starting GPS no longer leaves an interrupted address lookup stuck in the loading state after GPS fails. The initial map viewport remains the Philippines; it is not a fabricated customer position.
- A confirmed picker location includes coordinates, customer-corrected address and landmark. Mechanic location confirmation preserves the request landmark with that location. Both request types accept a full manual pickup address when GPS is unavailable; placeholder GPS text alone is not a manual address.
- Request validation checks vehicle, service issue, real coordinates or a full address, future schedule and description/instruction limits before provider search and again before booking. An in-flight guard blocks concurrent booking submissions. This is not server idempotency: after an uncertain network result, check history before retrying; the backend still needs an agreed idempotency contract.
- Media selection keeps accepted photos/videos when navigating Back. Duplicate files, unsupported/empty files, oversize files and selections above ten are rejected without dropping accepted files. Leaving/reloading a tab with selected files triggers the browser's native unsaved-data prompt (subject to browser interaction rules).
- **Booking-media upload remains blocked.** There is no initial booking-upload endpoint or attachment-ID contract in the current backend. Its existing multipart evidence parser records file metadata for another workflow; that does not establish private storage of booking media bytes. Do not silently strip files or claim upload success. The details screen explains the block before selection; customers can remove attachments and continue.
- Backend owner: supply authenticated upload/create/delete endpoints, private file storage, returned attachment IDs, ownership checks and booking association. Agree per-file/aggregate limits and resumable/chunked video support: the frontend permits ten files with 20 MiB photos / 100 MiB videos; the current 120 MiB multipart request ceiling cannot accept every allowed selection in one request.
- Automated checks now total 25 passing checks, including GPS success/failures/cancellation, manual/GPS pickup validation, schedules, and media batch preservation/limits. Lint and production build pass; the existing main-bundle size warning remains. Phone UI/map gesture checks and live booking/upload persistence must still be repeated with working browser preview tooling and a configured backend; these changes do not prove end-to-end customer/mechanic integration.

## Provider search and matching (#6)

- Customer search uses POST `/providers/search` with the complete draft, pickup and filters. Profile refresh uses POST `/providers/:id/quote` with `{request,location}`. Both now use the shared API client: authenticated cookies, no caching, protected-401 session expiry, timeout/cancellation and safe HTTP errors. Calls do not retry automatically.
- Search validates the draft and filter values before sending. Responses reject malformed provider metrics/coordinates, duplicate IDs and recommendations absent from the returned list. Missing estimates or ETAs stay pending/unavailable; the customer client never invents them.
- Request/filter changes cancel prior searches and hide old results. A stale selection is cleared. Automatic mode opens only the server-recommended provider, respects an existing valid choice when returning from review, and falls back to manual choice when no recommendation is supplied. It never confirms a booking automatically.
- Profiles display only a fresh quote response, not cached prices after a failure. Booking review requires a current PHP estimate, cancellation terms and valid towing route/condition when applicable. Empty results retain wider-radius, retry and scheduling actions. Towing errors link to the towing pickup form.
- Added six provider API/selection checks; the complete automated suite now has 31 passing checks. These are isolated frontend contract checks, not live database or mobile gesture acceptance tests.

### Backend owner: provider readiness gaps

The current `backend/src/routes/providerRoutes.js` does not yet establish live provider matching:

1. Distance falls back to 2.4 km; ETA is a distance-based formula with a six-minute minimum. Manual pickup addresses are not geocoded. Return unavailable values when a real position/route cannot be resolved, and supply routing/arrival data before presenting live tracking.
2. Mechanic fees have 300/150 fallback values; towing uses fixed 1,000 dispatch plus 100/km. Towing distance is based on customer-to-provider distance rather than the pickup-to-destination trip. Use actual configured provider rates and a validated trip route. Zero-valued legitimate fees must not be replaced by `||` defaults.
3. Search queries online profiles but does not enforce requested service, vehicle compatibility, scheduled availability or capacity. Specialty filtering can let profiles without a specialties array through. Enforce these server-side and recheck at quote and booking creation.
4. The profile/quote endpoint reads any matching profile ID without rechecking online/availability. Confirm authentication/role/ownership requirements and reject unavailable or incompatible providers.
5. Quote IDs/route IDs and version numbers are generated constants per provider/service. Provide actual versioned quote/route records, expiry, trusted cancellation-policy records and booking revalidation.
6. Configure the database and repeat actual mechanic/towing searches, filters, scheduled matches, quote refresh and concurrent booking checks. No live-nearest-provider or customer-to-mechanic completion claim is supported by the isolated frontend tests.
