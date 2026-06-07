/**
 * Integration tests for order workflow
 * These tests verify the critical workflows:
 * 1. Order creation
 * 2. Status transitions
 * 3. Invoice creation
 * 4. Payment processing
 *
 * Note: The first test uses mocks for Resend (email) and audit so it runs without a real DB.
 * Run with: npm run test (or npm run test:integration if configured)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks (hoisted so they exist when vi.mock runs) ---
const mockGetSession = vi.fn()
const mockSendOrderConfirmationEmail = vi.fn()
const mockLogEntityCreation = vi.fn()
const mockGetNextOrderNumber = vi.fn()

vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}))

vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: (params: unknown) => mockSendOrderConfirmationEmail(params),
  sendEmail: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  logEntityCreation: (
    _action: string,
    _entityType: string,
    _entityId: string,
    _session: unknown,
    _details?: unknown
  ) => mockLogEntityCreation(_action, _entityType, _entityId, _session, _details),
}))

const mockGetDeliveryNoteNumber = vi.fn().mockReturnValue('BL-2026-0001')
const mockGetInvoiceNumber = vi.fn().mockReturnValue('FAC-2026-0001')
vi.mock('@/app/lib/sequence', () => ({
  getNextOrderNumber: (_tx: unknown, _date?: Date) => mockGetNextOrderNumber(_tx, _date),
  getDeliveryNoteNumberFromOrderNumber: (orderNumber: string | null, date: Date) =>
    mockGetDeliveryNoteNumber(orderNumber, date),
  getInvoiceNumberFromOrderNumber: (orderNumber: string | null, date: Date) =>
    mockGetInvoiceNumber(orderNumber, date),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Prisma: transaction runs callback with mock tx; other calls return sensible values
const createdOrder = {
  id: 'order-test-1',
  orderNumber: 'CMD-2026-0001',
  status: 'CONFIRMED' as const,
  total: 200,
  items: [{ id: 'item-1', productId: 'prod-1', quantity: 2, priceAtTime: 100, costAtTime: 50 }],
  requiresAdminApproval: false,
  createdAt: new Date(),
  userId: 'user-test-1',
}
const mockOrderCreate = vi.fn()
const mockProductUpdate = vi.fn()
const mockProductFindUnique = vi.fn()
const mockProductFindMany = vi.fn()
const mockProductVariantFindMany = vi.fn()
const mockStockMovementCreateMany = vi.fn().mockResolvedValue({ count: 1 })
const mockOrderFindUnique = vi.fn()
const mockUserFindUnique = vi.fn()

const defaultMockProduct = {
  id: 'prod-1',
  name: 'Product 1',
  stock: 10,
  price: 100,
  cost: 50,
  segmentPrices: [] as { segment: string; price: number }[],
}

const mockDeliveryNoteCreate = vi.fn()
const mockPrismaOrderUpdate = vi.fn().mockResolvedValue({})
const mockInvoiceFindUniqueTx = vi.fn()
const mockInvoiceCreateTx = vi.fn()
const mockTxOrderFindUnique = vi.fn()
const mockTx = {
  product: {
    findUnique: mockProductFindUnique,
    findMany: mockProductFindMany,
    update: mockProductUpdate,
  },
  productVariant: {
    findMany: mockProductVariantFindMany,
    update: vi.fn().mockResolvedValue({}),
  },
  stockMovement: {
    create: vi.fn().mockResolvedValue({}),
    createMany: mockStockMovementCreateMany,
  },
  order: {
    create: mockOrderCreate,
    update: vi.fn().mockResolvedValue({}),
    findUnique: mockTxOrderFindUnique,
  },
  deliveryNote: {
    create: mockDeliveryNoteCreate,
  },
  invoice: {
    findUnique: mockInvoiceFindUniqueTx,
    create: mockInvoiceCreateTx,
  },
  user: { update: vi.fn().mockResolvedValue({}) },
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    adminSettings: {
      findUnique: vi.fn().mockResolvedValue({
        blockWorkflowUntilApproved: false,
        approvalMessage: 'Commande à valider (marge anormale)',
        requireApprovalIfAnyNegativeLineMargin: true,
        requireApprovalIfMarginBelowPercent: false,
        marginPercentThreshold: 0,
        requireApprovalIfOrderTotalMarginNegative: false,
      }),
    },
    companySettings: { findUnique: vi.fn().mockResolvedValue({ vatRate: 0.2 }) },
    product: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'prod-1',
        name: 'Product 1',
        stock: 10,
        price: 100,
        cost: 50,
        segmentPrices: [],
        options: [],
      }),
    },
    user: {
      findUnique: mockUserFindUnique,
    },
    order: {
      findUnique: mockOrderFindUnique,
      update: mockPrismaOrderUpdate,
    },
    $transaction: vi.fn().mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx)
    }),
  },
}))

describe('Order Workflow Integration Tests', () => {
  describe('Order Creation Workflow', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockGetDeliveryNoteNumber.mockReturnValue('BL-2026-0001')
      mockDeliveryNoteCreate.mockResolvedValue({ number: 'BL-2026-0001', orderId: 'order-1' })
      mockGetSession.mockResolvedValue({
        id: 'user-test-1',
        email: 'test@example.com',
        role: 'CLIENT',
        name: 'Test User',
      })
      mockGetNextOrderNumber.mockResolvedValue('CMD-2026-0001')
      mockProductFindUnique.mockResolvedValue({ ...defaultMockProduct, options: [] })
      mockProductFindMany.mockResolvedValue([defaultMockProduct])
      mockProductVariantFindMany.mockResolvedValue([])
      mockOrderCreate.mockResolvedValue(createdOrder)
      mockProductUpdate.mockResolvedValue({ id: 'prod-1', stock: 8 })
      mockSendOrderConfirmationEmail.mockResolvedValue(undefined)
      mockLogEntityCreation.mockResolvedValue(undefined)
      mockOrderFindUnique.mockResolvedValue({
        ...createdOrder,
        items: [
          { id: 'item-1', quantity: 2, priceAtTime: 100, productId: 'prod-1', product: { name: 'Product 1' } },
        ],
      })
      mockUserFindUnique.mockResolvedValue({
        segment: 'LABO',
        discountRate: null,
        balance: 0,
        creditLimit: 1000,
        name: 'Test User',
        companyName: null,
        email: 'test@example.com',
      })
    })

    it('should create order with CONFIRMED status', async () => {
      // 1. Create a test user (mocked via getSession)
      // 2. Create test products (mocked via prisma tx.product.findUnique)
      // 3. Call createOrderAction
      const { createOrderAction } = await import('@/app/actions/order')
      const result = await createOrderAction([
        { productId: 'prod-1', quantity: 2 },
      ])

      // 4. Verify order is created with status CONFIRMED
      expect(result).not.toHaveProperty('error')
      expect(result).toMatchObject({ success: true, orderId: 'order-test-1' })
      expect(mockOrderCreate).toHaveBeenCalledTimes(1)
      const orderCreateCall = mockOrderCreate.mock.calls[0][0]
      expect(orderCreateCall.data.status).toBe('CONFIRMED')

      // 5. Verify stock is decremented
      expect(mockProductUpdate).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { decrement: 2 } },
      })

      // 6. Verify orderNumber is generated
      expect(mockGetNextOrderNumber).toHaveBeenCalled()
      expect(orderCreateCall.data.orderNumber).toBe('CMD-2026-0001')

      // Mocks: Resend (email) and audit not called in a way that fails the flow
      expect(mockSendOrderConfirmationEmail).toHaveBeenCalled()
      expect(mockLogEntityCreation).toHaveBeenCalledWith(
        'ORDER_CREATED',
        'ORDER',
        'order-test-1',
        expect.anything(),
        expect.objectContaining({
          orderNumber: 'CMD-2026-0001',
          status: 'CONFIRMED',
          total: 200,
          itemsCount: 1,
        })
      )
    })

    it('should set requiresAdminApproval when line has negative margin', async () => {
      const highCostProduct = {
        ...defaultMockProduct,
        cost: 150,
        options: [] as { id: string }[],
      }
      mockProductFindUnique.mockResolvedValue(highCostProduct)
      mockProductFindMany.mockResolvedValue([highCostProduct])
      const { createOrderAction } = await import('@/app/actions/order')
      const result = await createOrderAction([{ productId: 'prod-1', quantity: 2 }])
      expect(result).not.toHaveProperty('error')
      expect(mockOrderCreate).toHaveBeenCalled()
      const orderCreateCall = mockOrderCreate.mock.calls[0][0]
      expect(orderCreateCall.data.requiresAdminApproval).toBe(true)
    })

    it('should set requiresAdminApproval false when margin is positive', async () => {
      const normalProduct = { ...defaultMockProduct, cost: 50, options: [] as { id: string }[] }
      mockProductFindUnique.mockResolvedValue(normalProduct)
      mockProductFindMany.mockResolvedValue([normalProduct])
      const { createOrderAction } = await import('@/app/actions/order')
      const result = await createOrderAction([{ productId: 'prod-1', quantity: 2 }])
      expect(result).not.toHaveProperty('error')
      expect(mockOrderCreate).toHaveBeenCalled()
      const orderCreateCall = mockOrderCreate.mock.calls[0][0]
      expect(orderCreateCall.data.requiresAdminApproval).toBe(false)
    })
  })

  describe('Order Status Transitions', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockGetDeliveryNoteNumber.mockReturnValue('BL-2026-0001')
      mockDeliveryNoteCreate.mockResolvedValue({ number: 'BL-2026-0001', orderId: 'order-1' })
    })

    it('should derive BL number from order number in createDeliveryNoteAction', async () => {
      mockGetSession.mockResolvedValue({
        id: 'mag-1',
        email: 'mag@test.com',
        role: 'MAGASINIER',
        name: 'Magasinier',
      })
      mockOrderFindUnique.mockResolvedValue({
        id: 'order-1',
        status: 'PREPARED',
        orderNumber: 'CMD-2026-0049',
        createdAt: new Date('2026-03-01'),
        deliveryNoteNumber: null,
        items: [],
        invoice: null,
      })
      mockGetDeliveryNoteNumber.mockReturnValue('BL-2026-0049')
      mockDeliveryNoteCreate.mockResolvedValue({ number: 'BL-2026-0049', orderId: 'order-1' })

      const { createDeliveryNoteAction } = await import('@/app/actions/admin-orders')
      const result = await createDeliveryNoteAction('order-1')

      expect(result?.error).toBeUndefined()
      expect(result).toEqual({ success: true, deliveryNoteNumber: 'BL-2026-0049' })
      expect(mockGetDeliveryNoteNumber).toHaveBeenCalledWith('CMD-2026-0049', expect.any(Date))
      expect(mockDeliveryNoteCreate).toHaveBeenCalledWith({
        data: { number: 'BL-2026-0049', orderId: 'order-1' },
      })
      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { deliveryNoteNumber: 'BL-2026-0049' },
      })
    })

    it('should allow CONFIRMED -> PREPARED transition', async () => {
      mockGetSession.mockResolvedValue({
        id: 'mag-1',
        email: 'mag@test.com',
        role: 'MAGASINIER',
        name: 'Magasinier',
      })
      mockOrderFindUnique.mockResolvedValue({
        id: 'order-1',
        status: 'CONFIRMED',
        orderNumber: 'CMD-2026-0001',
        deliveryNoteNumber: null,
        requiresAdminApproval: false,
        userId: 'user-1',
        createdAt: new Date(),
        total: 200,
        items: [{ productId: 'prod-1', quantity: 2 }],
        invoice: null,
      })
      const { updateOrderStatus } = await import('@/app/actions/admin-orders')
      const result = await updateOrderStatus('order-1', 'PREPARED')
      expect(result?.error).toBeUndefined()
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PREPARED',
            deliveryNoteNumber: 'BL-2026-0001',
          }),
        })
      )
    })

    it('should allow PREPARED -> SHIPPED transition when delivery agent is assigned', async () => {
      mockGetSession.mockResolvedValue({
        id: 'mag-1',
        email: 'mag@test.com',
        role: 'MAGASINIER',
        name: 'Magasinier',
      })
      mockOrderFindUnique
        .mockResolvedValueOnce({
          id: 'order-1',
          status: 'PREPARED',
          orderNumber: 'CMD-2026-0001',
          deliveryNoteNumber: 'BL-2026-0001',
          requiresAdminApproval: false,
          userId: 'user-1',
          createdAt: new Date(),
          total: 200,
          items: [],
          invoice: null,
        })
        .mockResolvedValueOnce({ deliveryAgentName: 'Ahmed Livreur' })

      const { updateOrderStatus } = await import('@/app/actions/admin-orders')
      const result = await updateOrderStatus('order-1', 'SHIPPED')

      expect(result?.error).toBeUndefined()
      expect(mockPrismaOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            status: 'SHIPPED',
            updatedBy: 'mag-1',
          }),
        })
      )
      expect(mockPrismaOrderUpdate.mock.calls[0][0].data.shippedAt).toBeInstanceOf(Date)
    })

    it('should reject PREPARED -> SHIPPED without delivery agent', async () => {
      mockGetSession.mockResolvedValue({
        id: 'mag-1',
        email: 'mag@test.com',
        role: 'MAGASINIER',
        name: 'Magasinier',
      })
      mockOrderFindUnique
        .mockResolvedValueOnce({
          id: 'order-1',
          status: 'PREPARED',
          orderNumber: 'CMD-2026-0001',
          deliveryNoteNumber: 'BL-2026-0001',
          requiresAdminApproval: false,
          userId: 'user-1',
          createdAt: new Date(),
          total: 200,
          items: [],
          invoice: null,
        })
        .mockResolvedValueOnce({ deliveryAgentName: null })

      const { updateOrderStatus } = await import('@/app/actions/admin-orders')
      const result = await updateOrderStatus('order-1', 'SHIPPED')

      expect(result?.error).toBeDefined()
      expect(result?.error).toMatch(/livreur/i)
    })

    it('should reject DELIVERED via updateOrderStatus (use specialized action)', async () => {
      mockGetSession.mockResolvedValue({
        id: 'mag-1',
        email: 'mag@test.com',
        role: 'MAGASINIER',
        name: 'Magasinier',
      })
      mockOrderFindUnique.mockResolvedValue({
        id: 'order-1',
        status: 'SHIPPED',
        orderNumber: 'CMD-2026-0001',
        deliveryNoteNumber: 'BL-2026-0001',
        requiresAdminApproval: false,
        userId: 'user-1',
        createdAt: new Date(),
        total: 200,
        items: [],
        invoice: null,
      })

      const { updateOrderStatus } = await import('@/app/actions/admin-orders')
      const result = await updateOrderStatus('order-1', 'DELIVERED')

      expect(result?.error).toBeDefined()
      expect(result?.error).toMatch(/action spécialisée/i)
    })

    it('should prevent invalid transitions', async () => {
      mockGetSession.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'ADMIN',
        name: 'Admin',
      })
      const { updateOrderStatus } = await import('@/app/actions/admin-orders')

      mockOrderFindUnique.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERED',
        orderNumber: 'CMD-001',
        deliveryNoteNumber: 'BL-001',
        requiresAdminApproval: false,
        userId: 'user-1',
        total: 200,
        items: [],
        invoice: null,
      })
      const resultDelivered = await updateOrderStatus('order-1', 'CONFIRMED')
      expect(resultDelivered?.error).toBeDefined()
      expect(resultDelivered?.error).toContain('livrée')

      mockOrderFindUnique.mockResolvedValue({
        id: 'order-2',
        status: 'CANCELLED',
        orderNumber: 'CMD-002',
        deliveryNoteNumber: null,
        requiresAdminApproval: false,
        userId: 'user-1',
        total: 100,
        items: [],
        invoice: null,
      })
      const resultCancelled = await updateOrderStatus('order-2', 'PREPARED')
      expect(resultCancelled?.error).toBeDefined()
      expect(resultCancelled?.error).toMatch(/annulée|Transition invalide/)
    })
  })

  describe('Invoice Creation', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockGetInvoiceNumber.mockReturnValue('FAC-2026-0001')
      mockInvoiceFindUniqueTx.mockResolvedValue(null)
      mockInvoiceCreateTx.mockResolvedValue({ id: 'inv-1' })
      mockTxOrderFindUnique.mockResolvedValue({
        total: 200,
        orderNumber: 'CMD-2026-0001',
        createdAt: new Date('2026-01-15'),
      })
    })

    it('should create invoice when order is delivered via markOrderDeliveredAction', async () => {
      mockGetSession.mockResolvedValue({
        id: 'mag-1',
        email: 'mag@test.com',
        role: 'MAGASINIER',
        name: 'Magasinier',
      })
      mockOrderFindUnique.mockResolvedValue({ status: 'SHIPPED' })

      const { markOrderDeliveredAction } = await import('@/app/actions/admin-orders')
      const result = await markOrderDeliveredAction('order-1', {
        deliveredToName: 'Dr. Client',
      })

      expect(result?.error).toBeUndefined()
      expect(result).toEqual({ success: true })
      expect(mockGetInvoiceNumber).toHaveBeenCalled()
      expect(mockInvoiceCreateTx).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          invoiceNumber: 'FAC-2026-0001',
          amount: 200,
          balance: 200,
          status: 'UNPAID',
        },
      })
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            status: 'DELIVERED',
            deliveredToName: 'Dr. Client',
            updatedBy: 'mag-1',
          }),
        })
      )
    })

    it('should derive invoice number from order number on delivery', async () => {
      mockGetSession.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        role: 'ADMIN',
        name: 'Admin',
      })
      mockOrderFindUnique.mockResolvedValue({ status: 'SHIPPED' })
      mockTxOrderFindUnique.mockResolvedValue({
        total: 350,
        orderNumber: 'CMD-2026-0042',
        createdAt: new Date('2026-02-01'),
      })
      mockGetInvoiceNumber.mockReturnValue('FAC-2026-0042')

      const { markOrderDeliveredAction } = await import('@/app/actions/admin-orders')
      await markOrderDeliveredAction('order-42', { deliveredToName: 'Client Test' })

      expect(mockGetInvoiceNumber).toHaveBeenCalledWith('CMD-2026-0042', expect.any(Date))
      expect(mockInvoiceCreateTx).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: 'FAC-2026-0042',
            amount: 350,
          }),
        })
      )
    })

    it('should skip invoice creation if one already exists', async () => {
      mockGetSession.mockResolvedValue({
        id: 'mag-1',
        email: 'mag@test.com',
        role: 'MAGASINIER',
        name: 'Magasinier',
      })
      mockOrderFindUnique.mockResolvedValue({ status: 'SHIPPED' })
      mockInvoiceFindUniqueTx.mockResolvedValue({ id: 'existing-inv' })

      const { markOrderDeliveredAction } = await import('@/app/actions/admin-orders')
      const result = await markOrderDeliveredAction('order-1', {
        deliveredToName: 'Dr. Client',
      })

      expect(result?.error).toBeUndefined()
      expect(mockInvoiceCreateTx).not.toHaveBeenCalled()
    })
  })
})
