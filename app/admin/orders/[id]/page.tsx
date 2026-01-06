import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import OrderStatusSelect from '../OrderStatusSelect'
import OrderActionButtons from '../OrderActionButtons'
import DeliveryForm from './DeliveryForm'
import CODPaymentForm from './CODPaymentForm'
import CreateDeliveryNoteButton from './CreateDeliveryNoteButton'
import Link from 'next/link'
import { formatOrderNumber } from '../../../lib/orderNumber'
import { calculateTotalPaid } from '../../../lib/invoice-utils'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // Get admin settings for approval message
  const settings = await prisma.adminSettings.findUnique({
    where: { id: 'default' }
  })
  const approvalMessage = settings?.approvalMessage || 'À valider (marge négative)'
  
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      requiresAdminApproval: true,
      deliveryCity: true,
      deliveryAddress: true,
      deliveryPhone: true,
      deliveryNote: true,
      shippedAt: true,
      deliveredAt: true,
      deliveryAgentName: true,
      deliveredToName: true,
      deliveryProofNote: true,
      user: {
        select: {
          name: true,
          companyName: true
        }
      },
      items: {
        select: {
          id: true,
          quantity: true,
          priceAtTime: true,
          costAtTime: true,
          product: {
            select: {
              name: true,
              price: true
            }
          }
        }
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          amount: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amount: true,
              method: true,
              reference: true,
              createdAt: true
            }
          }
        }
      },
      deliveryNoteNumber: true
    }
  })

  if (!order) {
    notFound()
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/orders" className="text-blue-600 hover:text-blue-900 text-sm mb-2 inline-block">
          ← Retour aux commandes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Commande {formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails de la commande</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Client</dt>
              <dd className="text-sm text-gray-900">{order.user.name}</dd>
              {order.user.companyName && (
                <dd className="text-sm text-gray-500">{order.user.companyName}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Date</dt>
              <dd className="text-sm text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Statut</dt>
              <dd className="text-sm text-gray-900">
                <div className="flex flex-col gap-2">
                  {order.requiresAdminApproval && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 w-fit">
                      {approvalMessage}
                    </span>
                  )}
                  <OrderStatusSelect 
                    orderId={order.id} 
                    currentStatus={order.status} 
                    requiresAdminApproval={order.requiresAdminApproval || false}
                  />
                  <OrderActionButtons 
                    orderId={order.id}
                    orderNumber={formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                    currentStatus={order.status} 
                    requiresAdminApproval={order.requiresAdminApproval || false}
                  />
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total</dt>
              <dd className="text-lg font-bold text-gray-900">{order.total.toFixed(2)} €</dd>
            </div>
            {order.invoice && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Facture</dt>
                <dd className="text-sm text-gray-900">
                  <Link href={`/admin/invoices/${order.invoice.id}`} className="text-blue-600 hover:text-blue-900">
                    {order.invoice.invoiceNumber || `#${order.invoice.id.slice(-6)}`}
                  </Link>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    order.invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    order.invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                    order.invoice.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.invoice.status === 'PAID' ? 'Payée' :
                     order.invoice.status === 'PARTIAL' ? 'Partiellement payée' :
                     order.invoice.status === 'CANCELLED' ? 'Annulée' :
                     'Impayée'}
                  </span>
                </dd>
              </div>
            )}
            {/* Delivery Note (BL) */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Bon de livraison</dt>
              <dd className="text-sm text-gray-900">
                {order.deliveryNoteNumber ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{order.deliveryNoteNumber}</span>
                    {(order.status === 'PREPARED' || order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                      <Link 
                        href={`/admin/orders/${order.id}/delivery-note`} 
                        className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5"
                        target="_blank"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimer BL
                      </Link>
                    )}
                  </div>
                ) : (
                  <CreateDeliveryNoteButton
                    orderId={order.id}
                    orderStatus={order.status}
                    hasDeliveryNote={!!order.deliveryNoteNumber}
                  />
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Order Items */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles commandés</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qté</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix unit.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Marge</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Marge %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item) => {
                  const lineTotal = item.priceAtTime * item.quantity
                  const costTotal = item.costAtTime * item.quantity
                  const margin = lineTotal - costTotal
                  const marginPercent = item.priceAtTime > 0 ? (margin / lineTotal) * 100 : 0
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.product.name}</td>
                      <td className="px-4 py-2 text-sm text-center text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-500">{item.priceAtTime.toFixed(2)} €</td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                        {lineTotal.toFixed(2)} €
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {item.costAtTime > 0 ? (
                          <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {margin.toFixed(2)} €
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {item.costAtTime > 0 ? (
                          <span className={marginPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {marginPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Livraison</h2>
          <DeliveryForm order={order} />
          {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && order.invoice && order.invoice.status !== 'PAID' && (
            <CODPaymentForm 
              invoiceId={order.invoice.id}
              invoiceAmount={order.invoice.amount}
              payments={order.invoice.payments}
            />
          )}
          {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
              {order.shippedAt && (
                <div>
                  <div className="text-xs font-medium text-gray-500">Expédiée le</div>
                  <div className="text-gray-900">
                    {new Date(order.shippedAt).toLocaleDateString('fr-FR')} à {new Date(order.shippedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {order.deliveryAgentName && (
                    <div className="text-xs text-gray-600">par {order.deliveryAgentName}</div>
                  )}
                </div>
              )}
              {order.deliveredAt && (
                <div>
                  <div className="text-xs font-medium text-gray-500">Livrée le</div>
                  <div className="text-gray-900">
                    {new Date(order.deliveredAt).toLocaleDateString('fr-FR')} à {new Date(order.deliveredAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {order.deliveredToName && (
                    <div className="text-xs text-gray-600">reçue par {order.deliveredToName}</div>
                  )}
                  {order.deliveryProofNote && (
                    <div className="text-xs text-gray-600 mt-1 italic">Note: {order.deliveryProofNote}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

