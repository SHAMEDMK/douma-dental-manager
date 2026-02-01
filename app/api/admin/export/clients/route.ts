import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exportToExcel, formatDateForExcel, formatMoneyForExcel, formatPercentForExcel } from '@/lib/excel'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { requireAdminAuth } from '@/lib/api-guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/export/clients
 * Export clients to Excel
 */
export async function GET(request: NextRequest) {
  // Rate limiting (stricter for exports - heavy operation)
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 10,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  // Security guard: require ADMIN only (sensitive data)
  const authResponse = await requireAdminAuth(request, ['ADMIN'])
  if (authResponse) return authResponse

  try {

    // Get all clients with order statistics
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: {
        name: true,
        email: true,
        companyName: true,
        segment: true,
        discountRate: true,
        creditLimit: true,
        balance: true,
        phone: true,
        address: true,
        city: true,
        ice: true,
        createdAt: true,
        orders: {
          select: {
            total: true,
            status: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format data for Excel
    const excelData = clients.map(client => {
      // Calculate statistics
      const totalOrders = client.orders.length
      const totalCA = client.orders.reduce((sum, order) => sum + order.total, 0)
      const paidOrders = client.orders.filter(order => order.status === 'DELIVERED').length

      return {
        'Nom': client.name,
        'Raison sociale': client.companyName || '-',
        'Email': client.email,
        'Téléphone': client.phone || '-',
        'Adresse': client.address || '-',
        'Ville': client.city || '-',
        'ICE': client.ice || '-',
        'Segment': client.segment,
        'Remise (%)': client.discountRate ? formatPercentForExcel(client.discountRate) : '-',
        'Plafond crédit (Dh)': client.creditLimit ? formatMoneyForExcel(client.creditLimit) : '-',
        'Solde actuel (Dh)': formatMoneyForExcel(client.balance),
        'Disponible (Dh)': formatMoneyForExcel(client.creditLimit > 0 ? Math.max(0, client.creditLimit - client.balance) : 0),
        'Total commandes': totalOrders,
        'Commandes payées': paidOrders,
        'CA total (Dh)': formatMoneyForExcel(totalCA),
        'Date création': formatDateForExcel(client.createdAt),
      }
    })

    // Generate Excel file
    const excelBuffer = exportToExcel(excelData, 'Clients', 'clients')

    // Generate filename with current date
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const filename = `clients-${dateStr}.xlsx`

    // Convert Buffer to Uint8Array for NextResponse BodyInit
    const uint8Array = new Uint8Array(excelBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting clients:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'export' }, { status: 500 })
  }
}
