'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

/** Type des opérations d'ajustement de stock */
export type StockOperation = 'ADD' | 'REMOVE' | 'SET'

export async function adjustStock(productId: string, quantity: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', reason: string) {
  if (quantity <= 0) {
    throw new Error('La quantité doit être positive')
  }

  // Use transaction to ensure consistency
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } })
    if (!product) throw new Error('Produit non trouvé')

    // Calculate new stock based on type
    let newStock = product.stock
    if (type === 'IN') {
      newStock += quantity
    } else if (type === 'OUT') {
      newStock -= quantity
    } else if (type === 'ADJUSTMENT') {
      // For adjustment, we assume 'quantity' is the DELTA or the NEW value?
      // Usually adjustment means "I found 5, but system says 4, so add 1".
      // Or "System says 10, I count 8, so remove 2".
      // Let's assume 'quantity' here is the ABSOLUTE change to apply.
      // Actually, to keep it simple, let's treat ADJUSTMENT as a direct signed change if we allowed negative quantity,
      // but here we enforce positive quantity.
      // So let's rely on IN/OUT for add/remove.
      // If type is ADJUSTMENT, maybe it means "Set to specific value"?
      // Let's stick to IN/OUT for manual changes.
      // If type is ADJUSTMENT, we might need to know if it's adding or removing.
      // Let's change the signature or logic.
      
      // Let's simplify: User selects "Ajout (+)" or "Retrait (-)" or "Inventaire (=)"
      // If "Inventaire (=)", we calculate the difference.
      
      // But for this action, let's keep it low level:
      // The caller decides if it's IN or OUT.
      // If type is ADJUSTMENT, maybe we just treat it like IN/OUT but label it differently?
      // Let's assume the caller handles the sign.
      
      // WAIT: The UI will probably have "Type: Correction (+), Correction (-), Perte (-), Vol (-)"
      // Let's stick to:
      // IN: Add
      // OUT: Subtract
      // ADJUSTMENT: Could be either, but usually implies a correction.
      
      // Let's change the action to take a SIGNED adjustment for 'ADJUSTMENT', or just use IN/OUT.
      // Let's support 'IN' and 'OUT' which always mean + and -.
      // If user selects 'ADJUSTMENT', they should specify if it's positive or negative correction?
      // Or maybe the UI handles "New Stock Level" and calculates the diff?
      
      // Let's implement "setStock" action as well, which is often easier for "Inventaire".
    }
    
    // For now, let's assume this action is for ADD/REMOVE delta.
    const adjustmentVal = (type === 'IN' || type === 'ADJUSTMENT') ? quantity : -quantity
    // Wait, if ADJUSTMENT is negative?
    
    // Let's allow signed quantity for ADJUSTMENT?
    // Or just strictly use IN/OUT.
  })
}

/**
 * Met à jour le stock d'un produit ou d'une variante.
 * Si productVariantId est fourni : met à jour le stock de la variante (vérifie qu'elle appartient au produit).
 * Sinon : comportement produit. Les StockMovement sont créés avec le bon productVariantId.
 * Validation : le stock résultant ne peut pas être négatif.
 */
export async function updateStock(
  productId: string,
  operation: StockOperation,
  quantity: number,
  reason: string,
  productVariantId?: string | null
): Promise<void> {
  const variantId = productVariantId != null && String(productVariantId).trim() !== '' ? String(productVariantId).trim() : undefined

  if (operation === 'ADD' || operation === 'REMOVE') {
    if (quantity <= 0 || !Number.isFinite(quantity)) {
      throw new Error('La quantité doit être un nombre positif')
    }
  }
  if (operation === 'SET') {
    if (quantity < 0 || !Number.isFinite(quantity)) {
      throw new Error('Le stock (inventaire) ne peut pas être négatif')
    }
  }

  let oldStock = 0
  let newStock = 0
  let change = 0
  let type: 'IN' | 'OUT' | 'ADJUSTMENT' = 'ADJUSTMENT'
  let productName = ''
  let entityId: string = productId

  await prisma.$transaction(async (tx) => {
    if (variantId) {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: { select: { id: true, name: true } } },
      })
      if (!variant) {
        throw new Error('Variante non trouvée')
      }
      if (variant.productId !== productId) {
        throw new Error('La variante ne correspond pas au produit')
      }
      oldStock = variant.stock
      productName = `${variant.product.name} – ${variant.name || variant.sku}`

      if (operation === 'ADD') {
        change = quantity
        type = 'IN'
      } else if (operation === 'REMOVE') {
        change = -quantity
        type = 'OUT'
      } else if (operation === 'SET') {
        change = quantity - variant.stock
        type = 'ADJUSTMENT'
      }

      if (change === 0) return
      newStock = variant.stock + change
      if (newStock < 0) {
        throw new Error('Le stock ne peut pas être négatif')
      }

      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      })

      await tx.stockMovement.create({
        data: {
          productId,
          productVariantId: variantId,
          type: operation === 'SET' ? 'ADJUSTMENT' : (change > 0 ? 'IN' : 'OUT'),
          quantity: Math.abs(change),
          reference: reason || 'Manuel',
        },
      })

      entityId = variantId
    } else {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error('Produit non trouvé')

      oldStock = product.stock
      productName = product.name

      if (operation === 'ADD') {
        change = quantity
        type = 'IN'
      } else if (operation === 'REMOVE') {
        change = -quantity
        type = 'OUT'
      } else if (operation === 'SET') {
        change = quantity - product.stock
        type = 'ADJUSTMENT'
      }

      if (change === 0) return
      newStock = product.stock + change
      if (newStock < 0) {
        throw new Error('Le stock ne peut pas être négatif')
      }

      await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      })

      await tx.stockMovement.create({
        data: {
          productId,
          type: operation === 'SET' ? 'ADJUSTMENT' : (change > 0 ? 'IN' : 'OUT'),
          quantity: Math.abs(change),
          reference: reason || 'Manuel',
        },
      })

      productName = product.name
    }
  })

  try {
    const session = await getSession()
    if (session && change !== 0) {
      const { logEntityUpdate } = await import('@/lib/audit')
      await logEntityUpdate(
        'STOCK_ADJUSTED',
        'STOCK',
        entityId,
        session as any,
        { stock: oldStock },
        {
          stock: newStock,
          change,
          operation,
          type,
          reason: reason || 'Manuel',
          productName,
          ...(variantId && { productVariantId: variantId }),
        }
      )
    }
  } catch (auditError) {
    console.error('Failed to log stock adjustment:', auditError)
  }

  revalidatePath('/admin/stock')
  revalidatePath(`/admin/stock/${productId}`)
}

/** Unité de stock pour la liste admin : produit seul ou variante */
export type StockUnit = {
  type: 'product' | 'variant'
  productId: string
  variantId?: string
  sku: string
  name: string
  stock: number
  minStock: number
}

/**
 * Retourne toutes les unités de stock pour l'admin : une ligne par produit (sans variantes)
 * ou une ligne par variante (produits avec variantes). Tri : Type (Produits puis Variantes), puis nom.
 */
export async function getStockUnits(): Promise<{ units: StockUnit[]; error?: string }> {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
    return { units: [], error: 'Non autorisé' }
  }
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { variants: true },
    })
    const units: StockUnit[] = []
    for (const product of products) {
      if (product.variants && product.variants.length > 0) {
        for (const v of product.variants) {
          units.push({
            type: 'variant',
            productId: product.id,
            variantId: v.id,
            sku: v.sku,
            name: `${product.name} – ${v.name || v.sku}`,
            stock: v.stock,
            minStock: v.minStock,
          })
        }
      } else {
        units.push({
          type: 'product',
          productId: product.id,
          sku: product.sku || '-',
          name: product.name,
          stock: product.stock,
          minStock: product.minStock,
        })
      }
    }
    units.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'product' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return { units }
  } catch (e) {
    console.error('getStockUnits:', e)
    return { units: [], error: 'Impossible de charger les unités de stock.' }
  }
}
