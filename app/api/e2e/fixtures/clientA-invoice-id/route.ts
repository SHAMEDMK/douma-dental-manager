import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const E2E_INVOICE_NUMBER = 'INV-E2E-0001'

/**
 * GET /api/e2e/fixtures/clientA-invoice-id
 * Returns { invoiceId } for the known E2E seed invoice belonging to clientA (client@dental.com).
 * Only available when E2E_SEED=1; returns 404 otherwise (never expose in prod).
 */
export async function GET() {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: E2E_INVOICE_NUMBER },
      select: { id: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
    }

    return NextResponse.json({ invoiceId: invoice.id })
  } catch {
    return NextResponse.json({ error: 'Fixture unavailable' }, { status: 404 })
  }
}
