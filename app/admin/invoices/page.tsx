import { prisma } from '@/lib/prisma'
import PaymentForm from './PaymentForm'
import Link from 'next/link'
import { getInvoiceDisplayNumber, calculateTotalPaid, calculateInvoiceRemaining, formatMoney } from '../../lib/invoice-utils'
import { computeTaxTotals } from '@/app/lib/tax'
import InvoiceFilters from './InvoiceFilters'
import { getCompanySettings } from '@/app/lib/settings-cache'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const statusFilter = params.status as string | undefined
  const clientFilter = params.client as string | undefined
  const dateFromFilter = params.dateFrom as string | undefined
  const dateToFilter = params.dateTo as string | undefined
  // Company settings (cached) + where built in parallel with invoices
  const where: any = {}
  if (statusFilter) where.status = statusFilter
  if (clientFilter) {
    where.order = {
      user: {
        OR: [
          { name: { contains: clientFilter } },
          { email: { contains: clientFilter } },
          { companyName: { contains: clientFilter } },
        ],
      },
    }
  }
  if (dateFromFilter || dateToFilter) {
    where.createdAt = {}
    if (dateFromFilter) where.createdAt.gte = new Date(dateFromFilter + 'T00:00:00')
    if (dateToFilter) where.createdAt.lte = new Date(dateToFilter + 'T23:59:59')
  }

  const [companySettings, invoices] = await Promise.all([
    getCompanySettings(),
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        status: true,
        amount: true,
        balance: true,
        order: {
          select: {
            user: {
              select: {
                name: true,
                clientCode: true,
                companyName: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  const vatRate = companySettings?.vatRate ?? 0.2

  const getStatusBadge = (status: string) => {
    const badges = {
      'PAID': { label: 'Payée', className: 'bg-green-100 text-green-800' },
      'PARTIAL': { label: 'Partiellement payée', className: 'bg-yellow-100 text-yellow-800' },
      'UNPAID': { label: 'Impayée', className: 'bg-red-100 text-red-800' },
      'CANCELLED': { label: 'Annulée', className: 'bg-gray-100 text-gray-800' }
    }
    return badges[status as keyof typeof badges] || { label: status, className: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Factures</h1>
        <a
          href="/api/admin/export/invoices"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exporter Excel
        </a>
      </div>

      <InvoiceFilters />

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {invoices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Aucune facture trouvée.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total TTC</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Payé</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reste</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => {
                const totalPaid = calculateTotalPaid(invoice.payments)
                // F1: Calculate remaining TTC (remaining = invoice.totalTTC - totalPaid, min 0)
                const remaining = calculateInvoiceRemaining(invoice.amount ?? 0, totalPaid, vatRate)
                const statusBadge = getStatusBadge(invoice.status)
                const invoiceNumber = getInvoiceDisplayNumber(invoice.invoiceNumber, invoice.id, invoice.createdAt)

                return (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link href={`/admin/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-900">
                        {invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.order.user.clientCode && (
                        <span className="font-mono text-gray-500 mr-1">{invoice.order.user.clientCode}</span>
                      )}
                      {invoice.order.user.name}
                      {invoice.order.user.companyName && (
                        <span className="block text-xs text-gray-400">{invoice.order.user.companyName}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(() => {
                        const date = new Date(invoice.createdAt)
                        const day = String(date.getDate()).padStart(2, '0')
                        const month = String(date.getMonth() + 1).padStart(2, '0')
                        const year = date.getFullYear()
                        return `${day}/${month}/${year}`
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      {computeTaxTotals(invoice.amount ?? 0, vatRate).ttcFormatted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatMoney(totalPaid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                      <span className={remaining > 0.01 ? 'text-red-600' : 'text-green-600'}>
                        {formatMoney(remaining)}
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
        )}
      </div>
    </div>
  )
}
