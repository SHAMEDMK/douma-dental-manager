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
  try {
    execSync('npx tsx scripts/set-accounting-close-e2e.ts', {
      cwd: projectRoot,
      stdio: 'pipe',
      env: { ...process.env, E2E_SEED: '1' },
    })
  } catch {
    // Non-fatal: accounting-close tests may skip if lock not set
  }
}

export default globalSetup
