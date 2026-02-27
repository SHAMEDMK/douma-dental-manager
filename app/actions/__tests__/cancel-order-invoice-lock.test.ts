/**
 * Unit tests: cancelOrderAction refused when invoice is locked (PARTIAL, paidAmount>0, lockedAt).
 * Règle métier : une commande ne peut pas être annulée si la facture associée est verrouillée.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { INVOICE_LOCKED_ERROR } from '@/app/lib/invoice-lock'

const mockGetSession = vi.fn()
const mockCreateAuditLog = vi.fn()
const mockOrderFindUnique = vi.fn()

vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: (opts: unknown) => mockCreateAuditLog(opts),
  logStatusChange: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: (args: unknown) => mockOrderFindUnique(args),
    },
    $transaction: vi.fn(),
  },
}))

const orderId = 'order-cancel-lock-test'
const session = { id: 'user-1', email: 'u@test.com', role: 'CLIENT' as const }

describe('cancelOrderAction - invoice locked', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(session)
    mockCreateAuditLog.mockResolvedValue(undefined)
  })

  it('returns error INVOICE_LOCKED_ERROR when invoice status is PARTIAL', async () => {
    const orderWithPartialInvoice = {
      id: orderId,
      userId: session.id,
      status: 'CONFIRMED',
      total: 100,
      items: [],
      invoice: {
        id: 'inv-1',
        status: 'PARTIAL',
        createdAt: new Date(),
        payments: [{ amount: 50 }],
      },
    }
    mockOrderFindUnique.mockResolvedValue(orderWithPartialInvoice)

    const { cancelOrderAction } = await import('@/app/actions/order')
    const result = await cancelOrderAction(orderId)

    expect(result).toEqual({ error: INVOICE_LOCKED_ERROR })
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ORDER_CANCEL_REFUSED_INVOICE_LOCKED',
        entityType: 'ORDER',
        entityId: orderId,
        details: { invoiceId: 'inv-1' },
      })
    )
  })

  it('returns error INVOICE_LOCKED_ERROR when invoice has paidAmount > 0 (payments sum)', async () => {
    const orderWithPaidInvoice = {
      id: orderId,
      userId: session.id,
      status: 'PREPARED',
      total: 200,
      items: [],
      invoice: {
        id: 'inv-2',
        status: 'DRAFT',
        createdAt: new Date(),
        payments: [{ amount: 10 }],
      },
    }
    mockOrderFindUnique.mockResolvedValue(orderWithPaidInvoice)

    const { cancelOrderAction } = await import('@/app/actions/order')
    const result = await cancelOrderAction(orderId)

    expect(result).toEqual({ error: INVOICE_LOCKED_ERROR })
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ORDER_CANCEL_REFUSED_INVOICE_LOCKED',
        entityId: orderId,
        details: { invoiceId: 'inv-2' },
      })
    )
  })
})
