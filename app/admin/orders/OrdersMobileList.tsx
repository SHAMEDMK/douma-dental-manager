'use client'

import Link from 'next/link'
import OrderActionButtons from './OrderActionButtons'
import { formatOrderNumber } from '../../lib/orderNumber'
import { computeTaxTotals } from '@/app/lib/tax'

type Order = {
  id: string
  orderNumber: string | null
  createdAt: Date
  status: string
  total: number
  requiresAdminApproval: boolean | null
  deliveryAgentId: string | null
  deliveryAgentName: string | null
  deliveryNoteNumber: string | null
  user: { name: string; clientCode: string | null }
  invoice: { status: string } | null
}

type OrdersMobileListProps = {
  orders: Order[]
  vatRate: number
  approvalMessage: string
  canAccessDeliveryNotePdf: boolean
}

function getStatusBadgeColor(status: string) {
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

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CONFIRMED: 'Confirmée',
    PREPARED: 'Préparée',
    SHIPPED: 'Expédiée',
    DELIVERED: 'Livrée',
    CANCELLED: 'Annulée',
  }
  return labels[status] || status
}

function shouldShowCODBadge(order: Order) {
  return (
    (order.status === 'SHIPPED' || order.status === 'DELIVERED') &&
    order.invoice &&
    order.invoice.status !== 'PAID'
  )
}

export default function OrdersMobileList({
  orders,
  vatRate,
  approvalMessage,
  canAccessDeliveryNotePdf,
}: OrdersMobileListProps) {
  if (orders.length === 0) {
    return (
      <div className="md:hidden bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-gray-500">
        Aucune commande trouvée.
      </div>
    )
  }

  return (
    <div className="md:hidden space-y-3 pb-4">
      {orders.map((order) => {
        const createdAt =
          order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)
        const dateStr = `${String(createdAt.getUTCDate()).padStart(2, '0')}/${String(createdAt.getUTCMonth() + 1).padStart(2, '0')}/${createdAt.getUTCFullYear()}`
        const ttc = computeTaxTotals(order.total, vatRate).ttc.toFixed(2)

        return (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex justify-between items-start gap-2 mb-2">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600"
                >
                  {formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                </Link>
                <span className="text-sm font-bold text-gray-900">{ttc} Dh</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {order.user.clientCode && (
                  <span className="font-mono text-gray-400 mr-1">{order.user.clientCode}</span>
                )}
                {order.user.name}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(order.status)}`}
                >
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
                {order.invoice && (
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      order.invoice.status === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : order.invoice.status === 'PARTIAL'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.invoice.status === 'CANCELLED'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {order.invoice.status === 'PAID'
                      ? 'Payée'
                      : order.invoice.status === 'PARTIAL'
                        ? 'Partielle'
                        : order.invoice.status === 'CANCELLED'
                          ? 'Annulée'
                          : 'Impayée'}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{dateStr}</span>
                {(order.deliveryAgentName || order.deliveryAgentId) && (
                  <span>Livreur: {order.deliveryAgentName || `ID: ${order.deliveryAgentId}`}</span>
                )}
              </div>
              {order.deliveryNoteNumber && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-green-600 font-medium text-sm">
                    BL {order.deliveryNoteNumber}
                  </span>
                  {(order.status === 'PREPARED' ||
                    order.status === 'SHIPPED' ||
                    order.status === 'DELIVERED') &&
                    canAccessDeliveryNotePdf && (
                      <span className="text-xs text-blue-600 font-medium flex gap-1">
                        <a
                          href={`/admin/orders/${order.id}/delivery-note`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Voir
                        </a>
                        <a
                          href={`/api/pdf/admin/orders/${order.id}/delivery-note`}
                          className="hover:underline"
                        >
                          PDF
                        </a>
                      </span>
                    )}
                </div>
              )}
            </div>
            <div className="px-4 pb-4 pt-0 border-t border-gray-100 flex flex-col gap-2">
              <OrderActionButtons
                orderId={order.id}
                orderNumber={formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                currentStatus={order.status}
                requiresAdminApproval={order.requiresAdminApproval || false}
              />
              <Link
                href={`/admin/orders/${order.id}`}
                className="block w-full text-center py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:bg-blue-200 min-h-[2.75rem] flex items-center justify-center"
              >
                Voir détails
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
