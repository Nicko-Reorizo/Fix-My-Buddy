# FixMyBuddy shared frontend package

Run `npm install`, `npm run dev`, and `npm run build` from the repository root. This package uses the source React 18, Vite 5, Tailwind 3, React Router, Lucide and Leaflet dependencies and lockfile.

Customer screens live in [src/pages/customer](src/pages/customer/), mechanic screens live in [src/pages/mechanic](src/pages/mechanic/), and public pages and shared sign-in forms live directly in [src/pages](src/pages/). Route definitions live in [src/routes](src/routes/).

The floating **Pages · 53** menu initializes sample roles and request data. See [migration-pages.json](../migration-pages.json) for page paths and team assignments.

The frontend talks to the real backend in [../../Fix-My-Buddy-Backend](../../Fix-My-Buddy-Backend), the same way as the original FixMyBuddy project:

- **Development:** `vite.config.js` loads the backend's `createApp()` as Vite middleware for every `/api/*` request and attaches the WebSocket tracking gateway (`/api/ws/tracking`) to Vite's HTTP server. One terminal and one origin (`http://localhost:5173`), so session cookies and CORS just work. Install backend dependencies once with `npm run setup:backend` from the repository root, and put `DATABASE_URL`, `SESSION_SECRET` and `PASSWORD_PEPPER` in `Fix-My-Buddy-Backend/.env` (see its `.env.example`).
- **API base URL:** `src/services/apiClient.js` reads `VITE_API_BASE_URL` (`.env.development` sets `/api`; unset also defaults to `/api`). `VITE_TRACKING_WS_URL` optionally points tracking at a separately hosted WebSocket.
- **Production (Vercel):** `vercel.json` rewrites `/api/*` to the deployed backend at `https://fix-my-buddy.vercel.app`, keeping requests same-origin.

`src/demo/` (browser-local sample API and page menu) is no longer loaded by `main.jsx`; it remains only for reference and unit tests.

`ACCOUNT_API.md`, `AUTH_API.md`, `CUSTOMER_API.md`, and `CUSTOMER_INTEGRATION_STATUS.md` retain historical source contracts for reference. They are not setup requirements for this frontend migration.

The existing application comes from [Nicko-Reorizo/FixMyBuddy](https://github.com/Nicko-Reorizo/FixMyBuddy), baseline `4d80403` plus the working tree preserved in `fixmybuddy-copy-frontend`. Preserve original credits and license notices.
