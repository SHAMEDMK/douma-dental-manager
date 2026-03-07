import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/api-guards'
import { updateOrderStatus } from '@/app/actions/admin-orders'

/**
 * POST /api/e2e/admin/attempt-cancel-order
 * E2E only: calls updateOrderStatus(orderId, 'CANCELLED') and returns { error } or { success: true }.
 * Used to assert refusal when invoice is PARTIAL (invoice-lock) without relying on UI visibility.
 * Guard: E2E_SEED === '1' and admin auth.
 */
export async function POST(request: NextRequest) {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const authResponse = await requireAdminAuth(request, ['ADMIN', 'MAGASINIER', 'COMMERCIAL'])
  if (authResponse) return authResponse

  let body: { orderId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const orderId = body?.orderId
  if (typeof orderId !== 'string' || !orderId.trim()) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  }

  const result = await updateOrderStatus(orderId.trim(), 'CANCELLED')
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 200 })
  }
  return NextResponse.json({ success: true })
}
