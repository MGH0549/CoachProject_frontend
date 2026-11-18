import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
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
// Only this isolated fixture shortens the signed JWT lifetime. Production remains 15 minutes.
const signer = new JwtAccessTokens({
  signAsync: (payload, options) => jwt.signAsync(payload, { ...options, expiresIn: '3s' }),
});
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
  PORT: 3401,
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
  status: 'Pending',
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
      useValue: {},
    })),
    JwtStrategy,
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
  ],
}).compile();
const app = module.createNestApplication(new FastifyAdapter(), { logger: false });
await setup(app);
await app.listen(3401, '127.0.0.1');
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
const browser = await chromium.launch();
const traces = [];
let transientInjected = false;
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route(apiOrigin + '/**', async (route) => {
    const request = route.request();
    const headers = await request.allHeaders();
    delete headers.host;
    delete headers['content-length'];
    if (mode.startsWith('tabs') && request.url().endsWith('/auth/refresh'))
      await new Promise((r) => setTimeout(r, 150));
    if (
      mode.startsWith('transient') &&
      !transientInjected &&
      request.url().endsWith('/auth/refresh') &&
      /refresh=/.test(headers.cookie ?? '')
    ) {
      transientInjected = true;
      traces.push({
        path: '/api/v1/auth/refresh',
        status: 503,
        cookiePresent: true,
        code: 'INTERNAL_ERROR',
      });
      await route.fulfill({
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': appOrigin,
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: 'INTERNAL_ERROR' }),
      });
      return;
    }
    const r = await fetch('http://127.0.0.1:3401' + new URL(request.url()).pathname, {
      method: request.method(),
      headers,
      ...(request.postData() ? { body: request.postData() } : {}),
    });
    const path = new URL(request.url()).pathname;
    const body = await r.text();
    let code;
    try {
      code = JSON.parse(body).code;
    } catch {}
    if (request.method() !== 'OPTIONS')
      traces.push({
        path,
        status: r.status,
        cookiePresent: /refresh=/.test(headers.cookie ?? ''),
        ...(code ? { code } : {}),
      });
    const responseHeaders = Object.fromEntries(r.headers);
    delete responseHeaders['content-length'];
    delete responseHeaders['content-encoding'];
    await route.fulfill({ status: r.status, headers: responseHeaders, body });
  });
  await context.route(appOrigin + '/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const path = resolve(root, '.' + (extname(pathname) ? pathname : '/index.csr.html'));
    const data = files.get(path);
    if (!data) {
      await route.fulfill({ status: 404, body: '' });
      return;
    }
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
  const page = await context.newPage();
  await page.goto(appOrigin + '/auth/sign-in');
  await page.locator('input[type=email]').fill(user.email);
  await page.locator('input[type=password]').fill('FixturePassword123!');
  const loginResponse = page.waitForResponse((r) => r.url() === apiOrigin + '/api/v1/auth/login');
  await page.locator('form button.btn').click();
  const login = await loginResponse;
  const body = await login.json();
  if (login.status() !== 200) throw new Error('Fixture login did not succeed');
  await page.waitForURL('**/auth/pending');
  if (mode.startsWith('tabs')) {
    const pages = await Promise.all([context.newPage(), context.newPage()]);
    await Promise.all(pages.map((p) => p.goto(appOrigin + '/auth/pending')));
    await Promise.all(pages.map((p) => p.waitForLoadState('networkidle')));
    console.log(JSON.stringify({ mode, rotations, revocations, traces }, null, 2));
    if (mode === 'tabs-baseline' && revocations === 0)
      throw new Error('Expected concurrent old-cookie reuse without a cross-tab lock');
    if (mode === 'tabs-fixed' && revocations !== 0)
      throw new Error('Cross-tab refresh must not revoke the token family');
  } else {
    const expiry = JSON.parse(Buffer.from(body.accessToken.split('.')[1], 'base64url')).exp * 1000;
    await new Promise((r) => setTimeout(r, Math.max(0, expiry + 200 - Date.now())));
    const refreshResponse = page.waitForResponse(
      (r) => r.url() === apiOrigin + '/api/v1/auth/refresh',
    );
    await page.locator('.pending button.btn.secondary').click();
    const refresh = await refreshResponse;
    await page.waitForTimeout(300);
    const cookies = (await context.cookies(apiOrigin + '/api/v1/auth/refresh')).map((c) => ({
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
      path: c.path,
    }));
    console.log(
      JSON.stringify(
        {
          mode,
          crossSite: true,
          loginStatus: login.status(),
          signedLifetimeSeconds: 3,
          refreshStatus: refresh.status(),
          signedOut: page.url().includes('/sign-in'),
          rotations,
          revocations,
          cookies,
          traces,
        },
        null,
        2,
      ),
    );
    if (mode === 'baseline' && refresh.status() !== 401)
      throw new Error('Expected Strict cookie reproduction to fail');
    if (mode === 'fixed' && (refresh.status() !== 200 || page.url().includes('/sign-in')))
      throw new Error('Expected refresh fix to retain session');
    if (mode === 'transient-baseline' && !page.url().includes('/sign-in'))
      throw new Error('Expected original frontend to sign out on a transient failure');
    if (mode === 'transient-fixed') {
      if (page.url().includes('/sign-in'))
        throw new Error('Temporary refresh failure must not sign the user out');
      const retry = page.waitForResponse((r) => r.url() === apiOrigin + '/api/v1/auth/refresh');
      await page.locator('.pending button.btn.secondary').click();
      if ((await retry).status() !== 200) throw new Error('Temporary failure retry must recover');
      console.log(JSON.stringify({ event: 'temporary_failure_recovered', rotations, revocations }));
    }
  }
} finally {
  console.log(JSON.stringify({ event: 'final_trace', traces }));
  await browser.close();
  await app.close();
}
