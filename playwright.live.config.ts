import { defineConfig, devices } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
  ...config,
  testMatch: '**/*.live.spec.ts',
  outputDir: 'test-results/live',
  testIgnore: [],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { ...config.use, trace: 'off', video: 'off' },
  projects: [{ name: 'live-desktop', use: { ...devices['Desktop Chrome'] } }],
});
