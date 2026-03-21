import '@/app/components/devis-pdf/devis-pdf.css'
import type { CompanySettings } from '@prisma/client'
import { computeTaxTotals } from '@/app/lib/tax'
import { getQuoteNumberFromOrderNumber } from '@/app/lib/sequence'
import { paginateItems } from '@/app/lib/invoice-pdf-pagination'
import InvoicePdfTable from '@/app/components/invoice-pdf/InvoicePdfTable'
import InvoicePdfFooter from '@/app/components/invoice-pdf/InvoicePdfFooter'
import DevisPdfHeader from './DevisPdfHeader'
import DevisPdfHeaderCompact from './DevisPdfHeaderCompact'
import DevisPdfClientCard from './DevisPdfClientCard'
import DevisPdfInfoCard from './DevisPdfInfoCard'
import DevisPdfTotals from './DevisPdfTotals'
import DevisPdfAmountBlock from './DevisPdfAmountBlock'

/** Validité par défaut : 30 jours à compter de la date du devis. */
function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

type OrderWithUser = {
  id: string
  orderNumber: string | null
  createdAt: Date
  total: number
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
  items: Array<{
    id: string
    quantity: number
    priceAtTime: number
    product: { name: string; sku?: string | null } | null
    productVariant: { name?: string | null; sku?: string | null } | null
  }>
}

type StatusKey = 'pending' | 'accepted' | 'rejected'

type Props = {
  order: OrderWithUser
  companySettings: CompanySettings | null
  /** Statut du devis affiché (ex: "En attente", "Accepté", "Refusé"). */
  statusText?: string
  /** Clé pour le style du badge (pending=neutre, accepted=vert, rejected=rouge). */
  statusKey?: StatusKey
  /** Validité en jours (défaut: 30). */
  validityDays?: number
}

export default async function DevisPdfDocument({
  order,
  companySettings,
  statusText = 'En attente',
  statusKey = 'pending',
  validityDays = 30,
}: Props) {
  const vatRate = companySettings?.vatRate ?? 0.2
  const taxTotals = computeTaxTotals(order.total, vatRate)
  const quoteNumber = getQuoteNumberFromOrderNumber(order.orderNumber, order.createdAt)
  const validUntil = addDays(order.createdAt, validityDays)

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
                {isFirstPage ? (
                  <>
                    <DevisPdfHeader
                      companySettings={companySettings}
                      quoteNumber={quoteNumber}
                    />
                    <div className="invoice-pdf__cards">
                      <DevisPdfClientCard user={order.user} />
                      <DevisPdfInfoCard
                        quoteNumber={quoteNumber}
                        createdAt={order.createdAt}
                        order={{ orderNumber: order.orderNumber }}
                        validUntil={validUntil}
                        statusText={statusText}
                        statusKey={statusKey}
                      />
                    </div>
                  </>
                ) : (
                  <DevisPdfHeaderCompact
                    companySettings={companySettings}
                    quoteNumber={quoteNumber}
                  />
                )}

                <InvoicePdfTable items={slice.items as typeof order.items} />

                {isLastPage && (
                  <div className="invoice-pdf__bottom">
                    <DevisPdfAmountBlock
                      amountTTC={taxTotals.ttc}
                      companySettings={companySettings}
                    />
                    <DevisPdfTotals taxTotals={taxTotals} />
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
