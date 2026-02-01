import { prisma } from '@/lib/prisma'
import { Package, ShoppingCart, AlertTriangle, TrendingDown } from 'lucide-react'
import Link from 'next/link'

export default async function MagasinierDashboard() {
  // Get orders to prepare (CONFIRMED status)
  const ordersToPrepare = await prisma.order.count({
    where: { status: 'CONFIRMED' }
  })

  // Get low stock products
  const lowStockProducts = await prisma.product.findMany({
    where: {
      stock: {
        lte: prisma.product.fields.minStock,
      },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      minStock: true,
    },
    take: 5,
    orderBy: { stock: 'asc' }
  })

  // Get prepared orders today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const preparedToday = await prisma.order.count({
    where: {
      status: 'PREPARED',
      updatedAt: {
        gte: today
      }
    }
  })

  // Get total products count
  const totalProducts = await prisma.product.count()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Magasin</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble des commandes et du stock</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Commandes à préparer */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">À préparer</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {ordersToPrepare}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    commande{ordersToPrepare !== 1 ? 's' : ''} en attente
                  </dd>
                </dl>
              </div>
            </div>
            {ordersToPrepare > 0 && (
              <div className="mt-4">
                <Link
                  href="/magasinier/orders?status=CONFIRMED"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Voir les commandes →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Préparées aujourd'hui */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Préparées aujourd'hui</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {preparedToday}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    commande{preparedToday !== 1 ? 's' : ''}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Stock bas */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-lg p-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Stock bas</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {lowStockProducts.length}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    produit{lowStockProducts.length !== 1 ? 's' : ''} à réapprovisionner
                  </dd>
                </dl>
              </div>
            </div>
            {lowStockProducts.length > 0 && (
              <div className="mt-4">
                <Link
                  href="/magasinier/stock"
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Voir le stock →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Total produits */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-100 rounded-lg p-3">
                <TrendingDown className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total produits</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {totalProducts}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    en catalogue
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white shadow-sm rounded-xl border border-red-200 mb-6">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Alertes Stock Bas</h2>
            </div>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.sku && <span className="font-mono text-gray-500 mr-1">{product.sku}</span>}{product.name}</p>
                    <p className="text-xs text-gray-600">
                      Stock: {product.stock} / Minimum: {product.minStock}
                    </p>
                  </div>
                  <Link
                    href={`/magasinier/stock/${product.id}`}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Ajuster →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/magasinier/orders?status=CONFIRMED"
          className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Commandes à préparer</h3>
              <p className="text-sm text-gray-600 mt-1">
                {ordersToPrepare > 0 
                  ? `${ordersToPrepare} commande${ordersToPrepare !== 1 ? 's' : ''} en attente`
                  : 'Aucune commande à préparer'
                }
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/magasinier/stock"
          className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Package className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gestion du stock</h3>
              <p className="text-sm text-gray-600 mt-1">
                Voir et ajuster les niveaux de stock
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
