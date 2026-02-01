import { formatMoney } from './invoice-utils'

/**
 * Tax computation helper
 * Computes VAT and TTC (including tax) from HT (excluding tax) amount
 * 
 * @param ht - Amount excluding tax (HT)
 * @param rate - VAT rate (default: 0.2 = 20%)
 * @returns Object with ht, vat, ttc, rate, and formatted strings
 */
export function computeTaxTotals(ht: number, rate = 0.2) {
  const vat = Math.round(ht * rate * 100) / 100
  const ttc = Math.round((ht + vat) * 100) / 100
  return { 
    ht, 
    vat, 
    ttc, 
    rate,
    // Formatted values for display (2 decimal places)
    htFormatted: formatMoney(ht),
    vatFormatted: formatMoney(vat),
    ttcFormatted: formatMoney(ttc),
    ratePercent: (rate * 100).toFixed(0)
  }
}
