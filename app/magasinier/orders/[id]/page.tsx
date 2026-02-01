import { prisma } from '@/lib/prisma'
import { formatOrderNumber } from '@/app/lib/orderNumber'
import { computeTaxTotals } from '@/app/lib/tax'
import OrderActionButtons from '@/app/admin/orders/OrderActionButtons'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function MagasinierOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          clientCode: true,
          companyName: true,
          email: true,
          phone: true,
        }
      },
      items: {
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              description: true,
            }
          }
        }
      }
    }
  })

  if (!order) {
    notFound()
  }

  // Only show CONFIRMED and PREPARED orders to magasinier
  if (order.status !== 'CONFIRMED' && order.status !== 'PREPARED') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-sm text-yellow-700">
            Cette commande est déjà {order.status === 'SHIPPED' ? 'expédiée' : order.status === 'DELIVERED' ? 'livrée' : 'annulée'}.
          </p>
        </div>
        <Link
          href="/magasinier/orders"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux commandes
        </Link>
      </div>
    )
  }

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })
  const vatRate = companySettings?.vatRate ?? 0.2
  const totals = computeTaxTotals(order.total, vatRate)

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/magasinier/orders"
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux commandes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Commande {formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
        </h1>
      </div>

      {/* Client Info */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Nom</p>
            <p className="text-sm font-medium text-gray-900">
              {order.user.companyName || order.user.name}
            </p>
            {order.user.clientCode && (
              <p className="text-xs font-mono text-gray-500">Code: {order.user.clientCode}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900">{order.user.email}</p>
          </div>
          {order.user.phone && (
            <div>
              <p className="text-sm text-gray-500">Téléphone</p>
              <p className="text-sm font-medium text-gray-900">{order.user.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles à préparer</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix unitaire HT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total HT
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.product.sku && <span className="font-mono text-gray-500 mr-1">{item.product.sku}</span>}
                      {item.product.name}
                    </div>
                    {item.product.description && (
                      <div className="text-xs text-gray-500">{item.product.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(item.priceAtTime / (1 + vatRate)).toFixed(2)} Dh
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {((item.priceAtTime * item.quantity) / (1 + vatRate)).toFixed(2)} Dh
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total HT</span>
                <span className="font-medium text-gray-900">{totals.ht.toFixed(2)} Dh</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">TVA ({vatRate * 100}%)</span>
                <span className="font-medium text-gray-900">{totals.vat.toFixed(2)} Dh</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total TTC</span>
                <span className="text-gray-900">{totals.ttc.toFixed(2)} Dh</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex gap-3">
          <OrderActionButtons
            orderId={order.id}
            orderNumber={formatOrderNumber(order.orderNumber, order.id, order.createdAt)}
            currentStatus={order.status}
            requiresAdminApproval={order.requiresAdminApproval}
            isInvoiceLocked={false}
          />
        </div>
        {order.requiresAdminApproval && (
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
            <p className="text-sm text-yellow-700">
              ⚠️ Cette commande nécessite une validation administrateur avant de pouvoir être préparée.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
