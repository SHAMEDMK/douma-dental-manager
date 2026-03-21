import type { CompanySettings } from '@prisma/client'

type Props = {
  companySettings: CompanySettings | null
  invoiceNumber: string
}

/** Version allégée du header pour les pages 2+ — logo compact + identité. */
export default function InvoicePdfHeaderCompact({
  companySettings,
  invoiceNumber,
}: Props) {
  const name = companySettings?.name || 'DOUMA Dental Manager'

  return (
    <header className="invoice-pdf__header invoice-pdf__header--compact">
      <div className="invoice-pdf__header-left invoice-pdf__header-left--compact">
        {companySettings?.logoUrl && (
          <img
            src={companySettings.logoUrl}
            alt=""
            className="invoice-pdf__logo invoice-pdf__logo--compact"
          />
        )}
        <h2 className="invoice-pdf__company-name invoice-pdf__company-name--compact">{name}</h2>
      </div>
      <div className="invoice-pdf__header-right">
        <div className="invoice-pdf__header-continuation">
          <span className="invoice-pdf__header-continuation-title">FACTURE</span>
          <span className="invoice-pdf__header-continuation-ref">{invoiceNumber}</span>
        </div>
      </div>
    </header>
  )
}
