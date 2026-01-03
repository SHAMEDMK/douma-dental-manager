'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import type { Prisma } from '@prisma/client'

const VALID_ORDER_STATUSES = ['CONFIRMED', 'PREPARED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const ADMIN_ROLES = ['ADMIN', 'COMPTABLE', 'MAGASINIER']

// Define valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  'CONFIRMED': ['PREPARED', 'CANCELLED'],
  'PREPARED': ['SHIPPED', 'CANCELLED'],
  'SHIPPED': ['DELIVERED'],
  'DELIVERED': [], // Final state - no transitions allowed
  'CANCELLED': [], // Final state - no transitions allowed
}

function isValidTransition(currentStatus: string, newStatus: string): boolean {
  // Same status is always valid (no-op)
  if (currentStatus === newStatus) return true
  
  // Check if transition is allowed
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []
  return allowedTransitions.includes(newStatus)
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const session = await getSession()
    if (!session || !ADMIN_ROLES.includes(session.role)) {
      return { error: 'Non autorisé' }
    }

    // Validate status
    if (!VALID_ORDER_STATUSES.includes(status)) {
      return { error: 'Statut invalide' }
    }

    // Verify order exists and get current status
    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { items: true, invoice: true }
    })
    
    if (!order) {
      return { error: 'Commande introuvable' }
    }

    // Prevent actions on final states
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return { error: `Impossible de modifier une commande ${order.status === 'DELIVERED' ? 'livrée' : 'annulée'}` }
    }

    // Validate transition
    if (!isValidTransition(order.status, status)) {
      const currentStatusLabel = {
        'CONFIRMED': 'confirmée',
        'PREPARED': 'préparée',
        'SHIPPED': 'expédiée',
        'DELIVERED': 'livrée',
        'CANCELLED': 'annulée'
      }[order.status] || order.status.toLowerCase()
      
      return { error: `Transition invalide: impossible de passer de "${currentStatusLabel}" à "${status}"` }
    }

    // Handle cancellation - release stock
    if (status === 'CANCELLED') {
      // Check if invoice is paid
      if (order.invoice && order.invoice.status === 'PAID') {
        return { error: 'Impossible d\'annuler une commande déjà payée' }
      }

      await prisma.$transaction(async (tx) => {
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
            }
          })
        }

        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' }
        })
      })
    } else {
      // Regular status update
      const now = new Date()
      const updateData: Prisma.OrderUpdateInput = { status }
      if (status === 'SHIPPED' && !order.shippedAt) {
        updateData.shippedAt = now
      }
      if (status === 'DELIVERED' && !order.deliveredAt) {
        updateData.deliveredAt = now
      }

      await prisma.order.update({
        where: { id: orderId },
        data: updateData,
      })
    }
    
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du statut' }
  }
}

type UpdateOrderDeliveryInfoInput = {
  deliveryCity?: string | null
  deliveryAddress?: string | null
  deliveryPhone?: string | null
  deliveryNote?: string | null
  deliveryAgentName?: string | null
  deliveredToName?: string | null
  deliveryProofNote?: string | null
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function updateOrderDeliveryInfo(orderId: string, input: UpdateOrderDeliveryInfoInput) {
  try {
    const session = await getSession()
    if (!session || !ADMIN_ROLES.includes(session.role)) {
      return { error: 'Non autorisé' }
    }

    if (!orderId) {
      return { error: 'Commande introuvable' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryCity: normalizeOptionalString(input.deliveryCity),
        deliveryAddress: normalizeOptionalString(input.deliveryAddress),
        deliveryPhone: normalizeOptionalString(input.deliveryPhone),
        deliveryNote: normalizeOptionalString(input.deliveryNote),
        deliveryAgentName: normalizeOptionalString(input.deliveryAgentName),
        deliveredToName: normalizeOptionalString(input.deliveredToName),
        deliveryProofNote: normalizeOptionalString(input.deliveryProofNote),
      },
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true }
  } catch (error: unknown) {
    return {
      error:
        error instanceof Error ? error.message : 'Erreur lors de la mise à jour des informations de livraison',
    }
  }
}

export async function markInvoicePaid(invoiceId: string, paymentMethod: string, reference: string, amount: number) {
  try {
    const session = await getSession()
    if (!session || !ADMIN_ROLES.includes(session.role)) {
      return { error: 'Non autorisé' }
    }

    // Validate inputs
    if (!invoiceId || !paymentMethod || amount <= 0) {
      return { error: 'Données invalides' }
    }

    if (!['CASH', 'CHECK', 'TRANSFER'].includes(paymentMethod)) {
      return { error: 'Méthode de paiement invalide' }
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) {
      return { error: 'Facture introuvable' }
    }

    // Validate amount doesn't exceed balance (with small tolerance for float precision)
    if (amount > invoice.balance + 0.01) {
      return { error: `Le montant (${amount.toFixed(2)} €) dépasse le solde restant (${invoice.balance.toFixed(2)} €). Paiement impossible.` }
    }

    // Calculate new balance and determine status
    const newBalance = Math.max(0, invoice.balance - amount) // Ensure non-negative
    // Status determination:
    // - If balance <= 0.01: PAID (fully paid)
    // - If balance > 0.01 and payments exist: PARTIAL
    // - If balance = amount and no payments: UNPAID (shouldn't happen after payment, but handle it)
    const status = newBalance <= 0.01 ? 'PAID' : 'PARTIAL'

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId,
          amount,
          method: paymentMethod,
          reference: reference || null,
        }
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { 
          status,
          balance: newBalance < 0 ? 0 : newBalance,
          paidAt: status === 'PAID' ? new Date() : undefined
        }
      }),
      // Update order status to DELIVERED only if fully paid
      ...(status === 'PAID' ? [
          prisma.order.update({
            where: { id: invoice.orderId },
            data: { status: 'DELIVERED' }
          }),
          // Stamp deliveredAt if not already set
          prisma.order.updateMany({
            where: { id: invoice.orderId, deliveredAt: null },
            data: { deliveredAt: new Date() }
          }),
      ] : [])
    ])
    
    revalidatePath('/admin/invoices')
    revalidatePath('/admin/orders')
    revalidatePath('/admin/payments')
    revalidatePath(`/admin/invoices/${invoiceId}`)
    // Also revalidate order detail page if it exists
    if (invoice.orderId) {
      revalidatePath(`/admin/orders/${invoice.orderId}`)
    }
    return { success: true }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du paiement' }
  }
}
