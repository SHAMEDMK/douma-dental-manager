import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PaymentForm from '../PaymentForm'
import Link from 'next/link'
import { getInvoiceDisplayNumber, calculateTotalPaid, calculateLineItemsTotal } from '../../../lib/invoice-utils'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          user: true,
          items: {
            include: {
              product: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      },
      payments: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!invoice) {
    notFound()
  }

  // Calculate amounts for verification
  const totalPaid = calculateTotalPaid(invoice.payments)
  const lineItemsTotal = calculateLineItemsTotal(invoice.order.items)
  const invoiceNumber = getInvoiceDisplayNumber(invoice.id, invoice.createdAt)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/invoices" className="text-blue-600 hover:text-blue-900 text-sm mb-2 inline-block">
            ← Retour aux factures
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Facture {invoiceNumber}</h1>
        </div>
        <span className={`px-3 py-1 text-sm rounded-full font-medium ${
          invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
          invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {invoice.status === 'PAID' ? 'Payée' :
           invoice.status === 'PARTIAL' ? 'Partiellement payée' :
           'Impayée'}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Invoice Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails de la facture</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Client</dt>
              <dd className="text-sm text-gray-900">{invoice.order.user.name}</dd>
              {invoice.order.user.companyName && (
                <dd className="text-sm text-gray-500">{invoice.order.user.companyName}</dd>
              )}
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Commande</dt>
              <dd className="text-sm text-gray-900">
                <Link href={`/admin/orders/${invoice.order.id}`} className="text-blue-600 hover:text-blue-900">
                  #{invoice.order.id.slice(-6)}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Date de création</dt>
              <dd className="text-sm text-gray-900">{new Date(invoice.createdAt).toLocaleDateString()}</dd>
            </div>
            {invoice.paidAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Date de paiement</dt>
                <dd className="text-sm text-gray-900">{new Date(invoice.paidAt).toLocaleDateString()}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Montant total</dt>
              <dd className="text-lg font-bold text-gray-900">{invoice.amount.toFixed(2)} €</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total payé</dt>
              <dd className="text-lg font-bold text-green-600">{totalPaid.toFixed(2)} €</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Reste à payer</dt>
              <dd className={`text-lg font-bold ${invoice.balance > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                {invoice.balance.toFixed(2)} €
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
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.order.items.map((item) => {
                  const lineTotal = item.priceAtTime * item.quantity
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.product.name}</td>
                      <td className="px-4 py-2 text-sm text-center text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-500">{item.priceAtTime.toFixed(2)} €</td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                        {lineTotal.toFixed(2)} €
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    {lineItemsTotal.toFixed(2)} €
                  </td>
                </tr>
                {Math.abs(lineItemsTotal - invoice.amount) > 0.01 && (
                  <tr className="bg-yellow-50">
                    <td colSpan={4} className="px-4 py-2 text-xs text-yellow-800 text-center">
                      ⚠️ Attention: Le total des lignes ({lineItemsTotal.toFixed(2)} €) ne correspond pas au montant de la facture ({invoice.amount.toFixed(2)} €)
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Timeline */}
      {invoice.payments.length > 0 && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des paiements</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méthode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {payment.amount.toFixed(2)} €
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.method === 'CASH' && 'Espèces'}
                      {payment.method === 'CHECK' && 'Chèque'}
                      {payment.method === 'TRANSFER' && 'Virement'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.reference || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={1} className="px-4 py-3 text-sm font-medium text-gray-900">Total payé</td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">
                    {totalPaid.toFixed(2)} €
                  </td>
                  <td colSpan={2}></td>
                </tr>
                {Math.abs(totalPaid - (invoice.amount - invoice.balance)) > 0.01 && (
                  <tr className="bg-yellow-50">
                    <td colSpan={4} className="px-4 py-2 text-xs text-yellow-800 text-center">
                      ⚠️ Attention: Incohérence détectée entre les paiements enregistrés et le solde
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Payment Form (only if not fully paid) */}
      {invoice.balance > 0.01 && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enregistrer un paiement</h2>
          <PaymentForm invoiceId={invoice.id} balance={invoice.balance} />
        </div>
      )}
    </div>
  )
}

