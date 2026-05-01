import { prisma } from '@/lib/prisma'

/** Même règle que app/admin/stock/page.tsx : rupture ou stock bas (pas « OK »). */
export function stockUnitNeedsAttention(stock: number, minStock: number): boolean {
  const isOutOfStock = stock === 0
  const isLowStock = !isOutOfStock && minStock > 0 && stock <= minStock
  return isOutOfStock || isLowStock
}

export type LowStockAlertRow = {
  id: string
  name: string
  stock: number
  minStock: number
  variantId?: string
}

/**
 * Unités visibles côté admin (produit seul ou chaque variante), avec le même sens que getStockUnits.
 */
export async function getLowStockAlertData(): Promise<{
  count: number
  items: LowStockAlertRow[]
}> {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      stock: true,
      minStock: true,
      variants: {
        select: { id: true, name: true, sku: true, stock: true, minStock: true },
      },
    },
  })
  const items: LowStockAlertRow[] = []
  for (const product of products) {
    if (product.variants.length > 0) {
      for (const v of product.variants) {
        if (stockUnitNeedsAttention(v.stock, v.minStock)) {
          items.push({
            id: product.id,
            name: `${product.name} – ${v.name || v.sku}`,
            stock: v.stock,
            minStock: v.minStock,
            variantId: v.id,
          })
        }
      }
    } else if (stockUnitNeedsAttention(product.stock, product.minStock)) {
      items.push({
        id: product.id,
        name: product.name,
        stock: product.stock,
        minStock: product.minStock,
      })
    }
  }
  return { count: items.length, items }
}
