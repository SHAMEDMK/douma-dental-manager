/**
 * Central production detection and guardrails.
 * Use this for any dangerous operation (seed, reset, db push).
 * Source of truth: VERCEL_ENV === 'production' (Vercel sets this on production deployments).
 */

export function isProd(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

export interface ProdBlockLogOptions {
  /** Action that was blocked (e.g. 'seed', 'db:reset') */
  action: string
  /** Required env var that was missing (e.g. 'ALLOW_PROD_SEED') */
  missingVar?: string
  /** Short reason for the block */
  reason?: string
}

/**
 * Log a production block clearly (action, environment, missing variable).
 * Call before throwing so the refusal is auditable.
 */
export function logProdBlocked(options: ProdBlockLogOptions): void {
  const { action, missingVar, reason } = options
  const env = process.env.VERCEL_ENV ?? '(non défini)'
  const parts = [
    '[PROD GUARD] Action bloquée:',
    action,
    '| Environnement:',
    env,
  ]
  if (missingVar) parts.push('| Variable requise absente:', missingVar)
  if (reason) parts.push('| Raison:', reason)
  console.error(parts.join(' '))
}

/**
 * Throws if we are in production and the given flag is not set.
 * Use for seed: requireProdFlag('ALLOW_PROD_SEED', 'seed')
 */
export function requireProdFlagOrThrow(flagName: string, action: string): void {
  if (!isProd()) return
  const value = process.env[flagName]
  if (value === 'true' || value === '1') return
  logProdBlocked({
    action,
    missingVar: flagName,
    reason: `En production, ${action} n'est autorisé que si ${flagName}=true est défini.`,
  })
  throw new Error(
    `[PROD] ${action} refusé: définir ${flagName}=true pour autoriser explicitement. Environnement: ${process.env.VERCEL_ENV}.`
  )
}
