import { prisma } from '@/lib/prisma'
import PaymentForm from './PaymentForm'
import Link from 'next/link'
import { getInvoiceDisplayNumber, calculateTotalPaid } from '../../lib/invoice-utils'

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: {
      order: {
        include: { user: true }
      },
      payments: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  const getStatusBadge = (status: string) => {
    const badges = {
      'PAID': { label: 'Payée', className: 'bg-green-100 text-green-800' },
      'PARTIAL': { label: 'Partiellement payée', className: 'bg-yellow-100 text-yellow-800' },
      'UNPAID': { label: 'Impayée', className: 'bg-red-100 text-red-800' }
    }
    return badges[status as keyof typeof badges] || { label: status, className: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestion des Factures</h1>

      {invoices.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">Aucune facture trouvée.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Payé</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reste</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => {
                const totalPaid = calculateTotalPaid(invoice.payments)
                const remaining = invoice.balance
                const statusBadge = getStatusBadge(invoice.status)
                const invoiceNumber = getInvoiceDisplayNumber(invoice.id, invoice.createdAt)

                return (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link href={`/admin/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-900">
                        {invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.order.user.name}
                      {invoice.order.user.companyName && (
                        <span className="block text-xs text-gray-400">{invoice.order.user.companyName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      {invoice.amount.toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {totalPaid.toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                      <span className={remaining > 0.01 ? 'text-red-600' : 'text-green-600'}>
                        {remaining.toFixed(2)} €
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {remaining > 0.01 ? (
                        <PaymentForm invoiceId={invoice.id} balance={remaining} />
                      ) : (
                        <Link href={`/admin/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-900">
                          Voir détails
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
