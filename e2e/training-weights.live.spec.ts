import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { Training } from '../src/app/core/api/models/training';

// Uses real HTTP, Prisma and PostgreSQL; every account and exercise is disposable.
test('real API: training save, reload, alternative isolation and completion without weights', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const databaseUrl = process.env['TEST_DATABASE_URL'];
  const backendRoot = process.env['TRAINING_BACKEND_ROOT'];
  if (!databaseUrl || !/test/i.test(new URL(databaseUrl).pathname) || !backendRoot)
    throw new Error(
      'Set TEST_DATABASE_URL to a dedicated test database and TRAINING_BACKEND_ROOT to the Node API checkout. Start that API against the same database.',
    );
  const require = createRequire(`${backendRoot}/package.json`);
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const argon = require('argon2');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const base = (process.env['STRENGTH_API_BASE'] ?? 'http://localhost:3000/api').replace(/\/$/, '');
  const prefix = `training-live-${randomUUID()}`;
  const emails = [`${prefix}-coach@example.com`, `${prefix}-client@example.com`];
  const password = `TrainingTest-${randomUUID()}`;
  const origin = { Origin: 'http://localhost:4200' };
  try {
    await db.user.create({
      data: {
        email: emails[0],
        passwordHash: await argon.hash(password),
        role: 'Coach',
        consentAt: new Date(),
      },
    });
    const coachLogin = await request.post(`${base}/v1/auth/login`, {
      headers: origin,
      data: { email: emails[0], password },
    });
    expect(coachLogin.status()).toBe(200);
    const coachHeaders = {
      ...origin,
      Authorization: `Bearer ${(await coachLogin.json()).accessToken}`,
    };
    const registered = await request.post(`${base}/v1/auth/register`, {
      headers: origin,
      data: {
        email: emails[1],
        password,
        fullName: 'Training Test',
        whatsapp: '201000000001',
        consent: true,
      },
    });
    expect(registered.status()).toBe(201);
    const profile = await db.clientProfile.findFirstOrThrow({
      where: { user: { email: emails[1] } },
    });
    expect(
      (
        await request.post(`${base}/v1/coach/clients/${profile.id}/activate`, {
          headers: coachHeaders,
          data: { version: 1, endDate: '2099-01-31', package: 'Monthly' },
        })
      ).status(),
    ).toBe(201);
    const ids: string[] = [];
    for (const label of ['main', 'alternative']) {
      const response = await request.post(`${base}/v1/coach/exercises`, {
        headers: coachHeaders,
        data: { name: `${prefix}-${label}`, muscleGroup: 'Chest', youtubeVideoId: 'dQw4w9WgXcQ' },
      });
      expect(response.status()).toBe(201);
      ids.push((await response.json()).id);
    }
    const response = await request.put(`${base}/v1/coach/clients/${profile.id}/training`, {
      headers: coachHeaders,
      data: {
        name: 'Training test',
        days: [
          {
            name: 'Push',
            order: 0,
            exercises: [
              {
                exerciseId: ids[0],
                sets: 1,
                reps: '8',
                restSeconds: 90,
                order: 0,
                alternatives: [{ exerciseId: ids[1] }],
              },
            ],
          },
        ],
      },
    });
    expect(response.status()).toBe(200);
    const plan: Training = await response.json();
    // Forward to the isolated real API when the frontend's configured port is occupied.
    // continue() performs a real network request; no response bodies are substituted.
    if (base !== 'http://localhost:3000/api')
      await page.route('http://localhost:3000/api/**', (route) =>
        route.continue({ url: route.request().url().replace('http://localhost:3000/api', base) }),
      );
    await page.goto('/auth/sign-in');
    await page.getByLabel('البريد الإلكتروني', { exact: true }).fill(emails[1]);
    await page.getByLabel('كلمة المرور', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
    await expect(page).toHaveURL(/\/client\//);
    await page.goto('/client/training');
    const row = page.locator('.exercise-row');
    await expect(row).toContainText('لم تسجّل أوزاناً بعد');
    await row.click();
    const panel = page.locator('app-training-weights');
    await panel.getByRole('spinbutton').first().fill('42.25');
    await panel.getByRole('spinbutton').nth(1).fill('8');
    await panel.getByRole('button', { name: 'حفظ الأوزان وإتمام التمرين', exact: true }).click();
    await expect(row).toContainText('42.25');
    expect(await db.workoutLog.count({ where: { clientId: profile.id } })).toBe(1);
    expect(await db.workoutSet.count({ where: { workoutLog: { clientId: profile.id } } })).toBe(1);
    await page.reload();
    await expect(row).toContainText('42.25');
    await row.click();
    await expect(panel.getByRole('spinbutton').first()).toHaveValue('42.25');
    await page
      .locator('.alternatives')
      .getByRole('button', { name: `${prefix}-alternative`, exact: true })
      .click();
    await expect(row).toContainText('لم تسجّل أوزاناً بعد');
    await panel.getByRole('spinbutton').first().fill('20');
    await panel.getByRole('spinbutton').nth(1).fill('10');
    await panel.getByRole('button', { name: 'حفظ الأوزان وإتمام التمرين', exact: true }).click();
    await expect(row).toContainText('20');
    await page
      .locator('.alternatives')
      .getByRole('button', { name: 'التمرين الأساسي', exact: true })
      .click();
    await expect(row).toContainText('42.25');
    await panel.getByRole('button', { name: 'إتمام التمرين بدون أوزان', exact: true }).click();
    await expect(page.locator('.toast')).toContainText('تم إتمام التمرين بدون أوزان');
    expect(await db.workoutLog.count({ where: { clientId: profile.id } })).toBe(3);
    expect(await db.workoutSet.count({ where: { workoutLog: { clientId: profile.id } } })).toBe(2);
    const sessions = await db.workoutLog.findMany({
      where: { clientId: profile.id },
      include: { workoutSets: true },
    });
    expect(
      Number(
        sessions.find(
          (s: { alternativeId: string | null }) =>
            s.alternativeId === plan.days[0].exercises[0].alternatives[0].id,
        ).workoutSets[0].weightKg,
      ),
    ).toBe(20);
  } finally {
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await db.exercise.deleteMany({ where: { name: { startsWith: prefix } } });
    await db.$disconnect();
  }
});
