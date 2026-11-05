# FixMyBuddy shared frontend package

Follow the root [README](../../README.md), [TEAM_TASKS](../../TEAM_TASKS.md), and [TRELLO_CARDS](../../TRELLO_CARDS.md). Run `npm install`, `npm run dev`, and `npm run build` from the repository root. This package uses the source React 18, Vite 5, Tailwind 3, React Router, Lucide and Leaflet dependencies and lockfile.

The prepared repository has 53 migration placeholders. Customer and mechanic routes, shared components/assets, contexts, styles, translations and browser-local demo records are already installed. The floating **Pages · 53** menu initializes sample roles and request data. Paste only your assigned page files; keep the uppercase `Frontend` folder.

No backend, database, Supabase, credentials, environment file or API proxy is required. `/demo-api` is handled in memory/browser storage by `src/demo/localApi.js` through `src/utils/networkFetch.js`; it is not an HTTP server. Tracking is local polling. Authentication, support, checkout and receipts are demonstrations. Public map tiles need internet and GPS permission is optional.

`ACCOUNT_API.md`, `AUTH_API.md`, `CUSTOMER_API.md`, and `CUSTOMER_INTEGRATION_STATUS.md` retain historical source contracts for reference. They are not setup requirements for this frontend migration.

The existing application comes from [Nicko-Reorizo/FixMyBuddy](https://github.com/Nicko-Reorizo/FixMyBuddy), baseline `4d80403` plus the working tree preserved in `fixmybuddy-copy-frontend`. Preserve original credits and license notices.
