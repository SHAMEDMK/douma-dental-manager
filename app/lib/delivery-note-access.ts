const DELIVERY_NOTE_VISIBLE_STATUSES = new Set(['PREPARED', 'SHIPPED', 'DELIVERED'])

/** BL disponible : numéro attribué et commande au bon stade du workflow. */
export function isDeliveryNoteAvailable(order: {
  deliveryNoteNumber: string | null
  status: string
}): boolean {
  return (
    !!order.deliveryNoteNumber &&
    DELIVERY_NOTE_VISIBLE_STATUSES.has(order.status)
  )
}
