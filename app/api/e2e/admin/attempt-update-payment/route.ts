import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/api-guards'
import { updatePaymentAction } from '@/app/actions/admin-payments'

/**
 * POST /api/e2e/admin/attempt-update-payment
 * E2E only: calls updatePaymentAction(paymentId, amount, method, reference) and returns { error } or { success: true }.
 * Used to assert refusal when invoice is locked (PARTIAL) without relying on UI (no edit-payment form in app).
 * Guard: E2E_SEED === '1' and admin auth.
 */
export async function POST(request: NextRequest) {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const authResponse = await requireAdminAuth(request, ['ADMIN', 'COMPTABLE'])
  if (authResponse) return authResponse

  let body: { paymentId?: string; amount?: number; method?: string; reference?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const paymentId = body?.paymentId
  const amount = body?.amount
  const method = body?.method ?? 'CASH'
  const reference = body?.reference ?? null

  if (typeof paymentId !== 'string' || !paymentId.trim()) {
    return NextResponse.json({ error: 'paymentId required' }, { status: 400 })
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount required (positive number)' }, { status: 400 })
  }
  if (!['CASH', 'CHECK', 'TRANSFER', 'COD', 'CARD'].includes(method)) {
    return NextResponse.json({ error: 'method must be CASH|CHECK|TRANSFER|COD|CARD' }, { status: 400 })
  }

  const result = await updatePaymentAction(
    paymentId.trim(),
    amount,
    method,
    typeof reference === 'string' ? reference : null
  )
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 200 })
  }
  return NextResponse.json({ success: true })
}
