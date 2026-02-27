/**
 * Guardrail: block dangerous DB commands when VERCEL_ENV=production.
 * Must match lib/env.ts isProd() criterion: VERCEL_ENV === 'production'.
 * Usage: node scripts/guard-prod.js <command>
 * If prod and command is blocked → log and process.exit(1).
 * Otherwise process.exit(0) so npm script can continue (e.g. && prisma migrate reset).
 */

const isProd = process.env.VERCEL_ENV === 'production'
const command = process.argv[2] || ''

const BLOCKED_COMMANDS = {
  'db:reset': {
    reason: 'migrate reset supprime toutes les données.',
    instead: 'En prod, ne jamais réinitialiser la base. Utiliser prisma migrate deploy pour appliquer les migrations.',
  },
  'db:push': {
    reason: 'db push peut modifier ou réinitialiser le schéma.',
    instead: 'En prod, utiliser prisma migrate deploy pour appliquer les migrations.',
  },
}

function logBlocked(action, reason, instead) {
  const env = process.env.VERCEL_ENV ?? '(non défini)'
  console.error('[PROD GUARD] Action bloquée:', action)
  console.error('[PROD GUARD] Environnement:', env)
  if (reason) console.error('[PROD GUARD] Raison:', reason)
  if (instead) console.error('[PROD GUARD] À la place:', instead)
}

if (!isProd || !command) {
  process.exit(0)
  return
}

const block = BLOCKED_COMMANDS[command]
if (!block) {
  process.exit(0)
  return
}

logBlocked(command, block.reason, block.instead)
process.exit(1)
