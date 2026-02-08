import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PaymentForm from '../PaymentForm'
import Link from 'next/link'
import { getInvoiceDisplayNumber, calculateTotalPaid, calculateLineItemsTotal, formatMoney, calculateInvoiceRemaining, calculateInvoiceStatusWithPayments } from '../../../lib/invoice-utils'
import PrintButton from '@/app/components/PrintButton'
import DownloadPdfButton from '@/app/components/DownloadPdfButton'
import { computeTaxTotals } from '@/app/lib/tax'
import { isInvoiceLocked } from '@/app/lib/invoice-lock'
import { getLineItemDisplayName, getLineItemSku } from '@/app/lib/line-item-display'
import { getPaymentTermsForDisplay } from '@/app/lib/invoice-utils'
import DeleteInvoiceButton from './DeleteInvoiceButton'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
          deliveryAddress: true,
          deliveryCity: true,
          deliveryPhone: true,
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
              costAtTime: true,
              product: {
                select: {
                  name: true,
                  sku: true
                }
              },
              productVariant: {
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

  // Get company settings for VAT rate and bank info
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  })

  // Calculate amounts for verification
  const totalPaid = calculateTotalPaid(invoice.payments)
  const lineItemsTotal = calculateLineItemsTotal(invoice.order.items)
  const invoiceNumber = getInvoiceDisplayNumber(invoice.invoiceNumber, invoice.id, invoice.createdAt)
  
  // Compute tax totals: invoice.amount is HT, use VAT rate from CompanySettings
  const vatRate = companySettings?.vatRate ?? 0.2
  const taxTotals = computeTaxTotals(invoice.amount ?? 0, vatRate)

  // F1: Calculate remaining TTC (remaining = invoice.totalTTC - totalPaid, min 0)
  const remaining = calculateInvoiceRemaining(invoice.amount ?? 0, totalPaid, vatRate)

  // Check if invoice is locked
  const invoiceLocked = isInvoiceLocked(invoice)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/invoices" className="text-blue-600 hover:text-blue-900 text-sm mb-2 inline-block">
            ← Retour aux factures
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Facture {invoiceNumber}</h1>
            {/* G3: Badge "Facture verrouillée" */}
            {invoiceLocked && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                🔒 Facture verrouillée
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={`/admin/invoices/${id}/print`}
            className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
          >
            Voir/Imprimer
          </Link>
          <DownloadPdfButton url={`/api/pdf/admin/invoices/${id}`} />
          <DeleteInvoiceButton invoiceId={id} invoiceNumber={invoice.invoiceNumber} />
          <span className={`px-3 py-1 text-sm rounded-full font-medium ${
            invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
            invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
            invoice.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
            'bg-red-100 text-red-800'
          }`}>
            {invoice.status === 'PAID' ? 'Payée' :
             invoice.status === 'PARTIAL' ? 'Partiellement payée' :
             invoice.status === 'CANCELLED' ? 'Annulée' :
             'Impayée'}
          </span>
        </div>
      </div>

      {/* G2: Vendeur + Client (cohérence avec print) */}
      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Vendeur */}
          <div className="md:col-span-1">
            <div className="text-gray-600 mb-2 font-medium">Vendeur</div>
            {companySettings && (
              <>
                <div className="font-semibold">{companySettings.name}</div>
                {(companySettings.address || companySettings.city || companySettings.country) && (
                  <div className="text-gray-600 text-xs mt-1">
                    {[companySettings.address, companySettings.city, companySettings.country].filter(Boolean).join(' – ')}
                  </div>
                )}
                {companySettings.ice && (
                  <div className="text-gray-600 text-xs mt-1">ICE: {companySettings.ice}</div>
                )}
                {(companySettings.if || companySettings.rc || companySettings.tp) && (
                  <div className="text-gray-600 text-xs mt-1">
                    {[companySettings.if && `IF: ${companySettings.if}`, companySettings.rc && `RC: ${companySettings.rc}`, companySettings.tp && `TP: ${companySettings.tp}`].filter(Boolean).join(' / ')}
                  </div>
                )}
                {(companySettings.phone || companySettings.email) && (
                  <div className="text-gray-600 text-xs mt-1">
                    {[companySettings.phone && `Tél: ${companySettings.phone}`, companySettings.email].filter(Boolean).join(' – ')}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Espace vide au centre */}
          <div className="hidden md:block md:col-span-1"></div>
          
          {/* Client */}
          <div className="md:col-span-1 md:ml-auto">
            <div className="text-gray-600 mb-2 font-medium">Facturé à</div>
            {invoice.order.user.clientCode && (
              <div className="text-xs font-mono text-gray-500 mb-1">Code: {invoice.order.user.clientCode}</div>
            )}
            {/* 1) Nom/Société */}
            <div className="font-semibold">{invoice.order.user.companyName ?? invoice.order.user.name}</div>
            {/* 2) Email */}
            {invoice.order.user.email && (
              <div className="text-gray-600 text-xs mt-1">{invoice.order.user.email}</div>
            )}
            {/* 3) Segment */}
            {invoice.order.user.segment && (
              <div className="text-gray-500 text-xs mt-1">Segment: {invoice.order.user.segment}</div>
            )}
            {/* 4) Téléphone */}
            {invoice.order.user.phone && (
              <div className="text-gray-600 text-xs mt-1">{invoice.order.user.phone}</div>
            )}
            {/* 5) Adresse */}
            {(invoice.order.user.address || invoice.order.user.city) && (
              <div className="text-gray-600 text-xs mt-1">
                {[invoice.order.user.address, invoice.order.user.city].filter(Boolean).join(', ')}
              </div>
            )}
            {/* 6) ICE */}
            {invoice.order.user.ice && (
              <div className="text-gray-600 text-xs mt-1">ICE: {invoice.order.user.ice}</div>
            )}
          </div>
        </div>

        {/* Références croisées : N° CMD et N° BL sur deux lignes */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm space-y-1">
          <div className="text-gray-600">
            <span className="font-medium">N° CMD:</span>{' '}
            <Link href={`/admin/orders/${invoice.order.id}`} className="text-blue-600 hover:text-blue-900">
              {invoice.order.orderNumber || `#${invoice.order.id.slice(-6)}`}
            </Link>
          </div>
          {invoice.order.deliveryNoteNumber && (
            <div className="text-gray-600">
              <span className="font-medium">N° BL:</span> {invoice.order.deliveryNoteNumber}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Invoice Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails de la facture</h2>
          <dl className="space-y-3">
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
              <dt className="text-sm font-medium text-gray-500">Total HT</dt>
              <dd className="text-lg font-bold text-gray-900">{taxTotals.htFormatted}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">TVA ({taxTotals.ratePercent}%)</dt>
              <dd className="text-sm text-gray-700">{taxTotals.vatFormatted}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total TTC</dt>
              <dd className="text-lg font-bold text-gray-900">{taxTotals.ttcFormatted}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total payé</dt>
              <dd className="text-lg font-bold text-green-600">{formatMoney(totalPaid)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Reste à payer</dt>
              <dd className={`text-lg font-bold ${remaining > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                {formatMoney(remaining)}
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Réf. / Produit</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qté</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">PU HT</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Remise attribuée</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total HT</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Marge</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Marge %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.order.items.map((item) => {
                  const lineTotal = item.priceAtTime * item.quantity
                  const costTotal = item.costAtTime * item.quantity
                  const margin = lineTotal - costTotal
                  const marginPercent = item.priceAtTime > 0 ? (margin / lineTotal) * 100 : 0
                  const discountRate = invoice.order.user.discountRate ?? 0
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {getLineItemSku(item) !== '-' && (
                          <span className="font-mono text-gray-500 mr-1">{getLineItemSku(item)}</span>
                        )}
                        {getLineItemDisplayName(item)}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-500">{formatMoney(item.priceAtTime)}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-600">
                        {discountRate > 0 ? `${discountRate.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                        {formatMoney(lineTotal)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {item.costAtTime > 0 ? (
                          <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatMoney(margin)}
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
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total HT</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                    {taxTotals.htFormatted}
                  </td>
                  <td colSpan={2}></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">TVA ({taxTotals.ratePercent}%)</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                    {taxTotals.vatFormatted}
                  </td>
                  <td colSpan={2}></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">Total TTC</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    {taxTotals.ttcFormatted}
                  </td>
                  <td colSpan={2}></td>
                </tr>
                {Math.abs(lineItemsTotal - invoice.amount) > 0.01 && (
                  <tr className="bg-yellow-50">
                    <td colSpan={7} className="px-4 py-2 text-xs text-yellow-800 text-center">
                      ⚠️ Attention: Le total des lignes ({formatMoney(lineItemsTotal)}) ne correspond pas au montant de la facture ({formatMoney(invoice.amount)})
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
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.method === 'CASH' && 'Espèces'}
                      {payment.method === 'CHECK' && 'Chèque'}
                      {payment.method === 'TRANSFER' && 'Virement'}
                      {payment.method === 'CARD' && 'Carte Bancaire'}
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
                    {formatMoney(totalPaid)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Payment Form (only if not fully paid) */}
      {remaining > 0.01 && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enregistrer un paiement</h2>
          <PaymentForm invoiceId={invoice.id} balance={remaining} />
        </div>
      )}

      {/* G2: Conditions de paiement et mentions légales (cohérence avec print) */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations légales</h2>
        {getPaymentTermsForDisplay(companySettings?.paymentTerms) && (
          <div className="mb-4 text-sm">
            <div className="text-gray-700 font-medium mb-1">Conditions de paiement:</div>
            <div className="text-gray-600">{getPaymentTermsForDisplay(companySettings?.paymentTerms)}</div>
          </div>
        )}
        <div className="mb-4 text-sm">
          <div className="text-gray-700 font-medium mb-1">Banque:</div>
          <div className="text-gray-600">{companySettings?.bankName?.trim() || '—'}</div>
          <div className="text-gray-700 font-medium mt-2 mb-1">RIB:</div>
          <div className="text-gray-600 whitespace-pre-wrap">{companySettings?.rib?.trim() || '—'}</div>
        </div>
        <div className="text-xs text-gray-500 space-y-1 border-t pt-4">
          {companySettings?.vatMention && (
            <div>{companySettings.vatMention}</div>
          )}
          {companySettings?.latePaymentMention && (
            <div>{companySettings.latePaymentMention}</div>
          )}
        </div>
      </div>
    </div>
  )
}

