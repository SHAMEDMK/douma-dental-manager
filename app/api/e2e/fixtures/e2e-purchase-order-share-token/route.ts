import { NextRequest, NextResponse } from 'next/server'
import { createPurchaseOrderShareToken } from '@/app/lib/purchase-order-share-token'
import { prisma } from '@/lib/prisma'

const E2E_PO_NUMBER = 'PO-E2E-0001'

/**
 * GET /api/e2e/fixtures/e2e-purchase-order-share-token?purchaseOrderId=...
 * Returns { token } for E2E tests only (E2E_SEED=1).
 */
export async function GET(req: NextRequest) {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const purchaseOrderId = req.nextUrl.searchParams.get('purchaseOrderId')
  if (!purchaseOrderId) {
    return NextResponse.json({ error: 'purchaseOrderId required' }, { status: 400 })
  }

  try {
    const po = await prisma.purchaseOrder.findFirst({
      where: { orderNumber: E2E_PO_NUMBER, id: purchaseOrderId },
      select: { id: true },
    })
    if (!po) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
    }

    const token = await createPurchaseOrderShareToken(po.id)
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json({ error: 'Fixture unavailable' }, { status: 404 })
  }
}
