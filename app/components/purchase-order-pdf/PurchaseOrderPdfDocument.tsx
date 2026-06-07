import '@/app/components/invoice-pdf/invoice-pdf.css'
import type { CompanySettings } from '@prisma/client'
import { computeTaxTotals } from '@/app/lib/tax'
import DeliveryNotePdfTopSection from '@/app/components/delivery-note-pdf/DeliveryNotePdfTopSection'
import InvoicePdfFooter from '@/app/components/invoice-pdf/InvoicePdfFooter'
import PurchaseOrderPdfSupplierCard from './PurchaseOrderPdfSupplierCard'
import PurchaseOrderPdfInfoCard from './PurchaseOrderPdfInfoCard'
import PurchaseOrderPdfTable from './PurchaseOrderPdfTable'
import DeliveryNotePdfTotals from '@/app/components/delivery-note-pdf/DeliveryNotePdfTotals'

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
    unitCost: number
    product: { name: string; sku?: string | null }
    productVariant: { name?: string | null; sku?: string | null } | null
  }>
  totalHt: number
}

type Props = {
  purchaseOrder: PurchaseOrderWithItems
  companySettings: CompanySettings | null
}

/** Bon de commande fournisseur — charte facture (1 page, prix HT). */
export default function PurchaseOrderPdfDocument({
  purchaseOrder,
  companySettings,
}: Props) {
  const vatRate = companySettings?.vatRate ?? 0.2
  const taxTotals = computeTaxTotals(purchaseOrder.totalHt, vatRate)

  return (
    <div className="invoice-pdf invoice-pdf--portal-bl invoice-pdf--purchase-order">
      <div className="invoice-pdf__zone">
        <div className="invoice-pdf__page-block invoice-pdf__page-block--single">
          <DeliveryNotePdfTopSection
            companySettings={companySettings}
            blNumber={purchaseOrder.orderNumber}
            createdAt={purchaseOrder.createdAt}
            title="BON DE COMMANDE"
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
          <div className="invoice-pdf__bottom invoice-pdf__bottom--bl">
            <DeliveryNotePdfTotals taxTotals={taxTotals} />
          </div>
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
