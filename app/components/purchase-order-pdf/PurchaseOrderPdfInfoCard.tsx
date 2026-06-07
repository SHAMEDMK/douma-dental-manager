import { formatDateLong } from '@/lib/config'

type Props = {
  orderNumber: string
  createdAt: Date
  statusLabel: string
  sentAt?: Date | null
}

export default function PurchaseOrderPdfInfoCard({
  orderNumber,
  createdAt,
  statusLabel,
  sentAt,
}: Props) {
  return (
    <div className="invoice-pdf__card">
      <div className="invoice-pdf__card-header">Informations</div>
      <div className="invoice-pdf__card-body">
        <dl className="invoice-pdf__info-list">
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">N° commande</dt>
            <dd className="invoice-pdf__info-value">{orderNumber}</dd>
          </div>
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">Date</dt>
            <dd className="invoice-pdf__info-value">{formatDateLong(createdAt)}</dd>
          </div>
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">Statut</dt>
            <dd className="invoice-pdf__info-value">{statusLabel}</dd>
          </div>
          {sentAt && (
            <div className="invoice-pdf__info-row">
              <dt className="invoice-pdf__info-label">Envoyée le</dt>
              <dd className="invoice-pdf__info-value">{formatDateLong(sentAt)}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
