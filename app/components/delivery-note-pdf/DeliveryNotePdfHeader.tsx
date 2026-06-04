import { formatDateLong } from '@/lib/config'

type Props = {
  blNumber: string
  createdAt: Date
  deliveryConfirmationCode?: string | null
}

/** Titre document BL (séparé du bloc vendeur pour rendu PDF fiable). */
export default function DeliveryNotePdfHeader({
  blNumber,
  createdAt,
  deliveryConfirmationCode,
}: Props) {
  return (
    <header className="invoice-pdf__bl-title-block">
      <h1 className="invoice-pdf__title">BON DE LIVRAISON</h1>
      <p className="invoice-pdf__title-sub">N° {blNumber}</p>
      <p className="invoice-pdf__title-sub">Date : {formatDateLong(createdAt)}</p>
      {deliveryConfirmationCode && (
        <p className="invoice-pdf__title-sub invoice-pdf__bl-confirm-code">
          Code livraison : {deliveryConfirmationCode}
        </p>
      )}
    </header>
  )
}
