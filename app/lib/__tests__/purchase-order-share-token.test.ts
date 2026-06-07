/** @vitest-environment node */
import { describe, it, expect, beforeAll } from 'vitest'
import {
  createPurchaseOrderShareToken,
  verifyPurchaseOrderShareToken,
  buildPurchaseOrderPublicPageUrl,
} from '../purchase-order-share-token'
import { isPurchaseOrderPubliclyShareable } from '../purchase-order-public-access'

describe('purchase-order share token', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-32-bytes-for-po-share'
  })

  it('creates and verifies a token for the same PO id', async () => {
    const poId = 'po-test-123'
    const token = await createPurchaseOrderShareToken(poId)
    expect(await verifyPurchaseOrderShareToken(token)).toBe(poId)
  })

  it('rejects tampered token', async () => {
    const token = await createPurchaseOrderShareToken('po-a')
    expect(await verifyPurchaseOrderShareToken(token + 'x')).toBeNull()
  })

  it('builds public page URL with token in path', () => {
    process.env.APP_URL = 'https://erp.example.com'
    const url = buildPurchaseOrderPublicPageUrl('po-1', 'aaa.bbb.ccc')
    expect(url).toBe('https://erp.example.com/public/purchases/po-1/aaa.bbb.ccc')
  })

  it('normalizes query token input', async () => {
    const { normalizeShareTokenInput } = await import('../purchase-order-share-token')
    expect(normalizeShareTokenInput('  tok.test.sig  ')).toBe('tok.test.sig')
    expect(normalizeShareTokenInput(['tok.test.sig'])).toBe('tok.test.sig')
    expect(normalizeShareTokenInput(null)).toBeNull()
  })
})

describe('purchase-order public access', () => {
  it('allows SENT and blocks DRAFT', () => {
    expect(isPurchaseOrderPubliclyShareable('SENT')).toBe(true)
    expect(isPurchaseOrderPubliclyShareable('RECEIVED')).toBe(true)
    expect(isPurchaseOrderPubliclyShareable('DRAFT')).toBe(false)
    expect(isPurchaseOrderPubliclyShareable('CANCELLED')).toBe(false)
  })
})
