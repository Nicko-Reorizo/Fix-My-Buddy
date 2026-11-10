# Authentication contract

Customer routes: /signin and /signup. Mechanic routes: /mechanic/signin and /mechanic/signup. Both use email/password and immediately open their own dashboard after a successful session response. OTP UI and phone-only login have been retired.

| Method | Endpoint (relative to /api) | Result |
| --- | --- | --- |
| POST | /auth/signup | 201 { user }, HttpOnly session cookie |
| POST | /auth/login | 200 { user }, HttpOnly session cookie |
| POST | /mechanics/auth/signup | 201 { user }, mechanic role enforced |
| POST | /mechanics/auth/login | 200 { user }, mechanic role enforced |
| GET | /auth/session | { user } or { user: null } |
| POST | /auth/logout | 204 |
| POST | /auth/password/forgot | { ok: true }, generic response |
| POST | /auth/phone/start, /auth/phone/verify, /auth/phone/resend | 410 retired |

Signup accepts name, email, phone, password, acceptedTerms and role. Login accepts email, password and role (customer by default). Phone numbers are normalized as +639XXXXXXXXX. Authenticated users contain id, role, name, email, phone, phoneVerified and emergencyContact.

phoneVerified is now an auto-set legacy eligibility field, not proof of phone ownership. Mechanic identity verification remains independent. Password reset delivery is outside these revisions and still needs an email provider.

Local development uses /api from .env.development and the backend middleware inside Vite. Configure backend/.env with the database connection and existing secrets. See ../../IMPLEMENTATION.md for file-by-file changes, GPS, deployment and launch instructions.
