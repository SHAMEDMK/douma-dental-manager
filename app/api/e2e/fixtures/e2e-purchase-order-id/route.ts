import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const E2E_PO_NUMBER = 'PO-E2E-0001'

/**
 * GET /api/e2e/fixtures/e2e-purchase-order-id
 * Returns { purchaseOrderId } for the known E2E seed purchase order (PO-E2E-0001).
 * Only available when E2E_SEED=1; returns 404 otherwise (never expose in prod).
 */
export async function GET() {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const po = await prisma.purchaseOrder.findFirst({
      where: { orderNumber: E2E_PO_NUMBER },
      select: { id: true },
    })

    if (!po) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
    }

    return NextResponse.json({ purchaseOrderId: po.id })
  } catch {
    return NextResponse.json({ error: 'Fixture unavailable' }, { status: 404 })
  }
}
