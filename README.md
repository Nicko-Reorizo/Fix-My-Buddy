# Fix-My-Buddy — shared frontend migration foundation

These are **migration assignments** for the existing FixMyBuddy frontend, credited to [Nicko-Reorizo/FixMyBuddy](https://github.com/Nicko-Reorizo/FixMyBuddy), baseline commit `4d80403` plus the source working tree copied into `C:\Users\nicko\FixMyBuddy\fixmybuddy-copy-frontend`. Preserve all original credits and license notices. Importing these files does not prove original authorship. No backend, database, Supabase connection, credentials or real environment files are required.

The shared frontend is ready. **All 53 assigned page files are placeholders** with their original exports. All routes, images, shared customer/mechanic components, contexts, hooks, utilities, translations, styles and browser-local demo infrastructure are included. Paste original pages into their assigned locations without configuring imports, routing or dependencies. The top FRONTEND DEMO banner is absent; the floating **Pages · 53** selector is retained.

## Run from repository root

```powershell
npm install
npm run dev
# Open the localhost URL printed by Vite (normally http://localhost:5174).
npm run build
```

Use a supported Node.js LTS version (verified here with Node 24) and npm. On Windows use `npm.cmd` if PowerShell blocks scripts. Root install automatically installs the customer-side package using its source lockfile. Later starts only need `npm run dev`. Root scripts delegate to `Frontend/customer-side`. Production output: `Frontend/customer-side/dist/`. No .env or API server is needed.

## Structure

```text
Fix-My-Buddy/
├── package.json / package-lock.json / .gitignore
├── README.md / TEAM_TASKS.md / TRELLO_CARDS.md / VERIFICATION.md
├── migration-pages.json
└── Frontend/
    ├── .gitignore
    ├── customer-side/
    │   ├── package.json / package-lock.json / index.html
    │   ├── vite.config.js / tailwind.config.js / postcss.config.js
    │   ├── eslint.config.js / vercel.json
    │   ├── public/ / tests/ / scripts/ / design/
    │   └── src/
    │       ├── main.jsx / App.jsx
    │       ├── assets/ / components/ / content/ / context/ / data/
    │       ├── demo/ / hooks/ / i18n/ / routes/ / services/ / styles/ / utils/
    │       └── pages/ (29 placeholders plus auth/ with 6 placeholders)
    └── src/mechanic/
        ├── components/ / layout/ / services/ / styles/
        └── pages/ (18 placeholders)
```

## Team workflow

Read [TEAM_TASKS.md](TEAM_TASKS.md) for exact source/destination folders, files, branch names, testing and PR steps. [TRELLO_CARDS.md](TRELLO_CARDS.md) has five ready-to-copy migration cards. Everyone clones this entire prepared baseline and replaces only their assigned placeholders on their own branch. The assignment manifest is [migration-pages.json](migration-pages.json). This is migration of existing credited code, not evidence of original authorship. No commits, pushes or remote branches are created by this preparation.

## Local demo and limits

Use Pages · 53 to select a member page or customer/mechanic workspace; it seeds a local demo identity and request. Sample records persist in browser local storage; sessions are per tab. No real authentication, SMS, support agent, payments, payouts, database, Supabase or durable file upload is connected. Use sample details only. Demo PIN: **1234**; simulated checkout code: **0000**. Browser-local messages/records are not shared between devices. Public OpenStreetMap tiles need internet; sample address search is local and GPS is optional.

A pasted page can still render another member's placeholder through a shared export or navigation until their PR merges. In particular, Member 2 depends on Member 1's PickupPreview; Member 5's Home aliases Member 1's Welcome; mechanic signup/reset use Member 1 pages; mechanic 404 uses Member 5; Member 4 wrappers use LiveWorkspace. All exports are present, so these dependencies do not require import repairs.

## Checks and hosting

```powershell
npm test
npm run lint
npm run build
npm run test:browser
npm run preview
```

Page interaction tests activate as the corresponding implementations arrive; see TEAM_TASKS. Browser smoke uses local Chrome by default, or set `$env:DEMO_BROWSER_CHANNEL='msedge'`. It writes ignored screenshots. For hosting, use `Frontend/customer-side` as project root, build `npm run build`, output `dist`; included vercel.json supplies the SPA fallback with no API proxy. No deployment is created. Original API contract documents inside the customer package are historical reference only. [VERIFICATION.md](VERIFICATION.md) records the preparation checks.

The old Vite starter and original working-tree status are preserved locally in ignored `.migration-backup/starter/` and `.migration-backup/initial-status.txt`; this backup is not part of the shared frontend.
