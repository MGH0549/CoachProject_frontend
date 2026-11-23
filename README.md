# FORMA — Angular frontend

Arabic RTL frontend based on the supplied UI/UX PNG export. The user approved applying the same style to password recovery, profile/privacy, coach feedback, and settings where the export has no layouts.

## Run locally

Node.js 24 and npm are required. In PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

```sh
npm ci
npm start
```

Open http://localhost:4200. Keep the backend running at http://localhost:3000. Its CORS configuration must allow the frontend origin with credentials. The running API was checked for health and CORS during implementation.

No credentials or sample health data are included. Register a client using the signup screen; sign in with an existing coach account created by the backend. New clients wait for coach activation.

## Implemented screens

- Public landing page, registration, sign-in, password recovery and reset.
- Pending, expired, and deactivated account status with the backend-provided WhatsApp link.
- Client training days, exercise videos and alternatives, workout logging.
- Client diet options, locked meals, and daily totals.
- Progress charts and history, weekly check-ins, optional photo uploads with previews and upload progress, coach feedback.
- Progress Body/Strength tabs, plan-based lift picker, time-scaled strength charts (12 weeks/All), personal bests, and session history with edit/delete.
- Weight logging from Progress or exercise completion, with a desktop modal/mobile bottom sheet, previous-session prefill and backend numeric/daily limits.
- Profile, personal-data export and explicit account-deletion confirmation.
- Coach paginated client list, search/status filters, activation, extension, deactivation.
- Training builder: days, exercise library, ordering, sets/reps/rest/tempo, notes, alternatives and locks.
- Diet builder: targets, meals, options, foods/quantities, client choices and locks.
- Exercise library: create/edit, validated YouTube IDs, archive, search and pagination.
- Training and diet templates: create/edit, duplicate, save from client plans, copy independently to clients.
- Client progress/feedback view and read-only platform settings.
- Privacy and terms pages using only the supplied product documentation. Their wording remains subject to the owner's review before publishing.

## Structure and maintenance

Each component, service, guard, model, pipe, and endpoint operation lives in its own file. Component HTML and CSS are separate. Top-level features are public, auth, client, and coach; shared UI is in `src/app/shared`, while authentication, generated API code, and configuration live in `src/app/core`.

Colors and surfaces are centralized in `src/styles/tokens.css`. Cairo font files are served locally. All dates display in Africa/Cairo with Western digits. Public and protected screens are lazy loaded.

Access tokens stay in memory. Cookies are included only for the configured API. Concurrent refresh calls share a single request. Route guards reflect the backend's role and account-status rules; authorization remains enforced by the server. The production service worker caches only static app files and public landing photos, with no API or health-data caching. YouTube embeds load only when requested and use youtube-nocookie.com.

## API contract

The API address is a build setting in `src/environments/environment.ts`. Generated paths already include `/api/v1`, so the generated API root uses the configured origin. All services/models/operations come from the checked-in `api/openapi.json`.

To update the contract:

```powershell
Invoke-WebRequest http://localhost:3000/api/docs-json -OutFile api/openapi.json
npm.cmd run api:generate
```

The backend OpenAPI currently describes some pagination and alternative-ID parameters as generic objects. Frontend wrappers supply the actual numeric/string values; the generated contract itself is preserved unchanged.

## Validation

Training weights are edited directly in the selected exercise panel; phones open the panel as a bottom sheet. Drafts remain in memory while navigating exercises/alternatives or closing and reopening the sheet. Refreshing the page discards unsaved drafts. The row displays the heaviest set in the last session (highest reps break ties), not the all-time best. The date is displayed in Cairo time. A “New best” badge compares the saved heaviest weight with the all-time best provided by the plan API; the first session and equal weights do not receive a badge.

`POST /api/v1/me/workouts` accepts optional `sets` (`setNumber`, `weightKg`, `repetitions`). Supplied sets and completion save atomically as one workout. Omitting `sets` marks done without changing weight history. Main exercises and alternatives each receive optional `lastSession` (`sets`, `recordedAt`, `localDate`) and `bestWeightKg` from `GET /api/v1/me/training`; never-logged exercises omit both fields. The server enforces Active access, plan ownership, choice locks, quarter-kilogram weights from 0–500, integer reps from 1–100 and ten sets per actual exercise per Cairo day. The panel preserves inputs after failures, including daily-limit refusals.

Run `npm run verify` for frontend typecheck, lint, unit tests, production build and the full browser suite on desktop/mobile. The Node backend in `../Coachprojectv2` has its own `npm run verify`, including PostgreSQL integration tests.

The training live test provisions and cleans up dedicated fixtures, sends real browser requests to the running API and checks persisted PostgreSQL rows. Start the updated backend against a database with `test` in its name, then run:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://coach:localdevelopment@localhost:5432/coaching_test'
$env:TRAINING_BACKEND_ROOT = 'D:/projects/Coachprojectv2'
$env:STRENGTH_API_BASE = 'http://localhost:3001/api'
npm.cmd run e2e:live -- e2e/training-weights.live.spec.ts
```

The API must use the same database and allow `http://localhost:4200`. If a separate API port is supplied, the test forwards browser requests to that real API without substituting responses. Existing strength live tests still require their documented client credentials.

```sh
npm run lint
npm run typecheck
npm run format:check
npm test -- --watch=false
npx playwright install chromium
npm run e2e
npm run build
npm run preview
```

Build before running the browser suite; it also starts the static preview on port 4300. Browser tests use isolated API fixtures and never create/delete real accounts or health records. They cover desktop and mobile, registration/activation, account and role access, exercise alternatives, meal selections/locks/conflicts, check-ins, library editing, templates, and layout overflow. Test screenshots and traces go to ignored `test-results/`.

Accessibility checks cover the app-owned document and embedded video titles. The third-party YouTube player's internal document is excluded from these audits. Production landing tests check both guest and signed-in navigation after hydration.

The CI workflow runs these checks and a dependency audit. At implementation time, the linter's transitive minimatch dependency reports seven moderate development-only advisories; there are no high/critical advisories. Review upstream fixes rather than forcing an incompatible major-version downgrade. Runtime dependencies are audited separately with `npm audit --omit=dev`.

## Static build and hosting

`npm run build` creates `dist/coaching-platform/browser`. The landing, privacy, and terms pages are prerendered; authenticated screens render in the browser. HTTP transfer caching is disabled so private API data is never embedded in HTML. The final build step adds hashes for inline scripts to each static page's Content Security Policy.

`public/_redirects` and `public/_headers` provide SPA fallback, framing/content-type protections, and no-store headers for protected routes on hosts that support those files. Other hosts need equivalent configuration. No deployment was performed.

## Mobile PWA

Production builds support home-screen installation with Android icons, a maskable icon, an Apple touch icon, and an Arabic standalone manifest. Android browsers show a “تثبيت التطبيق” button when the browser makes installation available. On iPhone/iPad, the button opens Safari “Share → Add to Home Screen” instructions. Installed apps hide this suggestion. Dismissal lasts for the current page session.

Run `npm run build` followed by `npm run preview`, then open `http://localhost:4300` to test locally. Normal `npm start` development builds do not register the service worker. On phones, use the deployed HTTPS address: an HTTP LAN IP is not a secure context for service-worker installation.

After the first online visit and service-worker installation, static screens can open offline. Sign-in, plans, uploads, workout logging, and all other API actions require a connection. An offline notice explains this; writes are not queued. Tokens, API responses, private progress photos, and personalized HTML are never added to the service-worker cache. The cached navigation fallback is the empty `index.csr.html` shell. Public marketing photos under `images/landing/` are cached only after viewing them.

Updates download in the background. An Arabic notice asks the user to save any changes and reload when a new version is ready; the app does not force a refresh. Returning to an open app or reconnecting checks for updates.

Deploy the complete `dist/coaching-platform/browser` folder over HTTPS, including `ngsw-worker.js`, `ngsw.json`, `manifest.webmanifest`, and `icons/`. Keep real static files ahead of the SPA fallback and serve `.webmanifest` as `application/manifest+json`. Revalidate `ngsw-worker.js` and `ngsw.json` rather than caching them long term; `public/_headers` contains these rules for compatible hosts. Deploy atomically so the manifest and asset versions stay consistent. The final build script regenerates service-worker hashes after inserting the CSP into HTML; do not edit generated HTML afterward.

Run `npx playwright test e2e/pwa.spec.ts` after building to check the production worker, offline navigation, API cache exclusion, icons, installation-button behavior, and iPhone instructions. OS-level installation still needs a real Android/iPhone check. Regenerate the committed brand icons with `node scripts/generate-pwa-icons.mjs`.

## Delete assigned client plans

The coach's training and diet editors have a delete action for saved client plans.
Each action asks for confirmation, sends the saved plan ID and version, and clears
the editor only after success. Cancellation or an API failure preserves the draft.
The backend exposes `DELETE /api/v1/coach/clients/{clientId}/training` and `/diet`
with `{ planId, version }`. Stale or replaced plans return `409 VERSION_CONFLICT`.
Workout logs, strength history, check-ins, client accounts, and saved templates are
retained. No database migration is needed for these routes.

Saved training and diet templates can also be deleted from the template list or
their editor. Deletion asks for confirmation and checks the saved version using
`DELETE /api/v1/coach/templates/{training|diet}/{id}` with `{ version }`.
Deleting a template leaves existing client copies unchanged; deleting from the
editor returns to the template list and clears the discarded draft.

## Live strength test

`npm run e2e:live` uses the real API without route mocks. Set
`STRENGTH_CLIENT_EMAIL` and `STRENGTH_CLIENT_PASSWORD` privately in the shell to
a dedicated Active client with a training plan. The API defaults to
`http://localhost:3000/api`; `STRENGTH_API_BASE` can override it when the frontend
is configured for the same backend. The test creates one uniquely marked set,
verifies its chart/history, edits it, deletes it, and attempts cleanup on failure.
It does not modify the coach's plan. Tokens stay in memory, and live traces/video
are disabled. Do not use a real client's account for automated fixtures.

Regular form, chart, pagination, and API-payload tests run with `npm test -- --watch=false`.
Desktop/mobile UI coverage is in `e2e/strength.spec.ts`, including validation,
prefill, alternatives, daily limits, mutation failures, accessibility and CRUD.

## Design and backend constraints

- Five homepage photo slots are ready for coach and motivational photos. See [the photo guide](public/images/landing/PHOTO-GUIDE.md) for filenames and placement. Client transformation placeholders remain separate.
- Arabic copy follows the supplied English reference and needs native copy review before launch.
- Add client copies the registration link: the API has no coach-side create-client endpoint. Clients must submit their own consent during registration.
- Profile and settings are read-only where the API provides no update endpoints.
- Photo uploads accept JPG/PNG/WebP up to 8 MiB, matching backend validation. The API does not store Front/Side/Back metadata; those labels guide upload selection only.
- Photo retention, email delivery, subscription expiry, and signed-link expiry are backend responsibilities.
