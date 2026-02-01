import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    // Get basic stats
    const [ordersCount, invoicesCount, usersCount] = await Promise.all([
      prisma.order.count(),
      prisma.invoice.count(),
      prisma.user.count(),
    ])

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      stats: {
        orders: ordersCount,
        invoices: invoicesCount,
        users: usersCount,
      },
    }, { status: 200 })
  } catch (error: any) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message || 'Unknown error',
    }, { status: 503 })
  }
}
