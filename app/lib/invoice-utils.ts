/**
 * Generate a client-facing invoice display number
 * Uses stored invoiceNumber if available, otherwise falls back to legacy format
 * Format: INV-YYYYMMDD-XXXX (sequential) or INV-YYYYMMDD-XXXX (legacy fallback)
 */
export function getInvoiceDisplayNumber(
  invoiceNumber: string | null | undefined,
  invoiceId: string,
  createdAt: Date
): string {
  // If invoiceNumber is stored, use it (new sequential format)
  if (invoiceNumber) {
    return invoiceNumber
  }
  
  // Fallback to legacy format for old records
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
