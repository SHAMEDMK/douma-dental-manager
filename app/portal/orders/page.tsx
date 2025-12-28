import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import OrderItemCard from './OrderItemCard'
import OrderActions from './OrderActions'
import { formatOrderNumber } from '../../lib/orderNumber'

export default async function OrdersPage() {
  const session = await getSession()
  const orders = await prisma.order.findMany({
    where: { userId: session?.id },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      items: {
        include: { 
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true
            }
          }
        }
      },
      invoice: {
        select: {
          id: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mes Commandes</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Du {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {order.status === 'CANCELLED' ? 'Annulée' : 
                     order.status === 'DELIVERED' ? 'Livrée' :
                     order.status === 'SHIPPED' ? 'Expédiée' :
                     order.status === 'PREPARED' ? 'Préparée' : 'Confirmée'}
                  </span>
                  {order.invoice && (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${order.invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        order.invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}`}>
                      {order.invoice.status === 'PAID' ? 'Payée' :
                       order.invoice.status === 'PARTIAL' ? 'Partiellement payée' :
                       'En attente'}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500 mt-1">
                  Total: {order.total.toFixed(2)} €
                </span>
              </div>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix unitaire</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-medium">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {item.priceAtTime.toFixed(2)} €
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {(item.priceAtTime * item.quantity).toFixed(2)} €
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                          <OrderItemCard 
                            item={item} 
                            isOrderPaid={order.invoice?.status === 'PAID'} 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div className="text-sm text-gray-500">
                    {order.invoice ? (
                      <>
                        Statut Paiement: 
                        <span className={`ml-2 font-bold ${
                          order.invoice.status === 'PAID' ? 'text-green-600' : 
                          order.invoice.status === 'PARTIAL' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {order.invoice.status === 'PAID' ? 'Payée' :
                           order.invoice.status === 'PARTIAL' ? 'Partiellement payée' :
                           'En attente'}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">Paiement à la livraison</span>
                    )}
                 </div>
                 <div className="flex flex-wrap items-center gap-3">
                   <OrderActions
                     orderId={order.id}
                     orderNumber={formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
                     orderStatus={order.status}
                     invoiceStatus={order.invoice?.status}
                   />
                   {/* Placeholder for PDF download */}
                   <button className="text-blue-600 hover:text-blue-900 text-sm">
                     Télécharger Facture (PDF)
                   </button>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
