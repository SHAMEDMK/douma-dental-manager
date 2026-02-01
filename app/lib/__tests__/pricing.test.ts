import { describe, it, expect } from 'vitest'
import { getPriceForSegment } from '../pricing'

describe('Pricing Utilities', () => {
  describe('getPriceForSegment', () => {
    it('should return price from segmentPrices when available', () => {
      const product = {
        price: 100,
        segmentPrices: [
          { segment: 'LABO', price: 80 },
          { segment: 'DENTISTE', price: 90 },
          { segment: 'REVENDEUR', price: 70 },
        ],
      }
      expect(getPriceForSegment(product, 'LABO')).toBe(80)
      expect(getPriceForSegment(product, 'DENTISTE')).toBe(90)
      expect(getPriceForSegment(product, 'REVENDEUR')).toBe(70)
    })

    it('should fallback to legacy price fields when segmentPrices not available', () => {
      const product = {
        price: 100,
        priceLabo: 80,
        priceDentiste: 90,
        priceRevendeur: 70,
      }
      expect(getPriceForSegment(product, 'LABO')).toBe(80)
      expect(getPriceForSegment(product, 'DENTISTE')).toBe(90)
      expect(getPriceForSegment(product, 'REVENDEUR')).toBe(70)
    })

    it('should fallback to base price when segment price not found', () => {
      const product = {
        price: 100,
        segmentPrices: [
          { segment: 'LABO', price: 80 },
        ],
      }
      expect(getPriceForSegment(product, 'DENTISTE')).toBe(100)
    })

    it('should fallback to base price when no segment prices available', () => {
      const product = {
        price: 100,
      }
      expect(getPriceForSegment(product, 'LABO')).toBe(100)
      expect(getPriceForSegment(product, 'DENTISTE')).toBe(100)
      expect(getPriceForSegment(product, 'REVENDEUR')).toBe(100)
    })

    it('should handle null legacy prices correctly', () => {
      const product = {
        price: 100,
        priceLabo: null,
        priceDentiste: undefined,
      }
      expect(getPriceForSegment(product, 'LABO')).toBe(100)
      expect(getPriceForSegment(product, 'DENTISTE')).toBe(100)
    })
  })
})
