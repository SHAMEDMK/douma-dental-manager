import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatOrderNumber } from '../../../lib/orderNumber'
import PrintButton from '@/app/components/PrintButton'
import DownloadPdfButton from '@/app/components/DownloadPdfButton'
import { getInvoiceDisplayNumber, calculateTotalPaid, formatMoney, calculateInvoiceRemaining } from '../../../lib/invoice-utils'

export default async function PortalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  
  if (!session) {
    notFound()
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      createdAt: true,
      status: true,
      amount: true,
      balance: true,
      paidAt: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          total: true,
          user: {
            select: {
              id: true,
              name: true,
              clientCode: true,
              companyName: true
            }
          },
          items: {
            select: {
              id: true,
              quantity: true,
              priceAtTime: true,
              product: {
                select: {
                  name: true,
                  sku: true
                }
              }
            }
          }
        }
      },
      payments: {
        select: {
          id: true,
          amount: true,
          method: true,
          reference: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!invoice) {
    notFound()
  }

  // Verify the invoice belongs to the current user
  if (invoice.order.user.id !== session.id) {
    notFound()
  }

  // Get company settings for VAT rate (F1: balance = encours TTC)
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })
  const vatRate = companySettings?.vatRate ?? 0.2

  const totalPaid = calculateTotalPaid(invoice.payments)
  // F1: Calculate remaining TTC (remaining = invoice.totalTTC - totalPaid, min 0)
  const remaining = calculateInvoiceRemaining(invoice.amount ?? 0, totalPaid, vatRate)
  const orderNumber = formatOrderNumber(invoice.order.orderNumber, invoice.order.id, invoice.order.createdAt)
  const invoiceNumber = getInvoiceDisplayNumber(invoice.invoiceNumber, invoice.id, invoice.createdAt)

  return (
    <div>
      <div className="mb-6">
        <Link href="/portal/orders" className="text-blue-600 hover:text-blue-900 text-sm mb-2 inline-block">
          ← Retour aux commandes
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Facture {invoiceNumber}</h1>
          <div className="flex items-center gap-3">
            <Link
              href={`/portal/invoices/${id}/print`}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
            >
              Voir/Imprimer
            </Link>
            <DownloadPdfButton url={`/api/pdf/portal/invoices/${id}`} />
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${
              invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
              invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {invoice.status === 'PAID' ? 'Payée' :
               invoice.status === 'PARTIAL' ? 'Partiellement payée' :
               'En attente'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails de la facture</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Client</dt>
            <dd className="text-sm text-gray-900">{invoice.order.user.name}</dd>
            {invoice.order.user.companyName && (
              <dd className="text-sm text-gray-500">{invoice.order.user.companyName}</dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Commande</dt>
            <dd className="text-sm text-gray-900">{orderNumber}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Date de facturation</dt>
            <dd className="text-sm text-gray-900">{new Date(invoice.createdAt).toLocaleDateString('fr-FR')}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Montant total</dt>
            <dd className="text-sm font-bold text-gray-900">{formatMoney(invoice.amount)} Dh</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Montant payé</dt>
            <dd className="text-sm text-green-600">{formatMoney(totalPaid)} Dh</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Solde restant</dt>
            <dd className={`text-sm font-bold ${remaining > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
              {formatMoney(remaining)} Dh
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantité</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.product.sku && <span className="font-mono text-gray-500 mr-1">{item.product.sku}</span>}
                    {item.product.name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">{formatMoney(item.priceAtTime)} Dh</td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatMoney(item.quantity * item.priceAtTime)} Dh
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-4 py-4 text-right text-sm font-medium text-gray-900">Total</td>
                <td className="px-4 py-4 text-right text-sm font-bold text-gray-900">{formatMoney(invoice.amount)} Dh</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {invoice.payments.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Paiements</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.method === 'CASH' ? 'Espèces' :
                       payment.method === 'CHECK' ? 'Chèque' :
                       payment.method === 'TRANSFER' ? 'Virement' :
                       payment.method === 'CARD' ? 'Carte Bancaire' :
                       payment.method}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{payment.reference || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatMoney(payment.amount)} Dh
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

