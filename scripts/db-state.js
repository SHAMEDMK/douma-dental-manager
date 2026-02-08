/**
 * Affiche l'état de la base de données (effectifs par table et résumé).
 * Usage: node scripts/db-state.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== État de la base de données ===\n')

  const [
    userCount,
    productCount,
    variantCount,
    orderCount,
    orderItemCount,
    invoiceCount,
    stockMovementCount,
    invitationCount,
    favoriteCount,
    productOptionCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.invoice.count(),
    prisma.stockMovement.count(),
    prisma.invitation.count(),
    prisma.favoriteProduct.count(),
    prisma.productOption.count(),
  ])

  console.log('--- Effectifs par table ---')
  console.log('  Users:              ', userCount)
  console.log('  Products:           ', productCount)
  console.log('  ProductVariants:     ', variantCount)
  console.log('  ProductOptions:     ', productOptionCount)
  console.log('  Orders:             ', orderCount)
  console.log('  OrderItems:         ', orderItemCount)
  console.log('  Invoices:           ', invoiceCount)
  console.log('  StockMovements:     ', stockMovementCount)
  console.log('  Invitations:        ', invitationCount)
  console.log('  FavoriteProducts:   ', favoriteCount)

  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true },
  })
  console.log('\n--- Utilisateurs par rôle ---')
  usersByRole.forEach((r) => console.log(`  ${r.role}: ${r._count.id}`))

  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, _count: { select: { variants: true, options: true } } },
    orderBy: { name: 'asc' },
  })
  console.log('\n--- Produits ---')
  if (products.length === 0) {
    console.log('  (aucun)')
  } else {
    products.forEach((p) => {
      console.log(`  ${p.sku ?? '(pas de SKU)'} | ${p.name} | variantes: ${p._count.variants}, options: ${p._count.options}`)
    })
  }

  const lastOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, orderNumber: true, status: true, createdAt: true },
  })
  console.log('\n--- 5 dernières commandes ---')
  if (lastOrders.length === 0) {
    console.log('  (aucune)')
  } else {
    lastOrders.forEach((o) => {
      console.log(`  ${o.orderNumber ?? o.id} | ${o.status} | ${o.createdAt.toISOString().slice(0, 10)}`)
    })
  }

  try {
    const adminSettings = await prisma.adminSettings.findUnique({ where: { id: 'default' } })
    const companySettings = await prisma.companySettings.findUnique({ where: { id: 'default' } })
    console.log('\n--- Paramètres ---')
    console.log('  AdminSettings:     ', adminSettings ? 'présent' : 'absent')
    console.log('  CompanySettings:   ', companySettings ? `présent (${companySettings?.name ?? '—'})` : 'absent')
  } catch (e) {
    console.log('\n  (paramètres non chargés)')
  }

  console.log('\n=== Fin ===')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
