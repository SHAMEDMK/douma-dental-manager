import { describe, it, expect } from 'vitest'
import { getDeliveryNoteNumberFromOrderNumber } from '../sequence'

describe('Sequence Utilities', () => {
  describe('getDeliveryNoteNumberFromOrderNumber', () => {
    it('should extract sequence from order number correctly', () => {
      const orderNumber = 'CMD-20260114-0029'
      const createdAt = new Date('2026-01-14')
      const result = getDeliveryNoteNumberFromOrderNumber(orderNumber, createdAt)
      expect(result).toBe('BL-20260114-0029')
    })

    it('should handle different dates correctly', () => {
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
})
