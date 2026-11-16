import { expect, test } from '@playwright/test';
import { mockApi } from './mock-api';

const origin = 'http://localhost:4300';

test('production manifest has valid mobile installation icons', async ({ request }) => {
  const response = await request.get(`${origin}/manifest.webmanifest`);
  expect(response.headers()['content-type']).toContain('application/manifest+json');
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'ar',
    dir: 'rtl',
  });
  expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(
    true,
  );
  for (const icon of manifest.icons) {
    const image = await request.get(`${origin}/${icon.src}`);
    expect(image.ok()).toBe(true);
    expect(image.headers()['content-type']).toBe('image/png');
    const bytes = await image.body();
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);
  }
});

test('service worker opens offline and never caches private API responses', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60000);
  await mockApi(page, null);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy|Refused to/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  await context.route(`${origin}/api/pwa-private-check`, (route) =>
    route.fulfill({ json: { privateHealthData: 'must-never-be-cached' } }),
  );
  await page.goto(origin);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
    }
  });
  // Reload once under service-worker control, after its shell has been installed.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const response = await page.evaluate(() => fetch('/api/pwa-private-check').then((r) => r.json()));
  expect(response.privateHealthData).toBe('must-never-be-cached');
  const cachedUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) urls.push(request.url);
    }
    return urls;
  });
  expect(cachedUrls.some((url) => url.endsWith('/index.csr.html'))).toBe(true);
  expect(
    cachedUrls.some((url) => /\/api\/|\/client\/|\/coach\/|res\.cloudinary\.com/.test(url)),
  ).toBe(false);

  await context.unroute(`${origin}/api/pwa-private-check`);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('أنت غير متصل بالإنترنت');
  const privateAvailable = await page.evaluate(() =>
    fetch('/api/pwa-private-check').then(
      (response) => response.ok,
      () => false,
    ),
  );
  expect(privateAvailable).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('pwa-offline.png'), fullPage: true });
  expect(errors).toEqual([]);
  await context.setOffline(false);
  await expect(page.getByText('أنت غير متصل بالإنترنت.', { exact: false })).toBeHidden();
});

test('install button invokes the browser prompt only after a tap', async ({ page }) => {
  await mockApi(page, null);
  await page.goto(origin);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.documentElement.dataset['installPrompted'] = 'yes';
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    window.dispatchEvent(event);
  });
  const install = page.getByRole('button', { name: 'تثبيت التطبيق' });
  await expect(install).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-install-prompted');
  await install.click();
  await expect(page.locator('html')).toHaveAttribute('data-install-prompted', 'yes');
  await expect(install).toBeHidden();
});

test('iPhone users can open and dismiss home-screen instructions', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await mockApi(page, null);
    await page.goto(origin);
    await page.getByRole('button', { name: 'تثبيت التطبيق' }).click();
    await expect(page.getByText('افتح الموقع في Safari', { exact: false })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole('button', { name: 'إخفاء اقتراح التثبيت' }).click();
    await expect(page.getByText('افتح الموقع في Safari', { exact: false })).toBeHidden();
  } finally {
    await context.close();
  }
});
