# Five-member frontend migration — 53 page files

These are **migration assignments** for the existing FixMyBuddy frontend, credited to [Nicko-Reorizo/FixMyBuddy](https://github.com/Nicko-Reorizo/FixMyBuddy), baseline commit `4d80403` plus the source working tree copied into `C:\Users\nicko\FixMyBuddy\fixmybuddy-copy-frontend`. Preserve all original credits and license notices. Importing these files does not prove original authorship. No backend, database, Supabase connection, credentials or real environment files are required.

## Shared baseline and concurrent work

The coordinator publishes this prepared foundation to main. Everyone clones the **entire repository**, runs `npm install` once at the root, and creates their assigned branch from that shared main baseline:

```powershell
git switch main
git pull --ff-only
git switch -c <assigned-branch>
npm install
npm run dev
```

Use `npm.cmd` if PowerShell blocks `npm`. Replace **only your assigned placeholder files** with the corresponding original source files below. Copy file contents or individual files; do not copy whole directories, another package manifest, lockfiles, routes or shared components. All supporting code/assets/dependencies are already included. Preserve uppercase `Frontend`; preserve each file's original name, exports and relative imports. Do not copy from the parent production project.

All five members can work concurrently. A route or embedded component owned by someone else may still show that member's placeholder. This is expected until their PR merges. Use the floating **Pages · 53** selector to initialize local demo identity/request data and reach assigned routes independently. A partial migration need not provide a complete end-to-end flow.

## Shared dependencies already prepared

- Member 2's `RequestAssistance.jsx`, `TowingRequest.jsx`, and `PickupLocation.jsx` import `PickupPreview` from Member 1's `auth/Welcome.jsx`. Its export exists now, but its UI stays a placeholder until Member 1 merges.
- Member 5's `Home.jsx` re-exports Member 1's `Welcome`. After Member 5 pastes Home, the landing page remains Member 1's placeholder until Welcome merges.
- Mechanic signup/reset use Member 1's SignUp/ForgotPassword. Mechanic unknown routes use Member 5's NotFound.
- Many Member 4 pages wrap `LiveWorkspace.jsx`. Paste all 18 together; its five exports are LiveAccount, LiveJobs, LiveJob, LiveEarnings and LiveUpdates.
- Member 3's booking/chat/payment UI shares browser-local records with Member 2 requests and Member 4 jobs; combined flow testing follows integration. Shared review/payment/booking/tracking components and the tracking hook are already present.
- No member needs to edit shared files to paste original pages. Shared-file changes, if later needed, go through a separate coordinated PR; do not race edits to routes, contexts, demo infrastructure, dependencies or styles.

## FE-01 — Authentication and onboarding

Owner: **Member 1**. Branch: `member-1-auth`. Reviewer: **Member 5**. Files: **6**.

Exact source folder: `C:/Users/nicko/FixMyBuddy/fixmybuddy-copy-frontend/frontend/customer-side/src/pages/auth`

Exact destination folder (relative to repository root): `Frontend/customer-side/src/pages/auth/`

Exact files to paste, with demo routes:

- `Welcome.jsx` → `/demo/welcome`
- `SignUp.jsx` → `/signup`
- `SignIn.jsx` → `/signin`
- `ForgotPassword.jsx` → `/forgot-password`
- `Permissions.jsx` → `/permissions`
- `SafetyProfile.jsx` → `/profile`

Testing: Run `npm run dev`, open Pages · 53 → Member 1, and visit every assigned entry. Test sample signup/signin, validation, permissions, safety profile and reset messaging. No email or SMS is sent. Run `npm test`, `npm run lint` and `npm run build` from the root. Full page flow checks depend on the other migration PRs; report any remaining placeholders honestly.

Pull request: Commit only these 6 files on `member-1-auth`, push the branch, then open a PR into `main` titled **FE-01: migrate authentication and onboarding**. Link this Trello card, list pasted paths, retain source attribution, attach test results and identify teammate placeholders encountered. Request Member 5's review. Update your branch from main and resolve conflicts before merging after review. Do not replace teammates' files.

## FE-02 — Assistance requests and mechanic search

Owner: **Member 2**. Branch: `member-2-request-matching`. Reviewer: **Member 3**. Files: **12**.

Exact source folder: `C:/Users/nicko/FixMyBuddy/fixmybuddy-copy-frontend/frontend/customer-side/src/pages`

Exact destination folder (relative to repository root): `Frontend/customer-side/src/pages/`

Exact files to paste, with demo routes:

- `RequestAssistance.jsx` → `/request`
- `RequestDetails.jsx` → `/request/details`
- `RequestMatching.jsx` → `/request/matching`
- `TowingRequest.jsx` → `/request/towing`
- `PickupLocation.jsx` → `/location`
- `ConfirmLocation.jsx` → `/confirm-location`
- `Providers.jsx` → `/providers`
- `ProviderFilters.jsx` → `/provider-filters`
- `ProviderProfile.jsx` → `/providers/demo-provider`
- `NoProviders.jsx` → `/demo/no-providers`
- `ConfirmRequest.jsx` → `/confirm-request`
- `Services.jsx` → `/demo/services`

Testing: Run `npm run dev`, open Pages · 53 → Member 2, and visit every assigned entry. Test request steps, pickup/towing locations, provider filters/details, empty results and confirmation with sample data. Run `npm test`, `npm run lint` and `npm run build` from the root. Full page flow checks depend on the other migration PRs; report any remaining placeholders honestly.

Pull request: Commit only these 12 files on `member-2-request-matching`, push the branch, then open a PR into `main` titled **FE-02: migrate assistance requests and mechanic search**. Link this Trello card, list pasted paths, retain source attribution, attach test results and identify teammate placeholders encountered. Request Member 3's review. Update your branch from main and resolve conflicts before merging after review. Do not replace teammates' files.

## FE-03 — Customer bookings and communication

Owner: **Member 3**. Branch: `member-3-customer-bookings`. Reviewer: **Member 2**. Files: **6**.

Exact source folder: `C:/Users/nicko/FixMyBuddy/fixmybuddy-copy-frontend/frontend/customer-side/src/pages`

Exact destination folder (relative to repository root): `Frontend/customer-side/src/pages/`

Exact files to paste, with demo routes:

- `ActiveService.jsx` → `/bookings/demo-active/service`
- `History.jsx` → `/history`
- `ProviderChat.jsx` → `/bookings/demo-active/provider-chat`
- `TowingChat.jsx` → `/bookings/demo-towing/towing-chat`
- `PaymentCheckout.jsx` → `/bookings/demo-active/pay`
- `Updates.jsx` → `/updates`

Testing: Run `npm run dev`, open Pages · 53 → Member 3, and visit every assigned entry. Test active/history bookings, both chats, updates, reviews and simulated checkout (demo code 0000). Run `npm test`, `npm run lint` and `npm run build` from the root. Full page flow checks depend on the other migration PRs; report any remaining placeholders honestly.

Pull request: Commit only these 6 files on `member-3-customer-bookings`, push the branch, then open a PR into `main` titled **FE-03: migrate customer bookings and communication**. Link this Trello card, list pasted paths, retain source attribution, attach test results and identify teammate placeholders encountered. Request Member 2's review. Update your branch from main and resolve conflicts before merging after review. Do not replace teammates' files.

## FE-04 — Mechanic workspace

Owner: **Member 4**. Branch: `member-4-mechanic`. Reviewer: **Member 1**. Files: **18**.

Exact source folder: `C:/Users/nicko/FixMyBuddy/fixmybuddy-copy-frontend/frontend/src/mechanic/pages`

Exact destination folder (relative to repository root): `Frontend/src/mechanic/pages/`

Exact files to paste, with demo routes:

- `Welcome.jsx` → `/mechanic`
- `SignIn.jsx` → `/mechanic/signin`
- `Availability.jsx` → `/mechanic/availability`
- `Jobs.jsx` → `/mechanic/jobs`
- `JobOffer.jsx` → `/mechanic/jobs/demo-pending`
- `JobTravel.jsx` → `/mechanic/jobs/demo-active/travel`
- `VerifyArrival.jsx` → `/mechanic/jobs/demo-active/arrival`
- `Diagnosis.jsx` → `/mechanic/jobs/demo-repair/diagnosis`
- `Quote.jsx` → `/mechanic/jobs/demo-repair/quote`
- `AdditionalWork.jsx` → `/mechanic/jobs/demo-repair/additional-work`
- `RepairProgress.jsx` → `/mechanic/jobs/demo-repair/progress`
- `TowingHandover.jsx` → `/mechanic/jobs/demo-towing/handover`
- `JobComplete.jsx` → `/mechanic/jobs/demo-completed/complete`
- `Earnings.jsx` → `/mechanic/earnings`
- `Updates.jsx` → `/mechanic/updates`
- `Account.jsx` → `/mechanic/account`
- `LiveWorkspace.jsx` → `/mechanic/jobs`
- `MechanicChat.jsx` → `/mechanic/jobs/demo-active/chat`

Testing: Run `npm run dev`, open Pages · 53 → Member 4, and visit every assigned entry. Test availability, jobs, arrival PIN 1234, diagnosis, quotes, progress, towing handover, completion, earnings and chat. Run `npm test`, `npm run lint` and `npm run build` from the root. Full page flow checks depend on the other migration PRs; report any remaining placeholders honestly.

Pull request: Commit only these 18 files on `member-4-mechanic`, push the branch, then open a PR into `main` titled **FE-04: migrate mechanic workspace**. Link this Trello card, list pasted paths, retain source attribution, attach test results and identify teammate placeholders encountered. Request Member 1's review. Update your branch from main and resolve conflicts before merging after review. Do not replace teammates' files.

## FE-05 — Landing, customer account, and support

Owner: **Member 5**. Branch: `member-5-account-layout`. Reviewer: **Member 4**. Files: **11**.

Exact source folder: `C:/Users/nicko/FixMyBuddy/fixmybuddy-copy-frontend/frontend/customer-side/src/pages`

Exact destination folder (relative to repository root): `Frontend/customer-side/src/pages/`

Exact files to paste, with demo routes:

- `Home.jsx` → `/`
- `AppHome.jsx` → `/app`
- `Account.jsx` → `/account`
- `AccountProfile.jsx` → `/account/personal`
- `AccountSettings.jsx` → `/settings/appearance`
- `Vehicles.jsx` → `/vehicles`
- `HelpCenter.jsx` → `/help`
- `SupportChat.jsx` → `/help/chat`
- `Disputes.jsx` → `/help/disputes`
- `PolicyPage.jsx` → `/terms`
- `NotFound.jsx` → `/demo-page-not-found`

Testing: Run `npm run dev`, open Pages · 53 → Member 5, and visit every assigned entry. Test landing/home, profile, theme/language, vehicles, support/disputes, policy links and unknown routes. Run `npm test`, `npm run lint` and `npm run build` from the root. Full page flow checks depend on the other migration PRs; report any remaining placeholders honestly.

Pull request: Commit only these 11 files on `member-5-account-layout`, push the branch, then open a PR into `main` titled **FE-05: migrate landing, customer account, and support**. Link this Trello card, list pasted paths, retain source attribution, attach test results and identify teammate placeholders encountered. Request Member 4's review. Update your branch from main and resolve conflicts before merging after review. Do not replace teammates' files.

## Check behavior during migration

`npm test` runs all source unit tests. The ActiveService page interaction test is automatically skipped while that page is a placeholder and resumes after Member 3 pastes it. `npm run test:browser` checks all 53 catalog entries in both states; full booking/review/payment/chat assertions run only after all pages have migrated. It uses installed Chrome (or set `DEMO_BROWSER_CHANNEL=msedge`), starts/stops Vite, and writes ignored screenshots. Services originally redirects to `/request`; LiveWorkspace shares the Jobs route. Those source behaviors are retained.
