import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import DownloadPdfButton from '@/app/components/DownloadPdfButton'
import Link from 'next/link'
import { formatOrderNumber } from '@/app/lib/orderNumber'
import { formatMoney } from '@/app/lib/invoice-utils'
import { computeTaxTotals } from '@/app/lib/tax'

export default async function ComptableOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // Get company settings for VAT rate
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })
  const vatRate = companySettings?.vatRate ?? 0.2
  
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
      deliveryNoteNumber: true,
      user: {
        select: {
          name: true,
          companyName: true,
          email: true,
          phone: true,
          discountRate: true
        }
      },
      items: {
        select: {
          id: true,
          quantity: true,
          priceAtTime: true,
          product: {
            select: {
              name: true
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
          createdAt: true
        }
      }
    }
  })

  if (!order) {
    notFound()
  }

  const orderNumber = formatOrderNumber(order.orderNumber, order.id, order.createdAt)
  const taxTotals = computeTaxTotals(order.total, vatRate)

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmée'
      case 'PREPARED': return 'Préparée'
      case 'SHIPPED': return 'Expédiée'
      case 'DELIVERED': return 'Livrée'
      case 'CANCELLED': return 'Annulée'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'PREPARED': return 'bg-yellow-100 text-yellow-800'
      case 'SHIPPED': return 'bg-purple-100 text-purple-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/comptable/orders" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← Retour aux commandes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Commande {orderNumber}</h1>
        </div>
        {order.deliveryNoteNumber && (
          <DownloadPdfButton url={`/api/pdf/admin/orders/${order.id}/delivery-note`} label="Télécharger BL" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nom</p>
                <p className="text-sm font-medium text-gray-900">{order.user.name}</p>
              </div>
              {order.user.companyName && (
                <div>
                  <p className="text-sm text-gray-500">Entreprise</p>
                  <p className="text-sm font-medium text-gray-900">{order.user.companyName}</p>
                </div>
              )}
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
              {order.user.discountRate && (
                <div>
                  <p className="text-sm text-gray-500">Remise</p>
                  <p className="text-sm font-medium text-gray-900">{order.user.discountRate}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles Commandés</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix HT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total HT</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.product.name}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">{formatMoney(item.priceAtTime)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatMoney(item.priceAtTime * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total HT</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatMoney(order.total)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">TVA ({vatRate * 100}%)</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{taxTotals.vatFormatted}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total TTC</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{taxTotals.ttcFormatted}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statut</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Statut de la commande</p>
                <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium mt-1 ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date de création</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {order.deliveryNoteNumber && (
                <div>
                  <p className="text-sm text-gray-500">Bon de livraison</p>
                  <p className="text-sm font-medium text-gray-900">{order.deliveryNoteNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Link */}
          {order.invoice && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Facture</h2>
              <Link 
                href={`/comptable/invoices/${order.invoice.id}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Voir la facture →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
