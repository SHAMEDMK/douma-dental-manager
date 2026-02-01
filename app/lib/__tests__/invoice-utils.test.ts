import { describe, it, expect } from 'vitest'
import {
  calculateTotalPaid,
  calculateLineItemsTotal,
  formatMoney,
  calculateInvoiceTotalTTC,
  calculateInvoiceRemaining,
  calculateInvoiceStatusWithPayments,
} from '../invoice-utils'

describe('Invoice Utilities', () => {
  describe('calculateTotalPaid', () => {
    it('should sum all payment amounts', () => {
      const payments = [
        { amount: 50 },
        { amount: 30 },
        { amount: 20 },
      ]
      expect(calculateTotalPaid(payments)).toBe(100)
    })

    it('should return 0 for empty array', () => {
      expect(calculateTotalPaid([])).toBe(0)
    })

    it('should handle decimal amounts', () => {
      const payments = [
        { amount: 50.50 },
        { amount: 29.75 },
      ]
      expect(calculateTotalPaid(payments)).toBe(80.25)
    })
  })

  describe('calculateLineItemsTotal', () => {
    it('should calculate total from quantity and price', () => {
      const items = [
        { quantity: 2, priceAtTime: 50 },
        { quantity: 3, priceAtTime: 30 },
      ]
      expect(calculateLineItemsTotal(items)).toBe(190)
    })

    it('should return 0 for empty array', () => {
      expect(calculateLineItemsTotal([])).toBe(0)
    })

    it('should handle decimal quantities and prices', () => {
      const items = [
        { quantity: 1.5, priceAtTime: 10.5 },
      ]
      expect(calculateLineItemsTotal(items)).toBe(15.75)
    })
  })

  describe('formatMoney', () => {
    it('should format to 2 decimal places', () => {
      expect(formatMoney(100)).toBe('100.00')
      expect(formatMoney(100.5)).toBe('100.50')
      expect(formatMoney(100.567)).toBe('100.57')
    })

    it('should handle zero', () => {
      expect(formatMoney(0)).toBe('0.00')
    })

    it('should handle non-finite numbers', () => {
      expect(formatMoney(Infinity)).toBe('0.00')
      expect(formatMoney(NaN)).toBe('0.00')
    })
  })

  describe('calculateInvoiceTotalTTC', () => {
    it('should calculate TTC with default 20% VAT', () => {
      expect(calculateInvoiceTotalTTC(100)).toBe(120)
    })

    it('should calculate TTC with custom VAT rate', () => {
      expect(calculateInvoiceTotalTTC(100, 0.1)).toBe(110)
    })

    it('should round correctly', () => {
      expect(calculateInvoiceTotalTTC(99.99)).toBe(119.99)
    })
  })

  describe('calculateInvoiceRemaining', () => {
    it('should calculate remaining amount correctly', () => {
      expect(calculateInvoiceRemaining(100, 50)).toBe(70) // 120 - 50 = 70
    })

    it('should return 0 when fully paid', () => {
      expect(calculateInvoiceRemaining(100, 120)).toBe(0)
    })

    it('should never return negative', () => {
      expect(calculateInvoiceRemaining(100, 150)).toBe(0)
    })

    it('should handle custom VAT rate', () => {
      expect(calculateInvoiceRemaining(100, 50, 0.1)).toBe(60) // 110 - 50 = 60
    })
  })

  describe('calculateInvoiceStatusWithPayments', () => {
    it('should return PAID when remaining is 0', () => {
      expect(calculateInvoiceStatusWithPayments(0, 120)).toBe('PAID')
      expect(calculateInvoiceStatusWithPayments(0.01, 120)).toBe('PAID')
    })

    it('should return PARTIAL when partially paid', () => {
      expect(calculateInvoiceStatusWithPayments(50, 70)).toBe('PARTIAL')
    })

    it('should return UNPAID when no payment made', () => {
      expect(calculateInvoiceStatusWithPayments(120, 0)).toBe('UNPAID')
    })
  })
})
