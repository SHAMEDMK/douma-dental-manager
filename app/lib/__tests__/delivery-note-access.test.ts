import { describe, it, expect } from 'vitest'
import { isDeliveryNoteAvailable } from '@/app/lib/delivery-note-access'

describe('isDeliveryNoteAvailable', () => {
  it('returns true when BL number exists and status is PREPARED', () => {
    expect(
      isDeliveryNoteAvailable({ deliveryNoteNumber: 'BL-2026-0001', status: 'PREPARED' })
    ).toBe(true)
  })

  it('returns true for SHIPPED and DELIVERED', () => {
    expect(
      isDeliveryNoteAvailable({ deliveryNoteNumber: 'BL-2026-0001', status: 'SHIPPED' })
    ).toBe(true)
    expect(
      isDeliveryNoteAvailable({ deliveryNoteNumber: 'BL-2026-0001', status: 'DELIVERED' })
    ).toBe(true)
  })

  it('returns false without delivery note number', () => {
    expect(
      isDeliveryNoteAvailable({ deliveryNoteNumber: null, status: 'PREPARED' })
    ).toBe(false)
  })

  it('returns false for CONFIRMED or CANCELLED', () => {
    expect(
      isDeliveryNoteAvailable({ deliveryNoteNumber: 'BL-2026-0001', status: 'CONFIRMED' })
    ).toBe(false)
    expect(
      isDeliveryNoteAvailable({ deliveryNoteNumber: 'BL-2026-0001', status: 'CANCELLED' })
    ).toBe(false)
  })
})
