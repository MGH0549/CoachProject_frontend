import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

test.use({ baseURL: 'http://localhost:4300', serviceWorkers: 'block' });

for (const role of ['Client', 'Coach'] as const) {
  test(`${role}: mobile settings contains logout and navigation stays in one row`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await mockApi(page, role);
    await page.goto(role === 'Coach' ? '/coach/clients' : '/client/training');
    const nav = page.locator('.mobile-nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a')).toHaveCount(4);
    await expect(nav.locator('button')).toHaveCount(0);
    const links = await nav.locator('a').evaluateAll((items) =>
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        return { top: rect.top, right: rect.right, left: rect.left };
      }),
    );
    expect(
      links.every(
        (link) => Math.abs(link.top - links[0].top) < 1 && link.left >= 0 && link.right <= 320,
      ),
    ).toBe(true);
    await nav.getByRole('link', { name: 'الإعدادات' }).click();
    await expect(page.locator('app-mobile-sign-out')).toBeVisible();
    await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test(`${role}: desktop keeps sidebar logout`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mockApi(page, role);
    await page.goto(role === 'Coach' ? '/coach/settings' : '/client/profile');
    await expect(page.locator('.sidebar .logout')).toBeVisible();
    await expect(page.locator('app-mobile-sign-out')).toBeHidden();
  });
}

test('homepage navigation fits on one line on mobile', async ({ page }) => {
  await mockApi(page, null);
  await page.goto('/');
  for (const width of [320, 390, 640, 760]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.locator('.site-header').evaluate((header) => {
      const brand = header.querySelector('app-brand')!.getBoundingClientRect();
      const actions = header.querySelector('.actions')!.getBoundingClientRect();
      return {
        brandY: brand.top + brand.height / 2,
        actionsY: actions.top + actions.height / 2,
        overlapping: Math.min(brand.right, actions.right) > Math.max(brand.left, actions.left),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(Math.abs(layout.brandY - layout.actionsY)).toBeLessThan(1);
    expect(layout.overlapping).toBe(false);
    expect(layout.overflow).toBe(false);
  }
});
