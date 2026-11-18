# Persistent login and startup restoration

Investigation date: 18 November 2026. Production frontend: `https://coachoroject.vercel.app`. API: Railway. Database: PostgreSQL/Supabase.

## Reproduced root causes

The inspected backend's refresh cookie was **already persistent**, not session-only: it used `Max-Age=2592000` (30 days), HttpOnly, Secure in production, SameSite=None for HTTPS, and Path=/api/v1/auth. A real Chromium disk-profile test successfully restored the session after reload, closing/reopening a tab, and closing/relaunching the browser even before this change. Missing cookie persistence was not reproduced.

Two frontend defects were reproduced:

1. `SessionService.restore()` swallowed temporary startup errors. The existing auth guard did await the refresh attempt, but once that attempt failed with a 503, it checked the empty in-memory access token and redirected to login. A valid persistent refresh cookie remained present. This was a failed-attempt classification problem, not a guard redirecting before the HTTP response arrived.
2. The public homepage always displayed Sign in/Register, even after startup refresh returned 200 and the account was restored. Opening a saved sign-in URL also left the user at a login form instead of entering their authenticated application.

These findings do not establish that a particular user's browser deleted a cookie. Browser policy, clearing site data, and private browsing can affect persistence independently; no authenticated live-production browser session was supplied for inspection.

## Changes

### Angular

- `src/app/core/auth/session.service.ts`: explicit `checking`, `authenticated`, `unauthenticated`, and `unavailable` states. Startup work remains shared. Guards wait on a readiness promise that resolves only when the user/account is restored or credentials are explicitly rejected. A temporary error retains the cookie/token and leaves readiness pending until retry. Account-loading failure can retry without unnecessarily rotating an already restored token. Sign-in/sign-out update the state consistently.
- `src/app/core/auth/auth.guard.ts`, `role.guard.ts`, and `pending.guard.ts`: await `waitUntilReady()` instead of treating the completion of any refresh attempt as a final authentication decision.
- `src/app/core/auth/guest.guard.ts` and `src/app/app.routes.ts`: restored authenticated users opening `/auth/sign-in` are redirected to their protected home route.
- `src/app/app.component.ts`, `.html`, and `.css`: checking/retry UI. During a temporary startup outage the app explains that the session could not be checked and offers Retry, rather than showing a login form. Client-only presentation starts after rendering to preserve public-page SSR hydration.
- `src/app/app.config.ts`: documents the intentional startup arrangement: restoration starts immediately, the UI can bootstrap to display recovery, and protected navigation waits for a definite result.
- `src/app/features/public/landing/landing.component.ts` and `.html`: restored users see a Dashboard link instead of Sign in/Register. The initial server/client markup remains consistent for hydration.

The startup request is still exactly `POST /api/v1/auth/refresh` with `withCredentials: true`, sent through `RefreshService`/`HttpBackend`. The production API configuration still targets Railway. No tokens were added to localStorage or sessionStorage. The access token remains in memory; the refresh token remains in the HttpOnly cookie.

### NestJS (`D:/projects/Coachprojectv2`)

- `src/application/auth/auth.service.ts`: calculates one `refreshExpiresAt` value for each login/rotation, persists it as the PostgreSQL row's `expiresAt`, and returns it internally to the controller.
- `src/api/controllers/auth.controller.ts`: sets the cookie's explicit `Expires` from that same stored deadline. Removes the independently started relative Max-Age. HttpOnly, production Secure/SameSite=None, host-only scope, and `/api/v1/auth` path are retained. Public response bodies still expose only the access token and its 900-second lifetime; the refresh token and internal expiry are not returned to JavaScript.

The intended refresh period remains 30 days, sliding on a successful refresh. The configured cookie deadline is not later than the database deadline. HTTP dates serialize at one-second precision; Chromium's Date-header clock correction can shift its reported internal expiry by a few milliseconds. The test validates the actual Expires header against the stored deadline as well as native browser persistence.

The 15-minute access JWT signer was not changed. Existing refresh rotation/reuse detection and cross-tab locking remain in place.

## Database check

A read-only query against the configured Supabase PostgreSQL database found an active, unrevoked refresh-token row. Its creation-to-expiry lifetime was exactly **30 days**; approximately **29.99311 days** remained at inspection. No user identifiers, token values, token hashes, passwords, or database credentials were printed. No production rows were modified by this check.

## Browser regression results

`scripts/auth-persistence-repro.mjs` runs the actual production Angular build and actual compiled NestJS auth controller/service/JWT strategy against isolated fixture records. It keeps the real 900-second JWT lifetime. The backend fixture remains running while Chromium is fully closed and relaunched with the same native disk profile; the test does not export/import Playwright storageState or seed cookies after restart.

Confirmed after the changes:

- Login: refresh cookie present, HttpOnly, Secure, SameSite=None, explicit future expiry, and `/api/v1/auth` path.
- Reload protected `/client/training`: startup refresh 200, fresh access token, restored account, protected content loads.
- Close tab and reopen: same successful restoration.
- Close/relaunch browser: cookie survives on disk; startup refresh 200; a new access token is generated and protected content loads.
- Slow startup refresh (1.8 seconds): no premature login redirect.
- Startup 503 with a valid cookie: recovery UI, no sign-in redirect, Retry returns refresh 200 and resumes the original protected route.
- Reopen homepage: Dashboard replaces Sign in/Register after restoration.
- Reopen saved sign-in URL: successful refresh redirects to the protected application.
- Explicit invalid/revoked refresh credentials: refresh 401 correctly requires sign-in.

The browser fixture uses an isolated in-memory store so it does not create production accounts. Database lifetime was verified separately through the read-only PostgreSQL query above. These are production-style tests, not a claim that an authenticated test was performed against the deployed Vercel/Railway application.

## Tests and validation

- Added `src/app/core/auth/session.service.spec.ts`: shared startup work, waiting for the account, retry after 503, preserving readiness through temporary failures, account-only retry, explicit invalid-session handling, and protected-guard ordering.
- Updated `src/app/core/auth/role.guard.spec.ts` and `src/app/app.component.spec.ts` for the readiness contract/UI.
- Updated backend `test/auth-cookie.spec.ts` and `test/auth.spec.ts`: cookie deadline follows stored expiry, processing time does not extend it, refresh rotation returns the persisted deadline, and no refresh credentials/internal fields enter the public login response.
- Angular: **31 unit tests passed**; production build, typecheck, and lint passed.
- NestJS: **34 unit tests passed**; build and typecheck passed.
- Existing desktop/mobile navigation, theme, and missing-plan browser checks: **24 passed**.
- Existing unrelated landing-page CSS budget warning remains.

To repeat: build the NestJS backend, run `npm run build` in the frontend, then `node scripts/auth-persistence-repro.mjs fixed`. The script defaults to the sibling `../Coachprojectv2` backend; `AUTH_BACKEND_DIR` can override that path. Its baseline mode is intended for the pre-fix revision.

Changes are local and require deployment of both repositories. No access-token lifetime changes, insecure token storage, database migrations, or forced logout of existing production sessions are required.
