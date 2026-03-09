#!/usr/bin/env npx tsx
/**
 * Supprime les clients et commandes de démo (Dr. Demo Client, Client B E2E).
 * À exécuter sur la base PRODUCTION pour nettoyer avant d'inviter de vrais clients.
 *
 * Usage:
 *   npx tsx scripts/cleanup-demo-data.ts [--dry-run]
 *
 * Le script charge .env.production s'il existe (sinon .env).
 * ⚠️ ATTENTION : Vérifiez que DATABASE_URL pointe vers la bonne base !
 */

import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Charger .env.production en priorité (pour prod), sinon .env
const prodEnv = resolve(process.cwd(), '.env.production')
if (existsSync(prodEnv)) {
  config({ path: prodEnv })
  console.log('📁 Variables chargées depuis .env.production\n')
} else {
  config()
}
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_CLIENT_EMAILS = ['client@dental.com', 'clientb@dental.com']

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) {
    console.log('🔍 Mode --dry-run : aucune suppression réelle.\n')
  }

  const clients = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      email: { in: DEMO_CLIENT_EMAILS },
    },
    include: {
      orders: {
        include: {
          invoice: { include: { payments: true } },
          items: true,
        },
      },
    },
  })

  if (clients.length === 0) {
    console.log('✓ Aucun client de démo trouvé.')
    return
  }

  console.log(`Clients de démo trouvés : ${clients.length}`)
  for (const c of clients) {
    console.log(`  - ${c.email} (${c.name}) : ${c.orders.length} commande(s)`)
  }
  console.log('')

  for (const client of clients) {
    for (const order of client.orders) {
      if (dryRun) {
        console.log(`  [DRY-RUN] Suppression commande ${order.orderNumber ?? order.id}`)
        continue
      }

      // 1. Supprimer les paiements
      if (order.invoice?.payments?.length) {
        await prisma.payment.deleteMany({
          where: { invoiceId: order.invoice.id },
        })
      }

      // 2. Supprimer la facture
      if (order.invoice) {
        await prisma.invoice.delete({
          where: { id: order.invoice.id },
        })
      }

      // 3. Supprimer les lignes de commande
      await prisma.orderItem.deleteMany({
        where: { orderId: order.id },
      })

      // 4. Supprimer le bon de livraison (si existe)
      await prisma.deliveryNote.deleteMany({
        where: { orderId: order.id },
      })

      // 5. Supprimer la commande
      await prisma.order.delete({
        where: { id: order.id },
      })

      console.log(`  ✓ Commande ${order.orderNumber ?? order.id} supprimée`)
    }

    if (!dryRun) {
      await prisma.user.delete({
        where: { id: client.id },
      })
      console.log(`  ✓ Client ${client.email} supprimé`)
    }
  }

  if (dryRun) {
    console.log('\n⚠️ Relancez sans --dry-run pour effectuer les suppressions.')
  } else {
    console.log('\n✓ Nettoyage terminé. Vous pouvez maintenant inviter vos vrais clients.')
  }
}

main()
  .catch((e) => {
    console.error('Erreur:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
