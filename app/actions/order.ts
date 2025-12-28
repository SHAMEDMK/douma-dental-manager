'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function createOrderAction(items: { productId: string; quantity: number }[]) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  if (items.length === 0) return { error: 'Panier vide' }

  // Start transaction
  try {
    const order = await prisma.$transaction(async (tx) => {
      let total = 0

      // Verify stock, calculate total, and prepare items
      const orderItemsData = []
      
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) throw new Error(`Produit introuvable: ${item.productId}`)
        
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name}`)
        }

        total += product.price * item.quantity
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtTime: product.price
        })

        // Reserve stock and create movement
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            reference: `Commande`,
            createdBy: session.id as string
          }
        })
      }

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId: session.id as string,
          total,
          status: 'CONFIRMED',
          items: {
            create: orderItemsData
          }
        },
        include: { items: true }
      })
      
      // Update movement reference with Order ID
      // Note: We can't easily update the movements created above with the newOrder ID in a single pass 
      // unless we create them AFTER the order or use a connect. 
      // For now, "Commande" reference is okay, or we could update them here.
      // Better approach: Create movements after order so we can use order ID in reference.
      
      // Let's rely on the generic "Commande" reference or update logic later if needed.

      // Create Invoice (Unpaid / À encaisser)
      await tx.invoice.create({
        data: {
          orderId: newOrder.id,
          amount: total,
          balance: total,
          status: 'UNPAID',
        }
      })

      return newOrder
    })

    return { success: true, orderId: order.id }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la commande' }
  }
}

export async function cancelOrderAction(orderId: string) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Fetch order with items and invoice
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          invoice: true
        }
      })

      if (!order) {
        throw new Error('Commande introuvable')
      }

      // Check if order belongs to user
      if (order.userId !== session.id) {
        throw new Error('Non autorisé')
      }

      // Check if order is cancellable
      // Rule: Can cancel if status is CONFIRMED or PREPARED, and not already paid
      const isCancellable = 
        (order.status === 'CONFIRMED' || order.status === 'PREPARED') &&
        order.invoice?.status !== 'PAID'

      if (!isCancellable) {
        throw new Error('Cette commande ne peut pas être annulée')
      }

      // Release stock for each item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })

        // Create stock movement to record the return
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'IN',
            quantity: item.quantity,
            reference: `Annulation commande ${orderId.slice(-6)}`,
            createdBy: session.id as string
          }
        })
      }

      // Update order status to CANCELLED
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      })

      return order
    })

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'annulation' }
  }
}
