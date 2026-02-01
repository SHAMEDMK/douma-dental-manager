import { prisma } from '@/lib/prisma'
import { formatOrderNumber } from '@/app/lib/orderNumber'
import { computeTaxTotals } from '@/app/lib/tax'
import Link from 'next/link'
import OrderFilters from './OrderFilters'

export default async function ComptableOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const statusFilter = params.status as string | undefined
  const clientFilter = params.client as string | undefined
  const dateFromFilter = params.dateFrom as string | undefined
  const dateToFilter = params.dateTo as string | undefined

  // Get company settings for VAT rate
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })
  const vatRate = companySettings?.vatRate ?? 0.2

  // Build where clause for filters
  const where: any = {}
  
  if (statusFilter) {
    where.status = statusFilter
  }
  
  if (clientFilter) {
    where.user = {
      OR: [
        { name: { contains: clientFilter } },
        { clientCode: { contains: clientFilter } },
        { email: { contains: clientFilter } },
        { companyName: { contains: clientFilter } },
      ]
    }
  }
  
  if (dateFromFilter || dateToFilter) {
    where.createdAt = {}
    if (dateFromFilter) {
      where.createdAt.gte = new Date(dateFromFilter + 'T00:00:00')
    }
    if (dateToFilter) {
      where.createdAt.lte = new Date(dateToFilter + 'T23:59:59')
    }
  }

  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      user: {
        select: {
          name: true,
          clientCode: true,
          companyName: true
        }
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
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
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmée'
      case 'PREPARED':
        return 'Préparée'
      case 'SHIPPED':
        return 'Expédiée'
      case 'DELIVERED':
        return 'Livrée'
      case 'CANCELLED':
        return 'Annulée'
      default:
        return status
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Commandes</h1>

      <OrderFilters />

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Aucune commande trouvée.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commande</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total TTC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const statusBadge = getStatusBadgeColor(order.status)
                const orderNumber = formatOrderNumber(order.orderNumber, order.id, order.createdAt)
                const totalTTC = computeTaxTotals(order.total, vatRate).ttcFormatted

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link href={`/comptable/orders/${order.id}`} className="text-blue-600 hover:text-blue-900">
                        {orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.user.clientCode && <span className="font-mono text-gray-500 mr-1">{order.user.clientCode}</span>}
                      {order.user.companyName || order.user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {totalTTC}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusBadge}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.invoice ? (
                        <Link 
                          href={`/comptable/invoices/${order.invoice.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {order.invoice.invoiceNumber || order.invoice.id.slice(-8)}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link 
                        href={`/comptable/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Voir détails
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
