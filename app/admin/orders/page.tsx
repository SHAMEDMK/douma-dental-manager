import { prisma } from '@/lib/prisma'
import OrderStatusSelect from './OrderStatusSelect'
import OrderActionButtons from './OrderActionButtons'
import { formatOrderNumber } from '../../lib/orderNumber'
import { computeTaxTotals } from '@/app/lib/tax'
import OrderFilters from './OrderFilters'
import { getSettingsForOrders } from '@/app/lib/settings-cache'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const statusFilter = params.status as string | undefined
  const clientFilter = params.client as string | undefined
  const segmentFilter = params.segment as string | undefined
  const deliveryAgentFilter = params.deliveryAgent as string | undefined
  const dateFromFilter = params.dateFrom as string | undefined
  const dateToFilter = params.dateTo as string | undefined

  // Build where (sync)
  const where: any = {}
  if (statusFilter) where.status = statusFilter
  if (deliveryAgentFilter) where.deliveryAgentId = deliveryAgentFilter
  if (clientFilter || segmentFilter) {
    where.user = {}
    if (clientFilter) {
      where.user.OR = [
        { name: { contains: clientFilter } },
        { clientCode: { contains: clientFilter } },
        { email: { contains: clientFilter } },
        { companyName: { contains: clientFilter } },
      ]
    }
    if (segmentFilter) where.user.segment = segmentFilter
  }
  if (dateFromFilter || dateToFilter) {
    where.createdAt = {}
    if (dateFromFilter) where.createdAt.gte = new Date(dateFromFilter + 'T00:00:00')
    if (dateToFilter) where.createdAt.lte = new Date(dateToFilter + 'T23:59:59')
  }

  // Delivery agents (livreurs) for filter dropdown
  const deliveryAgents = await prisma.user.findMany({
    where: {
      role: 'MAGASINIER',
      OR: [
        { userType: 'LIVREUR' },
        { userType: null },
      ],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  // Settings (cached) + orders in parallel = 1 round-trip
  const [settings, orders] = await Promise.all([
    getSettingsForOrders(),
    prisma.order.findMany({
      where,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      requiresAdminApproval: true,
      deliveryAgentId: true,
      deliveryAgentName: true,
      user: {
        select: {
          name: true,
          clientCode: true
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
    }),
  ])
  const { approvalMessage, vatRate } = settings

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Commandes</h1>
        <a
          href="/api/admin/export/orders"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exporter Excel
        </a>
      </div>

      <OrderFilters deliveryAgents={deliveryAgents} />

      <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total TTC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Livreur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détails</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                  Aucune commande trouvée.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)
                const dateStr = `${String(createdAt.getUTCDate()).padStart(2, '0')}/${String(createdAt.getUTCMonth() + 1).padStart(2, '0')}/${createdAt.getUTCFullYear()}`
                return (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.user.clientCode && <span className="font-mono text-gray-400 mr-1">{order.user.clientCode}</span>}
                    {order.user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dateStr}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{computeTaxTotals(order.total, vatRate).ttc.toFixed(2)} Dh</td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {(order.deliveryAgentName || order.deliveryAgentId) ? (
                      <span title={order.deliveryAgentId ?? undefined}>
                        {order.deliveryAgentName || `ID: ${order.deliveryAgentId}`}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
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
                          <div className="flex items-center gap-1">
                            <a 
                              href={`/admin/orders/${order.id}/delivery-note`}
                              target="_blank"
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                              title="Voir/Imprimer BL"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Voir
                            </a>
                            <a 
                              href={`/api/pdf/admin/orders/${order.id}/delivery-note`}
                              className="text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-900 flex items-center gap-1"
                              title="Télécharger PDF BL"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              PDF
                            </a>
                          </div>
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
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
