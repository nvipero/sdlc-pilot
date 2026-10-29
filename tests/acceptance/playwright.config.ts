import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --strictPort',
    cwd: '../..',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
  },
});
