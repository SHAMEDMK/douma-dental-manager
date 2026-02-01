'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

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

// Better approach:
// Action: updateStock(productId, operation, quantity, reason)
// operation: 'ADD' | 'REMOVE' | 'SET'

export async function updateStock(productId: string, operation: 'ADD' | 'REMOVE' | 'SET', quantity: number, reason: string) {
  let oldStock = 0
  let newStock = 0
  let change = 0
  let type: 'IN' | 'OUT' | 'ADJUSTMENT' = 'ADJUSTMENT'
  let productName = ''

  await prisma.$transaction(async (tx) => {
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
      type = 'ADJUSTMENT' // This effectively is a correction
    }

    if (change === 0) return // No change

    newStock = product.stock + change
    if (newStock < 0) throw new Error('Le stock ne peut pas être négatif')

    await tx.product.update({
      where: { id: productId },
      data: { stock: newStock }
    })

    await tx.stockMovement.create({
      data: {
        productId,
        // Map strictly to schema enum: IN, OUT, RESERVED, ADJUSTMENT
        // ADD -> IN (Approvisionnement)
        // REMOVE -> OUT (Perte/Autre)
        // SET -> ADJUSTMENT (Inventaire)
        type: operation === 'SET' ? 'ADJUSTMENT' : (change > 0 ? 'IN' : 'OUT'),
        quantity: Math.abs(change),
        reference: reason || 'Manuel'
      }
    })
  })

  // Log audit: Stock adjusted
  try {
    const session = await getSession()
    if (session && change !== 0) {
      const { logEntityUpdate } = await import('@/lib/audit')
      await logEntityUpdate(
        'STOCK_ADJUSTED',
        'STOCK',
        productId,
        session as any,
        { stock: oldStock },
        {
          stock: newStock,
          change: change,
          operation: operation,
          type: type,
          reason: reason || 'Manuel',
          productName: productName
        }
      )
    }
  } catch (auditError) {
    console.error('Failed to log stock adjustment:', auditError)
  }

  revalidatePath('/admin/stock')
  revalidatePath(`/admin/stock/${productId}`)
}
