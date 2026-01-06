import { prisma } from '@/lib/prisma'
import OrderStatusSelect from './OrderStatusSelect'
import OrderActionButtons from './OrderActionButtons'
import { formatOrderNumber } from '../../lib/orderNumber'

export default async function AdminOrdersPage() {
  // Get admin settings for approval message
  const settings = await prisma.adminSettings.findUnique({
    where: { id: 'default' }
  })
  const approvalMessage = settings?.approvalMessage || 'À valider (marge négative)'

  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      requiresAdminApproval: true,
      user: {
        select: {
          name: true
        }
      },
      invoice: {
        select: {
          status: true
        }
      },
      deliveryNoteNumber: true
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

  // Helper to check if COD badge should be shown
  const shouldShowCODBadge = (order: { status: string; invoice: { status: string } | null }) => {
    return (order.status === 'SHIPPED' || order.status === 'DELIVERED') &&
           order.invoice &&
           order.invoice.status !== 'PAID'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestion des Commandes</h1>

      {orders.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">Aucune commande trouvée.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détails</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{order.total.toFixed(2)} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      {order.requiresAdminApproval && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          {approvalMessage}
                        </span>
                      )}
                      {shouldShowCODBadge(order) && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          COD à encaisser
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.invoice ? (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        order.invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                        order.invoice.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.invoice.status === 'PAID' ? 'Payée' :
                         order.invoice.status === 'PARTIAL' ? 'Partielle' :
                         order.invoice.status === 'CANCELLED' ? 'Annulée' :
                         'Impayée'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {order.deliveryNoteNumber ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-green-600 font-medium">✅ {order.deliveryNoteNumber}</span>
                        {(order.status === 'PREPARED' || order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                          <a 
                            href={`/admin/orders/${order.id}/delivery-note`}
                            target="_blank"
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Imprimer BL
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">➖</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <OrderActionButtons 
                      orderId={order.id}
                      orderNumber={formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                      currentStatus={order.status} 
                      requiresAdminApproval={order.requiresAdminApproval || false}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <a href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-900">
                      Voir détails
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
