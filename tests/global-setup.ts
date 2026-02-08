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
    // Force E2E mode: known passwords + AdminSettings sans blocage workflow (Préparer/Expédier).
    const env: NodeJS.ProcessEnv = { ...process.env, E2E_SEED: '1' }
    delete env.CI
    execSync('npm run db:seed:e2e', {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
    })
  } catch (e) {
    console.warn('Global setup: prisma db seed failed (non-fatal).', e)
    // Continue so tests can run if DB was already seeded
  }
}

export default globalSetup
