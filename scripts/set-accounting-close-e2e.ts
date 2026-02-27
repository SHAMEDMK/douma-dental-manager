/**
 * Set CompanySettings.accountingLockedUntil for E2E accounting-close tests.
 * - Default: timestamps fixes ISO UTC (pas de Date.now). Edge case ≤ = clôturé :
 *   accountingLockedUntil = 2024-01-15T12:00:00.000Z
 *   Facture seed utilisée : invoiceNumber = INV-E2E-0001 (createdAt mis à ce même timestamp).
 * - --open: set accountingLockedUntil to null (open period for "allow new invoice" test).
 * Usage: E2E_SEED=1 tsx scripts/set-accounting-close-e2e.ts [--open]
 *
 * Ce script contourne la règle d'irreversibilité de l'app (updateAccountingLockAction) :
 * en prod, la clôture ne doit être modifiée que via l'action audité.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const openPeriod = process.argv.includes('--open')

async function main() {
  if (openPeriod) {
    try {
      await prisma.companySettings.update({
        where: { id: 'default' },
        data: { accountingLockedUntil: null },
      })
      console.log('E2E: accountingLockedUntil set to null (period open)')
    } catch (e) {
      console.warn('E2E: could not clear accountingLockedUntil:', e)
    }
  } else {
    // Fixed timestamp in the past (no Date.now). Edge case: createdAt === accountingLockedUntil (≤ = clôturé).
    const lockedUntil = new Date('2024-01-15T12:00:00.000Z')
    const invoiceCreatedAt = lockedUntil // same ISO UTC timestamp: boundary test
    // Ensure row exists (seed creates it; create has no accountingLockedUntil to avoid Prisma client issues)
    await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: { accountingLockedUntil: lockedUntil },
      create: {
        id: 'default',
        name: 'E2E',
        address: 'E2E',
        city: 'E2E',
        country: 'MA',
        ice: 'E2E',
        vatRate: 0.2,
      },
    })
    // Set lock (in case row existed without it)
    await prisma.companySettings.update({
      where: { id: 'default' },
      data: { accountingLockedUntil: lockedUntil },
    })
    console.log('E2E: accountingLockedUntil set to', lockedUntil.toISOString())
    const inv = await prisma.invoice.findFirst({ where: { invoiceNumber: 'INV-E2E-0001' } })
    if (inv) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { createdAt: invoiceCreatedAt },
      })
      console.log('E2E: INV-E2E-0001 createdAt set to', invoiceCreatedAt.toISOString(), '(boundary: createdAt === lockedUntil)')
    } else {
      console.warn('E2E: INV-E2E-0001 not found, skip backdate')
    }
  }
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
