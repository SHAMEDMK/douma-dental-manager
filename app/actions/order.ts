'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPriceForSegment } from '../lib/pricing'
import { getNextOrderNumber, getNextInvoiceNumber } from '../lib/sequence'

export async function createOrderAction(items: { productId: string; quantity: number }[]) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  if (items.length === 0) return { error: 'Panier vide' }

  // Get user segment for pricing (with safe fallback)
  let segment = 'LABO' // Default fallback
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { segment: true }
    })
    segment = user?.segment || 'LABO'
  } catch (error) {
    // If segment field doesn't exist yet, fallback to LABO
    console.warn('Segment field not available, using LABO default')
    segment = 'LABO'
  }

  // Start transaction
  try {
    const order = await prisma.$transaction(async (tx) => {
      let total = 0
      const now = new Date()

      // Verify stock, calculate total, and prepare items
      const orderItemsData = []
      
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) throw new Error(`Produit introuvable: ${item.productId}`)
        
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name}`)
        }

        // Use segment-based pricing
        const unitPrice = getPriceForSegment(product, segment as any)
        total += unitPrice * item.quantity
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtTime: unitPrice
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

      // Generate sequential order number (with fallback if DailySequence not available)
      let orderNumber: string | null = null
      try {
        orderNumber = await getNextOrderNumber(tx, now)
      } catch (error: any) {
        // If DailySequence table doesn't exist yet, use fallback format
        console.warn('Failed to generate sequential order number, using fallback:', error.message)
        // Fallback: use legacy format based on order ID (will be set after creation)
        orderNumber = null
      }

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId: session.id as string,
          orderNumber,
          total,
          status: 'CONFIRMED',
          items: {
            create: orderItemsData
          }
        },
        include: { items: true }
      })
      
      // If orderNumber is null, set a fallback (legacy format)
      if (!orderNumber) {
        const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
        const fallbackNumber = `CMD-${dateKey}-${newOrder.id.slice(-4).toUpperCase()}`
        await tx.order.update({
          where: { id: newOrder.id },
          data: { orderNumber: fallbackNumber }
        })
        orderNumber = fallbackNumber
      }
      
      // Update movement reference with Order ID
      // Note: We can't easily update the movements created above with the newOrder ID in a single pass 
      // unless we create them AFTER the order or use a connect. 
      // For now, "Commande" reference is okay, or we could update them here.
      // Better approach: Create movements after order so we can use order ID in reference.
      
      // Let's rely on the generic "Commande" reference or update logic later if needed.

      // Generate sequential invoice number (with fallback if DailySequence not available)
      let invoiceNumber: string | null = null
      try {
        invoiceNumber = await getNextInvoiceNumber(tx, now)
      } catch (error: any) {
        // If DailySequence table doesn't exist yet, use fallback format
        console.warn('Failed to generate sequential invoice number, using fallback:', error.message)
        // Fallback: use legacy format based on invoice ID (will be set after creation)
        invoiceNumber = null
      }

      // Create Invoice (Unpaid / À encaisser)
      const newInvoice = await tx.invoice.create({
        data: {
          orderId: newOrder.id,
          invoiceNumber,
          amount: total,
          balance: total,
          status: 'UNPAID',
        }
      })

      // If invoiceNumber is null, set a fallback (legacy format)
      if (!invoiceNumber) {
        const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
        const fallbackNumber = `INV-${dateKey}-${newInvoice.id.slice(-4).toUpperCase()}`
        await tx.invoice.update({
          where: { id: newInvoice.id },
          data: { invoiceNumber: fallbackNumber }
        })
      }

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
