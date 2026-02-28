import { describe, it, expect } from 'vitest'
import {
  isInvoiceLocked,
  canModifyOrder,
  canModifyInvoiceAmount,
  ORDER_NOT_MODIFIABLE_ERROR,
  INVOICE_LOCKED_ERROR,
} from '../invoice-lock'

describe('invoice-lock', () => {
  describe('isInvoiceLocked', () => {
    it('returns false for null/undefined', () => {
      expect(isInvoiceLocked(null)).toBe(false)
      expect(isInvoiceLocked(undefined)).toBe(false)
    })

    it('returns true when lockedAt is set', () => {
      expect(isInvoiceLocked({ lockedAt: new Date() })).toBe(true)
    })

    it('returns true when status is PARTIAL or PAID', () => {
      expect(isInvoiceLocked({ status: 'PARTIAL' })).toBe(true)
      expect(isInvoiceLocked({ status: 'PAID' })).toBe(true)
    })

    it('returns true when paidAmount > 0 (via payments)', () => {
      expect(isInvoiceLocked({ payments: [{ amount: 1 }] })).toBe(true)
    })

    it('returns false when no lock signals', () => {
      expect(isInvoiceLocked({ status: 'DRAFT', payments: [] })).toBe(false)
    })
  })

  describe('canModifyOrder', () => {
    it('returns false when order.status === DELIVERED', () => {
      expect(canModifyOrder({ status: 'DELIVERED' })).toBe(false)
      expect(canModifyOrder({ status: 'DELIVERED', invoice: null })).toBe(false)
    })

    it('returns false when order.status === CANCELLED', () => {
      expect(canModifyOrder({ status: 'CANCELLED' })).toBe(false)
    })

    it('returns false when invoice.status === PAID', () => {
      expect(canModifyOrder({ status: 'CONFIRMED', invoice: { createdAt: new Date(), status: 'PAID' } })).toBe(false)
    })

    it('returns false when invoice is locked (PARTIAL)', () => {
      expect(canModifyOrder({ status: 'CONFIRMED', invoice: { createdAt: new Date(), status: 'PARTIAL' } })).toBe(false)
    })

    it('returns true when CONFIRMED and no invoice', () => {
      expect(canModifyOrder({ status: 'CONFIRMED' })).toBe(true)
      expect(canModifyOrder({ status: 'CONFIRMED', invoice: null })).toBe(true)
    })

    it('returns true when PREPARED and invoice draft', () => {
      expect(canModifyOrder({ status: 'PREPARED', invoice: { createdAt: new Date(), status: 'DRAFT' } })).toBe(true)
    })
  })

  describe('canModifyInvoiceAmount', () => {
    it('returns false when invoice is locked', () => {
      expect(canModifyInvoiceAmount({ createdAt: new Date(), lockedAt: new Date() })).toBe(false)
    })

    it('returns true when invoice is not locked', () => {
      expect(canModifyInvoiceAmount({ createdAt: new Date() })).toBe(true)
    })
  })

  describe('error constants', () => {
    it('exports ORDER_NOT_MODIFIABLE_ERROR and INVOICE_LOCKED_ERROR', () => {
      expect(typeof ORDER_NOT_MODIFIABLE_ERROR).toBe('string')
      expect(typeof INVOICE_LOCKED_ERROR).toBe('string')
    })
  })
})
