import { execSync } from 'child_process'
import path from 'path'

/**
 * Playwright global setup: seed the database so E2E tests have known users
 * (admin@douma.com / password, client@dental.com / password123, etc.).
 * Runs before the web server starts so the DB is ready when tests run.
 */
async function globalSetup() {
  const projectRoot = path.resolve(__dirname, '..')
  try {
    const env: NodeJS.ProcessEnv = { ...process.env, E2E_SEED: '1' }
    delete env.CI
    execSync('npm run db:seed:e2e', {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
    })
  } catch (e) {
    console.warn('Global setup: prisma db seed failed (non-fatal).', e)
  }
  // Do NOT run set-accounting-close-e2e here: it locks the period (accountingLockedUntil = 2024-01-15)
  // and backdates INV-E2E-0001.createdAt, which blocks payments in payment-workflow tests.
  // Accounting-close tests run the script themselves (closed period) or --open (open period).
}

export default globalSetup
