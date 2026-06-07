import { getLineItemDisplayName, getLineItemSku } from '@/app/lib/line-item-display'
import { formatMoneyWithCurrency } from '@/app/lib/invoice-utils'

type OrderItem = {
  id: string
  quantity: number
  priceAtTime?: number
  product: { name: string; sku?: string | null } | null
  productVariant: { name?: string | null; sku?: string | null } | null
}

type Props = {
  items: OrderItem[]
  /** false = BL admin (désignation + qté uniquement) */
  showPrices?: boolean
}

export default function DeliveryNotePdfTable({ items, showPrices = true }: Props) {
  if (items.length === 0) return null

  const tableClass = showPrices
    ? 'invoice-pdf__table'
    : 'invoice-pdf__table invoice-pdf__table--qty-only'

  return (
    <div className="invoice-pdf__table-wrap">
      <table className={tableClass}>
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Qté</th>
            {showPrices && (
              <>
                <th>Prix unit. HT</th>
                <th>Total HT</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td className="invoice-pdf__table-cell-designation">
                <span
                  className="invoice-pdf__table-designation"
                  title={it.product ? getLineItemDisplayName(it) : 'Produit'}
                >
                  {it.product ? getLineItemDisplayName(it) : 'Produit'}
                </span>
                {getLineItemSku(it) !== '-' && (
                  <span className="invoice-pdf__table-sku">Réf. {getLineItemSku(it)}</span>
                )}
              </td>
              <td>{it.quantity}</td>
              {showPrices && (
                <>
                  <td>{formatMoneyWithCurrency(it.priceAtTime ?? 0)}</td>
                  <td>{formatMoneyWithCurrency((it.priceAtTime ?? 0) * it.quantity)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
