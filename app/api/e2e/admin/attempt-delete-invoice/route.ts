import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/api-guards'
import { deleteInvoiceAction } from '@/app/actions/admin-payments'

/**
 * POST /api/e2e/admin/attempt-delete-invoice
 * E2E only: calls deleteInvoiceAction(invoiceId) and returns { error } or { success: true }.
 * Used to assert refusal when invoice is locked (PARTIAL) without relying on UI (button hidden when locked).
 * Guard: E2E_SEED === '1' and admin auth.
 */
export async function POST(request: NextRequest) {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const authResponse = await requireAdminAuth(request, ['ADMIN'])
  if (authResponse) return authResponse

  let body: { invoiceId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const invoiceId = body?.invoiceId
  if (typeof invoiceId !== 'string' || !invoiceId.trim()) {
    return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
  }

  const result = await deleteInvoiceAction(invoiceId.trim())
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 200 })
  }
  return NextResponse.json({ success: true })
}
