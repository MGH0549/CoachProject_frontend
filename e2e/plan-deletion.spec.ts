import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

for (const kind of ['training', 'diet'] as const) {
  test(`${kind}: cancellation preserves plan; deletion resets builder and persists on reload`, async ({
    page,
  }) => {
    const state = await mockApi(page, 'Coach');
    const before = {
      history: structuredClone(state.history),
      strength: structuredClone(state.strength),
      other: structuredClone(kind === 'training' ? state.diet : state.training),
    };
    let deletes = 0;
    page.on('request', (request) => {
      if (request.method() === 'DELETE') deletes++;
    });
    await page.goto('/coach/clients/client-1');
    if (kind === 'diet')
      await page.getByRole('button', { name: 'النظام الغذائي', exact: true }).click();
    const label = kind === 'training' ? 'حذف الخطة التدريبية' : 'حذف النظام الغذائي';
    const name = page.getByLabel(kind === 'training' ? 'اسم الخطة' : 'اسم النظام', { exact: true });
    await expect(name).not.toHaveValue('');
    const savedName = await name.inputValue();
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue(savedName);
    expect(deletes).toBe(0);
    page.once('dialog', (dialog) => dialog.accept());
    const deleted = page.waitForRequest((request) => request.method() === 'DELETE');
    await page.getByRole('button', { name: label, exact: true }).click();
    const plan = kind === 'training' ? state.training : state.diet;
    expect((await deleted).postDataJSON()).toEqual({ planId: plan.id, version: plan.version });
    await expect(name).toHaveValue('');
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
    expect(state.history).toEqual(before.history);
    expect(state.strength).toEqual(before.strength);
    expect(kind === 'training' ? state.diet : state.training).toEqual(before.other);
    await page.reload();
    if (kind === 'diet')
      await page.getByRole('button', { name: 'النظام الغذائي', exact: true }).click();
    await expect(name).toHaveValue('');
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
    expect(deletes).toBe(1);
  });

  test(`${kind}: failed delete preserves unsaved edits`, async ({ page }) => {
    await mockApi(page, 'Coach');
    await page.goto('/coach/clients/client-1');
    if (kind === 'diet')
      await page.getByRole('button', { name: 'النظام الغذائي', exact: true }).click();
    const name = page.getByLabel(kind === 'training' ? 'اسم الخطة' : 'اسم النظام', { exact: true });
    await expect(name).not.toHaveValue('');
    await name.fill('مسودة غير محفوظة');
    await page.route(`**/api/v1/coach/clients/client-1/${kind}`, async (route) => {
      if (route.request().method() === 'DELETE')
        return route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT' } });
      return route.fallback();
    });
    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('button', {
        name: kind === 'training' ? 'حذف الخطة التدريبية' : 'حذف النظام الغذائي',
        exact: true,
      })
      .click();
    await expect(page.getByRole('alert')).toContainText('تم تعديل الخطة');
    await expect(name).toHaveValue('مسودة غير محفوظة');
  });
}
