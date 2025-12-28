/**
 * Generate a client-facing order number from order data
 * Uses stored orderNumber if available, otherwise falls back to legacy format
 * Format: CMD-YYYYMMDD-XXXX (sequential) or CMD-YYYYMMDD-XXXX (legacy fallback)
 */
export function formatOrderNumber(orderNumber: string | null | undefined, orderId: string, createdAt: Date): string {
  // If orderNumber is stored, use it (new sequential format)
  if (orderNumber) {
    return orderNumber
  }
  
  // Fallback to legacy format for old records
  const date = new Date(createdAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const suffix = orderId.slice(-4).toUpperCase()
  
  return `CMD-${year}${month}${day}-${suffix}`
}

