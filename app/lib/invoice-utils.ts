/**
 * Generate a deterministic invoice display number
 * Format: INV-YYYYMMDD-XXXX (where XXXX is last 4 chars of invoice ID)
 */
export function getInvoiceDisplayNumber(invoiceId: string, createdAt: Date): string {
  const date = new Date(createdAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const last4 = invoiceId.slice(-4).toUpperCase()
  
  return `INV-${year}${month}${day}-${last4}`
}

/**
 * Calculate total paid amount from payments
 */
export function calculateTotalPaid(payments: { amount: number }[]): number {
  return payments.reduce((sum, payment) => sum + payment.amount, 0)
}

/**
 * Calculate line items total
 */
export function calculateLineItemsTotal(items: { quantity: number; priceAtTime: number }[]): number {
  return items.reduce((sum, item) => sum + (item.quantity * item.priceAtTime), 0)
}
