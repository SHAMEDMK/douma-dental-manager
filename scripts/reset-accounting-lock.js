/**
 * Réinitialise la clôture comptable (accountingLockedUntil = null) pour le dev/local.
 * En production, ne pas utiliser : la clôture est volontairement irréversible.
 *
 * Usage: node scripts/reset-accounting-lock.js
 * En prod: refusé sauf si ALLOW_RESET_ACCOUNTING_LOCK=1 (à éviter).
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const isProd = process.env.NODE_ENV === 'production'
  const allowReset = process.env.ALLOW_RESET_ACCOUNTING_LOCK === '1'

  if (isProd && !allowReset) {
    console.error('❌ Réinitialisation de la clôture comptable refusée en production.')
    console.error('   Pour forcer (déconseillé): ALLOW_RESET_ACCOUNTING_LOCK=1 node scripts/reset-accounting-lock.js')
    process.exit(1)
  }

  const current = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { accountingLockedUntil: true },
  })

  if (!current) {
    console.log('ℹ Aucun CompanySettings "default" trouvé.')
    process.exit(0)
  }

  if (current.accountingLockedUntil == null) {
    console.log('ℹ La clôture comptable n\'est pas définie (déjà null).')
    process.exit(0)
  }

  await prisma.companySettings.update({
    where: { id: 'default' },
    data: { accountingLockedUntil: null },
  })

  console.log('✓ Clôture comptable réinitialisée (accountingLockedUntil = null).')
  console.log('  Vous pouvez à nouveau enregistrer des paiements sur les factures existantes.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
