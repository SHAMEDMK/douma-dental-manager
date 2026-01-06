'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { getNextDeliveryNoteNumber } from '@/app/lib/sequence'

const VALID_ORDER_STATUSES = ['CONFIRMED', 'PREPARED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

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
    // Validate status
    if (!VALID_ORDER_STATUSES.includes(status)) {
      return { error: 'Statut invalide' }
    }

    // Get admin settings
    let adminSettings
    try {
      adminSettings = await prisma.adminSettings.findUnique({
        where: { id: 'default' }
      })
    } catch (error) {
      console.warn('AdminSettings table not available, using defaults')
      adminSettings = null
    }

    // Default settings if not found
    const defaultSettings = {
      blockWorkflowUntilApproved: true,
      approvalMessage: 'Commande à valider (marge anormale)'
    }
    const s = adminSettings || defaultSettings

    // Verify order exists and get current status
    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        userId: true,
        deliveryNoteNumber: true,
        items: true,
        invoice: true
      }
    })
    
    if (!order) {
      return { error: 'Commande introuvable' }
    }

    // Prevent actions on final states
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return { error: `Impossible de modifier une commande ${order.status === 'DELIVERED' ? 'livrée' : 'annulée'}` }
    }

    // Block workflow transitions if blockWorkflowUntilApproved is enabled and order requires approval
    // Allow CANCELLED even if requiresAdminApproval (admin can still cancel)
    const targetStatusRequiresApproval = ['PREPARED', 'SHIPPED', 'DELIVERED'].includes(status)
    if (s.blockWorkflowUntilApproved && order.requiresAdminApproval && targetStatusRequiresApproval) {
      const errorMessage = s.approvalMessage || 'Commande bloquée: validation requise (marge anormale).'
      return { error: errorMessage }
    }

    // Block DELIVERED - must use specialized action (deliverOrderAction)
    if (status === 'DELIVERED') {
      return { error: 'Pour livrer une commande, utilisez l\'action spécialisée (modal)' }
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

        // IMPORTANT: Reduce user.balance by order.total (because order creation incremented it)
        // This ensures the credit limit calculation is correct after cancellation
        await tx.user.update({
          where: { id: order.userId },
          data: {
            balance: {
              decrement: order.total
            }
          }
        })

        // Update invoice status if it exists and is not paid
        // Note: If invoice has partial payments, we keep them but mark as CANCELLED
        if (order.invoice && order.invoice.status !== 'PAID') {
          await tx.invoice.update({
            where: { id: order.invoice.id },
            data: {
              status: 'CANCELLED',
              balance: 0 // Reset balance since order is cancelled
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
      // If status is PREPARED, generate deliveryNoteNumber if not already exists (transition CONFIRMED -> PREPARED)
      if (status === 'PREPARED') {
        await prisma.$transaction(async (tx) => {
          // Generate deliveryNoteNumber if not already exists
          if (!order.deliveryNoteNumber) {
            const blNumber = await getNextDeliveryNoteNumber(tx, new Date())
            await tx.order.update({
              where: { id: orderId },
              data: {
                status,
                deliveryNoteNumber: blNumber
              }
            })
          } else {
            // Update order status only (deliveryNoteNumber already exists)
            await tx.order.update({
              where: { id: orderId },
              data: { status }
            })
          }
        })
      } else {
        // Regular status update (not PREPARED)
        await prisma.order.update({
          where: { id: orderId },
          data: { status },
        })
      }
    }
    
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la mise à jour du statut' }
  }
}

export async function approveOrderAction(orderId: string) {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return { error: 'Non autorisé' }
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return { error: 'Commande introuvable' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { requiresAdminApproval: false }
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'approbation' }
  }
}

export async function updateDeliveryInfoAction(
  orderId: string,
  data: {
    deliveryCity?: string | null
    deliveryAddress?: string | null
    deliveryPhone?: string | null
    deliveryNote?: string | null
  }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      return { error: 'Non autorisé' }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true }
    })

    if (!order) {
      return { error: 'Commande introuvable' }
    }

    // Autoriser modification seulement si commande pas DELIVERED
    if (order.status === 'DELIVERED') {
      return { error: 'Impossible de modifier les informations de livraison d\'une commande déjà livrée' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryCity: data.deliveryCity ?? null,
        deliveryAddress: data.deliveryAddress ?? null,
        deliveryPhone: data.deliveryPhone ?? null,
        deliveryNote: data.deliveryNote ?? null,
      }
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la mise à jour' }
  }
}

export async function updateDeliveryInfo(
  orderId: string,
  data: {
    deliveryCity?: string | null
    deliveryAddress?: string | null
    deliveryPhone?: string | null
    deliveryNote?: string | null
  }
) {
  return updateDeliveryInfoAction(orderId, data)
}

export async function markOrderShippedAction(
  orderId: string,
  payload: {
    deliveryAgentName: string
    shippedAt?: string
  }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      return { error: 'Non autorisé' }
    }

    // Validation: deliveryAgentName obligatoire
    if (!payload.deliveryAgentName || payload.deliveryAgentName.trim() === '') {
      return { error: 'Le nom du livreur est obligatoire' }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        status: true,
        deliveryNoteNumber: true
      }
    })

    if (!order) {
      return { error: 'Commande introuvable' }
    }

    // Validation: status doit être PREPARED
    if (order.status !== 'PREPARED') {
      return { error: 'Seules les commandes préparées peuvent être expédiées' }
    }

    // Parse shippedAt si fourni, sinon utiliser maintenant
    const shippedAtDate = payload.shippedAt ? new Date(payload.shippedAt) : new Date()

    // Update order status (deliveryNoteNumber should already exist from PREPARED transition)
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        deliveryAgentName: payload.deliveryAgentName,
        shippedAt: shippedAtDate,
      }
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'expédition de la commande' }
  }
}

export async function deliverOrderAction(
  orderId: string,
  deliveredToName: string,
  deliveryProofNote?: string | null
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      return { error: 'Non autorisé' }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true }
    })

    if (!order) {
      return { error: 'Commande introuvable' }
    }

    if (order.status !== 'SHIPPED') {
      return { error: 'Seules les commandes expédiées peuvent être livrées' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredToName,
        deliveryProofNote: deliveryProofNote ?? null,
        deliveredAt: new Date(),
      }
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la livraison de la commande' }
  }
}

export async function markOrderDeliveredAction(
  orderId: string,
  payload: {
    deliveredToName: string
    deliveryProofNote?: string
    deliveredAt?: string
  }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      return { error: 'Non autorisé' }
    }

    // Validation: deliveredToName obligatoire
    if (!payload.deliveredToName || payload.deliveredToName.trim() === '') {
      return { error: 'Le nom de la personne qui a reçu la commande est obligatoire' }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true }
    })

    if (!order) {
      return { error: 'Commande introuvable' }
    }

    // Validation: status doit être SHIPPED
    if (order.status !== 'SHIPPED') {
      return { error: 'Seules les commandes expédiées peuvent être livrées' }
    }

    // Parse deliveredAt si fourni, sinon utiliser maintenant
    const deliveredAtDate = payload.deliveredAt ? new Date(payload.deliveredAt) : new Date()

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredToName: payload.deliveredToName,
        deliveryProofNote: payload.deliveryProofNote ?? null,
        deliveredAt: deliveredAtDate,
      }
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la livraison de la commande' }
  }
}

export async function markInvoicePaid(
  invoiceId: string,
  paymentMethod: string,
  reference: string | null,
  amount: number
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPTABLE')) {
      return { error: 'Non autorisé' }
    }

    if (!paymentMethod || !['CASH', 'CHECK', 'TRANSFER', 'COD'].includes(paymentMethod)) {
      return { error: 'Méthode de paiement invalide' }
    }

    if (!amount || amount <= 0) {
      return { error: 'Le montant doit être supérieur à 0' }
    }

    // Fetch invoice with payments, order, and user
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: {
          select: { amount: true }
        },
        order: {
          select: { userId: true }
        }
      }
    })

    if (!invoice) {
      return { error: 'Facture introuvable' }
    }

    // Calculate totalPaid BEFORE new payment
    const totalPaidBefore = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = invoice.amount - totalPaidBefore

    // Validate: amount cannot exceed remaining
    if (amount > remaining + 0.01) { // Small tolerance for floating point
      return { error: `Le montant (${amount.toFixed(2)} €) dépasse le solde restant (${remaining.toFixed(2)} €)` }
    }

    // Fetch user to get balance
    const user = await prisma.user.findUnique({
      where: { id: invoice.order.userId },
      select: { balance: true }
    })

    if (!user) {
      return { error: 'Utilisateur introuvable' }
    }

    // Transaction: create payment, update invoice status and balance, update user balance
    await prisma.$transaction(async (tx) => {
      // Create payment
      await tx.payment.create({
        data: {
          invoiceId,
          amount,
          method: paymentMethod,
          reference: reference || null,
        }
      })

      // Re-fetch payments to recalculate totalPaidAfter
      const allPayments = await tx.payment.findMany({
        where: { invoiceId },
        select: { amount: true }
      })

      const totalPaidAfter = allPayments.reduce((sum, p) => sum + p.amount, 0)

      // Determine invoice status based on totalPaidAfter
      let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID'
      if (totalPaidAfter >= invoice.amount - 0.01) { // Small tolerance
        newStatus = 'PAID'
      } else if (totalPaidAfter > 0.01) {
        newStatus = 'PARTIAL'
      }

      // Update invoice status and balance
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          balance: Math.max(0, invoice.amount - totalPaidAfter),
          paidAt: newStatus === 'PAID' ? new Date() : undefined,
        }
      })

      // Update user balance (decrease by paid amount - balance = credit used)
      await tx.user.update({
        where: { id: invoice.order.userId },
        data: {
          balance: Math.max(0, user.balance - amount)
        }
      })

      // If invoice is fully paid, update order status to DELIVERED
      if (newStatus === 'PAID') {
        await tx.order.update({
          where: { id: invoice.orderId },
          data: { status: 'DELIVERED' }
        })
      }
    })

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${invoiceId}`)
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${invoice.orderId}`)
    revalidatePath('/admin/payments')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'enregistrement du paiement' }
  }
}

/**
 * Create a delivery note (BL) for an order
 * Rules:
 * - Only if status is PREPARED
 * - Not if CANCELLED
 * - No duplicate if already has deliveryNoteDoc
 * - Refuses if invoice is paid (optional rule)
 */
export async function createDeliveryNoteAction(orderId: string) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      return { error: 'Non autorisé' }
    }

    // Load order with items and invoice
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        deliveryNoteNumber: true,
        items: true,
        invoice: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    if (!order) {
      return { error: 'Commande introuvable' }
    }

    // Not if CANCELLED
    if (order.status === 'CANCELLED') {
      return { error: 'Impossible de créer un bon de livraison pour une commande annulée' }
    }

    // Only if PREPARED
    if (order.status !== 'PREPARED') {
      return { error: 'Le bon de livraison ne peut être créé que pour une commande préparée' }
    }

    // Refuse if invoice is paid (optional rule)
    if (order.invoice && order.invoice.status === 'PAID') {
      return { error: 'Impossible de créer un bon de livraison pour une commande déjà payée' }
    }

    // No duplicate if already has deliveryNoteNumber
    if (order.deliveryNoteNumber) {
      return { error: 'Un bon de livraison existe déjà pour cette commande' }
    }

    // Create DeliveryNote and update deliveryNoteNumber in transaction
    const deliveryNote = await prisma.$transaction(async (tx) => {
      const number = await getNextDeliveryNoteNumber(tx, new Date())
      const note = await tx.deliveryNote.create({
        data: {
          number,
          orderId
        }
      })
      // Also update deliveryNoteNumber on Order for consistency
      await tx.order.update({
        where: { id: orderId },
        data: { deliveryNoteNumber: number }
      })
      return note
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true, deliveryNoteNumber: deliveryNote.number }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la création du bon de livraison' }
  }
}

/**
 * Generate a delivery note (BL) for an order
 * Rules:
 * - Only if status is PREPARED or SHIPPED
 * - Not if CANCELLED
 * - No duplicate if already has deliveryNoteDoc
 */
export async function generateDeliveryNoteAction(orderId: string) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      return { error: 'Non autorisé' }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        status: true, 
        deliveryNoteNumber: true 
      }
    })

    if (!order) {
      return { error: 'Commande introuvable' }
    }

    // Not if CANCELLED
    if (order.status === 'CANCELLED') {
      return { error: 'Impossible de générer un bon de livraison pour une commande annulée' }
    }

    // Only if PREPARED or SHIPPED
    if (order.status !== 'PREPARED' && order.status !== 'SHIPPED') {
      return { error: 'Le bon de livraison ne peut être généré que pour une commande préparée ou expédiée' }
    }

    // No duplicate if already has deliveryNoteNumber
    if (order.deliveryNoteNumber) {
      return { error: 'Un bon de livraison existe déjà pour cette commande' }
    }

    // Generate delivery note number and create DeliveryNote in transaction
    const deliveryNote = await prisma.$transaction(async (tx) => {
      const number = await getNextDeliveryNoteNumber(tx, new Date())
      const note = await tx.deliveryNote.create({
        data: {
          number,
          orderId
        }
      })
      // Also update deliveryNoteNumber on Order for consistency
      await tx.order.update({
        where: { id: orderId },
        data: { deliveryNoteNumber: number }
      })
      return note
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    return { success: true, deliveryNoteNumber: deliveryNote.number }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la génération du bon de livraison' }
  }
}
