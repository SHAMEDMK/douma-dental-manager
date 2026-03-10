#!/usr/bin/env node
/**
 * Attribue un code client (CLI-001, CLI-002, ...) à tous les clients qui n'en ont pas.
 *
 * Usage: node scripts/fill-missing-client-codes.js
 *   ou:  npm run db:fill-client-codes
 *
 * Avec .env.production: npx dotenv-cli -e .env.production -- npm run db:fill-client-codes
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const clientsSansCode = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      OR: [{ clientCode: null }, { clientCode: '' }],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true },
  })

  if (clientsSansCode.length === 0) {
    console.log('Aucun client sans code. Rien à faire.')
    return
  }

  // Trouver le prochain numéro disponible (max des CLI-XXX existants + 1)
  const clientsAvecCode = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      clientCode: { not: null },
    },
    select: { clientCode: true },
  })

  const nums = clientsAvecCode
    .map((u) => {
      const m = (u.clientCode || '').match(/^CLI-(\d+)$/i)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1

  console.log(`${clientsSansCode.length} client(s) sans code trouvé(s). Attribution en cours...\n`)

  for (let i = 0; i < clientsSansCode.length; i++) {
    const code = `CLI-${String(nextNum + i).padStart(3, '0')}`
    try {
      await prisma.user.update({
        where: { id: clientsSansCode[i].id },
        data: { clientCode: code },
      })
      console.log(`  ✓ ${clientsSansCode[i].name} (${clientsSansCode[i].email}) → ${code}`)
    } catch (err) {
      console.error(`  ✗ ${clientsSansCode[i].email}: ${err?.message || err}`)
    }
  }

  console.log(`\nTerminé. ${clientsSansCode.length} client(s) mis à jour.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
