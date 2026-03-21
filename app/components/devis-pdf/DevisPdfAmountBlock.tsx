import { numberToWords } from '@/app/lib/number-to-words'
import { getPaymentTermsForDisplay } from '@/app/lib/invoice-utils'

type CompanySettings = {
  paymentTerms: string | null
  bankName: string | null
  rib: string | null
}

type Props = {
  amountTTC: number
  companySettings: CompanySettings | null
}

/** Bloc montant devis — mentions adaptées (validité, conditions d'acceptation). */
export default function DevisPdfAmountBlock({ amountTTC, companySettings }: Props) {
  const paymentTerms = getPaymentTermsForDisplay(companySettings?.paymentTerms)
  const hasBank = companySettings?.bankName?.trim() || companySettings?.rib?.trim()

  return (
    <div className="invoice-pdf__amount-block">
      <p className="invoice-pdf__amount-label">Devis établi à la somme de :</p>
      <p className="invoice-pdf__amount-words">{numberToWords(amountTTC)}</p>
      <div className="invoice-pdf__conditions" style={{ marginTop: '2mm' }}>
        <p style={{ fontWeight: 600, margin: '0 0 1mm 0' }}>Conditions d&apos;acceptation</p>
        <p style={{ margin: 0 }}>
          Ce devis est valable 30 jours à compter de sa date d&apos;émission. L&apos;acceptation du devis vaut commande ferme et entraîne l&apos;application des conditions générales de vente.
        </p>
      </div>
      {paymentTerms && (
        <div className="invoice-pdf__conditions" style={{ marginTop: '3mm', paddingTop: '3mm', borderTop: '1px solid var(--inv-separator)' }}>
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
    </div>
  )
}
