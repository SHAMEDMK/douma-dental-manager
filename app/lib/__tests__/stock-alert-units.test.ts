import { describe, expect, it } from 'vitest'
import { stockUnitNeedsAttention } from '@/app/lib/stock-alert-units'

describe('stockUnitNeedsAttention', () => {
  it('rupture when stock is 0', () => {
    expect(stockUnitNeedsAttention(0, 0)).toBe(true)
    expect(stockUnitNeedsAttention(0, 10)).toBe(true)
  })

  it('OK when min not set and stock positive', () => {
    expect(stockUnitNeedsAttention(5, 0)).toBe(false)
  })

  it('stock bas when above 0 but at or below min', () => {
    expect(stockUnitNeedsAttention(3, 10)).toBe(true)
    expect(stockUnitNeedsAttention(10, 10)).toBe(true)
  })

  it('OK when above min', () => {
    expect(stockUnitNeedsAttention(11, 10)).toBe(false)
  })
})
