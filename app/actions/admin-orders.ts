'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { getNextDeliveryNoteNumber, getDeliveryNoteNumberFromOrderNumber, getInvoiceNumberFromOrderNumber } from '@/app/lib/sequence'
import { isDeliveryNoteNumberAlreadyAssigned, NUMBER_ALREADY_ASSIGNED_ERROR } from '@/app/lib/invoice-lock'
import { calculateInvoiceRemaining, calculateInvoiceStatusWithPayments, calculateTotalPaid } from '@/app/lib/invoice-utils'

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
    // G3: Get session for audit
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      return { error: 'Non autorisé' }
    }

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
        orderNumber: true,
        createdAt: true,
        deliveryNoteNumber: true,
        requiresAdminApproval: true,
        total: true,
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

        // G3: Update order status with audit (updatedBy)
        await tx.order.update({
          where: { id: orderId },
          data: { 
            status: 'CANCELLED',
            updatedBy: session.id // G3: Qui a modifié la commande
          }
        })
      })

      // Log audit: Order cancelled
      try {
        const { logStatusChange } = await import('@/lib/audit')
        await logStatusChange(
          'ORDER_CANCELLED',
          'ORDER',
          orderId,
          order.status,
          'CANCELLED',
          session as any,
          {
            orderNumber: order.orderNumber,
            invoiceId: order.invoice?.id,
            invoiceStatus: order.invoice?.status,
            stockReleased: order.items.length,
            balanceAdjusted: order.total,
          }
        )
      } catch (auditError) {
        console.error('Failed to log order cancellation:', auditError)
      }
    } else {
      // Regular status update
      // If status is PREPARED, generate deliveryNoteNumber if not already exists (transition CONFIRMED -> PREPARED)
      if (status === 'PREPARED') {
        await prisma.$transaction(async (tx) => {
          // SECURITY: Check if deliveryNoteNumber already exists - if so, do NOT regenerate
          if (isDeliveryNoteNumberAlreadyAssigned(order.deliveryNoteNumber)) {
            // Numéro BL déjà attribué - mettre à jour uniquement le statut
            // G3: Audit (session already fetched at function start)
            await tx.order.update({
              where: { id: orderId },
              data: { 
                status,
                updatedBy: session.id // G3: Qui a modifié la commande
              }
            })
          } else {
            // Générer le numéro BL basé sur le numéro de commande (même séquence)
            // Exemple: CMD-20260114-0029 -> BL-20260114-0029
            const blNumber = getDeliveryNoteNumberFromOrderNumber(order.orderNumber, order.createdAt)
            // G3: Audit (session already fetched at function start)
            await tx.order.update({
              where: { id: orderId },
              data: {
                status,
                deliveryNoteNumber: blNumber,
                updatedBy: session.id // G3: Qui a modifié la commande
              }
            })
          }
        })
      } else if (status === 'DELIVERED') {
        // When order is delivered, create invoice if it doesn't exist
        await prisma.$transaction(async (tx) => {
          // Check if invoice already exists
          const existingInvoice = await tx.invoice.findUnique({
            where: { orderId: orderId }
          })

          if (!existingInvoice) {
            // Generate invoice number from order number (same sequence)
            // Example: CMD-20260118-0049 -> FAC-20260118-0049
            const invoiceNumber = getInvoiceNumberFromOrderNumber(order.orderNumber, order.createdAt)

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

          // Update order status
          await tx.order.update({
            where: { id: orderId },
            data: { 
              status,
              updatedBy: session.id // G3: Qui a modifié la commande
            },
          })

          // Fetch invoice data for logging and email (if created)
          // This will be used after transaction commits
          const finalInvoice = await tx.invoice.findUnique({
            where: { orderId: orderId },
            select: { id: true, invoiceNumber: true, createdAt: true, amount: true, status: true }
          })

          // Log and email will be sent after transaction commits
        })

        // Log audit: Status changed to DELIVERED
        try {
          const { logStatusChange } = await import('@/lib/audit')
          await logStatusChange(
            'ORDER_STATUS_CHANGED',
            'ORDER',
            orderId,
            order.status,
            status,
            session as any,
            {
              orderNumber: order.orderNumber,
            }
          )
        } catch (auditError) {
          console.error('Failed to log status change:', auditError)
        }

        // Log audit: Invoice created (if created)
        try {
          const finalInvoice = await prisma.invoice.findUnique({
            where: { orderId: orderId },
            select: { id: true, invoiceNumber: true, amount: true, status: true }
          })

          if (finalInvoice) {
            const { logEntityCreation } = await import('@/lib/audit')
            await logEntityCreation(
              'INVOICE_CREATED',
              'INVOICE',
              finalInvoice.id,
              session as any,
              {
                invoiceNumber: finalInvoice.invoiceNumber,
                amount: finalInvoice.amount,
                status: finalInvoice.status,
                orderId: orderId,
                orderNumber: order.orderNumber,
              }
            )
          }
        } catch (auditError) {
          console.error('Failed to log invoice creation:', auditError)
        }

        // Send invoice email after transaction (if invoice was created)
        try {
          const finalInvoice = await prisma.invoice.findUnique({
            where: { orderId: orderId },
            select: { id: true, invoiceNumber: true, createdAt: true, amount: true }
          })

          if (finalInvoice) {
            const orderWithUser = await prisma.order.findUnique({
              where: { id: orderId },
              select: {
                orderNumber: true,
                user: {
                  select: { email: true, name: true, companyName: true }
                }
              }
            })

            if (orderWithUser?.user.email) {
              const { sendInvoiceEmail } = await import('@/lib/email')
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
              
              await sendInvoiceEmail({
                to: orderWithUser.user.email,
                invoiceNumber: finalInvoice.invoiceNumber || `FAC-${finalInvoice.id.slice(-8)}`,
                invoiceDate: finalInvoice.createdAt,
                amount: finalInvoice.amount,
                clientName: orderWithUser.user.companyName || orderWithUser.user.name,
                orderNumber: orderWithUser.orderNumber || `CMD-${orderId.slice(-8)}`,
                invoiceLink: `${baseUrl}/portal/invoices/${finalInvoice.id}`,
                pdfLink: `${baseUrl}/api/pdf/portal/invoices/${finalInvoice.id}`,
              })
            }
          }
        } catch (emailError) {
          console.error('Error sending invoice email:', emailError)
        }
      } else if (status === 'SHIPPED') {
        // Special handling for SHIPPED: require deliveryAgentName
        // If deliveryAgentName is not set, this should use markOrderShippedAction instead
        // But for backward compatibility, we'll set a default if missing
        const currentOrder = await prisma.order.findUnique({
          where: { id: orderId },
          select: { deliveryAgentName: true }
        })
        
        // If deliveryAgentName is not set, we can't properly ship the order
        // This should not happen if using ShipOrderModal, but handle gracefully
        if (!currentOrder?.deliveryAgentName) {
          return { error: 'Impossible d\'expédier sans assigner un livreur. Utilisez le bouton "Expédier" qui ouvre un formulaire.' }
        }
        
        // G3: Update order status with shippedAt timestamp
        await prisma.order.update({
          where: { id: orderId },
          data: { 
            status,
            shippedAt: new Date(), // Set shippedAt when status changes to SHIPPED
            updatedBy: session.id // G3: Qui a modifié la commande
          },
        })
      } else {
        // Regular status update (not PREPARED, not DELIVERED, not SHIPPED)
        // G3: Audit (session already fetched at function start)
        await prisma.order.update({
          where: { id: orderId },
          data: { 
            status,
            updatedBy: session.id // G3: Qui a modifié la commande
          },
        })

        // Log audit: Status changed
        try {
          const { logStatusChange } = await import('@/lib/audit')
          await logStatusChange(
            'ORDER_STATUS_CHANGED',
            'ORDER',
            orderId,
            order.status,
            status,
            session as any,
            {
              orderNumber: order.orderNumber,
              ...(status === 'CANCELLED' ? { reason: 'Order cancelled by admin' } : {}),
            }
          )
        } catch (auditError) {
          console.error('Failed to log status change:', auditError)
        }

        // Send status update email (non-blocking)
        try {
          const orderWithUser = await prisma.order.findUnique({
            where: { id: orderId },
            select: {
              orderNumber: true,
              status: true,
              user: {
                select: { email: true, name: true, companyName: true }
              }
            }
          })

          if (orderWithUser?.user.email) {
            const { sendOrderStatusUpdateEmail } = await import('@/lib/email')
            
            const statusLabels: Record<string, string> = {
              'PREPARED': 'Préparée',
              'SHIPPED': 'Expédiée',
              'DELIVERED': 'Livrée',
              'CANCELLED': 'Annulée',
              'CONFIRMED': 'Confirmée',
            }

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            const orderLink = `${baseUrl}/portal/orders/${orderId}`

            await sendOrderStatusUpdateEmail({
              to: orderWithUser.user.email,
              orderNumber: orderWithUser.orderNumber || `CMD-${orderId.slice(-8)}`,
              status: orderWithUser.status,
              statusLabel: statusLabels[orderWithUser.status] || orderWithUser.status,
              clientName: orderWithUser.user.companyName || orderWithUser.user.name,
              orderLink,
            })
          }
        } catch (emailError) {
          console.error('Error sending status update email:', emailError)
        }
      }
    }
    
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/magasinier/orders') // Revalidate magasinier orders page
    revalidatePath(`/magasinier/orders/${orderId}`) // Revalidate magasinier order detail page
    // Also revalidate portal pages so invoice buttons appear for clients
    revalidatePath('/portal/orders')
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

    // Log audit: Order approved
    try {
      const { logStatusChange } = await import('@/lib/audit')
      await logStatusChange(
        'ORDER_APPROVED',
        'ORDER',
        orderId,
        'PENDING_APPROVAL',
        'APPROVED',
        session as any,
        {
          orderNumber: order.orderNumber,
          requiresAdminApproval: false,
          total: order.total
        }
      )
    } catch (auditError) {
      console.error('Failed to log order approval:', auditError)
    }

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/magasinier/orders')
    revalidatePath(`/magasinier/orders/${orderId}`)
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
    deliveryAgentId?: string // Optional: ID du livreur (plus fiable)
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

    // Generate delivery confirmation code
    const { generateDeliveryConfirmationCode } = await import('@/app/lib/delivery-code')
    const confirmationCode = generateDeliveryConfirmationCode()

    // G3: Update order status (deliveryNoteNumber should already exist from PREPARED transition)
    // Log what we're storing for debugging
    console.log('Storing delivery agent:', {
      orderId,
      deliveryAgentName: payload.deliveryAgentName.trim(),
      deliveryAgentId: payload.deliveryAgentId || '(null)'
    })
    
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        deliveryAgentName: payload.deliveryAgentName.trim(), // Required - assigned by admin (legacy, kept for display)
        deliveryAgentId: payload.deliveryAgentId || null, // ID du livreur (plus fiable pour la correspondance)
        shippedAt: shippedAtDate,
        deliveryConfirmationCode: confirmationCode, // Generate unique code for delivery confirmation
        updatedBy: session.id // G3: Qui a modifié la commande
      }
    })
    
    // Verify the update
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { deliveryAgentId: true, deliveryAgentName: true }
    })
    console.log('Order updated with:', {
      deliveryAgentId: updatedOrder?.deliveryAgentId || '(null)',
      deliveryAgentName: updatedOrder?.deliveryAgentName || '(null)'
    })

    // Log audit: Status changed to SHIPPED
    try {
      const { logStatusChange } = await import('@/lib/audit')
      await logStatusChange(
        'ORDER_STATUS_CHANGED',
        'ORDER',
        orderId,
        'PREPARED',
        'SHIPPED',
        session as any,
        {
          deliveryAgentName: payload.deliveryAgentName.trim(),
          confirmationCode
        }
      )
    } catch (auditError) {
      console.error('Failed to log status change:', auditError)
    }

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/magasinier/orders')
    revalidatePath(`/magasinier/orders/${orderId}`)
    revalidatePath('/delivery') // Notify delivery agents of new shipped order
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'expédition de la commande' }
  }
}

/**
 * Reassign a delivery agent to an already SHIPPED order
 */
export async function reassignDeliveryAgentAction(
  orderId: string,
  payload: {
    deliveryAgentName: string
    deliveryAgentId?: string
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
        deliveryAgentName: true,
        deliveryAgentId: true
      }
    })

    if (!order) {
      return { error: 'Commande introuvable' }
    }

    // Validation: status doit être SHIPPED (not yet delivered)
    if (order.status !== 'SHIPPED') {
      return { error: 'Seules les commandes expédiées (non livrées) peuvent être réassignées' }
    }

    // Log what we're storing for debugging
    console.log('Reassigning delivery agent:', {
      orderId,
      oldAgentName: order.deliveryAgentName || '(null)',
      oldAgentId: order.deliveryAgentId || '(null)',
      newAgentName: payload.deliveryAgentName.trim(),
      newAgentId: payload.deliveryAgentId || '(null)'
    })
    
    await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryAgentName: payload.deliveryAgentName.trim(),
        deliveryAgentId: payload.deliveryAgentId || null,
        updatedBy: session.id
      }
    })
    
    // Verify the update
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { deliveryAgentId: true, deliveryAgentName: true }
    })
    console.log('Order reassigned to:', {
      deliveryAgentId: updatedOrder?.deliveryAgentId || '(null)',
      deliveryAgentName: updatedOrder?.deliveryAgentName || '(null)'
    })

    // Log audit: Delivery agent reassigned
    try {
      const { createAuditLog } = await import('@/lib/audit')
      await createAuditLog({
        action: 'DELIVERY_AGENT_REASSIGNED',
        entityType: 'ORDER',
        entityId: orderId,
        details: {
          previousAgentId: order.deliveryAgentId ?? undefined,
          newAgentId: payload.deliveryAgentId ?? undefined,
          oldAgentName: order.deliveryAgentName ?? undefined,
          newAgentName: payload.deliveryAgentName.trim(),
        },
        userId: session.id,
        userEmail: session.email,
        userRole: session.role,
      })
    } catch (auditError) {
      console.error('Failed to log delivery agent reassignment:', auditError)
    }

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/delivery') // Notify delivery agents

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la réassignation du livreur' }
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

    // G3: Update order status with audit
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredToName,
        deliveryProofNote: deliveryProofNote ?? null,
        deliveredAt: new Date(),
        updatedBy: session.id // G3: Qui a modifié la commande
      }
    })

    // Log audit: Status changed to DELIVERED
    try {
      const { logStatusChange } = await import('@/lib/audit')
      await logStatusChange(
        'ORDER_STATUS_CHANGED',
        'ORDER',
        orderId,
        'SHIPPED',
        'DELIVERED',
        session as any,
        { deliveredToName, deliveryProofNote: deliveryProofNote ?? null }
      )
    } catch (auditError) {
      console.error('Failed to log status change:', auditError)
    }

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

    // When order is delivered, create invoice if it doesn't exist (same logic as updateOrderStatus)
    await prisma.$transaction(async (tx) => {
      // Get order data for invoice (need total, orderNumber, createdAt)
      const orderWithTotal = await tx.order.findUnique({
        where: { id: orderId },
        select: { total: true, orderNumber: true, createdAt: true }
      })

      if (!orderWithTotal) {
        throw new Error('Commande introuvable')
      }

      // Check if invoice already exists
      const existingInvoice = await tx.invoice.findUnique({
        where: { orderId: orderId }
      })

      if (!existingInvoice) {
        // Generate invoice number from order number (same sequence)
        // Example: CMD-20260118-0049 -> FAC-20260118-0049
        const invoiceNumber = getInvoiceNumberFromOrderNumber(orderWithTotal.orderNumber, orderWithTotal.createdAt)

        // Create Invoice (Unpaid / À encaisser)
        await tx.invoice.create({
          data: {
            orderId: orderId,
            invoiceNumber,
            amount: orderWithTotal.total,
            balance: orderWithTotal.total,
            status: 'UNPAID',
          }
        })
      }

      // Update order status with audit
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveredToName: payload.deliveredToName,
          deliveryProofNote: payload.deliveryProofNote ?? null,
          deliveredAt: deliveredAtDate,
          updatedBy: session.id // G3: Qui a modifié la commande
        }
      })
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    // Also revalidate portal pages so invoice buttons appear for clients
    revalidatePath('/portal/orders')
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

    if (!paymentMethod || !['CASH', 'CHECK', 'TRANSFER', 'COD', 'CARD'].includes(paymentMethod)) {
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

    // Get company settings for VAT rate (F1: balance = encours TTC)
    let vatRate = 0.2 // Default 20%
    try {
      const companySettings = await prisma.companySettings.findUnique({
        where: { id: 'default' }
      })
      vatRate = companySettings?.vatRate ?? 0.2
    } catch (error) {
      console.warn('CompanySettings table not available, using default VAT rate 20%')
      vatRate = 0.2
    }

    // F1: Calculate remaining TTC (remaining = invoice.totalTTC - totalPaid, min 0)
    const totalPaidBefore = calculateTotalPaid(invoice.payments)
    const remaining = calculateInvoiceRemaining(invoice.amount, totalPaidBefore, vatRate)

    // F1: Validate: amount cannot exceed remaining (empêcher surpaiement)
    if (amount > remaining + 0.01) { // Small tolerance for floating point
      return { error: `Le montant (${amount.toFixed(2)} Dh) dépasse le solde restant (${remaining.toFixed(2)} Dh)` }
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
    const newInvoiceStatus = await prisma.$transaction(async (tx) => {
      // G3: Create payment with audit (createdBy)
      await tx.payment.create({
        data: {
          invoiceId,
          amount,
          method: paymentMethod,
          reference: reference || null,
          createdBy: session.id, // G3: Qui a créé le paiement
        }
      })

      // Re-fetch payments to recalculate totalPaidAfter
      const allPayments = await tx.payment.findMany({
        where: { invoiceId },
        select: { amount: true }
      })

      const totalPaidAfter = calculateTotalPaid(allPayments)

      // F1: Determine invoice status based on remaining (UNPAID/PARTIAL/PAID)
      const remainingAfter = calculateInvoiceRemaining(invoice.amount, totalPaidAfter, vatRate)
      const newStatus = calculateInvoiceStatusWithPayments(remainingAfter, totalPaidAfter)

      // G3: Update invoice status and balance (keep balance as HT for backward compatibility)
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          balance: Math.max(0, invoice.amount - totalPaidAfter), // Keep as HT for now
          paidAt: newStatus === 'PAID' ? new Date() : undefined,
          paidBy: newStatus === 'PAID' ? session.id : undefined, // G3: Qui a marqué comme payée
        }
      })

      // F1: Update user balance (decrease by paid amount - balance = credit used)
      await tx.user.update({
        where: { id: invoice.order.userId },
        data: {
          balance: Math.max(0, user.balance - amount) // Balance never goes below 0
        }
      })

      // If invoice is fully paid, update order status to DELIVERED
      if (newStatus === 'PAID') {
        await tx.order.update({
          where: { id: invoice.orderId },
          data: {
            status: 'DELIVERED',
            updatedBy: session.id // G3: Qui a modifié la commande
          }
        })
      }

      return newStatus
    })

    // Log audit: Payment recorded
    try {
      const newPayment = await prisma.payment.findFirst({
        where: { invoiceId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true, method: true }
      })

      if (newPayment) {
        const { logEntityCreation } = await import('@/lib/audit')
        await logEntityCreation(
          'PAYMENT_RECORDED',
          'PAYMENT',
          newPayment.id,
          session as any,
          {
            invoiceId,
            amount: newPayment.amount,
            method: newPayment.method,
            newInvoiceStatus,
          }
        )
      }
    } catch (auditError) {
      console.error('Failed to log payment:', auditError)
    }

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

    // SECURITY: No duplicate if already has deliveryNoteNumber - numéro figé dès PREPARED
    if (isDeliveryNoteNumberAlreadyAssigned(order.deliveryNoteNumber)) {
      return { error: `${NUMBER_ALREADY_ASSIGNED_ERROR} Le numéro BL ${order.deliveryNoteNumber} est déjà attribué à cette commande.` }
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
