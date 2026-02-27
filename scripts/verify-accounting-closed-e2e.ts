/**
 * Verify that the DB is in "closed period" state for E2E: INV-E2E-0001 has createdAt
 * before accountingLockedUntil. Exit 0 if ok, 1 otherwise.
 * Usage: tsx scripts/verify-accounting-closed-e2e.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { accountingLockedUntil: true },
  })
  const inv = await prisma.invoice.findFirst({
    where: { invoiceNumber: 'INV-E2E-0001' },
    select: { id: true, createdAt: true },
  })
  await prisma.$disconnect()

  if (!companySettings?.accountingLockedUntil) {
    console.error('E2E verify: accountingLockedUntil is not set')
    process.exit(1)
  }
  if (!inv) {
    console.error('E2E verify: INV-E2E-0001 not found')
    process.exit(1)
  }
  const lockedUntil = companySettings.accountingLockedUntil.getTime()
  const createdAt = inv.createdAt.getTime()
  if (createdAt > lockedUntil) {
    console.error(
      `E2E verify: invoice createdAt (${inv.createdAt.toISOString()}) is after lockedUntil (${companySettings.accountingLockedUntil.toISOString()})`
    )
    process.exit(1)
  }
  console.log('E2E verify: DB is in closed period state')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
