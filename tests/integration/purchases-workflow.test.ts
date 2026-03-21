/**
 * Integration tests for purchases workflow (module Achats).
 * Covers: fournisseur, PO DRAFT/SENT, réception partielle/totale, refus métier, RBAC, StockMovement.
 * Run: npm run test:run
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
const mockLogEntityCreation = vi.fn()
const mockLogEntityUpdate = vi.fn()
const mockLogStatusChange = vi.fn()
const mockGetNextPurchaseOrderNumber = vi.fn()

vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}))

vi.mock('@/lib/audit', () => ({
  logEntityCreation: (...args: unknown[]) => mockLogEntityCreation(...args),
  logEntityUpdate: (...args: unknown[]) => mockLogEntityUpdate(...args),
  logStatusChange: (...args: unknown[]) => mockLogStatusChange(...args),
}))

vi.mock('@/app/lib/sequence', () => ({
  getNextPurchaseOrderNumber: (_tx: unknown, _date?: Date) => mockGetNextPurchaseOrderNumber(_tx, _date),
}))

vi.mock('@/app/lib/accounting-close', () => ({
  isAccountingClosedFor: vi.fn().mockReturnValue(false),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// State for transaction simulation
let mockSupplierId = 'supplier-1'
let mockPOId = 'po-1'
let mockPOItemId = 'po-item-1'
let mockProductStock = 10
let mockVariantStock = 5

const mockSupplierCreate = vi.fn()
const mockSupplierFindUnique = vi.fn()
const mockSupplierUpdate = vi.fn()
const mockPurchaseOrderCreate = vi.fn()
const mockPurchaseOrderFindUnique = vi.fn()
const mockPurchaseOrderUpdate = vi.fn()
const mockPurchaseOrderItemUpdate = vi.fn()
const mockPurchaseReceiptCreate = vi.fn()
const mockProductFindUnique = vi.fn()
const mockProductUpdate = vi.fn()
const mockProductVariantFindUnique = vi.fn()
const mockProductVariantUpdate = vi.fn()
const mockStockMovementCreate = vi.fn()
const mockCompanySettingsFindUnique = vi.fn()

const mockTx = {
  supplier: { create: mockSupplierCreate, findUnique: mockSupplierFindUnique, update: mockSupplierUpdate },
  purchaseOrder: {
    create: mockPurchaseOrderCreate,
    findUnique: mockPurchaseOrderFindUnique,
    update: mockPurchaseOrderUpdate,
  },
  purchaseOrderItem: { update: mockPurchaseOrderItemUpdate },
  purchaseReceipt: { create: mockPurchaseReceiptCreate },
  product: { findUnique: mockProductFindUnique, update: mockProductUpdate },
  productVariant: { findUnique: mockProductVariantFindUnique, update: mockProductVariantUpdate },
  stockMovement: { create: mockStockMovementCreate },
  globalSequence: { upsert: vi.fn(), update: vi.fn().mockResolvedValue({ seq: 1 }) },
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    supplier: { create: mockSupplierCreate, findUnique: mockSupplierFindUnique, update: mockSupplierUpdate },
    purchaseOrder: {
      create: mockPurchaseOrderCreate,
      findUnique: mockPurchaseOrderFindUnique,
      update: mockPurchaseOrderUpdate,
    },
    purchaseOrderItem: { update: mockPurchaseOrderItemUpdate },
    purchaseReceipt: { create: mockPurchaseReceiptCreate },
    product: { findUnique: mockProductFindUnique, update: mockProductUpdate },
    productVariant: { findUnique: mockProductVariantFindUnique, update: mockProductVariantUpdate },
    stockMovement: { create: mockStockMovementCreate },
    companySettings: { findUnique: mockCompanySettingsFindUnique },
    globalSequence: mockTx.globalSequence,
    $transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
  },
}))

const adminSession = { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN', name: 'Admin' }
const commercialSession = { id: 'com-1', email: 'com@test.com', role: 'COMMERCIAL', name: 'Commercial' }
const magasinierSession = { id: 'mag-1', email: 'mag@test.com', role: 'MAGASINIER', name: 'Magasinier' }
const clientSession = { id: 'cli-1', email: 'cli@test.com', role: 'CLIENT', name: 'Client' }

describe('Purchases Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPurchaseOrderFindUnique.mockResolvedValue(null)
    mockGetSession.mockResolvedValue(adminSession)
    mockLogEntityCreation.mockResolvedValue(undefined)
    mockLogEntityUpdate.mockResolvedValue(undefined)
    mockLogStatusChange.mockResolvedValue(undefined)
    mockGetNextPurchaseOrderNumber.mockResolvedValue('PO-2025-0001')
    mockCompanySettingsFindUnique.mockResolvedValue({ accountingLockedUntil: null })
    // Restore mockTx delegates (test 5 overrides findUnique and leaks to later tests)
    mockTx.purchaseOrder.findUnique = mockPurchaseOrderFindUnique
    mockTx.purchaseOrder.update = mockPurchaseOrderUpdate
    mockTx.purchaseOrder.create = mockPurchaseOrderCreate
  })

  describe('1. Création fournisseur', () => {
    it('should create supplier with ADMIN role', async () => {
      mockSupplierCreate.mockResolvedValue({ id: mockSupplierId, name: 'Fournisseur Test' })
      const { createSupplierAction } = await import('@/app/actions/purchases')
      const result = await createSupplierAction({ name: 'Fournisseur Test', email: 'f@test.com' })
      expect(result.error).toBeUndefined()
      expect(result.supplierId).toBe(mockSupplierId)
      expect(mockSupplierCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Fournisseur Test', email: 'f@test.com' }),
        })
      )
      expect(mockLogEntityCreation).toHaveBeenCalledWith('SUPPLIER_CREATED', 'SUPPLIER', mockSupplierId, expect.anything(), expect.any(Object))
    })

    it('should create supplier with COMMERCIAL role', async () => {
      mockGetSession.mockResolvedValue(commercialSession)
      mockSupplierCreate.mockResolvedValue({ id: mockSupplierId, name: 'F' })
      const { createSupplierAction } = await import('@/app/actions/purchases')
      const result = await createSupplierAction({ name: 'Fournisseur B' })
      expect(result.error).toBeUndefined()
    })

    it('should refuse creation when not authenticated (RBAC)', async () => {
      mockGetSession.mockResolvedValue(null)
      const { createSupplierAction } = await import('@/app/actions/purchases')
      const result = await createSupplierAction({ name: 'Test' })
      expect(result.error).toBeDefined()
      expect(result.error).toMatch(/authentifié|autorise/i)
      expect(mockSupplierCreate).not.toHaveBeenCalled()
    })

    it('should refuse creation when CLIENT role (RBAC)', async () => {
      mockGetSession.mockResolvedValue(clientSession)
      const { createSupplierAction } = await import('@/app/actions/purchases')
      const result = await createSupplierAction({ name: 'Test' })
      expect(result.error).toBeDefined()
      expect(mockSupplierCreate).not.toHaveBeenCalled()
    })

    it('should refuse creation when name is empty', async () => {
      const { createSupplierAction } = await import('@/app/actions/purchases')
      const result = await createSupplierAction({ name: '' })
      expect(result.error).toContain('nom')
      expect(mockSupplierCreate).not.toHaveBeenCalled()
    })
  })

  describe('2. Modification fournisseur', () => {
    it('should update supplier with valid data', async () => {
      mockSupplierFindUnique.mockResolvedValue({ id: mockSupplierId, name: 'Ancien Nom' })
      mockSupplierUpdate.mockResolvedValue({})
      const { updateSupplierAction } = await import('@/app/actions/purchases')
      const result = await updateSupplierAction(mockSupplierId, { name: 'Nouveau Nom', email: 'new@test.com' })
      expect(result.error).toBeUndefined()
      expect(mockSupplierUpdate).toHaveBeenCalledWith({
        where: { id: mockSupplierId },
        data: expect.objectContaining({ name: 'Nouveau Nom', email: 'new@test.com' }),
      })
      expect(mockLogEntityUpdate).toHaveBeenCalledWith('SUPPLIER_UPDATED', 'SUPPLIER', mockSupplierId, expect.anything(), expect.any(Object), expect.any(Object))
    })

    it('should refuse update when supplier not found', async () => {
      mockSupplierFindUnique.mockResolvedValue(null)
      const { updateSupplierAction } = await import('@/app/actions/purchases')
      const result = await updateSupplierAction('invalid-id', { name: 'Test' })
      expect(result.error).toContain('introuvable')
      expect(mockSupplierUpdate).not.toHaveBeenCalled()
    })

    it('should refuse update when name is empty', async () => {
      mockSupplierFindUnique.mockResolvedValue({ id: mockSupplierId })
      const { updateSupplierAction } = await import('@/app/actions/purchases')
      const result = await updateSupplierAction(mockSupplierId, { name: '   ' })
      expect(result.error).toContain('nom')
      expect(mockSupplierUpdate).not.toHaveBeenCalled()
    })
  })

  describe('3. Création PO en DRAFT', () => {
    it('should create PO in DRAFT with PO-YYYY-XXXX number', async () => {
      mockSupplierFindUnique.mockResolvedValue({ id: mockSupplierId })
      mockGetNextPurchaseOrderNumber.mockResolvedValue('PO-2025-0042')
      mockPurchaseOrderCreate.mockResolvedValue({
        id: mockPOId,
        orderNumber: 'PO-2025-0042',
        status: 'DRAFT',
        items: [{ id: mockPOItemId }],
      })
      const { createPurchaseOrderAction } = await import('@/app/actions/purchases')
      const result = await createPurchaseOrderAction(mockSupplierId, [
        { productId: 'prod-1', quantityOrdered: 10, unitCost: 5 },
      ])
      expect(result.error).toBeUndefined()
      expect(result.purchaseOrderId).toBe(mockPOId)
      expect(mockGetNextPurchaseOrderNumber).toHaveBeenCalled()
      expect(mockPurchaseOrderCreate).toHaveBeenCalled()
      const createData = mockPurchaseOrderCreate.mock.calls[0][0].data
      expect(createData.status).toBe('DRAFT')
      expect(createData.orderNumber).toBe('PO-2025-0042')
    })

    it('should refuse when supplier not found', async () => {
      mockSupplierFindUnique.mockResolvedValue(null)
      const { createPurchaseOrderAction } = await import('@/app/actions/purchases')
      const result = await createPurchaseOrderAction('invalid', [{ productId: 'p1', quantityOrdered: 1, unitCost: 1 }])
      expect(result.error).toContain('Fournisseur')
      expect(mockPurchaseOrderCreate).not.toHaveBeenCalled()
    })

    it('should refuse when items invalid (quantity 0)', async () => {
      mockSupplierFindUnique.mockResolvedValue({ id: mockSupplierId })
      const { createPurchaseOrderAction } = await import('@/app/actions/purchases')
      const result = await createPurchaseOrderAction(mockSupplierId, [
        { productId: 'p1', quantityOrdered: 0, unitCost: 5 },
      ])
      expect(result.error).toMatch(/invalides|Articles/)
    })
  })

  describe('4. Passage DRAFT -> SENT', () => {
    it('should send PO (DRAFT -> SENT)', async () => {
      mockPurchaseOrderFindUnique.mockResolvedValue({
        id: mockPOId,
        status: 'DRAFT',
        createdAt: new Date(),
      })
      mockPurchaseOrderUpdate.mockResolvedValue({})
      const { sendPurchaseOrderAction } = await import('@/app/actions/purchases')
      const result = await sendPurchaseOrderAction(mockPOId)
      expect(result.error).toBeUndefined()
      expect(mockPurchaseOrderUpdate).toHaveBeenCalledWith({
        where: { id: mockPOId },
        data: expect.objectContaining({ status: 'SENT' }),
      })
      expect(mockLogStatusChange).toHaveBeenCalledWith('PURCHASE_ORDER_STATUS_CHANGED', 'PURCHASE_ORDER', mockPOId, 'DRAFT', 'SENT', expect.anything())
    })

    it('should refuse send when PO already SENT', async () => {
      mockPurchaseOrderFindUnique.mockResolvedValue({ id: mockPOId, status: 'SENT', createdAt: new Date() })
      const { sendPurchaseOrderAction } = await import('@/app/actions/purchases')
      const result = await sendPurchaseOrderAction(mockPOId)
      expect(result.error).toMatch(/brouillon|envoyée/)
      expect(mockPurchaseOrderUpdate).not.toHaveBeenCalled()
    })
  })

  describe('5. Réception partielle', () => {
    const poWithItems = {
      id: mockPOId,
      status: 'SENT',
      items: [
        {
          id: mockPOItemId,
          productId: 'prod-1',
          productVariantId: null,
          quantityOrdered: 10,
          quantityReceived: 0,
          product: { name: 'Produit A' },
          productVariant: null,
        },
      ],
    }

    it('should create receipt with partial quantities', async () => {
      mockGetSession.mockResolvedValue(magasinierSession)
      mockPurchaseOrderFindUnique.mockResolvedValue(poWithItems)
      mockPurchaseReceiptCreate.mockResolvedValue({ id: 'receipt-1', items: [{ quantityReceived: 3 }] })
      mockProductFindUnique.mockResolvedValue({ id: 'prod-1', stock: mockProductStock })
      mockProductUpdate.mockResolvedValue({})
      mockStockMovementCreate.mockResolvedValue({})
      mockPurchaseOrderItemUpdate.mockResolvedValue({})

      const { createPurchaseReceiptAction } = await import('@/app/actions/purchases')
      const result = await createPurchaseReceiptAction(mockPOId, [
        { purchaseOrderItemId: mockPOItemId, quantityReceived: 3 },
      ])
      expect(result.error).toBeUndefined()
      expect(result.purchaseReceiptId).toBe('receipt-1')
      expect(mockStockMovementCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'IN',
            source: 'PURCHASE_RECEIPT',
            quantity: 3,
            productId: 'prod-1',
          }),
        })
      )
    })
  })

  describe('6. Réception complète', () => {
    it('should update PO to RECEIVED when all items fully received', async () => {
      const poWithPartial = {
        id: mockPOId,
        status: 'PARTIALLY_RECEIVED',
        items: [
          {
            id: mockPOItemId,
            productId: 'prod-1',
            productVariantId: null,
            quantityOrdered: 10,
            quantityReceived: 7,
            product: { name: 'Produit A' },
            productVariant: null,
          },
        ],
      }
      mockPurchaseOrderFindUnique.mockImplementation(async () =>
        mockPurchaseOrderFindUnique.mock.calls.length < 2
          ? poWithPartial
          : { ...poWithPartial, items: [{ ...poWithPartial.items[0], quantityReceived: 10 }] }
      )
      mockPurchaseReceiptCreate.mockResolvedValue({ id: 'receipt-2' })
      mockProductFindUnique.mockResolvedValue({ stock: 10 })
      mockProductUpdate.mockResolvedValue({})
      mockStockMovementCreate.mockResolvedValue({})
      mockPurchaseOrderItemUpdate.mockResolvedValue({})
      mockPurchaseOrderUpdate.mockResolvedValue({})

      mockGetSession.mockResolvedValue(magasinierSession)

      const { createPurchaseReceiptAction } = await import('@/app/actions/purchases')
      await createPurchaseReceiptAction(mockPOId, [{ purchaseOrderItemId: mockPOItemId, quantityReceived: 3 }])

      expect(mockPurchaseOrderUpdate).toHaveBeenCalledWith({
        where: { id: mockPOId },
        data: expect.objectContaining({ status: 'RECEIVED' }),
      })
    })
  })

  describe('7. Refus de sur-réception', () => {
    it('should refuse when quantityReceived > remaining', async () => {
      const poWithPartial = {
        id: mockPOId,
        status: 'SENT',
        items: [
          {
            id: mockPOItemId,
            productId: 'prod-1',
            productVariantId: null,
            quantityOrdered: 10,
            quantityReceived: 8,
            product: { name: 'Produit X' },
            productVariant: null,
          },
        ],
      }
      mockPurchaseOrderFindUnique.mockResolvedValue(poWithPartial)
      mockGetSession.mockResolvedValue(magasinierSession)

      const { createPurchaseReceiptAction } = await import('@/app/actions/purchases')
      const result = await createPurchaseReceiptAction(mockPOId, [
        { purchaseOrderItemId: mockPOItemId, quantityReceived: 5 },
      ])
      expect(result.error).toBeDefined()
      expect(result.error).toMatch(/supérieure|reste|2/)
      expect(mockStockMovementCreate).not.toHaveBeenCalled()
    })
  })

  describe('8. Refus d\'annulation après réception', () => {
    it('should refuse cancel when PO has receipts', async () => {
      mockPurchaseOrderFindUnique.mockResolvedValue({
        id: mockPOId,
        status: 'SENT',
        createdAt: new Date(),
        receipts: [{ id: 'r1' }],
        items: [],
      })
      const { cancelPurchaseOrderAction } = await import('@/app/actions/purchases')
      const result = await cancelPurchaseOrderAction(mockPOId)
      expect(result.error).toBeDefined()
      expect(result.error).toMatch(/réceptions|ayant/)
      expect(mockPurchaseOrderUpdate).not.toHaveBeenCalled()
    })

    it('should refuse cancel when PO is PARTIALLY_RECEIVED', async () => {
      mockPurchaseOrderFindUnique.mockResolvedValue({
        id: mockPOId,
        status: 'PARTIALLY_RECEIVED',
        receipts: [],
        items: [],
      })
      const { cancelPurchaseOrderAction } = await import('@/app/actions/purchases')
      const result = await cancelPurchaseOrderAction(mockPOId)
      expect(result.error).toMatch(/réceptionnée|impossible/)
    })
  })

  describe('9. StockMovement avec source PURCHASE_RECEIPT', () => {
    it('should create StockMovement with source PURCHASE_RECEIPT', async () => {
      const poSent = {
        id: mockPOId,
        status: 'SENT',
        items: [
          {
            id: mockPOItemId,
            productId: 'prod-1',
            productVariantId: null,
            quantityOrdered: 10,
            quantityReceived: 0,
            product: { name: 'P' },
            productVariant: null,
          },
        ],
      }
      mockPurchaseOrderFindUnique.mockResolvedValue(poSent)
      mockPurchaseReceiptCreate.mockResolvedValue({ id: 'receipt-1', items: [] })
      mockProductFindUnique.mockResolvedValue({ stock: 5 })
      mockProductUpdate.mockResolvedValue({})
      mockPurchaseOrderUpdate.mockResolvedValue({})
      mockGetSession.mockResolvedValue(magasinierSession)

      const { createPurchaseReceiptAction } = await import('@/app/actions/purchases')
      await createPurchaseReceiptAction(mockPOId, [{ purchaseOrderItemId: mockPOItemId, quantityReceived: 2 }])

      expect(mockStockMovementCreate).toHaveBeenCalled()
      const call = mockStockMovementCreate.mock.calls[0][0]
      expect(call.data.source).toBe('PURCHASE_RECEIPT')
      expect(call.data.type).toBe('IN')
    })
  })

  describe('10. RBAC', () => {
    it('cancelPurchaseOrder: COMMERCIAL should be refused (ADMIN only)', async () => {
      mockGetSession.mockResolvedValue(commercialSession)
      mockPurchaseOrderFindUnique.mockResolvedValue({
        id: mockPOId,
        status: 'DRAFT',
        createdAt: new Date(),
        receipts: [],
        items: [],
      })
      const { cancelPurchaseOrderAction } = await import('@/app/actions/purchases')
      const result = await cancelPurchaseOrderAction(mockPOId)
      expect(result.error).toBeDefined()
      expect(mockPurchaseOrderUpdate).not.toHaveBeenCalled()
    })

    it('createPurchaseReceipt: COMMERCIAL should be refused (MAGASINIER/ADMIN)', async () => {
      mockGetSession.mockResolvedValue(commercialSession)
      const { createPurchaseReceiptAction } = await import('@/app/actions/purchases')
      const result = await createPurchaseReceiptAction(mockPOId, [
        { purchaseOrderItemId: mockPOItemId, quantityReceived: 1 },
      ])
      expect(result.error).toBeDefined()
    })
  })
})
