import { formatMoneyWithCurrency } from '@/app/lib/invoice-utils'

type TaxTotals = {
  ht: number
  vat: number
  ttc: number
  ratePercent: string
}

type Props = {
  taxTotals: TaxTotals
}

/** Totaux devis : HT, TVA, TTC uniquement (pas de payé / reste à payer). */
export default function DevisPdfTotals({ taxTotals }: Props) {
  return (
    <div className="invoice-pdf__totals">
      <div className="invoice-pdf__totals-row">
        <span className="invoice-pdf__totals-label">Total HT</span>
        <span className="invoice-pdf__totals-value">{formatMoneyWithCurrency(taxTotals.ht)}</span>
      </div>
      <div className="invoice-pdf__totals-row">
        <span className="invoice-pdf__totals-label">TVA ({taxTotals.ratePercent}%)</span>
        <span className="invoice-pdf__totals-value">{formatMoneyWithCurrency(taxTotals.vat)}</span>
      </div>
      <div className="invoice-pdf__totals-row invoice-pdf__totals-row--ttc">
        <span>Total TTC</span>
        <span>{formatMoneyWithCurrency(taxTotals.ttc)}</span>
      </div>
    </div>
  )
}
