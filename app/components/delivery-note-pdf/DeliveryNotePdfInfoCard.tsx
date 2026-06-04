import { formatDateLong } from '@/lib/config'

type Props = {
  blNumber: string
  createdAt: Date
  orderNumber: string
}

export default function DeliveryNotePdfInfoCard({
  blNumber,
  createdAt,
  orderNumber,
}: Props) {
  return (
    <div className="invoice-pdf__card">
      <div className="invoice-pdf__card-header">Informations</div>
      <div className="invoice-pdf__card-body">
        <dl className="invoice-pdf__info-list">
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">N° BL</dt>
            <dd className="invoice-pdf__info-value">{blNumber}</dd>
          </div>
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">Date</dt>
            <dd className="invoice-pdf__info-value">{formatDateLong(createdAt)}</dd>
          </div>
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">N° CMD</dt>
            <dd className="invoice-pdf__info-value">{orderNumber}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
