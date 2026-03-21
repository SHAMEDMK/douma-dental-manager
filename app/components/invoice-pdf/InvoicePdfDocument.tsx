import '@/app/components/invoice-pdf/invoice-pdf.css'
import type { CompanySettings } from '@prisma/client'
import { computeTaxTotals } from '@/app/lib/tax'
import { calculateTotalPaid, calculateInvoiceRemaining } from '@/app/lib/invoice-utils'
import { paginateItems } from '@/app/lib/invoice-pdf-pagination'
import InvoicePdfHeader from './InvoicePdfHeader'
import InvoicePdfHeaderCompact from './InvoicePdfHeaderCompact'
import InvoicePdfClientCard from './InvoicePdfClientCard'
import InvoicePdfInfoCard from './InvoicePdfInfoCard'
import InvoicePdfTable from './InvoicePdfTable'
import InvoicePdfTotals from './InvoicePdfTotals'
import InvoicePdfAmountBlock from './InvoicePdfAmountBlock'
import InvoicePdfFooter from './InvoicePdfFooter'

type InvoiceWithOrder = {
  id: string
  invoiceNumber: string | null
  amount: number | null
  status: string
  createdAt: Date
  order: {
    user: {
      clientCode: string | null
      companyName: string | null
      name: string
      email: string | null
      phone: string | null
      address: string | null
      city: string | null
      ice: string | null
    }
    orderNumber: string | null
    deliveryNoteNumber?: string | null
    items: Array<{
      id: string
      quantity: number
      priceAtTime: number
      product: { name: string; sku?: string | null } | null
      productVariant: { name?: string | null; sku?: string | null } | null
    }>
  }
  payments: { amount: number }[]
}

type Props = {
  invoice: InvoiceWithOrder
  companySettings: CompanySettings | null
}

export default async function InvoicePdfDocument({
  invoice,
  companySettings,
}: Props) {
  const vatRate = companySettings?.vatRate ?? 0.2
  const taxTotals = computeTaxTotals(invoice.amount ?? 0, vatRate)
  const paid = calculateTotalPaid(invoice.payments)
  const remaining = calculateInvoiceRemaining(invoice.amount ?? 0, paid, vatRate)

  const paymentStatusText =
    invoice.status === 'PAID' ? 'Payée' :
    invoice.status === 'PARTIAL' ? 'Partiellement payée' :
    invoice.status === 'CANCELLED' ? 'Annulée' :
    'Impayée'

  const paymentStatusKey =
    invoice.status === 'PAID' ? 'PAID' :
    invoice.status === 'PARTIAL' ? 'PARTIAL' :
    'UNPAID'

  const invoiceNumber =
    invoice.invoiceNumber ?? invoice.id.slice(-8)

  const order = invoice.order
  const slices = paginateItems(order.items)
  const hasManyLines = order.items.length > 15
  const isMultiPage = slices.length > 1

  const totalPages = slices.length

  return (
    <div className={`invoice-pdf${hasManyLines ? ' invoice-pdf--many-lines' : ''}${isMultiPage ? ' invoice-pdf--multi-page' : ''}`}>
      <div className="invoice-pdf__zone">
        {slices.map((slice) => {
          const isFirstPage = slice.pageIndex === 0
          const isLastPage = slice.pageIndex === totalPages - 1
          const currentPage = slice.pageIndex + 1

          return (
            <div
              key={slice.pageIndex}
              className={`invoice-pdf__page-block${slice.isContinuation ? ' invoice-pdf__page-block--page-break' : ''}`}
            >
              <div className="invoice-pdf__page-block-content">
                {/* Page 1 : header complet + cartes ; pages suivantes : header compact */}
                {isFirstPage ? (
                  <>
                    <InvoicePdfHeader
                      companySettings={companySettings}
                      invoiceId={invoice.id}
                      invoiceNumber={invoice.invoiceNumber}
                      amountTTC={taxTotals.ttc}
                      createdAt={invoice.createdAt}
                    />
                    <div className="invoice-pdf__cards">
                      <InvoicePdfClientCard user={invoice.order.user} />
                      <InvoicePdfInfoCard
                        invoiceNumber={invoiceNumber}
                        createdAt={invoice.createdAt}
                        order={order}
                        paymentStatusText={paymentStatusText}
                        paymentStatus={paymentStatusKey}
                      />
                    </div>
                  </>
                ) : (
                  <InvoicePdfHeaderCompact
                    companySettings={companySettings}
                    invoiceNumber={invoiceNumber}
                  />
                )}

                <InvoicePdfTable items={slice.items as typeof order.items} />

                {/* Totaux + montant en lettres : uniquement sur la dernière page */}
                {isLastPage && (
                  <div className="invoice-pdf__bottom">
                    <InvoicePdfAmountBlock
                      amountTTC={taxTotals.ttc}
                      companySettings={companySettings}
                    />
                    <InvoicePdfTotals
                      taxTotals={taxTotals}
                      paid={paid}
                      remaining={remaining}
                    />
                  </div>
                )}
              </div>

              <div className="invoice-pdf__page-block-spacer" aria-hidden="true" />

              <InvoicePdfFooter
                companySettings={companySettings}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
