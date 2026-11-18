import { randomUUID, randomBytes } from 'node:crypto';
import { chromium } from 'playwright';
const api = 'http://localhost:3000/api/v1';
const origin = 'http://localhost:4200';
const credentials = {
  email: `auth-expiry-${randomUUID()}@example.test`,
  password: `Aa1!${randomBytes(24).toString('hex')}`,
};
const log = (event, details = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), event, ...details }));
let token;
let browser;
let created = false;
async function apiCall(path, body, method = 'POST') {
  return fetch(`${api}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
}
try {
  const registered = await apiCall('/auth/register', {
    ...credentials,
    fullName: 'Temporary auth expiry test',
    whatsapp: '201000000001',
    consent: true,
  });
  if (registered.status !== 201) throw new Error(`Test registration returned ${registered.status}`);
  created = true;
  log('temporary_test_account_created');
  browser = await chromium.launch();
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('response', async (response) => {
    if (!response.url().startsWith(api)) return;
    const path = new URL(response.url()).pathname;
    const request = response.request();
    if (request.method() === 'OPTIONS') return;
    let code;
    if (response.status() >= 400) {
      try {
        code = (await response.json()).code;
      } catch {}
    }
    log('http_response', {
      path,
      status: response.status(),
      refreshCookieSent: /(?:^|;\s*)refresh=/.test((await request.allHeaders()).cookie ?? ''),
      ...(code ? { code } : {}),
    });
  });
  await page.goto(`${origin}/auth/sign-in`);
  await page.locator('input[type=email]').fill(credentials.email);
  await page.locator('input[type=password]').fill(credentials.password);
  const loginResponse = page.waitForResponse(
    (r) => r.url() === `${api}/auth/login` && r.request().method() === 'POST',
  );
  await page.locator('form button[type=submit], form button.btn').click();
  const response = await loginResponse;
  if (response.status() !== 200) throw new Error(`Login returned ${response.status()}`);
  const session = await response.json();
  token = session.accessToken;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  log('login_succeeded', {
    accessLifetimeSeconds: payload.exp - payload.iat,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    reportedExpiresIn: session.expiresIn,
  });
  const cookies = await context.cookies(api + '/auth/refresh');
  log('refresh_cookie_attributes', {
    cookies: cookies.map((c) => ({
      name: c.name,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
      path: c.path,
      domain: c.domain,
    })),
  });
  let remaining;
  while ((remaining = payload.exp * 1000 + 1500 - Date.now()) > 0) {
    await new Promise((r) => setTimeout(r, Math.min(remaining, 30000)));
    log('waiting_for_real_expiry', {
      remainingSeconds: Math.max(0, Math.ceil((payload.exp * 1000 + 1500 - Date.now()) / 1000)),
    });
  }
  log('access_token_expired_triggering_account_check');
  const refreshResponse = page.waitForResponse(
    (r) => r.url() === `${api}/auth/refresh` && r.request().method() === 'POST',
    { timeout: 20000 },
  );
  await page.locator('.pending button.btn.secondary').click();
  const refreshed = await refreshResponse;
  if (refreshed.status() === 200) token = (await refreshed.json()).accessToken;
  await page.waitForTimeout(1000);
  log('expiry_reproduction_complete', {
    refreshStatus: refreshed.status(),
    redirectedToSignIn: page.url().includes('/sign-in'),
  });
} catch (error) {
  log('test_failed', { reason: error.name === 'Error' ? error.message : error.name });
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      if (!token) {
        const login = await apiCall('/auth/login', credentials);
        if (!login.ok) throw new Error('Cannot authenticate disposable account for cleanup');
        token = (await login.json()).accessToken;
      }
      let r = await apiCall('/me', undefined, 'DELETE');
      if (r.status === 401) {
        const login = await apiCall('/auth/login', credentials);
        if (login.ok) {
          token = (await login.json()).accessToken;
          r = await apiCall('/me', undefined, 'DELETE');
        }
      }
      log('temporary_test_account_cleanup', { status: r.status });
      if (!r.ok) throw new Error('Test-account cleanup did not complete');
    } catch (error) {
      log('cleanup_failed', { reason: error.name });
      process.exitCode = 1;
    }
  }
  await browser?.close();
}
