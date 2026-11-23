import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi } from './mock-api';
for (const screen of [
  { path: '/', heading: 'أربع خطوات بسيطة للانطلاق', role: null },
  { path: '/auth/register', heading: 'أنشئ حسابك', role: null },
  { path: '/client/training', heading: 'يوم الدفع', role: 'Client' },
  { path: '/client/diet', heading: 'النظام الغذائي', role: 'Client' },
] as const) {
  test(`accessible Arabic screen: ${screen.path}`, async ({ page }) => {
    await mockApi(page, screen.role);
    await page.goto(screen.path);
    await expect(page.getByRole('heading', { name: screen.heading, exact: true })).toBeVisible();
    if (screen.path === '/') {
      await expect(page.locator('iframe')).toHaveAttribute(
        'title',
        'فيديو توضيحي لتجربة التدريب مع المدرب',
      );
    }
    const result = await new AxeBuilder({ page })
      // The embed title is checked above; YouTube maintains the document inside its frame.
      .exclude('iframe[src^="https://www.youtube-nocookie.com/embed/"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

for (const role of [null, 'Client'] as const) {
  test(`static production pages hydrate and honor their Content Security Policy (${role ?? 'guest'})`, async ({
    page,
  }, testInfo) => {
    const state = await mockApi(page, role);
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && /Content Security Policy|Refused to/i.test(message.text()))
        errors.push(message.text());
    });
    const response = await page.goto('http://localhost:4300/');
    expect(await response!.text()).toContain('أربع خطوات بسيطة للانطلاق');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      'content',
      /script-src 'self' 'sha256-/,
    );
    if (role === 'Client') {
      await expect(page.getByRole('link', { name: 'لوحة التحكم', exact: true })).toHaveAttribute(
        'href',
        '/client/home',
      );
    } else {
      await expect(page.getByRole('link', { name: 'تسجيل الدخول', exact: true })).toHaveAttribute(
        'href',
        '/auth/sign-in',
      );
      await expect(page.getByRole('link', { name: 'لوحة التحكم', exact: true })).toHaveCount(0);
    }
    state.role = 'Client';
    await page.goto('http://localhost:4300/client/diet');
    await expect(page.getByRole('button', { name: 'زبادي وفاكهة', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'زبادي وفاكهة', exact: true }).click();
    await expect(page.locator('app-stat-card').first().locator('strong')).toHaveText('550');
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('production-diet.png'), fullPage: true });
  });
}
