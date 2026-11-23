import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi } from './mock-api';
import { StrengthSession } from '../src/app/features/client/strength/strength.models';

const log = (id: string, daysAgo: number, weight: number): StrengthSession => {
  const date = new Date(Date.now() - daysAgo * 86400000);
  return {
    id,
    exerciseId: 'exercise-1',
    exerciseName: 'ضغط الصدر بالبار',
    planExerciseId: 'placement-1',
    alternativeId: null,
    recordedAt: date.toISOString(),
    localDate: date.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }),
    note: null,
    sets: Array.from({ length: 4 }, (_, i) => ({
      setNumber: i + 1,
      weightKg: weight - i * 2.5,
      repetitions: 8,
    })),
    bestSet: { setNumber: 1, weightKg: weight, repetitions: 8 },
    heaviestWeightKg: weight,
    estimatedOneRepMaxKg: null,
  };
};

test('Strength chart, prefilled logging, editing, and deletion', async ({ page }, testInfo) => {
  const state = await mockApi(page);
  state.strength = [log('old', 100, 70), log('recent', 2, 90), log('latest', 1, 92.5)];
  await page.goto('/client/progress');
  await expect(page.locator('#body-panel .table-wrap')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.getByRole('tab', { name: 'القوة', exact: true }).click();
  await expect(page.locator('.strength-chart circle')).toHaveCount(2);
  await expect(page.locator('.new-best')).toContainText('92.5');
  await page.getByRole('button', { name: 'الكل', exact: true }).click();
  await expect(page.locator('.strength-chart circle')).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath('strength.png'), fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'تسجيل الأوزان', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'سجّل أوزانك' })).toBeVisible();
  const weight = dialog.getByRole('spinbutton', {
    name: 'وزن المجموعة 1 بالكيلوجرام',
    exact: true,
  });
  await expect(weight).toHaveValue('92.5');
  await weight.fill('92.6');
  await dialog.getByRole('button', { name: 'حفظ الأوزان', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('0.25');
  await weight.fill('95');
  await dialog.getByLabel('ملاحظة (اختياري)').fill('جلسة اختبار');
  await dialog.getByRole('button', { name: 'إضافة مجموعة', exact: true }).click();
  await expect(dialog.getByRole('spinbutton')).toHaveCount(10);
  await dialog.getByRole('button', { name: 'حذف المجموعة 5', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('log-weights.png') });
  await dialog.getByRole('button', { name: 'حفظ الأوزان', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.new-best')).toContainText('95');
  const row = page.locator('.session-row').filter({ hasText: 'جلسة اختبار' });
  await row.getByRole('button', { name: 'تعديل', exact: true }).click();
  await expect(
    dialog.getByRole('spinbutton', { name: 'وزن المجموعة 1 بالكيلوجرام', exact: true }),
  ).toHaveValue('95');
  await dialog
    .getByRole('spinbutton', { name: 'وزن المجموعة 1 بالكيلوجرام', exact: true })
    .fill('97.5');
  await dialog.getByRole('button', { name: 'حفظ الأوزان', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText('97.5');
  await row.getByRole('button', { name: 'حذف', exact: true }).click();
  await row.locator('.delete-confirm').getByRole('button', { name: 'حذف', exact: true }).click();
  await expect(row).toHaveCount(0);
  expect(state.strength).toHaveLength(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('new lifter sees an empty state and selects actual plan alternatives', async ({ page }) => {
  await mockApi(page);
  await page.goto('/client/progress');
  await page.getByRole('tab', { name: 'القوة', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'كل تقدم يبدأ بأول مجموعة' })).toBeVisible();
  await page.getByLabel('التمرين', { exact: true }).selectOption('exercise-2');
  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/v1/me/strength') && r.method() === 'POST',
  );
  await page.getByRole('button', { name: 'تسجيل الأوزان', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('spinbutton')).toHaveCount(8);
  for (let i = 1; i <= 4; i++) {
    await dialog
      .getByRole('spinbutton', { name: `وزن المجموعة ${i} بالكيلوجرام`, exact: true })
      .fill('0');
    await dialog.getByRole('spinbutton', { name: `تكرارات المجموعة ${i}`, exact: true }).fill('10');
  }
  await dialog.getByRole('button', { name: 'حفظ الأوزان', exact: true }).click();
  expect((await request).postDataJSON()).toMatchObject({
    planExerciseId: 'placement-1',
    alternativeId: 'alternative-1',
  });
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.strength-chart circle')).toHaveCount(1);
});

test('daily set cap is enforced and failed saves keep input', async ({ page }) => {
  const state = await mockApi(page);
  const today = log('today', 0, 80);
  today.sets = Array.from({ length: 9 }, (_, i) => ({
    setNumber: i + 1,
    weightKg: 80,
    repetitions: 8,
  }));
  state.strength = [today];
  await page.goto('/client/progress');
  await page.getByRole('tab', { name: 'القوة', exact: true }).click();
  await page.getByRole('button', { name: 'تسجيل الأوزان', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('spinbutton')).toHaveCount(2);
  await expect(dialog.getByRole('button', { name: 'إضافة مجموعة', exact: true })).toBeDisabled();
  await page.route('**/api/v1/me/strength', (route) =>
    route.fulfill({ status: 409, json: { code: 'STRENGTH_SET_LIMIT' } }),
  );
  await dialog.getByRole('button', { name: 'حفظ الأوزان', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('10');
  await expect(
    dialog.getByRole('spinbutton', { name: 'وزن المجموعة 1 بالكيلوجرام', exact: true }),
  ).toHaveValue('80');
});
