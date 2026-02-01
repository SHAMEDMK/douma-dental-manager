import { prisma } from '@/lib/prisma'
import { formatOrderNumber } from '@/app/lib/orderNumber'
import { computeTaxTotals } from '@/app/lib/tax'
import OrderActionButtons from '@/app/admin/orders/OrderActionButtons'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default async function MagasinierOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const statusFilter = params.status as string | undefined

  // Get company settings for VAT rate
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })
  const vatRate = companySettings?.vatRate ?? 0.2

  // Build where clause - focus on CONFIRMED and PREPARED orders
  const where: any = {
    status: { in: ['CONFIRMED', 'PREPARED'] } // Always show both by default
  }
  
  if (statusFilter && (statusFilter === 'CONFIRMED' || statusFilter === 'PREPARED')) {
    // If a specific filter is selected, show only that status
    where.status = statusFilter
  }

  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      requiresAdminApproval: true,
      user: {
        select: {
          name: true,
          clientCode: true,
          companyName: true
        }
      },
      items: {
        select: {
          product: {
            select: {
              name: true,
              sku: true
            }
          },
          quantity: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800'
      case 'PREPARED':
        return 'bg-yellow-100 text-yellow-800'
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800'
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'CONFIRMED': 'Confirmée',
      'PREPARED': 'Préparée',
      'SHIPPED': 'Expédiée',
      'DELIVERED': 'Livrée',
      'CANCELLED': 'Annulée'
    }
    return labels[status] || status
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Commandes à Préparer</h1>
        <p className="text-gray-600 mt-1">Gérer la préparation des commandes</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <Link
          href="/magasinier/orders"
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            !statusFilter
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Toutes ({orders.length})
        </Link>
        <Link
          href="/magasinier/orders?status=CONFIRMED"
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            statusFilter === 'CONFIRMED'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          À préparer ({orders.filter(o => o.status === 'CONFIRMED').length})
        </Link>
        <Link
          href="/magasinier/orders?status=PREPARED"
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            statusFilter === 'PREPARED'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Préparées ({orders.filter(o => o.status === 'PREPARED').length})
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Aucune commande trouvée.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total HT
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
              {orders.map((order) => {
                const totals = computeTaxTotals(order.total, vatRate)
                return (
                  <tr key={order.id} className={order.requiresAdminApproval ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/magasinier/orders/${order.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        {formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                      </Link>
                      {order.requiresAdminApproval && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⚠️ À valider
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.user.clientCode && <span className="font-mono text-gray-500 mr-1">{order.user.clientCode}</span>}
                        {order.user.companyName || order.user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.items.length} produit{order.items.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.items.slice(0, 2).map(item => item.product.sku ? `${item.product.sku} ${item.product.name}` : item.product.name).join(', ')}
                        {order.items.length > 2 && '...'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {totals.ht.toFixed(2)} Dh
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <OrderActionButtons
                          orderId={order.id}
                          orderNumber={formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                          currentStatus={order.status}
                          requiresAdminApproval={order.requiresAdminApproval}
                          isInvoiceLocked={false}
                        />
                        <Link
                          href={`/magasinier/orders/${order.id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Détails
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
