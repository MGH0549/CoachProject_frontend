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

## Design and backend constraints

- Five homepage photo slots are ready for coach and motivational photos. See [the photo guide](public/images/landing/PHOTO-GUIDE.md) for filenames and placement. Client transformation placeholders remain separate.
- Arabic copy follows the supplied English reference and needs native copy review before launch.
- Add client copies the registration link: the API has no coach-side create-client endpoint. Clients must submit their own consent during registration.
- Profile and settings are read-only where the API provides no update endpoints.
- Photo uploads accept JPG/PNG/WebP up to 8 MiB, matching backend validation. The API does not store Front/Side/Back metadata; those labels guide upload selection only.
- Photo retention, email delivery, subscription expiry, and signed-link expiry are backend responsibilities.
