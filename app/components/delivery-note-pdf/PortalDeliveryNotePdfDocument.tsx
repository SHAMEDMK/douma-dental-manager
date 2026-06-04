import '@/app/components/invoice-pdf/invoice-pdf.css'
import type { CompanySettings } from '@prisma/client'
import { formatOrderNumber } from '@/app/lib/orderNumber'
import { computeTaxTotals } from '@/app/lib/tax'
import DeliveryNotePdfHeader from './DeliveryNotePdfHeader'
import DeliveryNotePdfSellerBlock from './DeliveryNotePdfSellerBlock'
import DeliveryNotePdfClientCard from './DeliveryNotePdfClientCard'
import DeliveryNotePdfInfoCard from './DeliveryNotePdfInfoCard'
import DeliveryNotePdfTable from './DeliveryNotePdfTable'
import DeliveryNotePdfTotals from './DeliveryNotePdfTotals'
import InvoicePdfFooter from '@/app/components/invoice-pdf/InvoicePdfFooter'

type OrderWithItems = {
  id: string
  orderNumber: string | null
  deliveryNoteNumber: string | null
  createdAt: Date
  total: number
  deliveryConfirmationCode?: string | null
  user: {
    clientCode: string | null
    companyName: string | null
    name: string
    email: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    ice?: string | null
  }
  items: Array<{
    id: string
    quantity: number
    priceAtTime: number
    product: { name: string; sku?: string | null } | null
    productVariant: { name?: string | null; sku?: string | null } | null
  }>
}

type Props = {
  order: OrderWithItems
  companySettings: CompanySettings | null
}

/** BL portail client — charte facture (logo, désignation + Réf., prix HT/TTC). */
export default function PortalDeliveryNotePdfDocument({
  order,
  companySettings,
}: Props) {
  const orderNumber = formatOrderNumber(order.orderNumber, order.id, order.createdAt)
  const blNumber = order.deliveryNoteNumber || `BL-${orderNumber}`
  const vatRate = companySettings?.vatRate ?? 0.2
  const taxTotals = computeTaxTotals(order.total, vatRate)

  return (
    <div className="invoice-pdf invoice-pdf--portal-bl">
      <div className="invoice-pdf__zone">
        <div className="invoice-pdf__page-block invoice-pdf__page-block--single">
          <DeliveryNotePdfSellerBlock companySettings={companySettings} />
          <DeliveryNotePdfHeader
            blNumber={blNumber}
            createdAt={order.createdAt}
            deliveryConfirmationCode={order.deliveryConfirmationCode}
          />
          <div className="invoice-pdf__cards">
            <DeliveryNotePdfClientCard user={order.user} />
            <DeliveryNotePdfInfoCard
              blNumber={blNumber}
              createdAt={order.createdAt}
              orderNumber={orderNumber}
            />
          </div>
          <DeliveryNotePdfTable items={order.items} />
          <div className="invoice-pdf__bottom invoice-pdf__bottom--bl">
            <DeliveryNotePdfTotals taxTotals={taxTotals} />
          </div>
          <p className="invoice-pdf__bl-disclaimer">
            Ce document n&apos;est pas une facture.
          </p>
          <InvoicePdfFooter
            companySettings={companySettings}
            currentPage={1}
            totalPages={1}
          />
        </div>
      </div>
    </div>
  )
}
