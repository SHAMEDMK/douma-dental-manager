import { getLineItemDisplayName, getLineItemSku } from '@/app/lib/line-item-display'
import { formatMoneyWithCurrency } from '@/app/lib/invoice-utils'

type OrderItem = {
  id: string
  quantity: number
  priceAtTime: number
  product: { name: string; sku?: string | null } | null
  productVariant: { name?: string | null; sku?: string | null } | null
}

type Props = {
  items: OrderItem[]
}

export default function InvoicePdfTable({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="invoice-pdf__table-wrap">
      <table className="invoice-pdf__table">
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Qté</th>
            <th>Prix unit. HT</th>
            <th>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td className="invoice-pdf__table-cell-designation">
                {getLineItemSku(it) !== '-' && (
                  <span className="invoice-pdf__table-sku">{getLineItemSku(it)}</span>
                )}
                <span className="invoice-pdf__table-designation" title={it.product ? getLineItemDisplayName(it) : 'Produit'}>
                  {it.product ? getLineItemDisplayName(it) : 'Produit'}
                </span>
              </td>
              <td>{it.quantity}</td>
              <td>{formatMoneyWithCurrency(it.priceAtTime)}</td>
              <td>{formatMoneyWithCurrency(it.priceAtTime * it.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
