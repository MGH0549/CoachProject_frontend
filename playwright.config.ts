import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4200', channel: 'chromium', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm start -- --host 127.0.0.1',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120000,
    },
    {
      command: 'npm run preview',
      url: 'http://localhost:4300',
      reuseExistingServer: !process.env['CI'],
      timeout: 30000,
    },
  ],
});
