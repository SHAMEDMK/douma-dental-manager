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
          <p className="invoice-pdf__conditions-title">Conditions de paiement</p>
          <p className="invoice-pdf__conditions-text">{paymentTerms}</p>
        </div>
      )}
      {hasBank && (
        <div className="invoice-pdf__conditions invoice-pdf__conditions--section">
          <p className="invoice-pdf__conditions-title">Banque</p>
          <p className="invoice-pdf__conditions-text">{companySettings?.bankName?.trim() || '—'}</p>
          <p className="invoice-pdf__conditions-title">RIB</p>
          <p className="invoice-pdf__conditions-text invoice-pdf__conditions-text--rib">{companySettings?.rib?.trim() || '—'}</p>
        </div>
      )}
      {hasMentions && (
        <div className="invoice-pdf__conditions invoice-pdf__conditions--section">
          {companySettings?.vatMention?.trim() && <p className="invoice-pdf__conditions-text">{companySettings.vatMention}</p>}
          {companySettings?.latePaymentMention?.trim() && <p className="invoice-pdf__conditions-text">{companySettings.latePaymentMention}</p>}
        </div>
      )}
    </div>
  )
}
