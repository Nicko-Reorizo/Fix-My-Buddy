# FixMyBuddy shared frontend package

Run `npm install`, `npm run dev`, and `npm run build` from the repository root. This package uses the source React 18, Vite 5, Tailwind 3, React Router, Lucide and Leaflet dependencies and lockfile.

Customer screens live in [src/pages/customer](src/pages/customer/), mechanic screens live in [src/pages/mechanic](src/pages/mechanic/), and public pages and shared sign-in forms live directly in [src/pages](src/pages/). Route definitions live in [src/routes](src/routes/).

The floating **Pages · 53** menu initializes sample roles and request data. See [migration-pages.json](../migration-pages.json) for page paths and team assignments.

No backend, database, Supabase, credentials, environment file or API proxy is required. `/demo-api` is handled in memory/browser storage by `src/demo/localApi.js` through `src/utils/networkFetch.js`; it is not an HTTP server. Tracking is local polling. Authentication, support, checkout and receipts are demonstrations. Public map tiles need internet and GPS permission is optional.

`ACCOUNT_API.md`, `AUTH_API.md`, `CUSTOMER_API.md`, and `CUSTOMER_INTEGRATION_STATUS.md` retain historical source contracts for reference. They are not setup requirements for this frontend migration.

The existing application comes from [Nicko-Reorizo/FixMyBuddy](https://github.com/Nicko-Reorizo/FixMyBuddy), baseline `4d80403` plus the working tree preserved in `fixmybuddy-copy-frontend`. Preserve original credits and license notices.
