import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exportToExcel, formatDateForExcel, formatMoneyForExcel } from '@/lib/excel'
import { computeInvoiceTotals } from '@/app/lib/invoice-utils'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { requireAdminAuth } from '@/lib/api-guards'
import { getExportMaxRows, rejectExportTooLarge } from '@/lib/export-guard'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/export/orders
 * Export orders to Excel
 */
export async function GET(request: NextRequest) {
  // Rate limiting (stricter for exports - heavy operation)
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 10,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  // Security guard: require admin auth
  const authResponse = await requireAdminAuth(request, ['ADMIN', 'COMPTABLE', 'MAGASINIER'])
  if (authResponse) return authResponse

  const maxRows = getExportMaxRows()
  if (maxRows != null) {
    const count = await prisma.order.count()
    const tooLarge = rejectExportTooLarge(count, maxRows, 'Commandes')
    if (tooLarge) return tooLarge
  }

  try {

    // Get company settings for VAT rate
    const companySettings = await prisma.companySettings.findUnique({
      where: { id: 'default' }
    })
    const vatRate = companySettings?.vatRate ?? 0.2

    // Get all orders with user and invoice
    const orders = await prisma.order.findMany({
      select: {
        orderNumber: true,
        createdAt: true,
        status: true,
        total: true,
        deliveryNoteNumber: true,
        user: {
          select: {
            name: true,
            companyName: true,
            email: true,
            segment: true,
          }
        },
        invoice: {
          select: {
            invoiceNumber: true,
            status: true,
            amount: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // Source de vérité unique : computeInvoiceTotals (ordre = total HT, pas de paiement)
    const excelData = orders.map(order => {
      const { totalHT, totalTVA, totalTTC } = computeInvoiceTotals(
        { amount: order.total, payments: [] },
        vatRate
      )
      const statusLabels: Record<string, string> = {
        'CONFIRMED': 'Confirmée',
        'PREPARED': 'Préparée',
        'SHIPPED': 'Expédiée',
        'DELIVERED': 'Livrée',
        'CANCELLED': 'Annulée',
      }
      const invoiceStatusLabels: Record<string, string> = {
        'UNPAID': 'Impayée',
        'PARTIAL': 'Partiellement payée',
        'PAID': 'Payée',
        'CANCELLED': 'Annulée',
      }
      const tvatTaux = `${(vatRate * 100).toFixed(0)}%`

      return {
        'Numéro commande': order.orderNumber || '-',
        'Date': formatDateForExcel(order.createdAt),
        'Client': order.user.companyName || order.user.name,
        'Email': order.user.email,
        'Segment': order.user.segment,
        'Statut': statusLabels[order.status] || order.status,
        'Total HT (Dh)': formatMoneyForExcel(totalHT),
        'TVA (taux)': tvatTaux,
        'TVA (Dh)': formatMoneyForExcel(totalTVA),
        'Total TTC (Dh)': formatMoneyForExcel(totalTTC),
        'Bon de livraison': order.deliveryNoteNumber || '-',
        'Facture': order.invoice?.invoiceNumber || '-',
        'Statut facture': order.invoice ? (invoiceStatusLabels[order.invoice.status] || order.invoice.status) : '-',
      }
    })

    // Generate Excel file
    const excelBuffer = await exportToExcel(excelData, 'Commandes', 'commandes')

    // Generate filename with current date
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const filename = `commandes-${dateStr}.xlsx`

    // Convert Buffer to Uint8Array for NextResponse BodyInit
    const uint8Array = new Uint8Array(excelBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting orders:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'export' }, { status: 500 })
  }
}
