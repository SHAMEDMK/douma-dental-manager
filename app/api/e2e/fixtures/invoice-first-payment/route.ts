import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/e2e/fixtures/invoice-first-payment?invoiceId=xxx
 * E2E only: returns { paymentId } for the first payment (by createdAt) of the given invoice.
 * Used to get a paymentId after recording a partial payment in E2E (deterministic, no scraping).
 * Guard: E2E_SEED === '1'. No auth required (fixture data only).
 */
export async function GET(request: NextRequest) {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const invoiceId = request.nextUrl.searchParams.get('invoiceId')
  if (!invoiceId?.trim()) {
    return NextResponse.json({ error: 'invoiceId query required' }, { status: 400 })
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { invoiceId: invoiceId.trim() },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (!payment) {
      return NextResponse.json({ error: 'No payment found for this invoice' }, { status: 404 })
    }
    return NextResponse.json({ paymentId: payment.id })
  } catch {
    return NextResponse.json({ error: 'Fixture unavailable' }, { status: 404 })
  }
}
