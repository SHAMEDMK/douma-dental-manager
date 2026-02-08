import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL: 127.0.0.1 to avoid 0.0.0.0 / localhost resolution issues in E2E */
    baseURL: 'http://127.0.0.1:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects: auth-setup run first, then role-based projects with shared session */
  projects: [
    { name: 'auth-setup', testMatch: /auth\.setup\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/admin.json' },
      dependencies: ['auth-setup'],
      testMatch: [
        /admin-approval\.spec\.ts/,
        /audit-logs\.spec\.ts/,
        /backups\.spec\.ts/,
        /client-management\.spec\.ts/,
        /dashboard-admin\.spec\.ts/,
        /delivery-agents-management\.spec\.ts/,
        /filters-advanced\.spec\.ts/,
        /invoice-lock\.spec\.ts/,
        /order-workflow\.spec\.ts/,
        /pdf-generation\.spec\.ts/,
        /product-management\.spec\.ts/,
        /settings-admin\.spec\.ts/,
        /stock-management\.spec\.ts/,
      ],
    },
    {
      name: 'client',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/client.json' },
      dependencies: ['auth-setup'],
      timeout: 180000,
      testMatch: [
        /smoke\.spec\.ts/,
        /credit-limit\.spec\.ts/,
        /delivery-workflow\.spec\.ts/,
        /full-workflow-delivery\.spec\.ts/,
        /payment-workflow\.spec\.ts/,
        /workflow-complet\.spec\.ts/,
        /workflow\.order-to-prepared\.spec\.ts/,
      ],
    },
    {
      name: 'no-auth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        /auth\.spec\.ts/,
        /rate-limit-login\.spec\.ts/,
        /rate-limit-pdf\.spec\.ts/,
        /api-admin-security\.spec\.ts/,
      ],
    },
  ],

  /* Seed DB before tests so login credentials are known (admin@douma.com / password, etc.) */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  /* Run your local dev server before starting the tests. ECONNRESET in [WebServer] logs are usually benign. See docs/E2E_DOUMA_GUIDE.md */
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  /* Timeout for each test (login + navigation can be slow) */
  timeout: 60000,
})
