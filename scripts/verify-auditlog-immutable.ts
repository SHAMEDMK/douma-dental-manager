/**
 * Vérifie que la table AuditLog est protégée en base (trigger) : UPDATE et DELETE doivent échouer
 * avec le message d'erreur attendu. Append-only garanti au niveau DB.
 *
 * Usage: npx tsx scripts/verify-auditlog-immutable.ts
 * Exit 0 si les deux tentatives (update, delete) sont bien refusées ; 1 sinon.
 */

import { PrismaClient } from '@prisma/client'

const EXPECTED_ERROR = 'AuditLog is immutable'

async function main() {
  const prisma = new PrismaClient()

  let id: string
  const existing = await prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { id: true } })
  if (existing) {
    id = existing.id
  } else {
    const created = await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        entityType: 'USER',
        entityId: null,
        userId: null,
        userEmail: null,
        userRole: null,
        details: null,
        ipAddress: null,
        userAgent: null,
      },
    })
    id = created.id
  }

  let updateOk = false
  let deleteOk = false

  function hasExpectedError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e)
    const meta = (e as { meta?: { message?: string } })?.meta?.message ?? ''
    return msg.includes(EXPECTED_ERROR) || meta.includes(EXPECTED_ERROR)
  }

  try {
    await prisma.auditLog.update({
      where: { id },
      data: { details: '{}' },
    })
  } catch (e: unknown) {
    if (hasExpectedError(e)) {
      updateOk = true
    } else {
      console.error('UPDATE refusé mais message inattendu:', e instanceof Error ? e.message : String(e))
    }
  }

  try {
    await prisma.auditLog.delete({ where: { id } })
  } catch (e: unknown) {
    if (hasExpectedError(e)) {
      deleteOk = true
    } else {
      console.error('DELETE refusé mais message inattendu:', e instanceof Error ? e.message : String(e))
    }
  }

  await prisma.$disconnect()

  if (updateOk && deleteOk) {
    console.log('OK: AuditLog est bien immuable (UPDATE et DELETE refusés par le trigger).')
    process.exit(0)
  }
  console.error('Échec: le trigger AuditLog ne se comporte pas comme attendu.')
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
