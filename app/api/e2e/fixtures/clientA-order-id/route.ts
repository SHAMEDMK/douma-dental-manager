import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const E2E_ORDER_NUMBER = 'CMD-E2E-PREPARED'

/**
 * GET /api/e2e/fixtures/clientA-order-id
 * Returns { orderId } for the known E2E seed order belonging to clientA (client@dental.com).
 * Only available when E2E_SEED=1; returns 404 otherwise (never expose in prod).
 */
export async function GET() {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const order = await prisma.order.findFirst({
      where: { orderNumber: E2E_ORDER_NUMBER },
      select: { id: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
    }

    return NextResponse.json({ orderId: order.id })
  } catch {
    return NextResponse.json({ error: 'Fixture unavailable' }, { status: 404 })
  }
}
