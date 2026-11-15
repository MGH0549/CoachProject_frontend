import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

test('landing follows the supplied composition in Arabic RTL', async ({ page }, testInfo) => {
  await mockApi(page, null);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'أربع خطوات بسيطة للانطلاق' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'تدرّب مع مدرب يعرف اسمك ويهتم بتقدمك.' }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('registration leads to pending account and WhatsApp', async ({ page }) => {
  const state = await mockApi(page, null);
  await page.goto('/auth/register');
  await page.getByLabel('الاسم الكامل').fill('عميل جديد');
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill('new@example.test');
  await page.getByLabel('رقم واتساب').fill('+201234567890');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('StrongPass1234');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'إنشاء حساب', exact: true }).click();
  await expect(page).toHaveURL(/auth\/pending/);
  await expect(page.locator('app-status-badge')).toContainText('بانتظار التفعيل');
  await expect(page.getByRole('link', { name: 'تواصل مع المدرب على واتساب' })).toHaveAttribute(
    'href',
    /https:\/\/wa.me\//,
  );
  expect(state.registered).toBe(true);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('training loads alternatives, records the chosen version, and keeps video lazy', async ({
  page,
}, testInfo) => {
  await mockApi(page);
  await page.goto('/client/training');
  await expect(page.getByRole('heading', { name: 'يوم الدفع', exact: true })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'ضغط الصدر بالدمبل', exact: true }).click();
  await expect(page.locator('app-video-panel button')).toHaveAttribute(
    'aria-label',
    'تشغيل ضغط الصدر بالدمبل',
  );
  await page.getByRole('button', { name: 'تسجيل إتمام التمرين', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '✓ تم تسجيل التمرين', exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('training.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('diet selections update totals and survive a reload', async ({ page }, testInfo) => {
  const state = await mockApi(page);
  await page.goto('/client/diet');
  await page.getByRole('button', { name: 'زبادي وفاكهة', exact: true }).click();
  await expect(page.locator('app-stat-card').first().locator('strong')).toHaveText('550');
  await page.reload();
  await expect(page.getByRole('button', { name: 'زبادي وفاكهة', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(state.mealChoices).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('diet.png'), fullPage: true });
});

test('locked meal cannot be changed', async ({ page }) => {
  const state = await mockApi(page);
  state.diet.meals[0].selection!.locked = true;
  await page.goto('/client/diet');
  await expect(page.getByRole('button', { name: 'زبادي وفاكهة', exact: true })).toBeDisabled();
  await expect(page.getByText('🔒 مقفل بواسطة المدرب')).toBeVisible();
});

test('version conflict refreshes the diet and explains the retry', async ({ page }) => {
  const state = await mockApi(page);
  state.conflict = true;
  await page.goto('/client/diet');
  await page.getByRole('button', { name: 'زبادي وفاكهة', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('تم تعديل الخطة');
  await expect(page.getByRole('button', { name: 'شوفان وبيض', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('weekly check-in saves and renders new measurements', async ({ page }) => {
  const state = await mockApi(page);
  await page.goto('/client/progress');
  await page.getByRole('button', { name: 'تسجيل المتابعة', exact: true }).first().click();
  await page.getByLabel('الوزن (كجم)', { exact: true }).fill('83.5');
  await page.getByLabel('الخصر (سم)', { exact: true }).fill('81');
  await page.getByRole('button', { name: 'إرسال إلى المدرب', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'المتابعة الأسبوعية', exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('app-stat-card').first().locator('strong')).toHaveText('83.5');
  expect(state.history).toHaveLength(2);
});

test('coach activates pending client', async ({ page }) => {
  const state = await mockApi(page, 'Coach', 'Pending');
  await page.goto('/coach/clients');
  await page.getByRole('button', { name: 'تفعيل', exact: true }).click();
  await page.getByLabel('الباقة', { exact: true }).fill('أونلاين');
  await page.getByLabel('تاريخ انتهاء الاشتراك').fill('2027-06-30');
  await page.getByRole('button', { name: 'حفظ وتأكيد' }).click();
  await expect(page.getByRole('link', { name: 'فتح الخطة' })).toBeVisible();
  expect(state.account.status).toBe('Active');
});

test('coach builder saves a training plan', async ({ page }, testInfo) => {
  const state = await mockApi(page, 'Coach');
  await page.goto('/coach/clients/client-1');
  await page.getByLabel('اسم الخطة', { exact: true }).fill('خطة جديدة');
  await page.getByRole('button', { name: 'حفظ الخطة', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('تم حفظ الخطة التدريبية');
  expect(state.trainingSaves).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('coach-builder.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('coach copies a template without modifying the original', async ({ page }) => {
  const state = await mockApi(page, 'Coach');
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/coach/templates');
  await page.getByRole('button', { name: 'دفع سحب أرجل إصدار 1' }).click();
  await page.getByRole('button', { name: 'أحمد محمد', exact: true }).click();
  await page.getByRole('button', { name: 'نسخ إلى العميل', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('تم نسخ الخطة');
  expect(state.copied).toBe(true);
});

test('coach creates a library exercise with a validated YouTube identifier', async ({ page }) => {
  const state = await mockApi(page, 'Coach');
  await page.goto('/coach/library');
  await page.getByRole('button', { name: 'تمرين جديد', exact: true }).click();
  await page.getByLabel('اسم التمرين', { exact: true }).fill('سحب أرضي');
  await page.getByLabel('العضلة المستهدفة').fill('الظهر');
  await page.getByLabel('رابط يوتيوب').fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('تم حفظ التمرين');
  expect(state.library.at(-1)?.youtubeVideoId).toBe('dQw4w9WgXcQ');
});

for (const status of ['Pending', 'Expired', 'Deactivated'] as const)
  test(`${status} client cannot open active plans`, async ({ page }) => {
    await mockApi(page, 'Client', status);
    await page.goto('/client/training');
    await expect(page).toHaveURL(/auth\/pending/);
    await expect(page.locator('app-training')).toHaveCount(0);
  });

test('client cannot enter coach routes', async ({ page }) => {
  await mockApi(page);
  await page.goto('/coach/clients');
  await expect(page).toHaveURL(/client\/training/);
});

test('new training template updates its saved ID on subsequent saves', async ({ page }) => {
  const state = await mockApi(page, 'Coach');
  await page.goto('/coach/templates/training/new');
  await page.getByLabel('اسم الخطة', { exact: true }).fill('قالب جديد');
  await page.getByRole('button', { name: '+ إضافة يوم', exact: true }).click();
  await page.locator('.library-row').filter({ hasText: 'ضغط الصدر بالبار' }).click();
  await page.getByRole('button', { name: 'حفظ الخطة', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('تم حفظ الخطة التدريبية');
  await page.getByLabel('اسم الخطة', { exact: true }).fill('قالب معدل');
  await page.getByRole('button', { name: 'حفظ الخطة', exact: true }).click();
  await expect.poll(() => state.trainingSaves).toBe(1);
  expect(state.templateCreates).toBe(1);
});

test('coach diet builder saves targets and locks choices', async ({ page }, testInfo) => {
  const state = await mockApi(page, 'Coach');
  await page.goto('/coach/clients/client-1');
  await page.getByRole('button', { name: 'النظام الغذائي', exact: true }).click();
  await page.getByLabel('اسم النظام', { exact: true }).fill('نظام معدل');
  await page.getByRole('button', { name: 'حفظ النظام', exact: true }).click();
  await expect.poll(() => state.dietSaves).toBe(1);
  await page.getByLabel('قفل النظام بالكامل', { exact: true }).check();
  await expect.poll(() => state.diet.choicesLocked).toBe(true);
  await page.getByLabel('قفل الوجبة', { exact: true }).check();
  await expect.poll(() => state.diet.meals[0].selection!.locked).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('coach-diet.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('coach feedback is saved on the selected check-in', async ({ page }) => {
  const state = await mockApi(page, 'Coach');
  await page.goto('/coach/clients/client-1');
  await page.getByRole('button', { name: 'التقدم والملاحظات', exact: true }).click();
  await page.getByLabel('ملاحظات المدرب', { exact: true }).fill('أحسنت، استمر على الخطة.');
  await page.getByRole('button', { name: 'حفظ الملاحظات', exact: true }).click();
  await expect.poll(() => state.history[0].feedback).toBe('أحسنت، استمر على الخطة.');
});

test('photo retry does not duplicate an already saved check-in', async ({ page }) => {
  const state = await mockApi(page);
  let attempts = 0;
  await page.route('**/api/v1/me/check-ins/*/photos', (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { code: 'PHOTO_RETRY' } })
      : route.fulfill({ json: { id: 'photo-saved' } });
  });
  await page.goto('/client/progress');
  await page.getByRole('button', { name: 'تسجيل المتابعة', exact: true }).first().click();
  await page.getByLabel('الوزن (كجم)', { exact: true }).fill('83.5');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'front.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  await page.getByRole('button', { name: 'إرسال إلى المدرب', exact: true }).click();
  await expect(page.getByRole('button', { name: 'إعادة رفع الصور', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'إعادة رفع الصور', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'المتابعة الأسبوعية', exact: true })).toHaveCount(
    0,
  );
  expect(state.checkInSubmissions).toBe(1);
  expect(attempts).toBe(2);
});

test('password recovery confirms sending without exposing account existence', async ({ page }) => {
  await mockApi(page, null);
  await page.goto('/auth/forgot-password');
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill('client@example.test');
  await page.getByRole('button', { name: 'إرسال رابط الاستعادة', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('إذا كان البريد مسجلاً');
});
