# Authentication expiry investigation

Frontend: `https://coachoroject.vercel.app`. Backend: Railway, with PostgreSQL via Prisma/Supabase. Investigation performed on 17 November 2026.

## Findings

The primary defect in the inspected NestJS backend is the refresh cookie's `SameSite=Strict` setting. Vercel and Railway are different sites. Cross-site login can return an access token successfully while the browser rejects or withholds that refresh cookie. The first protected request after the 15-minute JWT lifetime then fails; refresh has no cookie and returns `401 INVALID_SESSION`. Angular previously cleared its token and redirected to sign-in.

This was reproduced in a Chromium browser using the actual compiled Angular application and actual NestJS authentication controllers, JWT strategy, auth service, crypto adapter, and rotation logic. The isolated test fixture uses an in-memory store and a three-second JWT signer override to exercise expiration quickly; it does not change the production JWT lifetime or touch production accounts. Before the cookie fix, the trace was:

1. `POST /api/v1/auth/login`: 200.
2. `GET /api/v1/me`: 200.
3. Wait for the signed JWT to expire.
4. `GET /api/v1/me`: 401.
5. `POST /api/v1/auth/refresh`: 401, `INVALID_SESSION`, cookie absent.
6. Angular redirects to sign-in.

With the backend cookie fix, steps 5–6 become refresh 200, one rotation, no family revocation, followed by a successful retry of `/me` and no redirect. The browser reports `HttpOnly=true`, `Secure=true`, `SameSite=None`, and `Path=/api/v1/auth`.

Two additional frontend defects were reproduced:

- Per-tab refresh deduplication already existed, but separate tabs could simultaneously submit the same rotating cookie. With 150 ms of simulated transport latency, two real browser tabs produced one refresh 200 and one `401 SESSION_REUSED`, revoking the family. The fix uses a same-origin Web Lock around refresh, login, and logout; access tokens remain in memory and are never shared through storage.
- A temporary refresh 503 cleared the access token and redirected to sign-in even though the cookie was valid and no rotation or revocation occurred. The fix preserves the session for network errors, timeouts, 403, 429, and 5xx failures. A refresh 401 still clears the token and requires sign-in.

After the frontend fix, the two-tab test produced **two sequential successful rotations and zero family revocations**. The transient-503 test stayed signed in and recovered on the next check. Each tab still obtains its own in-memory access token; coordination prevents simultaneous use of the same refresh cookie rather than sharing JWTs between tabs.

## Verification and repeatable tests

- Angular: **25 unit tests passed**; production build, typecheck, and lint passed.
- NestJS: **33 unit tests passed**; build, typecheck, and lint passed. No destructive database integration suite was run against Supabase.
- Desktop/mobile registration regression checks: **2 passed**.
- Browser runtime checks: natural 900-second expiry, cross-site cookie failure/success, two-tab reuse failure/success, and temporary-503 logout/recovery.
- The existing landing-page CSS budget warning remains unrelated to authentication.

From the backend directory, run `npm run build` and `npm test`. From the frontend directory, run `npm run build`, `npm test -- --watch=false`, and these isolated browser checks:

```powershell
node scripts/auth-cookie-repro.mjs fixed
node scripts/auth-cookie-repro.mjs tabs-fixed
node scripts/auth-cookie-repro.mjs transient-fixed
```

The script reads the sibling `../Coachprojectv2` compiled backend by default; `AUTH_BACKEND_DIR` can override that location. Its `baseline`, `tabs-baseline`, and `transient-baseline` assertions are intended for the corresponding pre-fix revisions. The fixture uses actual browser cookie enforcement and real NestJS auth code, with an isolated in-memory store and shortened JWT lifetime. It does not access Supabase.

`node scripts/auth-expiry-live.mjs` instead uses the running local frontend on port 4200 and backend on port 3000, creates a disposable pending account, waits the full signed JWT lifetime, and deletes that account. It writes through whichever database the local backend is configured to use. Use a test environment for subsequent runs.

## End-to-end checks

A separate real-account test logged into the running Angular frontend and NestJS backend at **17:51:14 UTC**, waited the full **900 seconds without shortening or forging the token**, and triggered an account request at **18:06:15 UTC**. The trace was `/me` 401 → `/auth/refresh` 200 with cookie present → `/me` 200, with no sign-in redirect. This localhost test uses a same-site cookie, so it validates the existing automatic refresh path rather than claiming the cross-site deployment works. The temporary test account was deleted after the run.

- **Access expiry:** `src/infrastructure/auth/access-tokens.ts` signs HS256 tokens with `expiresIn: '15m'`, issuer `coaching-api`, and audience `coaching-app`. Login and refresh report `expiresIn: 900`. Angular refreshes reactively after a protected API 401, rather than running a background refresh timer. Merely leaving a page idle does not refresh it.
- **Cookie:** set by `src/api/controllers/auth.controller.ts` on login and refresh. It has a sliding 30-day lifetime. Production validation forces secure cookies. The fix selects `SameSite=None` for secure HTTPS deployments and keeps Strict for local HTTP development. Setting and clearing share the same scope and attributes. No Domain is specified: the host-only Railway cookie is correct; it must not be assigned the frontend's domain. `/api/v1/auth` covers refresh and logout.
- **Credentials:** Angular's `apiCredentialsInterceptor` sets `withCredentials: true` on API calls, including login/logout. `RefreshService` bypasses interceptors intentionally through `HttpBackend`, explicitly sets credentials, and calls exactly `POST {apiBaseUrl}/v1/auth/refresh`.
- **CORS:** the live Railway endpoint was probed with `Origin: https://coachoroject.vercel.app`. OPTIONS returned 204. POST without a cookie returned 401 `INVALID_SESSION`. Both responses had `Access-Control-Allow-Origin: https://coachoroject.vercel.app` and `Access-Control-Allow-Credentials: true`. No wildcard was observed. The source allowlist uses exactly `APP_ORIGIN`; its origin guard also protects state-changing cookie requests.
- **Storage:** Prisma's PostgreSQL `RefreshToken` model persists token hashes, family IDs, expiry, and revocation timestamps. `PrismaStore.rotateSession()` uses a database transaction and a conditional update to consume the old token once. Railway process restarts do not inherently erase these rows. Keep `JWT_SECRET` and `DATABASE_URL` stable across replicas/deployments. A changed JWT secret invalidates access tokens; missing/changed database data can invalidate refresh sessions. No evidence currently identifies a Railway restart as the cause.
- **Logout:** protected API 401s first attempt refresh. Previously every refresh error cleared the token and redirected. Now only a refresh 401 triggers that automatic sign-in redirect. Explicit user logout still calls the backend and clears local state. Failed initial restoration can be attempted again instead of being cached permanently.
- **Domains/build:** local development can continue using localhost. Production builds must use Railway and a CSP that allows that same API origin; deploying a localhost API URL is a separate configuration error.

## Changed files

Backend repository: `D:/projects/Coachprojectv2`.

- `src/api/controllers/auth.controller.ts`: secure cross-site cookie policy, matching clear-cookie attributes, and opt-in safe refresh/logout diagnostics.
- `src/application/auth/auth.service.ts`: opt-in event callbacks for missing/unknown/expired tokens, validation, rotation, reuse, and family revocation. Theft detection remains enforced.
- `src/api/security.ts`: safe expired-access-token event.
- `src/config/environment.ts`: `AUTH_DEBUG` defaults off and parses only `true` as enabled.
- `test/auth-cookie.spec.ts`: production/development cookie contract tests.

Frontend repository: `D:/projects/CoachProject_frontend`.

- `src/app/core/auth/refresh.service.ts`: preserve access state for temporary failures; keep the existing shared pending promise; execute refresh under a cross-tab session lock.
- `src/app/core/auth/auth.interceptor.ts`: retain the existing retry after refresh; redirect only for a rejected refresh session; add safe debug events.
- `src/app/core/auth/auth-session-lock.ts`: Web Locks coordination across tabs, with existing per-tab protection as fallback where Web Locks is unavailable.
- `src/app/core/auth/auth-diagnostics.service.ts`: opt-in logs limited to event names, HTTP status, expiry timestamp, and fixed reason codes.
- `src/app/core/auth/session-rejected.ts`: classify only refresh 401 as a rejected session.
- `src/app/core/auth/token-store.service.ts`: read expiry metadata without logging or persisting the JWT.
- `src/app/core/auth/session.service.ts`: serialize login/logout with refresh; allow restoration retry after failure.
- Auth unit tests cover concurrent refresh, retry, temporary failures, and rejected sessions.
- `src/environments/environment.production.ts`, `angular.json`, and `scripts/add-csp.mjs`: production uses Railway and a matching CSP; local development retains the user's localhost configuration.
- `e2e/mock-api.ts`: mock API calls independently of their deployment hostname, so production-preview tests do not accidentally contact live accounts.
- `scripts/auth-cookie-repro.mjs`: isolated cross-site, multi-tab, and transient-error reproductions.
- `scripts/auth-expiry-live.mjs`: disposable local account login, natural 900-second expiry, safe HTTP tracing, and deletion of that test account.

## Production rollout

1. Deploy the backend fix with `NODE_ENV=production`, `COOKIE_SECURE=true`, `APP_ORIGIN=https://coachoroject.vercel.app`, and the same HTTPS `PUBLIC_APP_URL`. Keep secrets stable. Leave the cookie Domain unset.
2. Deploy the frontend fixes with Railway as the production API URL. A frontend-only deployment cannot repair the backend's Strict cookie.
3. Sign in again to obtain a cookie with the new attributes. Wait for access expiry, trigger an API request, and verify refresh 200 followed by a successful protected retry.
4. For temporary backend diagnosis, set `AUTH_DEBUG=true` and then disable it. Browser diagnosis: `localStorage.setItem('forma-auth-debug', '1')`; disable with `localStorage.removeItem('forma-auth-debug')`. Logs exclude JWTs, refresh-token values/hashes, passwords, cookie/header contents, and request bodies.

The unauthenticated live probe verifies the endpoint and CORS, not an authenticated production session. No production user's credentials were used. If a browser blocks third-party cookies entirely, SameSite=None cannot override that policy; a same-site API domain or same-origin API proxy is the more robust deployment arrangement. See [MDN's cookie reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) and [third-party cookie guidance](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies).
