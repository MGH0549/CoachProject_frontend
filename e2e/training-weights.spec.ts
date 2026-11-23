import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi } from './mock-api';
import { StrengthSession } from '../src/app/features/client/strength/strength.models';

test('training weights prefill, validate, save atomically, retain drafts and separate alternatives', async ({
  page,
}, testInfo) => {
  const state = await mockApi(page);
  state.strength = [
    {
      id: 'previous',
      exerciseId: 'exercise-1',
      exerciseName: 'Bench',
      planExerciseId: 'placement-1',
      alternativeId: null,
      recordedAt: '2026-11-01T12:00:00Z',
      localDate: '2026-11-01',
      note: null,
      sets: [{ setNumber: 1, weightKg: 92.5, repetitions: 8 }],
      bestSet: null,
      heaviestWeightKg: 92.5,
      estimatedOneRepMaxKg: null,
    } satisfies StrengthSession,
  ];
  await page.goto('/client/training');
  const row = page.locator('.exercise-row');
  await expect(row).toContainText('92.5');
  await row.click();
  const panel = page.locator('.video-card');
  const weights = panel.locator('app-training-weights');
  const weight = weights.getByRole('spinbutton').first();
  await expect(weight).toHaveValue('92.5');
  await expect(weights.locator('.prefilled')).toContainText('2026');
  await weight.fill('92.6');
  await weights.getByRole('button', { name: 'حفظ الأوزان وإتمام التمرين', exact: true }).click();
  await expect(weights.getByRole('alert')).toContainText('0.25');
  await weight.fill('95');
  await weights.getByRole('button', { name: 'إضافة مجموعة', exact: true }).click();
  await expect(weights.getByRole('spinbutton')).toHaveCount(4);
  await weights.getByRole('button', { name: 'حذف المجموعة 2', exact: true }).click();
  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('dialog')).toBeVisible();
    await panel.getByRole('button', { name: 'إغلاق', exact: true }).click();
    await row.click();
    await expect(weight).toHaveValue('95');
  }
  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/v1/me/workouts') && r.method() === 'POST',
  );
  await weights.getByRole('button', { name: 'حفظ الأوزان وإتمام التمرين', exact: true }).click();
  expect((await request).postDataJSON()).toEqual({
    planExerciseId: 'placement-1',
    alternativeId: null,
    sets: [{ setNumber: 1, weightKg: 95, repetitions: 8 }],
  });
  await expect(row).toContainText('95');
  await expect(row.locator('.new-best')).toBeAttached();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  const choices =
    testInfo.project.name === 'mobile'
      ? panel.locator('.mobile-choices')
      : page.locator('.alternatives');
  await choices.getByRole('button', { name: 'ضغط الصدر بالدمبل', exact: true }).click();
  await expect(row).toContainText('لم تسجّل أوزاناً بعد');
  await expect(weight).toHaveValue('');
  await weight.fill('25');
  await choices.getByRole('button', { name: 'التمرين الأساسي', exact: true }).click();
  await expect(weight).toHaveValue('95');
  await choices.getByRole('button', { name: 'ضغط الصدر بالدمبل', exact: true }).click();
  await expect(weight).toHaveValue('25');
  const skip = page.waitForRequest(
    (r) => r.url().endsWith('/api/v1/me/workouts') && r.method() === 'POST',
  );
  await weights.getByRole('button', { name: 'إتمام التمرين بدون أوزان', exact: true }).click();
  expect((await skip).postDataJSON()).toEqual({
    planExerciseId: 'placement-1',
    alternativeId: 'alternative-1',
  });
  await expect(row).toContainText('لم تسجّل أوزاناً بعد');
  expect(state.strength).toHaveLength(2);
  await page.screenshot({ path: testInfo.outputPath('training-weights.png'), fullPage: true });
});

test('training panel retains values after a failed save and respects the ten row limit', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/client/training');
  await page.locator('.exercise-row').click();
  const panel = page.locator('app-training-weights');
  const weight = panel.getByRole('spinbutton').first();
  await weight.fill('500');
  await panel.getByRole('spinbutton').nth(1).fill('100');
  for (let i = 4; i < 10; i++)
    await panel.getByRole('button', { name: 'إضافة مجموعة', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'إضافة مجموعة', exact: true })).toBeDisabled();
  for (let i = 10; i > 1; i--)
    await panel.getByRole('button', { name: `حذف المجموعة ${i}`, exact: true }).click();
  await page.route('**/api/v1/me/workouts', (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'STRENGTH_SET_LIMIT' }),
    }),
  );
  await panel.getByRole('button', { name: 'حفظ الأوزان وإتمام التمرين', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('10');
  await expect(weight).toHaveValue('500');
});
