import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

for (const status of ['Pending'] as const) {
  test(`${status} client can open the additional-details form from Home`, async ({ page }) => {
    const state = await mockApi(page, 'Client', status);
    await page.goto('/client/home');
    const link = page.getByRole('link', { name: 'ملء استمارة بيانات العميل', exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      'href',
      'https://docs.google.com/forms/d/e/1FAIpQLSf74ZalTdcoEN_FnGWcGY7-SV3V18Lo5xFmS5s15ygOgb3oGg/viewform?usp=header',
    );
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    state.account.status = 'Active';
    await page.getByRole('button', { name: 'تم التفعيل؟ حدّث حالة حسابي', exact: true }).click();
    await expect(link).toHaveCount(0);
  });
}

for (const status of ['Active', 'Expired', 'Deactivated'] as const) {
  test(`${status} client does not see the pre-activation form`, async ({ page }) => {
    await mockApi(page, 'Client', status);
    await page.goto('/client/home');
    await expect(page.locator('app-client-home .home-pages')).toBeVisible();
    await expect(page.locator('.intake-card')).toHaveCount(0);
  });
}
