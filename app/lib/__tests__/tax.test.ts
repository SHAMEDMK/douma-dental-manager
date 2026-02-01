import { describe, it, expect } from 'vitest'
import { computeTaxTotals } from '../tax'

describe('Tax Utilities', () => {
  describe('computeTaxTotals', () => {
    it('should calculate VAT and TTC correctly with default 20% rate', () => {
      const result = computeTaxTotals(100)
      expect(result.ht).toBe(100)
      expect(result.vat).toBe(20)
      expect(result.ttc).toBe(120)
      expect(result.rate).toBe(0.2)
    })

    it('should calculate VAT and TTC correctly with custom rate', () => {
      const result = computeTaxTotals(100, 0.1)
      expect(result.ht).toBe(100)
      expect(result.vat).toBe(10)
      expect(result.ttc).toBe(110)
      expect(result.rate).toBe(0.1)
    })

    it('should round values correctly to 2 decimal places', () => {
      const result = computeTaxTotals(99.99)
      // The function rounds: 99.99 * 0.2 = 19.998, rounded to 20.00
      expect(result.vat).toBe(20)
      // 99.99 + 20 = 119.99 (already rounded)
      expect(result.ttc).toBe(119.99)
    })

    it('should handle zero amount', () => {
      const result = computeTaxTotals(0)
      expect(result.ht).toBe(0)
      expect(result.vat).toBe(0)
      expect(result.ttc).toBe(0)
    })

    it('should format values correctly', () => {
      const result = computeTaxTotals(100.5)
      expect(result.htFormatted).toBe('100.50')
      expect(result.vatFormatted).toBe('20.10')
      expect(result.ttcFormatted).toBe('120.60')
      expect(result.ratePercent).toBe('20')
    })
  })
})
