/**
 * Race condition: remaining computed inside tx.
 * assertAccountingOpen uses invoiceSnapshot.createdAt (read via tx).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ACCOUNTING_CLOSED_ERROR_MESSAGE } from '@/app/lib/accounting-close'

const mockGetSession = vi.fn()
const mockInvoiceFindUnique = vi.fn()
const mockCompanySettingsFindUnique = vi.fn()
const mockPaymentFindMany = vi.fn()
const mockPaymentCreate = vi.fn()
const mockInvoiceUpdate = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockOrderUpdate = vi.fn()

vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    invoice: { findUnique: (args: unknown) => mockInvoiceFindUnique(args) },
    companySettings: { findUnique: (args: unknown) => mockCompanySettingsFindUnique(args) },
    payment: { findFirst: vi.fn().mockResolvedValue({ id: 'p1', amount: 100, method: 'CASH' }) },
    $transaction: vi.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        invoice: {
          findUnique: (args: unknown) => mockInvoiceFindUnique(args),
          update: (args: unknown) => mockInvoiceUpdate(args),
        },
        companySettings: { findUnique: (args: unknown) => mockCompanySettingsFindUnique(args) },
        payment: {
          findMany: (args: unknown) => mockPaymentFindMany(args),
          create: (args: unknown) => mockPaymentCreate(args),
        },
        user: {
          findUnique: (args: unknown) => mockUserFindUnique(args),
          update: (args: unknown) => mockUserUpdate(args),
        },
        order: { update: (args: unknown) => mockOrderUpdate(args) },
      }
      return callback(tx)
    }),
  },
}))

const invoiceId = 'inv-race-test'
const session = { id: 'user-1', email: 'admin@test.com', role: 'ADMIN' as const }

const createdAt = new Date('2024-06-01T12:00:00.000Z')
const invoiceSnapshot = {
  amount: 100,
  orderId: 'ord-1',
  lockedAt: null,
  createdAt,
  order: { userId: 'u1' },
}
const invoiceForPreCheck = {
  id: invoiceId,
  createdAt,
  amount: 100,
  orderId: 'ord-1',
  lockedAt: null,
  payments: [] as { amount: number }[],
  order: { userId: 'u1' as string, status: 'CONFIRMED' as string },
}

const companySettingsOpen = { vatRate: 0.2, accountingLockedUntil: null }
const companySettingsClosed = {
  vatRate: 0.2,
  accountingLockedUntil: new Date('2025-01-01T00:00:00.000Z'),
}

describe('markInvoicePaid - race condition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(session)
    mockInvoiceFindUnique.mockResolvedValue(invoiceForPreCheck)
    mockCompanySettingsFindUnique.mockResolvedValue(companySettingsOpen)
    mockUserFindUnique.mockResolvedValue({ balance: 500 })
    mockInvoiceUpdate.mockResolvedValue({})
    mockUserUpdate.mockResolvedValue({})
    mockOrderUpdate.mockResolvedValue({})
  })

  it('second payment is refused when remaining is insufficient (remaining computed inside transaction)', async () => {
    mockCompanySettingsFindUnique.mockResolvedValue(companySettingsOpen)
    mockInvoiceFindUnique
      .mockResolvedValueOnce(invoiceForPreCheck)
      .mockResolvedValueOnce(invoiceSnapshot)
      .mockResolvedValueOnce(invoiceForPreCheck)
      .mockResolvedValueOnce(invoiceSnapshot)
    mockPaymentFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ amount: 100 }])
    mockPaymentCreate.mockResolvedValue({})

    const { markInvoicePaid } = await import('@/app/actions/admin-orders')

    const first = await markInvoicePaid(invoiceId, 'CASH', null, 100)
    expect(first.error).toBeUndefined()
    expect(first.success).toBe(true)

    mockInvoiceFindUnique.mockReset()
    mockInvoiceFindUnique
      .mockResolvedValueOnce(invoiceForPreCheck)
      .mockResolvedValueOnce(invoiceSnapshot)
    mockPaymentFindMany.mockReset()
    mockPaymentFindMany.mockResolvedValue([{ amount: 100 }])

    const second = await markInvoicePaid(invoiceId, 'CASH', null, 100)
    expect(second.success).toBeUndefined()
    expect(second.error).toBeDefined()
    expect(second.error).toMatch(/dépasse le solde restant/)
    expect(second.error).toMatch(/20\.00 Dh/)
  })

  it('accounting closed: assertAccountingOpen uses invoiceSnapshot.createdAt (fail-closed, same message)', async () => {
    mockInvoiceFindUnique
      .mockResolvedValueOnce(invoiceForPreCheck)
      .mockResolvedValueOnce({ ...invoiceSnapshot, createdAt: new Date('2024-01-01T00:00:00.000Z') })
    mockCompanySettingsFindUnique.mockResolvedValue(companySettingsClosed)

    const { markInvoicePaid } = await import('@/app/actions/admin-orders')
    const result = await markInvoicePaid(invoiceId, 'CASH', null, 50)

    expect(result.success).toBeUndefined()
    expect(result.error).toBe(ACCOUNTING_CLOSED_ERROR_MESSAGE)
  })

  it('concurrent markInvoicePaid: one success, one refused with "dépasse le solde restant" (deterministic mock)', async () => {
    // Déterministe, pas de Date.now ni d’état DB réel. On simule la course en faisant répondre
    // findMany dans l’ordre : [] (une tx voit 0 paiement → passe), [100] (l’autre voit le premier → refus),
    // [100] (la tx gagnante relit après create). Un seul success, un seul { error } "dépasse le solde restant".
    mockInvoiceFindUnique.mockImplementation((args: { include?: { payments?: unknown } }) =>
      args?.include?.payments !== undefined ? Promise.resolve(invoiceForPreCheck) : Promise.resolve(invoiceSnapshot)
    )
    mockCompanySettingsFindUnique.mockResolvedValue(companySettingsOpen)
    mockPaymentFindMany
      .mockResolvedValueOnce([])                                    // first tx: no payments yet -> wins
      .mockResolvedValueOnce([{ amount: 100 }])                     // second tx: sees first payment -> remaining 0 -> fails
      .mockResolvedValueOnce([{ amount: 100 }])                     // first tx: findMany after create
    mockPaymentCreate.mockResolvedValue({})
    mockUserFindUnique.mockResolvedValue({ balance: 500 })
    mockInvoiceUpdate.mockResolvedValue({})
    mockUserUpdate.mockResolvedValue({})
    mockOrderUpdate.mockResolvedValue({})

    const { markInvoicePaid } = await import('@/app/actions/admin-orders')

    const [result1, result2] = await Promise.all([
      markInvoicePaid(invoiceId, 'CASH', null, 100),
      markInvoicePaid(invoiceId, 'CASH', null, 100),
    ])

    const successCount = [result1, result2].filter((r) => r.success === true).length
    const errorResults = [result1, result2].filter((r) => r.error != null)
    const remainingError = errorResults.find((r) => r.error && String(r.error).includes('dépasse le solde restant'))

    expect(successCount).toBe(1)
    expect(errorResults.length).toBe(1)
    expect(remainingError).toBeDefined()
    expect(remainingError?.error).toMatch(/dépasse le solde restant/)
    expect(remainingError?.error).toMatch(/20\.00 Dh/)
  })
})
