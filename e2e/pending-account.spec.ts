import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';
import type { AccessDto } from '../src/app/core/api/models/access-dto';
import AxeBuilder from '@axe-core/playwright';

test('register, activate through the coach API, refresh, and see plans without a reload', async ({
  page,
}, testInfo) => {
  const state = await mockApi(page, null);
  const protectedCalls: string[] = [];
  const authCalls: { action: string; data: Record<string, unknown> }[] = [];
  let meUrl = '';
  page.on('request', (request) => {
    if (/\/api\/v1\/me$/.test(request.url())) meUrl = request.url();
    if (/\/me\/(training|diet|progress|workouts)/.test(request.url()))
      protectedCalls.push(request.url());
    if (request.method() === 'POST' && /\/api\/v1\/auth\/(register|login)$/.test(request.url()))
      authCalls.push({ action: request.url().split('/').at(-1)!, data: request.postDataJSON() });
  });
  await page.goto('/auth/register');
  await page.getByLabel('الاسم الكامل').fill('عميل جديد');
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill('new@example.test');
  await page.getByLabel('رقم واتساب').fill('+201234567890');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('StrongPass1234');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'إنشاء حساب', exact: true }).click();
  await expect(page).toHaveURL(/\/client\/home$/);
  const notice = page.locator('app-account-access');
  await expect(notice.locator('app-status-badge')).toHaveText(/بانتظار التفعيل/);
  await expect(notice.locator('ol li')).toHaveCount(4);
  await expect(notice.getByRole('link')).toHaveAttribute('href', state.account.whatsappUrl);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('pending-home.png'), fullPage: true });
  expect(authCalls.map((call) => call.action)).toEqual(['register', 'login']);
  expect(authCalls[1].data).toEqual({
    email: authCalls[0].data['email'],
    password: authCalls[0].data['password'],
  });
  for (const path of ['training', 'diet', 'progress']) {
    await page.locator(`nav:visible a[href="/client/${path}"]`).click();
    await expect(page.getByRole('heading', { name: 'مدربك يجهّز خطتك' })).toBeVisible();
    await expect(page.locator('app-training, app-diet, app-progress')).toHaveCount(0);
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
  }
  expect(protectedCalls).toHaveLength(0);
  await page.locator('nav:visible a[href="/client/home"]').click();
  const coachToken = `header.${Buffer.from(JSON.stringify({ role: 'Coach', sub: 'coach-test' })).toString('base64url')}.signature`;
  const activated = await page.evaluate(
    async ({ url, token, version }) => {
      // Exercise the coach activation contract against the mocked backend.
      const response = await fetch(url.replace('/me', '/coach/clients/client-1/activate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          package: 'أونلاين',
          endDate: '2027-06-30',
          version,
        } satisfies AccessDto),
      });
      return response.ok;
    },
    { url: meUrl, token: coachToken, version: state.account.version },
  );
  expect(activated).toBe(true);
  await page.evaluate(() => {
    (window as unknown as { pendingFlowMarker: string }).pendingFlowMarker = 'same-document';
  });
  await notice.getByRole('button', { name: 'تم التفعيل؟ حدّث حالة حسابي' }).click();
  await expect(notice).toHaveCount(0);
  await expect(page.locator('nav:visible .nav-lock')).toHaveCount(0);
  await page.locator('nav:visible a[href="/client/training"]').click();
  await expect(page.getByRole('heading', { name: 'يوم الدفع', exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { pendingFlowMarker: string }).pendingFlowMarker,
    ),
  ).toBe('same-document');
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).some((key) => /token|auth|session/i.test(key)) ||
        sessionStorage.length > 0,
    ),
  ).toBe(false);
});

for (const status of ['Expired', 'Deactivated'] as const) {
  test(`${status} shows its own notice and locks all plan requests`, async ({ page }) => {
    await mockApi(page, 'Client', status);
    const calls: string[] = [];
    page.on('request', (request) => {
      if (/\/me\/(training|diet|progress|workouts)/.test(request.url())) calls.push(request.url());
    });
    await page.goto('/client/home');
    await expect(
      page.getByRole('heading', {
        name: status === 'Expired' ? 'انتهت مدة اشتراكك' : 'حسابك غير مفعل حالياً',
      }),
    ).toBeVisible();
    await expect(page.locator('nav:visible .nav-lock')).toHaveCount(3);
    for (const path of ['training', 'diet', 'progress']) {
      await page.locator(`nav:visible a[href="/client/${path}"]`).click();
      await expect(page.locator('app-account-access')).toBeVisible();
    }
    expect(calls).toHaveLength(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

for (const withWeights of [false, true]) {
  test(`ACCESS_INACTIVE during a plan action rechecks /me and hides the plan without an error (${withWeights ? 'weights' : 'without weights'})`, async ({
    page,
  }) => {
    const state = await mockApi(page);
    await page.goto('/client/training');
    await expect(page.getByRole('heading', { name: 'يوم الدفع', exact: true })).toBeVisible();
    let rejected = false;
    await page.route('**/api/v1/me/workouts', (route) => {
      rejected = true;
      state.account.status = 'Expired';
      return route.fulfill({ status: 403, json: { code: 'ACCESS_INACTIVE' } });
    });
    await page.locator('.exercise-row').click();
    if (withWeights) {
      for (let number = 1; number <= 4; number++) {
        await page
          .getByRole('spinbutton', { name: `وزن المجموعة ${number} بالكيلوجرام`, exact: true })
          .fill('20');
        await page
          .getByRole('spinbutton', { name: `تكرارات المجموعة ${number}`, exact: true })
          .fill('8');
      }
    }
    await page
      .getByRole('button', {
        name: withWeights ? 'حفظ الأوزان وإتمام التمرين' : 'إتمام التمرين بدون أوزان',
        exact: true,
      })
      .click();
    await expect(page.getByRole('heading', { name: 'انتهت مدة اشتراكك' })).toBeVisible();
    expect(rejected).toBe(true);
    await expect(page.locator('app-training')).toHaveCount(0);
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    await expect(page.locator('nav:visible .nav-lock')).toHaveCount(3);
    state.account.status = 'Active';
    await page.getByRole('button', { name: 'تم التفعيل؟ حدّث حالة حسابي' }).click();
    await expect(page.getByRole('heading', { name: 'يوم الدفع', exact: true })).toBeVisible();
  });
}
