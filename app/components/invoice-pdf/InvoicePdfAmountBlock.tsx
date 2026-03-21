import { numberToWords } from '@/app/lib/number-to-words'
import { getPaymentTermsForDisplay } from '@/app/lib/invoice-utils'

type CompanySettings = {
  paymentTerms: string | null
  vatMention: string | null
  latePaymentMention: string | null
  bankName: string | null
  rib: string | null
}

type Props = {
  amountTTC: number
  companySettings: CompanySettings | null
}

export default function InvoicePdfAmountBlock({ amountTTC, companySettings }: Props) {
  const paymentTerms = getPaymentTermsForDisplay(companySettings?.paymentTerms)
  const hasBank = companySettings?.bankName?.trim() || companySettings?.rib?.trim()
  const hasMentions =
    companySettings?.vatMention?.trim() || companySettings?.latePaymentMention?.trim()

  return (
    <div className="invoice-pdf__amount-block">
      <p className="invoice-pdf__amount-label">Facture arrêtée à la somme de :</p>
      <p className="invoice-pdf__amount-words">{numberToWords(amountTTC)}</p>
      {paymentTerms && (
        <div className="invoice-pdf__conditions">
          <p style={{ fontWeight: 600, margin: '0 0 1mm 0' }}>Conditions de paiement</p>
          <p style={{ margin: 0 }}>{paymentTerms}</p>
        </div>
      )}
      {hasBank && (
        <div className="invoice-pdf__conditions" style={{ marginTop: '3mm', paddingTop: '3mm', borderTop: '1px solid var(--inv-separator)' }}>
          <p style={{ fontWeight: 600, margin: '0 0 1mm 0' }}>Banque</p>
          <p style={{ margin: 0 }}>{companySettings?.bankName?.trim() || '—'}</p>
          <p style={{ fontWeight: 600, margin: '2mm 0 1mm 0' }}>RIB</p>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{companySettings?.rib?.trim() || '—'}</p>
        </div>
      )}
      {hasMentions && (
        <div className="invoice-pdf__conditions" style={{ marginTop: '3mm', paddingTop: '3mm', borderTop: '1px solid var(--inv-separator)' }}>
          {companySettings?.vatMention?.trim() && <p style={{ margin: '0 0 1mm 0' }}>{companySettings.vatMention}</p>}
          {companySettings?.latePaymentMention?.trim() && <p style={{ margin: 0 }}>{companySettings.latePaymentMention}</p>}
        </div>
      )}
    </div>
  )
}
