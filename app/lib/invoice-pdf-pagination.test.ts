import { describe, expect, it } from 'vitest'
import {
  getInitialFirstPageCount,
  paginateItems,
} from './invoice-pdf-pagination'

describe('invoice-pdf-pagination', () => {
  it('getInitialFirstPageCount: 10 lignes → 6 sur page 1', () => {
    expect(getInitialFirstPageCount(10)).toBe(6)
  })

  it('paginateItems: 10 lignes → 6 + 4 (pas 4 + 6)', () => {
    const items = Array.from({ length: 10 }, (_, i) => i)
    const slices = paginateItems(items)
    expect(slices).toHaveLength(2)
    expect(slices[0]!.items).toHaveLength(6)
    expect(slices[1]!.items).toHaveLength(4)
    expect(slices[0]!.isContinuation).toBe(false)
    expect(slices[1]!.isContinuation).toBe(true)
  })

  it('paginateItems: ≤8 lignes → une page', () => {
    expect(paginateItems([1, 2]).length).toBe(1)
    expect(paginateItems(Array.from({ length: 8 }, (_, i) => i))[0]!.items).toHaveLength(8)
  })

  it('paginateItems: 9 lignes → 5 + 4', () => {
    const slices = paginateItems(Array.from({ length: 9 }, (_, i) => i))
    expect(slices[0]!.items).toHaveLength(5)
    expect(slices[1]!.items).toHaveLength(4)
  })
})
