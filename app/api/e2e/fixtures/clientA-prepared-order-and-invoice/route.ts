import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const E2E_ORDER_NUMBER = 'CMD-E2E-PREPARED'

/**
 * GET /api/e2e/fixtures/clientA-prepared-order-and-invoice
 * Returns { orderId, invoiceId, invoiceCreatedAt? } for the E2E seed order (CMD-E2E-PREPARED)
 * and its invoice (INV-E2E-0001). Only available when E2E_SEED=1; 404 otherwise.
 */
export async function GET() {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const order = await prisma.order.findFirst({
      where: { orderNumber: E2E_ORDER_NUMBER },
      select: {
        id: true,
        invoice: {
          select: { id: true, createdAt: true },
        },
      },
    })

    if (!order || !order.invoice) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
    }

    return NextResponse.json({
      orderId: order.id,
      invoiceId: order.invoice.id,
      invoiceCreatedAt: order.invoice.createdAt.toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Fixture unavailable' }, { status: 404 })
  }
}
