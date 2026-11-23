import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';
import { diet } from './fixtures';

for (const kind of ['training', 'diet'] as const) {
  test(`${kind}: delete template from list, preserve client copies, and clear copy selection`, async ({
    page,
  }) => {
    const state = await mockApi(page, 'Coach');
    state.dietTemplates.push({
      ...structuredClone(diet),
      id: 'diet-template-1',
      name: 'قالب التغذية',
      isTemplate: true,
      clientId: null,
    });
    const original = structuredClone({ training: state.training, diet: state.diet });
    const templates = kind === 'training' ? state.trainingTemplates : state.dietTemplates;
    const saved = { ...templates[0] };
    let deleteCalls = 0;
    page.on('request', (request) => {
      if (request.method() === 'DELETE') deleteCalls++;
    });
    await page.goto('/coach/templates');
    if (kind === 'diet')
      await page.getByRole('button', { name: 'قوالب الأنظمة الغذائية', exact: true }).click();
    await page.locator('.template-select').first().click();
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'حذف القالب', exact: true }).click();
    expect(deleteCalls).toBe(0);
    await expect(page.locator('.template')).toHaveCount(1);
    page.once('dialog', (dialog) => dialog.accept());
    const request = page.waitForRequest((request) => request.method() === 'DELETE');
    await page.getByRole('button', { name: 'حذف القالب', exact: true }).click();
    const deletion = await request;
    expect(deletion.url()).toContain(`/coach/templates/${kind}/${saved.id}`);
    expect(deletion.postDataJSON()).toEqual({ version: saved.version });
    await expect(page.locator('.template')).toHaveCount(0);
    await expect(page.locator('.selected-template')).toHaveText('اختر قالباً من القائمة');
    await expect(page.getByRole('button', { name: 'نسخ إلى العميل', exact: true })).toBeDisabled();
    expect(state.training).toEqual(original.training);
    expect(state.diet).toEqual(original.diet);
  });

  test(`${kind}: delete from editor returns to list without an extra unsaved-changes prompt`, async ({
    page,
  }) => {
    const state = await mockApi(page, 'Coach');
    state.dietTemplates.push({
      ...structuredClone(diet),
      id: 'diet-template-1',
      name: 'قالب التغذية',
      isTemplate: true,
      clientId: null,
    });
    const template = (kind === 'training' ? state.trainingTemplates : state.dietTemplates)[0];
    await page.goto(`/coach/templates/${kind}/${template.id}`);
    const name = page.getByLabel(kind === 'training' ? 'اسم الخطة' : 'اسم النظام', { exact: true });
    await expect(name).not.toHaveValue('');
    await name.fill('مسودة قالب');
    let confirmations = 0;
    page.on('dialog', async (dialog) => {
      confirmations++;
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'حذف القالب', exact: true }).click();
    await expect(page).toHaveURL(/\/coach\/templates$/);
    expect(confirmations).toBe(1);
    expect(kind === 'training' ? state.trainingTemplates : state.dietTemplates).toHaveLength(0);
  });

  test(`${kind}: failed template deletion preserves the template and editor draft`, async ({
    page,
  }) => {
    const state = await mockApi(page, 'Coach');
    state.dietTemplates.push({
      ...structuredClone(diet),
      id: 'diet-template-1',
      name: 'قالب التغذية',
      isTemplate: true,
      clientId: null,
    });
    const template = (kind === 'training' ? state.trainingTemplates : state.dietTemplates)[0];
    await page.goto(`/coach/templates/${kind}/${template.id}`);
    const name = page.getByLabel(kind === 'training' ? 'اسم الخطة' : 'اسم النظام', { exact: true });
    await expect(name).not.toHaveValue('');
    await name.fill('تغييرات مهمة');
    await page.route(`**/api/v1/coach/templates/${kind}/${template.id}`, (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT' } })
        : route.fallback(),
    );
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'حذف القالب', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('تم تعديل الخطة');
    await expect(name).toHaveValue('تغييرات مهمة');
  });
}
