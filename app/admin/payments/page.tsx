import { prisma } from '@/lib/prisma'
import { formatDate, formatCurrencyWithSymbol } from '@/lib/config'
import { getInvoiceDisplayNumber } from '../../lib/invoice-utils'
import AdminPagination from '@/app/components/AdminPagination'
import { parsePaginationParams, computeSkipTake, computeTotalPages } from '@/lib/pagination'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const { page, pageSize } = parsePaginationParams(params)
  const { skip, take } = computeSkipTake(page, pageSize)

  const [payments, totalCount] = await Promise.all([
    prisma.payment.findMany({
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            createdAt: true,
            order: {
              include: {
                user: true
              }
            }
          }
        }
      }
    }),
    prisma.payment.count(),
  ])
  const totalPages = computeTotalPages(totalCount, pageSize)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Historique des Paiements</h1>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {totalCount > 0 && (
          <div className="px-6 py-3 text-sm text-gray-500 border-b border-gray-200">
            Page {page} sur {totalPages} — {totalCount} paiement{totalCount > 1 ? 's' : ''} au total
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant TTC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méthode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(payment.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.invoice.order.user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getInvoiceDisplayNumber(payment.invoice.invoiceNumber, payment.invoice.id, payment.invoice.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {formatCurrencyWithSymbol(payment.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.method === 'CASH' && 'Espèces'}
                    {payment.method === 'CHECK' && 'Chèque'}
                    {payment.method === 'TRANSFER' && 'Virement'}
                    {payment.method === 'CARD' && 'Carte Bancaire'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.reference || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination
          totalPages={totalPages}
          totalCount={totalCount}
          itemLabel={{ singular: 'paiement', plural: 'paiements' }}
        />
      </div>
    </div>
  )
}
