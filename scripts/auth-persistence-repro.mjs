import { createRequire } from 'node:module';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { strict as assert } from 'node:assert';
import { expect } from '@playwright/test';
import { resolve, join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
const backendRoot = resolve(process.env.AUTH_BACKEND_DIR ?? '../Coachprojectv2');
const require = createRequire(join(backendRoot, 'package.json'));
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { APP_GUARD } = require('@nestjs/core');
const { ConfigService } = require('@nestjs/config');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { PassportModule } = require('@nestjs/passport');
const backend = join(backendRoot, 'dist') + '/';
const { AuthController } = require(backend + 'api/controllers/auth.controller.js');
const { ClientController } = require(backend + 'api/controllers/client.controller.js');
const { AuthService } = require(backend + 'application/auth/auth.service.js');
const { JwtAccessTokens } = require(backend + 'infrastructure/auth/access-tokens.js');
const { ArgonCrypto } = require(backend + 'infrastructure/auth/crypto.js');
const { PrismaStore } = require(backend + 'infrastructure/database/store.js');
const { JwtStrategy, AuthenticationGuard, AuthorizationGuard, OriginGuard } = require(
  backend + 'api/security.js',
);
const { setup } = require(backend + 'api/setup.js');
const { ClientsService } = require(backend + 'application/clients/clients.service.js');
const { PrivacyService } = require(backend + 'application/clients/privacy.service.js');
const { TrainingService } = require(backend + 'application/training/training.service.js');
const { DietService } = require(backend + 'application/diet/diet.service.js');
const { ProgressService } = require(backend + 'application/progress/progress.service.js');
const mode = process.argv[2] ?? 'fixed';
const appOrigin = 'https://frontend.forma.test';
const apiOrigin = 'https://backend.railway.test';
const secret = 'isolated-auth-test-only-not-a-production-secret';
const crypto = new ArgonCrypto();
const user = {
  id: randomUUID(),
  clientId: randomUUID(),
  role: 'Client',
  email: 'fixture@example.test',
  passwordHash: await crypto.hash('FixturePassword123!'),
  failedLogins: 0,
  lockedUntil: null,
};
const sessions = new Map();
let rotations = 0,
  revocations = 0;
const store = {
  userById: async (id) => (id === user.id ? user : null),
  userByEmail: async (email) => (email === user.email ? user : null),
  client: async () => ({
    status: 'Active',
    accessEndAt: new Date(Date.now() + 30 * 86400000),
    deactivatedAt: null,
  }),
  loginSuccess: async () => {},
  loginFailure: async () => {},
  addSession: async (data) => {
    const id = randomUUID();
    sessions.set(id, { ...data, id, revokedAt: null });
  },
  session: async (hash) => [...sessions.values()].find((s) => s.tokenHash === hash) ?? null,
  rotateSession: async (id, next, now) => {
    const old = sessions.get(id);
    if (!old || old.revokedAt) return false;
    old.revokedAt = now;
    const nextId = randomUUID();
    sessions.set(nextId, { ...next, id: nextId, revokedAt: null });
    rotations++;
    return true;
  },
  revokeFamily: async (family, now) => {
    revocations++;
    for (const s of sessions.values()) if (s.family === family) s.revokedAt = now;
  },
};
const jwt = new JwtService({ secret });
// Use the unchanged production 15-minute JWT signer.
const signer = new JwtAccessTokens(jwt);
const auth = new AuthService(
  store,
  crypto,
  signer,
  { now: () => new Date() },
  {},
  { whatsapp: '201000000000', reminderLeadDays: 3, auditRetentionDays: 365 },
);
const config = new ConfigService({
  NODE_ENV: 'production',
  APP_ORIGIN: appOrigin,
  PUBLIC_APP_URL: appOrigin,
  PORT: 3402,
  COOKIE_SECURE: true,
  AUTH_DEBUG: true,
  JWT_SECRET: secret,
});
const account = {
  id: user.clientId,
  userId: user.id,
  email: user.email,
  fullName: 'Auth test',
  whatsapp: '201000000001',
  status: 'Active',
  accessEndAt: null,
  createdAt: new Date().toISOString(),
  version: 1,
  whatsappUrl: 'https://wa.me/201000000000',
};
const module = await Test.createTestingModule({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret })],
  controllers: [AuthController, ClientController],
  providers: [
    { provide: AuthService, useValue: auth },
    { provide: ConfigService, useValue: config },
    { provide: PrismaStore, useValue: store },
    { provide: ClientsService, useValue: { account: async () => ({ ok: true, value: account }) } },
    ...[PrivacyService, TrainingService, DietService, ProgressService].map((provide) => ({
      provide,
      useValue:
        provide === TrainingService
          ? {
              get: async () => ({
                ok: true,
                value: {
                  id: 'fixture-plan',
                  clientId: user.clientId,
                  name: 'Fixture training',
                  version: 1,
                  isTemplate: false,
                  choicesLocked: false,
                  days: [],
                },
              }),
            }
          : {},
    })),
    JwtStrategy,
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
  ],
}).compile();
const app = module.createNestApplication(new FastifyAdapter(), { logger: false });
await setup(app);
await app.listen(3402, '127.0.0.1');
const files = new Map();
const root = resolve('dist/coaching-platform/browser');
async function collect(dir) {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, f.name);
    if (f.isDirectory()) await collect(path);
    else files.set(path, await readFile(path));
  }
}
await collect(root);
const types = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const profile = await mkdtemp(join(tmpdir(), 'forma-auth-persistence-'));
let context;
let stage = 'login';
let lastAccess = null;
let previousAccess = null;
let delayRefresh = 0;
let failRefreshOnce = false;
const trace = [];
let issuedCookieDeadline = null;
const results = [];
async function openBrowser() {
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    serviceWorkers: 'block',
  });
  await context.route(apiOrigin + '/**', async (route) => {
    const request = route.request();
    const headers = await request.allHeaders();
    delete headers.host;
    delete headers['content-length'];
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/refresh') && delayRefresh)
      await new Promise((r) => setTimeout(r, delayRefresh));
    if (path.endsWith('/auth/refresh') && failRefreshOnce) {
      failRefreshOnce = false;
      trace.push({
        stage,
        path,
        status: 503,
        cookiePresent: /refresh=/.test(headers.cookie ?? ''),
      });
      await route.fulfill({
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': appOrigin,
          'Access-Control-Allow-Credentials': 'true',
        },
        json: { code: 'INTERNAL_ERROR' },
      });
      return;
    }
    const response = await fetch('http://127.0.0.1:3402' + path, {
      method: request.method(),
      headers,
      ...(request.postData() ? { body: request.postData() } : {}),
    });
    const body = await response.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {}
    if (data?.accessToken) {
      const cookieHeader = response.headers.get('set-cookie') ?? '';
      const expiry = /;\s*Expires=([^;]+)/i.exec(cookieHeader);
      issuedCookieDeadline = expiry ? Date.parse(expiry[1]) : null;
      previousAccess = lastAccess;
      lastAccess = data.accessToken;
      const payload = JSON.parse(Buffer.from(lastAccess.split('.')[1], 'base64url'));
      assert.equal(payload.exp - payload.iat, 900);
    }
    if (request.method() !== 'OPTIONS')
      trace.push({
        stage,
        path,
        status: response.status,
        cookiePresent: /refresh=/.test(headers.cookie ?? ''),
        ...(data?.code ? { code: data.code } : {}),
      });
    const responseHeaders = Object.fromEntries(response.headers);
    delete responseHeaders['content-length'];
    delete responseHeaders['content-encoding'];
    await route.fulfill({ status: response.status, headers: responseHeaders, body });
  });
  await context.route(appOrigin + '/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const path = resolve(root, '.' + (extname(pathname) ? pathname : '/index.csr.html'));
    const data = files.get(path);
    if (!data) return route.fulfill({ status: 404, body: '' });
    const extension = extname(path);
    const body = ['.js', '.html'].includes(extension)
      ? data
          .toString()
          .replaceAll('http://localhost:3000', apiOrigin)
          .replaceAll('https://coachprojectnodeversion-production.up.railway.app', apiOrigin)
      : data;
    await route.fulfill({
      status: 200,
      contentType: types[extension] ?? 'application/octet-stream',
      body,
    });
  });
  return context.newPage();
}
async function inspectCookie() {
  const cookie = (await context.cookies(apiOrigin + '/api/v1/auth/refresh')).find(
    (c) => c.name === 'refresh',
  );
  assert(cookie, 'Persistent refresh cookie must exist');
  assert(cookie.httpOnly && cookie.secure && cookie.sameSite === 'None');
  assert(cookie.expires > Date.now() / 1000, 'Refresh cookie must have an explicit future expiry');
  const stored = [...sessions.values()].find((s) => s.tokenHash === crypto.digest(cookie.value));
  assert(stored && !stored.revokedAt);
  const days = (stored.expiresAt.getTime() - Date.now()) / 86400000;
  assert(days > 29.99 && days <= 30);
  const driftMs = cookie.expires * 1000 - stored.expiresAt.getTime();
  if (mode === 'fixed') {
    assert(
      issuedCookieDeadline !== null && issuedCookieDeadline <= stored.expiresAt.getTime(),
      'Cookie Expires header must not exceed the stored deadline',
    );
    // Chromium adjusts expiry metadata using the response Date clock, at HTTP's one-second precision.
    assert(
      driftMs < 1000,
      'Browser cookie deadline must match the DB deadline within HTTP-date precision',
    );
  }
  return {
    persistent: true,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    remainingDays: Number(days.toFixed(5)),
    cookieExpiresFromStoredDeadline:
      issuedCookieDeadline !== null && issuedCookieDeadline <= stored.expiresAt.getTime(),
    browserExpiryClockAdjustmentMs: Math.round(driftMs),
  };
}
async function navigateRestored(page, action) {
  await new Promise((r) => setTimeout(r, 1100));
  const refreshed = page.waitForResponse((r) => r.url() === apiOrigin + '/api/v1/auth/refresh');
  await action();
  assert.equal((await refreshed).status(), 200);
  await page.waitForURL('**/client/training');
  await page.locator('.training-grid').waitFor({ state: 'visible' });
  assert(lastAccess !== previousAccess, 'A fresh access token must be issued');
  results.push({ stage, restored: true, newAccessToken: true, cookie: await inspectCookie() });
}
try {
  let page = await openBrowser();
  await page.goto(appOrigin + '/auth/sign-in');
  await page.locator('input[type=email]').fill(user.email);
  await page.locator('input[type=password]').fill('FixturePassword123!');
  await page.locator('form button.btn').click();
  await page.waitForURL('**/client/training');
  results.push({ stage, cookie: await inspectCookie() });
  stage = 'reload';
  await navigateRestored(page, () => page.reload());
  stage = 'close-tab-reopen';
  await page.close();
  page = await context.newPage();
  await navigateRestored(page, () => page.goto(appOrigin + '/client/training'));
  stage = 'close-browser-reopen';
  await context.close();
  page = await openBrowser();
  await navigateRestored(page, () => page.goto(appOrigin + '/client/training'));
  stage = 'slow-startup';
  await context.close();
  page = await openBrowser();
  delayRefresh = 1800;
  const refresh = page.waitForResponse((r) => r.url() === apiOrigin + '/api/v1/auth/refresh');
  await page.goto(appOrigin + '/client/training');
  await page.waitForTimeout(400);
  assert(!page.url().includes('/sign-in'), 'Protected guard must wait for startup refresh');
  assert.equal((await refresh).status(), 200);
  delayRefresh = 0;
  await page.waitForURL('**/client/training');
  results.push({ stage, noPrematureRedirect: true });
  stage = 'reopen-homepage';
  const homeRefresh = page.waitForResponse((r) => r.url() === apiOrigin + '/api/v1/auth/refresh');
  await page.goto(appOrigin + '/');
  assert.equal((await homeRefresh).status(), 200);
  await page.waitForTimeout(200);
  const loginShown = await page.locator('.site-header a[href="/auth/sign-in"]').isVisible();
  results.push({ stage, loginShownDespiteValidSession: loginShown });
  if (mode === 'fixed')
    assert(!loginShown, 'Returning users must see their dashboard link instead of Sign in');
  stage = 'temporary-startup-failure';
  await context.close();
  page = await openBrowser();
  failRefreshOnce = true;
  await page.goto(appOrigin + '/client/training');
  if (mode === 'baseline') {
    await page.waitForURL('**/auth/sign-in**');
    results.push({ stage, incorrectSignInRedirect: true, cookieStillValid: await inspectCookie() });
  } else {
    await expect(page.locator('.session-recovery button')).toBeVisible();
    assert(!page.url().includes('/sign-in'));
    const retry = page.waitForResponse((r) => r.url() === apiOrigin + '/api/v1/auth/refresh');
    await page.locator('.session-recovery button').click();
    assert.equal((await retry).status(), 200);
    await page.waitForURL('**/client/training');
    results.push({ stage, incorrectSignInRedirect: false, retryRecovered: true });
    stage = 'reopen-saved-sign-in-url';
    const restored = page.waitForResponse((r) => r.url() === apiOrigin + '/api/v1/auth/refresh');
    await page.goto(appOrigin + '/auth/sign-in');
    assert.equal((await restored).status(), 200);
    await page.waitForURL('**/client/training');
    results.push({ stage, authenticatedUserRedirectedToApp: true });
    stage = 'explicit-invalid-session';
    for (const token of sessions.values()) token.revokedAt = new Date();
    await context.close();
    page = await openBrowser();
    await page.goto(appOrigin + '/client/training');
    await page.waitForURL('**/auth/sign-in**');
    results.push({ stage, signInRequired: true });
  }
  const saved = await page.evaluate(() => [
    ...Object.values(localStorage),
    ...Object.values(sessionStorage),
  ]);
  assert(
    !saved.some((value) => lastAccess && value.includes(lastAccess)),
    'Access token must not be stored in Web Storage',
  );
  console.log(
    JSON.stringify(
      {
        mode,
        accessLifetimeSeconds: 900,
        refreshLifetimeDays: 30,
        browser: 'Chromium persistent profile; native disk cookie jar; no storageState import',
        results,
        trace,
      },
      null,
      2,
    ),
  );
} finally {
  await context?.close();
  await app.close();
  if (!profile.startsWith(join(tmpdir(), 'forma-auth-persistence-')))
    throw new Error('Unexpected test profile path');
  await rm(profile, { recursive: true, force: true });
}
