# Client account access

Registration logs in using the submitted email and password and opens `/client/home`.
Access tokens remain in `TokenStore` signals; no token is written to browser storage.
Existing HttpOnly refresh-cookie session restoration is preserved.

Home loads `GET /api/v1/me`. `SessionService.isActive` derives plan access from
the account status and whether the latest status check succeeded. Pending,
Expired, and Deactivated clients stay inside the normal client shell. The Home
notice and three preview cards follow the supplied desktop screenshot; mobile
uses the same content with a five-item bottom navigation bar.

Training, Diet, and Progress routes use `activeGuard` to re-read `/me` before
mounting `PlanAccessComponent`. The boundary mounts the existing plan page only
when access is active. Otherwise it shows an account-aware empty state, so the
plan components cannot start API calls. Refreshing status updates signals and
mounts the requested page without navigation or a browser reload.

The auth interceptor handles `403` with problem code `ACCESS_INACTIVE`, including
responses after a token refresh. It blocks plan access immediately, deduplicates
concurrent `/me` recovery requests, and does not display a plan-error toast. A
failed `/me` refresh keeps plans hidden and offers retry. Other 403 responses
keep their existing error behavior. `/me` rejecting access does not recursively
request itself. The access boundary also closes any open check-in dialog.

New copy lives in `src/app/core/i18n/ar.ts`. CSS uses logical properties and
existing design tokens; the inactive diet page uses green action tokens.
WhatsApp links come from `/me` and accept HTTPS WhatsApp hosts only.

## Validation

- `npm test -- --watch=false`: account status, guard ordering, recovery, and auth tests.
- `npm run build`, `npm run typecheck`, `npm run lint`.
- `npx playwright test e2e/pending-account.spec.ts`: desktop/mobile registration,
  same-credential login, notice, no inactive plan requests, activation API call,
  status refresh, live plan access, expired/deactivated states, mid-session 403,
  accessibility, and storage checks.
- `e2e/platform.spec.ts` and `e2e/mobile-navigation.spec.ts` cover existing client
  and coach behavior with the Home route and updated navigation.

Browser tests use the repository's mocked backend and its checked-in OpenAPI
contract, including `POST /api/v1/coach/clients/{clientId}/activate` with
`{ package, endDate, version }`. They do not activate an account on a live server.
