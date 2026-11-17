import { test, expect } from '@playwright/test';
import { account, training, diet } from './fixtures';

test.use({ baseURL: 'http://localhost:4300', serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  // Mock the configured backend regardless of its hostname; never contact live client data.
  await page.context().route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const token = `header.${Buffer.from(JSON.stringify({ role: 'Client', sub: 'test-user' })).toString('base64url')}.signature`;
    return route.fulfill({
      json: path.endsWith('/auth/refresh') ? { accessToken: token, expiresIn: 900 } : account,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:4300',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  });
});

for (const plan of [
  {
    endpoint: 'training',
    data: training,
    content: '.training-grid',
    title: 'خطتك التدريبية لم تُضف بعد',
  },
  { endpoint: 'diet', data: diet, content: '.meals', title: 'نظامك الغذائي لم يُضف بعد' },
]) {
  test(`${plan.endpoint}: missing plan explains next steps and can be checked again`, async ({
    page,
  }) => {
    let ready = false;
    await page.context().route(`**/api/v1/me/${plan.endpoint}`, (route) =>
      route.fulfill({
        status: ready ? 200 : 404,
        json: ready ? plan.data : { code: 'NOT_FOUND' },
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:4300',
          'Access-Control-Allow-Credentials': 'true',
        },
      }),
    );
    await page.goto(`/client/${plan.endpoint}`);
    await expect(page.getByRole('heading', { name: plan.title })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'تواصل مع المدرب على واتساب' })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\//,
    );
    ready = true;
    await page.getByRole('button', { name: 'التحقق من وجود الخطة' }).click();
    await expect(page.locator('app-missing-plan')).toHaveCount(0);
    await expect(page.locator(plan.content)).toBeVisible();
  });

  test(`${plan.endpoint}: server errors remain errors`, async ({ page }) => {
    await page.context().route(`**/api/v1/me/${plan.endpoint}`, (route) =>
      route.fulfill({
        status: 500,
        json: { code: 'INTERNAL_ERROR' },
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:4300',
          'Access-Control-Allow-Credentials': 'true',
        },
      }),
    );
    await page.goto(`/client/${plan.endpoint}`);
    await expect(page.getByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('app-missing-plan')).toHaveCount(0);
  });
}
