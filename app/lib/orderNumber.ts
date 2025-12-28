/**
 * Generate a client-facing order number from order data
 * Format: CMD-YYYYMMDD-XXXX where XXXX is last 4 chars of order id
 */
export function formatOrderNumber(orderId: string, createdAt: Date): string {
  const date = new Date(createdAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const suffix = orderId.slice(-4).toUpperCase()
  
  return `CMD-${year}${month}${day}-${suffix}`
}

