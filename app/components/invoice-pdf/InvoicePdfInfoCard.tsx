import { formatDateLong } from '@/lib/config'

type Order = {
  orderNumber: string | null
  deliveryNoteNumber?: string
}

type StatusKey = 'PAID' | 'PARTIAL' | 'UNPAID'

type Props = {
  invoiceNumber: string
  createdAt: Date
  order: Order
  paymentStatusText: string
  paymentStatus: 'PAID' | 'PARTIAL' | 'CANCELLED' | 'UNPAID'
}

function Badge({ status, text }: { status: StatusKey; text: string }) {
  const cls =
    status === 'PAID' ? 'invoice-pdf__badge--paid' :
    status === 'PARTIAL' ? 'invoice-pdf__badge--partial' :
    'invoice-pdf__badge--unpaid'
  return <span className={`invoice-pdf__badge ${cls}`}>{text}</span>
}

export default function InvoicePdfInfoCard({
  invoiceNumber,
  createdAt,
  order,
  paymentStatusText,
  paymentStatus,
}: Props) {
  const statusKey =
    paymentStatus === 'PAID' ? 'PAID' :
    paymentStatus === 'PARTIAL' ? 'PARTIAL' :
    'UNPAID'

  return (
    <div className="invoice-pdf__card">
      <div className="invoice-pdf__card-header">Informations</div>
      <div className="invoice-pdf__card-body">
        <dl className="invoice-pdf__info-list">
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">N° Facture</dt>
            <dd className="invoice-pdf__info-value">{invoiceNumber}</dd>
          </div>
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">Date</dt>
            <dd className="invoice-pdf__info-value">{formatDateLong(createdAt)}</dd>
          </div>
          {order.orderNumber && (
            <div className="invoice-pdf__info-row">
              <dt className="invoice-pdf__info-label">N° CMD</dt>
              <dd className="invoice-pdf__info-value">{order.orderNumber}</dd>
            </div>
          )}
          {order.deliveryNoteNumber && (
            <div className="invoice-pdf__info-row">
              <dt className="invoice-pdf__info-label">N° BL</dt>
              <dd className="invoice-pdf__info-value">{order.deliveryNoteNumber}</dd>
            </div>
          )}
          <div className="invoice-pdf__info-row invoice-pdf__info-row--status">
            <dt className="invoice-pdf__info-label">Statut</dt>
            <dd className="invoice-pdf__info-value"><Badge status={statusKey} text={paymentStatusText} /></dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
