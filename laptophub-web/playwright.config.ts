import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  workers: 1, // serial execution — shared backend data + login rate-limit se bachne ke liye
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
    screenshot: 'only-on-failure',
  },
  reporter: [['html', { open: 'never' }]],
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
      testIgnore: /pos-sale\.spec\.ts/,
    },
    {
      name: 'login-flow',
      testMatch: /pos-sale\.spec\.ts/,
    },
  ],
});