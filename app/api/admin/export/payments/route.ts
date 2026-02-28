import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exportToExcel, formatDateForExcel, formatMoneyForExcel } from '@/lib/excel'
import { computeInvoiceTotals } from '@/app/lib/invoice-utils'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { requireAdminAuth } from '@/lib/api-guards'
import { getExportMaxRows, rejectExportTooLarge } from '@/lib/export-guard'

export const dynamic = 'force-dynamic'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CHECK: 'Chèque',
  TRANSFER: 'Virement',
  CARD: 'Carte Bancaire',
  COD: 'COD',
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  UNPAID: 'Impayée',
  PARTIAL: 'Partiellement payée',
  PAID: 'Payée',
  CANCELLED: 'Annulée',
}

/**
 * GET /api/admin/export/payments
 * Export payments to Excel (ADMIN + COMPTABLE), rate-limit 10/min
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 10,
    windowMs: 60 * 1000,
  })
  if (rateLimitResponse) return rateLimitResponse

  const authResponse = await requireAdminAuth(request, ['ADMIN', 'COMPTABLE'])
  if (authResponse) return authResponse

  const maxRows = getExportMaxRows()
  if (maxRows != null) {
    const count = await prisma.payment.count()
    const tooLarge = rejectExportTooLarge(count, maxRows, 'Paiements')
    if (tooLarge) return tooLarge
  }

  try {
    const companySettings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
      select: { vatRate: true },
    })
    const vatRate = companySettings?.vatRate ?? 0.2

    const payments = await prisma.payment.findMany({
      select: {
        amount: true,
        method: true,
        reference: true,
        createdAt: true,
        invoice: {
          select: {
            invoiceNumber: true,
            status: true,
            lockedAt: true,
            amount: true,
            payments: { select: { amount: true } },
            order: {
              select: {
                orderNumber: true,
                user: {
                  select: {
                    companyName: true,
                    name: true,
                    email: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    const tvatTaux = `${(vatRate * 100).toFixed(0)}%`
    const excelData = payments.map(p => {
      const user = p.invoice?.order?.user
      const clientName = user ? (user.companyName || user.name) : '-'
      const email = user?.email ?? '-'
      const invoiceNumber = p.invoice?.invoiceNumber ?? '-'
      const orderNumber = p.invoice?.order?.orderNumber ?? '-'
      const invoiceStatus = p.invoice?.status
        ? (INVOICE_STATUS_LABELS[p.invoice.status] || p.invoice.status)
        : '-'
      const factureVerrouillee = p.invoice?.lockedAt != null ? 'Oui' : 'Non'

      const invoiceForTotals = p.invoice
        ? { amount: p.invoice.amount, payments: p.invoice.payments ?? [] }
        : { amount: 0, payments: [] }
      const { totalTVA } = computeInvoiceTotals(invoiceForTotals, vatRate)

      return {
        'Date paiement': formatDateForExcel(p.createdAt),
        'Client': clientName,
        'Email': email,
        'Facture': invoiceNumber,
        'Commande': orderNumber,
        'Montant (Dh)': formatMoneyForExcel(p.amount),
        'Mode': PAYMENT_METHOD_LABELS[p.method] || p.method,
        'Référence': p.reference ?? '-',
        'Statut facture': invoiceStatus,
        'Facture verrouillée': factureVerrouillee,
        'TVA (taux)': tvatTaux,
        'TVA (montant) (Dh)': formatMoneyForExcel(totalTVA),
      }
    })

    const excelBuffer = await exportToExcel(excelData, 'Paiements', 'paiements')
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const filename = `paiements-${dateStr}.xlsx`
    const uint8Array = new Uint8Array(excelBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'export'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
