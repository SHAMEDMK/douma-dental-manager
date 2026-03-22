import { describe, it, expect } from 'vitest'
import {
  getDeliveryNoteNumberFromOrderNumber,
  getInvoiceNumberFromOrderNumber,
  parseCmdOrderNumber,
} from '../sequence'

describe('Sequence Utilities', () => {
  describe('parseCmdOrderNumber', () => {
    it('parses legacy CMD-YYYYMMDD-NNNN', () => {
      expect(parseCmdOrderNumber('CMD-20260114-0029')).toEqual({ middle: '20260114', seq: '0029' })
    })
    it('parses unified CMD-YYYY-NNNN', () => {
      expect(parseCmdOrderNumber('CMD-2026-0042')).toEqual({ middle: '2026', seq: '0042' })
    })
    it('returns null for invalid', () => {
      expect(parseCmdOrderNumber('INVALID')).toBeNull()
    })
  })

  describe('getDeliveryNoteNumberFromOrderNumber', () => {
    it('should extract sequence from legacy order number correctly', () => {
      const orderNumber = 'CMD-20260114-0029'
      const createdAt = new Date('2026-01-14')
      const result = getDeliveryNoteNumberFromOrderNumber(orderNumber, createdAt)
      expect(result).toBe('BL-20260114-0029')
    })

    it('maps unified CMD-YYYY-NNNN to BL-YYYY-NNNN', () => {
      const orderNumber = 'CMD-2026-0049'
      const createdAt = new Date('2026-03-22')
      expect(getDeliveryNoteNumberFromOrderNumber(orderNumber, createdAt)).toBe('BL-2026-0049')
    })

    it('should handle different dates correctly (legacy)', () => {
      const orderNumber = 'CMD-20251225-0001'
      const createdAt = new Date('2025-12-25')
      const result = getDeliveryNoteNumberFromOrderNumber(orderNumber, createdAt)
      expect(result).toBe('BL-20251225-0001')
    })

    it('should handle null order number with fallback', () => {
      const createdAt = new Date('2026-01-14')
      const result = getDeliveryNoteNumberFromOrderNumber(null, createdAt)
      expect(result).toMatch(/^BL-20260114-/)
    })

    it('should handle undefined order number with fallback', () => {
      const createdAt = new Date('2026-01-14')
      const result = getDeliveryNoteNumberFromOrderNumber(undefined, createdAt)
      expect(result).toMatch(/^BL-20260114-/)
    })

    it('should handle invalid format with fallback', () => {
      const orderNumber = 'INVALID-FORMAT'
      const createdAt = new Date('2026-01-14')
      const result = getDeliveryNoteNumberFromOrderNumber(orderNumber, createdAt)
      expect(result).toBe('BL-20260114-0000')
    })
  })

  describe('getInvoiceNumberFromOrderNumber', () => {
    it('maps unified CMD to FAC', () => {
      expect(
        getInvoiceNumberFromOrderNumber('CMD-2026-0003', new Date('2026-01-01'))
      ).toBe('FAC-2026-0003')
    })
    it('maps legacy CMD to FAC (date in middle)', () => {
      expect(
        getInvoiceNumberFromOrderNumber('CMD-20260312-0002', new Date('2026-03-12'))
      ).toBe('FAC-20260312-0002')
    })
  })
})
