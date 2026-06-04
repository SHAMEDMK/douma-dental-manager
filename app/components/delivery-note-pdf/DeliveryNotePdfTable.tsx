import { getLineItemDisplayName, getLineItemSku } from '@/app/lib/line-item-display'

type OrderItem = {
  id: string
  quantity: number
  product: { name: string; sku?: string | null } | null
  productVariant: { name?: string | null; sku?: string | null } | null
}

type Props = {
  items: OrderItem[]
}

export default function DeliveryNotePdfTable({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="invoice-pdf__table-wrap">
      <table className="invoice-pdf__table invoice-pdf__table--delivery-qty">
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Qté</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
