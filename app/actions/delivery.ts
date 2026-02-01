'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { isValidDeliveryCode } from '@/app/lib/delivery-code'
import { getInvoiceNumberFromOrderNumber } from '@/app/lib/sequence'
import { logStatusChange } from '@/lib/audit'

/**
 * Assign an order to the current delivery agent
 */
export async function assignOrderToMeAction(orderId: string) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      return { error: 'Non autorisé' }
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        deliveryAgentName: true
      }
    })

    if (!order) {
      return { error: 'Commande introuvable' }
    }

    if (order.status !== 'SHIPPED') {
      return { error: 'Seules les commandes expédiées peuvent être assignées' }
    }

    // Check if already assigned to someone else
    if (order.deliveryAgentName && order.deliveryAgentName !== session.name && order.deliveryAgentName !== session.email) {
      return { error: `Cette commande est déjà assignée à ${order.deliveryAgentName}` }
    }

    // Assign to current user
    await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryAgentName: session.name || session.email,
        updatedBy: session.id
      }
    })

    revalidatePath('/delivery')
    revalidatePath(`/admin/orders/${orderId}`)

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'assignation de la commande' }
  }
}

/**
 * Confirm delivery using confirmation code
 * Accessible by MAGASINIER role (delivery agents)
 */
export async function confirmDeliveryWithCodeAction(
  orderId: string,
  confirmationCode: string,
  deliveredToName: string,
  deliveryProofNote?: string
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      return { error: 'Non autorisé' }
    }

    // Validate code format
    if (!isValidDeliveryCode(confirmationCode)) {
      return { error: 'Le code de confirmation doit être composé de 6 chiffres' }
    }

    // Validate deliveredToName
    if (!deliveredToName || deliveredToName.trim() === '') {
      return { error: 'Le nom de la personne qui a reçu est obligatoire' }
    }

    // Get order with confirmation code
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        deliveryConfirmationCode: true,
        total: true,
        orderNumber: true,
        createdAt: true,
        deliveryAgentName: true
      }
    })

    if (!order) {
      return { error: 'Commande introuvable' }
    }

    // Validate order status
    if (order.status !== 'SHIPPED') {
      return { error: 'Seules les commandes expédiées peuvent être livrées' }
    }

    // Check if order is assigned to this agent (optional check, but good for security)
    if (order.deliveryAgentName && 
        order.deliveryAgentName !== session.name && 
        order.deliveryAgentName !== session.email) {
      return { error: 'Cette commande est assignée à un autre livreur' }
    }

    // Validate confirmation code
    if (!order.deliveryConfirmationCode) {
      return { error: 'Aucun code de confirmation généré pour cette commande' }
    }

    if (order.deliveryConfirmationCode !== confirmationCode) {
      return { error: 'Code de confirmation incorrect' }
    }

    // All validations passed - confirm delivery
    // Use extended timeout for transaction (10 seconds)
    let invoiceNumber: string | null = null
    const result = await prisma.$transaction(async (tx) => {
      // Check if invoice already exists
      const existingInvoice = await tx.invoice.findUnique({
        where: { orderId: orderId }
      })

      if (!existingInvoice) {
        // Generate invoice number from order number
        invoiceNumber = getInvoiceNumberFromOrderNumber(order.orderNumber, order.createdAt)

        // Create Invoice (Unpaid / À encaisser)
        await tx.invoice.create({
          data: {
            orderId: orderId,
            invoiceNumber,
            amount: order.total,
            balance: order.total,
            status: 'UNPAID',
          }
        })
      }

      // Update order status to DELIVERED
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveredToName,
          deliveryProofNote: deliveryProofNote ?? null,
          deliveredAt: new Date(),
          updatedBy: session.id
        }
      })

      return { invoiceCreated: !existingInvoice, invoiceNumber }
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot
      timeout: 10000, // Maximum time the transaction can run
    })

    // Log audit events outside transaction (non-critical)
    try {
      if (result.invoiceCreated && invoiceNumber) {
        const { logEntityCreation } = await import('@/lib/audit')
        await logEntityCreation(
          'INVOICE_CREATED',
          'INVOICE',
          orderId,
          session as any,
          { invoiceNumber, amount: order.total }
        )
      }
    } catch (auditError) {
      console.error('Failed to log invoice creation:', auditError)
    }

    try {
      await logStatusChange(
        'ORDER_STATUS_CHANGED',
        'ORDER',
        orderId,
        'SHIPPED',
        'DELIVERED',
        session as any,
        { confirmationCode, deliveredToName }
      )
    } catch (auditError) {
      console.error('Failed to log status change:', auditError)
    }

    revalidatePath('/delivery')
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/magasinier/orders')
    revalidatePath(`/magasinier/orders/${orderId}`)
    revalidatePath('/portal/orders')

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la confirmation de livraison' }
  }
}
