import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PaymentForm from '../../../admin/invoices/PaymentForm'
import Link from 'next/link'
import { getInvoiceDisplayNumber, calculateTotalPaid, formatMoney, calculateInvoiceRemaining } from '@/app/lib/invoice-utils'
import PrintButton from '@/app/components/PrintButton'
import DownloadPdfButton from '@/app/components/DownloadPdfButton'
import { computeTaxTotals } from '@/app/lib/tax'

export default async function ComptableInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
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
          deliveryNoteNumber: true,
          status: true,
          user: {
            select: {
              name: true,
              clientCode: true,
              companyName: true,
              email: true,
              segment: true,
              phone: true,
              address: true,
              city: true,
              ice: true,
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
                  name: true,
                  sku: true
                }
              }
            }
          }
        }
      },
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
  })

  if (!invoice) {
    notFound()
  }

  // Get company settings for VAT rate
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })
  const vatRate = companySettings?.vatRate ?? 0.2

  const totalPaid = calculateTotalPaid(invoice.payments)
  const remaining = calculateInvoiceRemaining(invoice.amount ?? 0, totalPaid, vatRate)
  const invoiceNumber = getInvoiceDisplayNumber(invoice.invoiceNumber, invoice.id, invoice.createdAt)
  const taxTotals = computeTaxTotals(invoice.amount ?? 0, vatRate)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/comptable/invoices" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← Retour aux factures
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Facture {invoiceNumber}</h1>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <DownloadPdfButton url={`/api/pdf/admin/invoices/${invoice.id}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h2>
            <div className="grid grid-cols-2 gap-4">
              {invoice.order.user.clientCode && (
                <div>
                  <p className="text-sm text-gray-500">Code client</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{invoice.order.user.clientCode}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Nom</p>
                <p className="text-sm font-medium text-gray-900">{invoice.order.user.name}</p>
              </div>
              {invoice.order.user.companyName && (
                <div>
                  <p className="text-sm text-gray-500">Entreprise</p>
                  <p className="text-sm font-medium text-gray-900">{invoice.order.user.companyName}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{invoice.order.user.email}</p>
              </div>
              {invoice.order.user.phone && (
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <p className="text-sm font-medium text-gray-900">{invoice.order.user.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Articles</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réf. / Produit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix HT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total HT</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.product.sku && <span className="font-mono text-gray-500 mr-1">{item.product.sku}</span>}
                      {item.product.name}
                    </td>
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
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatMoney(invoice.amount ?? 0)}</td>
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
          {/* Payment Summary */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Résumé Paiement</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total TTC</span>
                <span className="text-sm font-medium text-gray-900">{taxTotals.ttcFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Payé</span>
                <span className="text-sm font-medium text-green-600">{formatMoney(totalPaid)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-sm font-medium text-gray-900">Reste à payer</span>
                <span className={`text-sm font-bold ${remaining > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatMoney(remaining)}
                </span>
              </div>
              {remaining > 0.01 && (
                <div className="pt-4">
                  <PaymentForm invoiceId={invoice.id} balance={remaining} />
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des Paiements</h2>
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="border-b pb-3 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatMoney(payment.amount)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {payment.method === 'CASH' ? 'Espèces' :
                         payment.method === 'CHECK' ? 'Chèque' :
                         payment.method === 'TRANSFER' ? 'Virement' :
                         payment.method === 'COD' ? 'COD' :
                         payment.method === 'CARD' ? 'Carte Bancaire' : payment.method}
                      </span>
                    </div>
                    {payment.reference && (
                      <p className="text-xs text-gray-500">Ref: {payment.reference}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Link */}
          <div className="bg-white shadow rounded-lg p-6">
            <Link 
              href={`/comptable/orders/${invoice.order.id}`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Voir la commande associée →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
