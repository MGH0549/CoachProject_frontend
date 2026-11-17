import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

test.use({ baseURL: 'http://localhost:4300', serviceWorkers: 'block' });

test('theme defaults to dark and persists across reloads and navigation', async ({ page }) => {
  await mockApi(page, null);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const accents = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ['--red', '--green', '--action-red'].map((name) => style.getPropertyValue(name));
  });
  await page.getByRole('button', { name: 'تفعيل الوضع الفاتح' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 247, 248)');
  expect(
    await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return ['--red', '--green', '--action-red'].map((name) => style.getPropertyValue(name));
    }),
  ).toEqual(accents);
  await expect(page.locator('.hero-banner')).toHaveCSS('background-color', 'rgb(30, 30, 32)');
  await expect(page.locator('.cta .btn')).toHaveCSS('background-color', 'rgb(10, 10, 10)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/auth/sign-in');
  await expect(page.getByRole('button', { name: 'تفعيل الوضع الداكن' })).toBeVisible();
  await page.getByRole('button', { name: 'تفعيل الوضع الداكن' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('dashboard offers a theme switch on desktop and mobile', async ({ page }) => {
  await mockApi(page, 'Client');
  await page.goto('/client/diet');
  await page.getByRole('button', { name: 'تفعيل الوضع الفاتح' }).filter({ visible: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('main')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('theme switch still works when storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('Storage blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('Storage blocked');
    };
  });
  await mockApi(page, null);
  await page.goto('/');
  await page.getByRole('button', { name: 'تفعيل الوضع الفاتح' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
