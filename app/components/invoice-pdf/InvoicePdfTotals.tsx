import { formatMoneyWithCurrency } from '@/app/lib/invoice-utils'

type TaxTotals = {
  ht: number
  vat: number
  ttc: number
  ratePercent: string
}

type Props = {
  taxTotals: TaxTotals
  paid: number
  remaining: number
}

export default function InvoicePdfTotals({ taxTotals, paid, remaining }: Props) {
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
      <div className="invoice-pdf__totals-row">
        <span className="invoice-pdf__totals-label">Total payé</span>
        <span className="invoice-pdf__totals-value">{formatMoneyWithCurrency(paid)}</span>
      </div>
      <div className="invoice-pdf__totals-row">
        <span className="invoice-pdf__totals-label">Reste à payer</span>
        <span className="invoice-pdf__totals-value" style={{ fontWeight: 600 }}>
          {formatMoneyWithCurrency(remaining)}
        </span>
      </div>
    </div>
  )
}
