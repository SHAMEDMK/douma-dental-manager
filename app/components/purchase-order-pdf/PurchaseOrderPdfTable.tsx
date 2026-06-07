import { getLineItemDisplayName, getLineItemSku } from '@/app/lib/line-item-display'

type PoItem = {
  id: string
  quantityOrdered: number
  product: { name: string; sku?: string | null }
  productVariant: { name?: string | null; sku?: string | null } | null
}

type Props = {
  items: PoItem[]
}

/** Tableau PO : désignation + quantités uniquement (pas de prix). */
export default function PurchaseOrderPdfTable({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="invoice-pdf__table-wrap">
      <table className="invoice-pdf__table invoice-pdf__table--qty-only">
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Qté</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const line = {
              product: it.product,
              productVariant: it.productVariant,
            }
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
                <td>{Number(it.quantityOrdered)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
