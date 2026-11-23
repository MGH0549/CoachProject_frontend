import { test, expect } from '@playwright/test';
import { planLifts } from '../src/app/features/client/strength/strength.models';
import type { StrengthSession } from '../src/app/features/client/strength/strength.models';

test('real API: log one set, read chart, edit, delete, and clean up', async ({ page, request }) => {
  test.setTimeout(180000);
  const email = process.env['STRENGTH_CLIENT_EMAIL'];
  const password = process.env['STRENGTH_CLIENT_PASSWORD'];
  if (!email || !password)
    throw new Error(
      'Live test needs STRENGTH_CLIENT_EMAIL and STRENGTH_CLIENT_PASSWORD for a dedicated Active client with a plan. No API requests were mocked.',
    );
  const base = (process.env['STRENGTH_API_BASE'] || 'http://localhost:3000/api').replace(/\/$/, '');
  const marker = `strength-live-${Date.now()}`;
  let savedId: string | null = null;
  let accessToken = '';
  try {
    await page.goto('/auth/sign-in');
    await page.getByLabel('البريد الإلكتروني', { exact: true }).fill(email);
    await page.getByLabel('كلمة المرور', { exact: true }).fill(password);
    const loginResponse = page.waitForResponse(
      (response) =>
        response.url() === `${base}/v1/auth/login` && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
    const login = await loginResponse;
    expect(login.status()).toBe(200);
    accessToken = (await login.json()).accessToken;
    const headers = { Authorization: `Bearer ${accessToken}`, Origin: 'http://localhost:4200' };
    const me = await request.get(`${base}/v1/me`, { headers });
    expect(me.ok()).toBe(true);
    expect((await me.json()).status).toBe('Active');
    const plan = await request.get(`${base}/v1/me/training`, { headers });
    expect(plan.ok()).toBe(true);
    const overview = await request.get(`${base}/v1/me/strength/overview`, { headers });
    expect(
      overview.status(),
      'Strength overview must be healthy; apply backend strength migrations before testing',
    ).toBe(200);
    const lift = planLifts(await plan.json()).find((item) => item.canLog);
    expect(lift, 'Active test account must have a loggable plan exercise').toBeTruthy();
    await page.goto('/client/progress');
    await page.getByRole('tab', { name: 'القوة', exact: true }).click();
    await expect(page.locator('app-strength .strength-toolbar')).toBeVisible({ timeout: 45000 });
    await page.getByLabel('التمرين', { exact: true }).selectOption(lift!.exerciseId);
    await page.getByRole('button', { name: 'تسجيل الأوزان', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('spinbutton').first()).toBeVisible();
    while ((await dialog.getByRole('spinbutton').count()) > 2) {
      const last = (await dialog.getByRole('spinbutton').count()) / 2;
      await dialog.getByRole('button', { name: `حذف المجموعة ${last}`, exact: true }).click();
    }
    await dialog
      .getByRole('spinbutton', { name: 'وزن المجموعة 1 بالكيلوجرام', exact: true })
      .fill('42.25');
    await dialog.getByRole('spinbutton', { name: 'تكرارات المجموعة 1', exact: true }).fill('8');
    await dialog.getByLabel('ملاحظة (اختياري)').fill(marker);
    const createResponse = page.waitForResponse(
      (response) =>
        response.url() === `${base}/v1/me/strength` && response.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'حفظ الأوزان', exact: true }).click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    const entry = (await created.json()) as StrengthSession;
    savedId = entry.id;
    expect(entry.exerciseId).toBe(lift!.exerciseId);
    expect(entry.sets).toEqual([{ setNumber: 1, weightKg: 42.25, repetitions: 8 }]);
    await expect(dialog).toHaveCount(0);
    const row = page.locator('.session-row').filter({ hasText: marker });
    await expect(row).toContainText('42.25');
    await expect(page.locator('.strength-chart circle').first()).toBeVisible();
    await row.getByRole('button', { name: 'تعديل', exact: true }).click();
    await expect(
      dialog.getByRole('spinbutton', { name: 'وزن المجموعة 1 بالكيلوجرام', exact: true }),
    ).toHaveValue('42.25');
    await dialog
      .getByRole('spinbutton', { name: 'وزن المجموعة 1 بالكيلوجرام', exact: true })
      .fill('42.5');
    await dialog.getByRole('button', { name: 'حفظ الأوزان', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toContainText('42.5');
    await row.getByRole('button', { name: 'حذف', exact: true }).click();
    await row.locator('.delete-confirm').getByRole('button', { name: 'حذف', exact: true }).click();
    await expect(row).toHaveCount(0);
    const history = await request.get(
      `${base}/v1/me/strength/exercises/${lift!.exerciseId}?pageSize=100`,
      { headers },
    );
    expect(history.ok()).toBe(true);
    expect((await history.json()).items.some((item: StrengthSession) => item.id === savedId)).toBe(
      false,
    );
    savedId = null;
    expect(
      await page.evaluate(
        () =>
          Object.values(localStorage).some(
            (value) => value.includes('accessToken') || value.startsWith('eyJ'),
          ) || sessionStorage.length > 0,
      ),
    ).toBe(false);
  } finally {
    if (savedId && accessToken) {
      const result = await request.delete(`${base}/v1/me/strength/${encodeURIComponent(savedId)}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Origin: 'http://localhost:4200' },
      });
      expect([200, 404]).toContain(result.status());
    }
  }
});
