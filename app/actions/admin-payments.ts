'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { calculateInvoiceRemaining, calculateInvoiceStatusWithPayments, calculateTotalPaid } from '@/app/lib/invoice-utils'

/**
 * G2: Supprimer un paiement
 * Règles:
 * - ❌ Si facture = PAID → bloqué
 * - ✅ Sinon : autorisé (recalcule statut facture et balance utilisateur)
 */
export async function deletePaymentAction(paymentId: string) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPTABLE')) {
      return { error: 'Non autorisé' }
    }

    // Fetch payment with invoice and order
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            order: {
              select: { userId: true }
            },
            payments: {
              select: { id: true, amount: true }
            }
          }
        }
      }
    })

    if (!payment) {
      return { error: 'Paiement introuvable' }
    }

    // G2: Block deletion if invoice is PAID
    if (payment.invoice.status === 'PAID') {
      return { error: 'Impossible de supprimer un paiement d\'une facture déjà payée' }
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

    // Fetch user to get balance
    const user = await prisma.user.findUnique({
      where: { id: payment.invoice.order.userId },
      select: { balance: true }
    })

    if (!user) {
      return { error: 'Utilisateur introuvable' }
    }

    // Transaction: delete payment, recalculate invoice status and balance, update user balance
    await prisma.$transaction(async (tx) => {
      // Store payment data for audit log before deletion
      const paymentToDelete = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, amount: true, method: true, reference: true }
      })

      // Delete payment
      await tx.payment.delete({
        where: { id: paymentId }
      })
      
      // Log will be done after transaction

      // Re-fetch remaining payments to recalculate totalPaidAfter
      const remainingPayments = await tx.payment.findMany({
        where: { invoiceId: payment.invoiceId },
        select: { amount: true }
      })

      const totalPaidAfter = calculateTotalPaid(remainingPayments)

      // F1: Determine invoice status based on remaining (UNPAID/PARTIAL/PAID)
      const remainingAfter = calculateInvoiceRemaining(payment.invoice.amount, totalPaidAfter, vatRate)
      const newStatus = calculateInvoiceStatusWithPayments(remainingAfter, totalPaidAfter)

      // Update invoice status and balance
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: newStatus,
          balance: Math.max(0, payment.invoice.amount - totalPaidAfter), // Keep as HT for now
          paidAt: newStatus === 'PAID' ? payment.invoice.paidAt : null,
          paidBy: newStatus === 'PAID' ? payment.invoice.paidBy : null
        }
      })

      // F1: Update user balance (increase by deleted amount - balance = credit used)
      await tx.user.update({
        where: { id: payment.invoice.order.userId },
        data: {
          balance: user.balance + payment.amount // Restore balance
        }
      })

      // If invoice is no longer fully paid, update order status if needed
      if (newStatus !== 'PAID') {
        await tx.order.update({
          where: { id: payment.invoice.orderId },
          data: { status: 'SHIPPED' } // Or keep current status, depending on business logic
        })
      }
    })

    // Log audit: Payment deleted
    try {
      const { logEntityDeletion } = await import('@/lib/audit')
      await logEntityDeletion(
        'PAYMENT_DELETED',
        'PAYMENT',
        paymentId,
        session as any,
        {
          invoiceId: payment.invoiceId,
          deletedAmount: payment.amount,
          method: payment.method,
          reference: payment.reference,
        }
      )
    } catch (auditError) {
      console.error('Failed to log payment deletion:', auditError)
    }

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${payment.invoiceId}`)
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${payment.invoice.orderId}`)
    revalidatePath('/admin/payments')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la suppression du paiement' }
  }
}

/**
 * G2: Modifier un paiement
 * Règles:
 * - ❌ Si facture = PAID → bloqué
 * - ✅ Vérifier remaining >= newAmount (empêcher surpaiement)
 * - ✅ Sinon : autorisé (recalcule statut facture et balance utilisateur)
 */
export async function updatePaymentAction(
  paymentId: string,
  newAmount: number,
  newMethod: string,
  newReference: string | null
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPTABLE')) {
      return { error: 'Non autorisé' }
    }

    if (!newMethod || !['CASH', 'CHECK', 'TRANSFER', 'COD', 'CARD'].includes(newMethod)) {
      return { error: 'Méthode de paiement invalide' }
    }

    if (!newAmount || newAmount <= 0) {
      return { error: 'Le montant doit être supérieur à 0' }
    }

    // Fetch payment with invoice and order
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            order: {
              select: { userId: true }
            },
            payments: {
              select: { id: true, amount: true }
            }
          }
        }
      }
    })

    if (!payment) {
      return { error: 'Paiement introuvable' }
    }

    // G2: Block update if invoice is PAID
    if (payment.invoice.status === 'PAID') {
      return { error: 'Impossible de modifier un paiement d\'une facture déjà payée' }
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

    // Calculate remaining before this payment (excluding current payment)
    const otherPayments = payment.invoice.payments
      .filter(p => p.id !== paymentId)
      .map(p => p.amount)
    const totalPaidOther = otherPayments.reduce((sum, amt) => sum + amt, 0)
    const remainingBefore = calculateInvoiceRemaining(payment.invoice.amount, totalPaidOther, vatRate)

    // G2: Validate: newAmount cannot exceed remaining (empêcher surpaiement)
    if (newAmount > remainingBefore + 0.01) { // Small tolerance for floating point
      return { error: `Le montant (${newAmount.toFixed(2)} Dh) dépasse le solde restant (${remainingBefore.toFixed(2)} Dh)` }
    }

    // Fetch user to get balance
    const user = await prisma.user.findUnique({
      where: { id: payment.invoice.order.userId },
      select: { balance: true }
    })

    if (!user) {
      return { error: 'Utilisateur introuvable' }
    }

    const amountDiff = newAmount - payment.amount

    // Transaction: update payment, recalculate invoice status and balance, update user balance
    await prisma.$transaction(async (tx) => {
      // Update payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          amount: newAmount,
          method: newMethod,
          reference: newReference || null
        }
      })

      // Re-fetch all payments to recalculate totalPaidAfter
      const allPayments = await tx.payment.findMany({
        where: { invoiceId: payment.invoiceId },
        select: { amount: true }
      })

      const totalPaidAfter = calculateTotalPaid(allPayments)

      // F1: Determine invoice status based on remaining (UNPAID/PARTIAL/PAID)
      const remainingAfter = calculateInvoiceRemaining(payment.invoice.amount, totalPaidAfter, vatRate)
      const newStatus = calculateInvoiceStatusWithPayments(remainingAfter, totalPaidAfter)

      // Update invoice status and balance
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: newStatus,
          balance: Math.max(0, payment.invoice.amount - totalPaidAfter), // Keep as HT for now
          paidAt: newStatus === 'PAID' ? new Date() : payment.invoice.paidAt,
          paidBy: newStatus === 'PAID' ? session.id : payment.invoice.paidBy
        }
      })

      // F1: Update user balance (adjust by amount difference)
      await tx.user.update({
        where: { id: payment.invoice.order.userId },
        data: {
          balance: Math.max(0, user.balance - amountDiff) // Adjust balance by difference
        }
      })

      // If invoice is fully paid, update order status to DELIVERED
      if (newStatus === 'PAID') {
        await tx.order.update({
          where: { id: payment.invoice.orderId },
          data: { status: 'DELIVERED' }
        })
      }
    })

    // Log audit: Payment updated
    try {
      const { logEntityUpdate } = await import('@/lib/audit')
      await logEntityUpdate(
        'PAYMENT_UPDATED',
        'PAYMENT',
        paymentId,
        session as any,
        {
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference
        },
        {
          amount: newAmount,
          method: newMethod,
          reference: newReference || null,
          invoiceId: payment.invoiceId,
          invoiceNumber: payment.invoice.invoiceNumber || null
        }
      )
    } catch (auditError) {
      console.error('Failed to log payment update:', auditError)
    }

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${payment.invoiceId}`)
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${payment.invoice.orderId}`)
    revalidatePath('/admin/payments')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la modification du paiement' }
  }
}

/**
 * Supprime une facture (paiements puis facture). La commande reste sans facture.
 * Réservé ADMIN.
 */
export async function deleteInvoiceAction(invoiceId: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, invoiceNumber: true, orderId: true },
  })
  if (!invoice) {
    return { error: 'Facture introuvable' }
  }

  await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } })
  await prisma.invoice.delete({ where: { id: invoice.id } })

  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/invoices/${invoiceId}`)
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${invoice.orderId}`)
  revalidatePath('/admin/payments')
  return { success: true }
}
