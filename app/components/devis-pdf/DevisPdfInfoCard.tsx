import { formatDateLong } from '@/lib/config'

type Order = {
  orderNumber: string | null
}

type StatusKey = 'pending' | 'accepted' | 'rejected'

type Props = {
  quoteNumber: string
  createdAt: Date
  order: Order
  validUntil: Date
  statusText: string
  statusKey?: StatusKey
}

function getBadgeClass(statusKey: StatusKey): string {
  const base = 'invoice-pdf__badge'
  if (statusKey === 'accepted') return `${base} invoice-pdf__badge--paid`
  if (statusKey === 'rejected') return `${base} invoice-pdf__badge--unpaid`
  return base // En attente : badge neutre
}

/** Carte infos devis — N° Devis, Date, Validité, N° CMD (si existe), Statut. Pas de N° BL. */
export default function DevisPdfInfoCard({
  quoteNumber,
  createdAt,
  order,
  validUntil,
  statusText,
  statusKey = 'pending',
}: Props) {
  return (
    <div className="invoice-pdf__card">
      <div className="invoice-pdf__card-header">Informations</div>
      <div className="invoice-pdf__card-body">
        <dl className="invoice-pdf__info-list">
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">N° Devis</dt>
            <dd className="invoice-pdf__info-value">{quoteNumber}</dd>
          </div>
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">Date</dt>
            <dd className="invoice-pdf__info-value">{formatDateLong(createdAt)}</dd>
          </div>
          <div className="invoice-pdf__info-row">
            <dt className="invoice-pdf__info-label">Valable jusqu&apos;au</dt>
            <dd className="invoice-pdf__info-value">{formatDateLong(validUntil)}</dd>
          </div>
          {order.orderNumber && (
            <div className="invoice-pdf__info-row">
              <dt className="invoice-pdf__info-label">N° CMD</dt>
              <dd className="invoice-pdf__info-value">{order.orderNumber}</dd>
            </div>
          )}
          <div className="invoice-pdf__info-row invoice-pdf__info-row--status">
            <dt className="invoice-pdf__info-label">Statut</dt>
            <dd className="invoice-pdf__info-value">
              <span className={getBadgeClass(statusKey)}>{statusText}</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
