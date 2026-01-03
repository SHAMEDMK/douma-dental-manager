import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import OrderStatusSelect from '../OrderStatusSelect'
import OrderActionButtons from '../OrderActionButtons'
import Link from 'next/link'
import { formatOrderNumber } from '../../../lib/orderNumber'
import DeliveryInformationForm from '../DeliveryInformationForm'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
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
        include: {
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
      }
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
                  <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                  <OrderActionButtons orderId={order.id} currentStatus={order.status} />
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
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.invoice.status === 'PAID' ? 'Payée' :
                     order.invoice.status === 'PARTIAL' ? 'Partiellement payée' :
                     'Impayée'}
                  </span>
                </dd>
              </div>
            )}
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.product.name}</td>
                    <td className="px-4 py-2 text-sm text-center text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-500">{item.priceAtTime.toFixed(2)} €</td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                      {(item.priceAtTime * item.quantity).toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de livraison</h2>
          <DeliveryInformationForm
            orderId={order.id}
            initialValues={{
              deliveryCity: order.deliveryCity,
              deliveryAddress: order.deliveryAddress,
              deliveryPhone: order.deliveryPhone,
              deliveryNote: order.deliveryNote,
              deliveryAgentName: order.deliveryAgentName,
              deliveredToName: order.deliveredToName,
              deliveryProofNote: order.deliveryProofNote,
            }}
            shippedAt={order.shippedAt}
            deliveredAt={order.deliveredAt}
          />
        </div>
      </div>
    </div>
  )
}

