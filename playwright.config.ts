import { defineConfig, devices } from '@playwright/test'

// Use PLAYWRIGHT_BASE_URL for production testing, otherwise localhost
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3005'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Only start webServer if testing locally (not when PLAYWRIGHT_BASE_URL is set)
  ...(process.env.PLAYWRIGHT_BASE_URL ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3005',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  }),
})
