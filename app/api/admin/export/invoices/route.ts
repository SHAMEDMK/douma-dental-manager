import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exportToExcel, formatDateForExcel, formatMoneyForExcel } from '@/lib/excel'
import { calculateTotalPaid, calculateInvoiceRemaining } from '@/app/lib/invoice-utils'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { requireAdminAuth } from '@/lib/api-guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/export/invoices
 * Export invoices to Excel
 */
export async function GET(request: NextRequest) {
  // Rate limiting (stricter for exports - heavy operation)
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 10,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  // Security guard: require ADMIN or COMPTABLE
  const authResponse = await requireAdminAuth(request, ['ADMIN', 'COMPTABLE'])
  if (authResponse) return authResponse

  try {

    // Get company settings for VAT rate
    const companySettings = await prisma.companySettings.findUnique({
      where: { id: 'default' }
    })
    const vatRate = companySettings?.vatRate ?? 0.2

    // Get all invoices with order, user, and payments
    const invoices = await prisma.invoice.findMany({
      select: {
        invoiceNumber: true,
        createdAt: true,
        status: true,
        amount: true,
        balance: true,
        paidAt: true,
        order: {
          select: {
            orderNumber: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                companyName: true,
                email: true,
              }
            }
          }
        },
        payments: {
          select: {
            amount: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format data for Excel
    const excelData = invoices.map(invoice => {
      const totalPaid = calculateTotalPaid(invoice.payments)
      const remaining = calculateInvoiceRemaining(invoice.amount, totalPaid, vatRate)
      const statusLabels: Record<string, string> = {
        'UNPAID': 'Impayée',
        'PARTIAL': 'Partiellement payée',
        'PAID': 'Payée',
        'CANCELLED': 'Annulée',
      }

      return {
        'Numéro facture': invoice.invoiceNumber || '-',
        'Date facture': formatDateForExcel(invoice.createdAt),
        'Commande': invoice.order.orderNumber || '-',
        'Date commande': formatDateForExcel(invoice.order.createdAt),
        'Client': invoice.order.user.companyName || invoice.order.user.name,
        'Email': invoice.order.user.email,
        'Montant HT (Dh)': formatMoneyForExcel(invoice.amount),
        'Montant TTC (Dh)': formatMoneyForExcel(remaining + totalPaid),
        'Total payé (Dh)': formatMoneyForExcel(totalPaid),
        'Solde restant (Dh)': formatMoneyForExcel(remaining),
        'Statut': statusLabels[invoice.status] || invoice.status,
        'Date paiement': invoice.paidAt ? formatDateForExcel(invoice.paidAt) : '-',
      }
    })

    // Generate Excel file
    const excelBuffer = await exportToExcel(excelData, 'Factures', 'factures')

    // Generate filename with current date
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const filename = `factures-${dateStr}.xlsx`

    // Convert Buffer to Uint8Array for NextResponse BodyInit
    const uint8Array = new Uint8Array(excelBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting invoices:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'export' }, { status: 500 })
  }
}
