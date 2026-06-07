import { getLineItemDisplayName, getLineItemSku } from '@/app/lib/line-item-display'
import { formatMoneyWithCurrency } from '@/app/lib/invoice-utils'

type PoItem = {
  id: string
  quantityOrdered: number
  unitCost: number
  product: { name: string; sku?: string | null }
  productVariant: { name?: string | null; sku?: string | null } | null
}

type Props = {
  items: PoItem[]
}

export default function PurchaseOrderPdfTable({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="invoice-pdf__table-wrap">
      <table className="invoice-pdf__table">
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Qté</th>
            <th>Coût unit. HT</th>
            <th>Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const line = {
              product: it.product,
              productVariant: it.productVariant,
            }
            const qty = Number(it.quantityOrdered)
            const unitCost = Number(it.unitCost)
            return (
              <tr key={it.id}>
                <td className="invoice-pdf__table-cell-designation">
                  <span
                    className="invoice-pdf__table-designation"
                    title={getLineItemDisplayName(line)}
                  >
                    {getLineItemDisplayName(line)}
                  </span>
                  {getLineItemSku(line) !== '-' && (
                    <span className="invoice-pdf__table-sku">Réf. {getLineItemSku(line)}</span>
                  )}
                </td>
                <td>{qty}</td>
                <td>{formatMoneyWithCurrency(unitCost)}</td>
                <td>{formatMoneyWithCurrency(unitCost * qty)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
