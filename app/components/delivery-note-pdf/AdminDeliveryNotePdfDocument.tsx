import '@/app/components/invoice-pdf/invoice-pdf.css'
import type { CompanySettings } from '@prisma/client'
import { formatOrderNumber } from '@/app/lib/orderNumber'
import DeliveryNotePdfTopSection from './DeliveryNotePdfTopSection'
import DeliveryNotePdfClientCard from './DeliveryNotePdfClientCard'
import DeliveryNotePdfInfoCard from './DeliveryNotePdfInfoCard'
import DeliveryNotePdfTable from './DeliveryNotePdfTable'
import DeliveryNotePdfSignatures from './DeliveryNotePdfSignatures'
import InvoicePdfFooter from '@/app/components/invoice-pdf/InvoicePdfFooter'

type OrderWithItems = {
  id: string
  orderNumber: string | null
  deliveryNoteNumber: string | null
  createdAt: Date
  deliveryConfirmationCode?: string | null
  deliveryAddress?: string | null
  deliveryCity?: string | null
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
    product: { name: string; sku?: string | null } | null
    productVariant: { name?: string | null; sku?: string | null } | null
  }>
}

type Props = {
  order: OrderWithItems
  companySettings: CompanySettings | null
}

/** BL admin — charte facture, quantités sans prix, signatures livreur/client. */
export default function AdminDeliveryNotePdfDocument({
  order,
  companySettings,
}: Props) {
  const orderNumber = formatOrderNumber(order.orderNumber, order.id, order.createdAt)
  const blNumber = order.deliveryNoteNumber || `BL-${orderNumber}`

  return (
    <div className="invoice-pdf invoice-pdf--portal-bl invoice-pdf--admin-bl">
      <div className="invoice-pdf__zone">
        <div className="invoice-pdf__page-block invoice-pdf__page-block--single">
          <DeliveryNotePdfTopSection
            companySettings={companySettings}
            blNumber={blNumber}
            createdAt={order.createdAt}
            deliveryConfirmationCode={order.deliveryConfirmationCode}
          />
          <div className="invoice-pdf__cards">
            <DeliveryNotePdfClientCard
              user={order.user}
              deliveryAddress={order.deliveryAddress}
              deliveryCity={order.deliveryCity}
            />
            <DeliveryNotePdfInfoCard
              blNumber={blNumber}
              createdAt={order.createdAt}
              orderNumber={orderNumber}
            />
          </div>
          <DeliveryNotePdfTable items={order.items} showPrices={false} />
          <DeliveryNotePdfSignatures />
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
