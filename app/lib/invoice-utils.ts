/**
 * Generate a client-facing invoice display number
 * Uses stored invoiceNumber if available, otherwise falls back to legacy format
 * Format: FAC-YYYYMMDD-XXXX (sequential) or INV-YYYYMMDD-XXXX (legacy fallback)
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

/**
 * Format money value to 2 decimal places
 * Centralized formatting function for consistent display across all pages
 * @param value - The number to format
 * @returns Formatted string with 2 decimal places (e.g., "123.45")
 */
export function formatMoney(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2)
}

/**
 * Format money value to 2 decimal places with currency symbol
 * @param value - The number to format
 * @param currency - Currency symbol (default: "Dh")
 * @returns Formatted string with 2 decimal places and currency (e.g., "123.45 Dh")
 */
export function formatMoneyWithCurrency(value: number, currency: string = "Dh"): string {
  return `${formatMoney(value)} ${currency}`
}

/**
 * Calculate invoice total TTC (including VAT) from HT amount
 * F1: balance = encours TTC, so we need to calculate totalTTC
 * @param invoiceAmountHT - Invoice amount excluding tax (HT)
 * @param vatRate - VAT rate (default: 0.2 = 20%)
 * @returns Total TTC amount
 */
export function calculateInvoiceTotalTTC(invoiceAmountHT: number, vatRate: number = 0.2): number {
  const vat = Math.round(invoiceAmountHT * vatRate * 100) / 100
  const ttc = Math.round((invoiceAmountHT + vat) * 100) / 100
  return ttc
}

/**
 * Calculate remaining amount to pay for an invoice (F1)
 * F1 Rule: remaining = invoice.totalTTC - totalPaid (min 0)
 * @param invoiceAmountHT - Invoice amount excluding tax (HT)
 * @param totalPaid - Total amount already paid
 * @param vatRate - VAT rate (default: 0.2 = 20%)
 * @returns Remaining amount to pay (never negative, min 0)
 */
export function calculateInvoiceRemaining(
  invoiceAmountHT: number,
  totalPaid: number,
  vatRate: number = 0.2
): number {
  const totalTTC = calculateInvoiceTotalTTC(invoiceAmountHT, vatRate)
  const remaining = Math.max(0, totalTTC - totalPaid)
  return remaining
}

/**
 * Determine invoice payment status based on remaining amount (F1)
 * F1 Rule: status depends on remaining (UNPAID/PARTIAL/PAID)
 * @param remaining - Remaining amount to pay
 * @returns Invoice payment status
 */
export function calculateInvoiceStatus(remaining: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (remaining <= 0.01) {
    return 'PAID'
  }
  // We need to check if any payment was made to distinguish UNPAID from PARTIAL
  // This function should be used with calculateInvoiceRemaining to get the full picture
  // For now, we'll need the totalPaid amount separately to determine PARTIAL vs UNPAID
  return 'UNPAID'
}

/**
 * Determine invoice payment status based on remaining amount and total paid (F1)
 * F1 Rule: status depends on remaining (UNPAID/PARTIAL/PAID)
 * @param remaining - Remaining amount to pay
 * @param totalPaid - Total amount already paid
 * @returns Invoice payment status
 */
export function calculateInvoiceStatusWithPayments(
  remaining: number,
  totalPaid: number
): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (remaining <= 0.01) {
    return 'PAID'
  }
  if (totalPaid > 0.01) {
    return 'PARTIAL'
  }
  return 'UNPAID'
}
