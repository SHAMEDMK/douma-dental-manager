/**
 * Supprime un produit et toutes ses variantes/options par SKU.
 * Usage: node scripts/delete-product-by-sku.js <SKU> [--force]
 *
 * Par défaut, refuse la suppression si des lignes de commande référencent le produit.
 * Avec --force : supprime d'abord les lignes de commande concernées puis le produit (destructif).
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const sku = args.find((a) => !a.startsWith('--'))
  const force = args.includes('--force')
  if (!sku) {
    console.error('Usage: node scripts/delete-product-by-sku.js <SKU> [--force]')
    console.error('Exemple: node scripts/delete-product-by-sku.js Prod-009')
    console.error('        node scripts/delete-product-by-sku.js Prod-009 --force')
    process.exit(1)
  }

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { sku: sku },
        { sku: sku.toUpperCase() },
        { sku: sku.toLowerCase() },
      ].filter((x) => x.sku != null),
    },
    include: {
      variants: {
        select: { id: true, sku: true, _count: { select: { orderItems: true } } },
      },
      options: { select: { id: true, name: true } },
      _count: { select: { orderItems: true } },
    },
  })

  if (!product) {
    console.error(`Produit non trouvé avec le SKU: ${sku}`)
    process.exit(1)
  }

  const productOrderItems = product._count?.orderItems ?? 0
  const variantOrderItems = product.variants?.reduce((sum, v) => sum + (v._count?.orderItems ?? 0), 0) ?? 0
  const totalRefs = productOrderItems + variantOrderItems

  if (totalRefs > 0 && !force) {
    console.error(
      `Impossible de supprimer: le produit est utilisé dans ${totalRefs} ligne(s) de commande. ` +
      'Supprimez ou modifiez les commandes concernées, ou relancez avec --force pour supprimer ces lignes puis le produit.'
    )
    process.exit(1)
  }

  if (totalRefs > 0 && force) {
    const variantIds = product.variants?.map((v) => v.id) ?? []
    const deletedItems = await prisma.orderItem.deleteMany({
      where: {
        OR: [
          { productId: product.id },
          ...(variantIds.length ? [{ productVariantId: { in: variantIds } }] : []),
        ],
      },
    })
    console.log(`${deletedItems.count} ligne(s) de commande supprimée(s).`)
  }

  console.log(`Produit trouvé: ${product.name} (SKU: ${product.sku})`)
  console.log(`  Variantes: ${product.variants?.length ?? 0}`)
  console.log(`  Options: ${product.options?.length ?? 0}`)
  console.log('Suppression en cours...')

  const variantIds = product.variants?.map((v) => v.id) ?? []
  const sm = await prisma.stockMovement.deleteMany({
    where: {
      OR: [
        { productId: product.id },
        ...(variantIds.length ? [{ productVariantId: { in: variantIds } }] : []),
      ],
    },
  })
  if (sm.count > 0) console.log(`  ${sm.count} mouvement(s) de stock supprimé(s).`)
  const fp = await prisma.favoriteProduct.deleteMany({
    where: {
      OR: [
        { productId: product.id },
        ...(variantIds.length ? [{ productVariantId: { in: variantIds } }] : []),
      ],
    },
  })
  if (fp.count > 0) console.log(`  ${fp.count} favori(s) supprimé(s).`)

  await prisma.product.delete({
    where: { id: product.id },
  })

  console.log('Produit et ses variantes/options ont été supprimés.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
