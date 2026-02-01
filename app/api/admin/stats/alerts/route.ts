import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { requireAdminAuth } from '@/lib/api-guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stats/alerts
 * Get alerts for admin dashboard (low stock, unpaid invoices, pending orders)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 30,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  // Security guard: require admin auth
  const authResponse = await requireAdminAuth(request, ['ADMIN', 'COMPTABLE', 'MAGASINIER'])
  if (authResponse) return authResponse

  try {
    // Single round-trip: all alerts in parallel
    const clientRequestCountPromise = (async () => {
      try {
        return await prisma.clientRequest.count({ where: { status: 'PENDING' } })
      } catch {
        return 0
      }
    })()

    const [
      lowStockProducts,
      pendingOrders,
      unpaidInvoices,
      ordersRequiringApproval,
      pendingRequests,
    ] = await Promise.all([
      prisma.product.findMany({
        where: { stock: { lte: prisma.product.fields.minStock } },
        select: { id: true, name: true, stock: true, minStock: true },
      }),
      prisma.order.count({
        where: { status: 'CONFIRMED' },
      }),
      prisma.invoice.aggregate({
        where: { status: { in: ['UNPAID', 'PARTIAL'] } },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.order.count({
        where: { requiresAdminApproval: true },
      }),
      clientRequestCountPromise,
    ])

    return NextResponse.json({
      lowStock: {
        count: lowStockProducts.length,
        products: lowStockProducts.slice(0, 5), // Limit to 5 for preview
      },
      pendingOrders: {
        count: pendingOrders,
      },
      unpaidInvoices: {
        count: unpaidInvoices._count || 0,
        total: unpaidInvoices._sum?.amount || 0,
      },
      ordersRequiringApproval: {
        count: ordersRequiringApproval,
      },
      pendingRequests: {
        count: pendingRequests,
      },
    })
  } catch (error: any) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de la récupération des alertes' }, { status: 500 })
  }
}
