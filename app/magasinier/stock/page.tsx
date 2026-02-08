import Link from 'next/link'
import { AlertTriangle, History, CheckCircle } from 'lucide-react'
import { getStockUnits } from '@/app/actions/stock'
import MagasinierStockSuccessBanner from './MagasinierStockSuccessBanner'

export default async function MagasinierStockPage(props: {
  searchParams: Promise<{ updated?: string }>
}) {
  const searchParams = await props.searchParams
  const showSuccess = searchParams.updated === '1'

  const { units, error } = await getStockUnits()

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion du Stock</h1>
        <div className="flex gap-2">
          <Link
            href="/magasinier/stock/movements"
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <History className="w-4 h-4 mr-2" />
            Historique Mouvements
          </Link>
        </div>
      </div>

      {showSuccess && <MagasinierStockSuccessBanner />}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock actuel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock min
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {units.map((row) => {
              const rowKey = row.variantId ?? row.productId
              const isOutOfStock = row.stock === 0
              const isLowStock =
                !isOutOfStock && row.minStock > 0 && row.stock <= row.minStock
              const href = row.variantId
                ? `/magasinier/stock/${row.productId}?variantId=${row.variantId}`
                : `/magasinier/stock/${row.productId}`

              const statusLabel = isOutOfStock
                ? 'Rupture'
                : isLowStock
                  ? 'Stock bas'
                  : 'OK'
              const statusClass = isOutOfStock
                ? 'bg-red-100 text-red-800'
                : isLowStock
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-green-100 text-green-800'

              const rowBgClass = isOutOfStock
                ? 'bg-red-50'
                : isLowStock
                  ? 'bg-amber-50/50'
                  : ''

              return (
                <tr key={rowKey} className={rowBgClass}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.type === 'variant' ? 'Variante' : 'Produit'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {row.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {row.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-bold ${
                        isOutOfStock
                          ? 'text-red-600'
                          : isLowStock
                            ? 'text-amber-700'
                            : 'text-gray-900'
                      }`}
                    >
                      {row.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.minStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}
                    >
                      {isOutOfStock && (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      )}
                      {!isOutOfStock && isLowStock && (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      )}
                      {!isOutOfStock && !isLowStock && (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      )}
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link
                      href={href}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Ajuster
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {units.length === 0 && (
        <p className="mt-6 text-center text-gray-500">
          Aucune unité de stock.
        </p>
      )}
    </div>
  )
}
