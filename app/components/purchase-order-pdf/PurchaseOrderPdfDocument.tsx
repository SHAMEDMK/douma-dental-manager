import '@/app/components/invoice-pdf/invoice-pdf.css'
import type { CompanySettings } from '@prisma/client'
import DeliveryNotePdfTopSection from '@/app/components/delivery-note-pdf/DeliveryNotePdfTopSection'
import InvoicePdfFooter from '@/app/components/invoice-pdf/InvoicePdfFooter'
import PurchaseOrderPdfSupplierCard from './PurchaseOrderPdfSupplierCard'
import PurchaseOrderPdfInfoCard from './PurchaseOrderPdfInfoCard'
import PurchaseOrderPdfTable from './PurchaseOrderPdfTable'

type PurchaseOrderWithItems = {
  orderNumber: string
  createdAt: Date
  sentAt: Date | null
  statusLabel: string
  supplier: {
    code: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    ice: string | null
    contact: string | null
  }
  items: Array<{
    id: string
    quantityOrdered: number
    product: { name: string; sku?: string | null }
    productVariant: { name?: string | null; sku?: string | null } | null
  }>
}

type Props = {
  purchaseOrder: PurchaseOrderWithItems
  companySettings: CompanySettings | null
}

/** Bon de commande fournisseur — désignation + qté, sans prix. */
export default function PurchaseOrderPdfDocument({
  purchaseOrder,
  companySettings,
}: Props) {
  return (
    <div className="invoice-pdf invoice-pdf--portal-bl invoice-pdf--purchase-order">
      <div className="invoice-pdf__zone">
        <div className="invoice-pdf__page-block invoice-pdf__page-block--single">
          <DeliveryNotePdfTopSection
            companySettings={companySettings}
            blNumber={purchaseOrder.orderNumber}
            createdAt={purchaseOrder.createdAt}
            title="BON DE COMMANDE"
            sellerLabel="COMMANDÉ PAR"
          />
          <div className="invoice-pdf__cards">
            <PurchaseOrderPdfSupplierCard supplier={purchaseOrder.supplier} />
            <PurchaseOrderPdfInfoCard
              orderNumber={purchaseOrder.orderNumber}
              createdAt={purchaseOrder.createdAt}
              statusLabel={purchaseOrder.statusLabel}
              sentAt={purchaseOrder.sentAt}
            />
          </div>
          <PurchaseOrderPdfTable items={purchaseOrder.items} />
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
