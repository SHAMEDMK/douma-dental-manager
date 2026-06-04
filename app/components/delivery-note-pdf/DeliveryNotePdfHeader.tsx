import type { CompanySettings } from '@prisma/client'
import { formatDateLong } from '@/lib/config'

type Props = {
  companySettings: CompanySettings | null
  blNumber: string
  createdAt: Date
  deliveryConfirmationCode?: string | null
}

export default function DeliveryNotePdfHeader({
  companySettings,
  blNumber,
  createdAt,
  deliveryConfirmationCode,
}: Props) {
  const name = companySettings?.name || 'SHAMED'

  return (
    <header className="invoice-pdf__header">
      <div className="invoice-pdf__header-left">
        {companySettings?.logoUrl ? (
          <img
            src={companySettings.logoUrl}
            alt={name}
            className="invoice-pdf__logo"
          />
        ) : (
          <h2 className="invoice-pdf__company-name">{name}</h2>
        )}
      </div>
      <div className="invoice-pdf__header-right">
        <h1 className="invoice-pdf__title">BON DE LIVRAISON</h1>
        <p className="invoice-pdf__title-sub">N° {blNumber}</p>
        <p className="invoice-pdf__title-sub">Date : {formatDateLong(createdAt)}</p>
        {deliveryConfirmationCode && (
          <p className="invoice-pdf__title-sub invoice-pdf__bl-confirm-code">
            Code livraison : {deliveryConfirmationCode}
          </p>
        )}
      </div>
    </header>
  )
}
