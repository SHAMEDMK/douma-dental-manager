import { prisma } from '@/lib/prisma'
import PaymentForm from '../../admin/invoices/PaymentForm'
import Link from 'next/link'
import { getInvoiceDisplayNumber, calculateTotalPaid, calculateInvoiceRemaining, formatMoney } from '@/app/lib/invoice-utils'
import { computeTaxTotals } from '@/app/lib/tax'
import ExportInvoicesButton from './ExportInvoicesButton'

type PeriodKey = 'tous' | 'ce-mois' | 'mois-precedent' | '3-mois' | 'annee'
type StatusKey = 'tous' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED'

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function getPeriod(period: PeriodKey | undefined) {
  const now = new Date()
  const key: PeriodKey = period ?? 'tous'
  let from: Date | undefined
  let to: Date | undefined

  if (key === 'tous') {
    from = undefined
    to = undefined
  } else if (key === 'ce-mois') {
    from = startOfMonth(now)
    to = endOfMonth(now)
  } else if (key === 'mois-precedent') {
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    from = startOfMonth(prevMonth)
    to = endOfMonth(prevMonth)
  } else if (key === '3-mois') {
    from = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0)
    to = endOfMonth(now)
  } else {
    from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    to = endOfMonth(now)
  }

  return { key, from, to }
}

export default async function ComptableInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const { key: periodKey, from: periodFrom, to: periodTo } = getPeriod(params.period as PeriodKey | undefined)
  const statusFilter = (params.status as StatusKey) ?? 'tous'
  const clientFilter = params.client as string | undefined
  
  // Get company settings for VAT rate
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })
  const vatRate = companySettings?.vatRate ?? 0.2

  // Build where clause for filters
  const where: any = {}
  
  if (statusFilter !== 'tous') {
    where.status = statusFilter
  }
  
  if (clientFilter) {
    where.order = {
      user: {
        OR: [
          { name: { contains: clientFilter } },
          { clientCode: { contains: clientFilter } },
          { email: { contains: clientFilter } },
          { companyName: { contains: clientFilter } },
        ]
      }
    }
  }
  
  if (periodFrom || periodTo) {
    where.createdAt = {}
    if (periodFrom) where.createdAt.gte = periodFrom
    if (periodTo) where.createdAt.lte = periodTo
  }

  const invoices = await prisma.invoice.findMany({
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
              companyName: true
            }
          }
        }
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        select: {
          amount: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, inv) => sum + computeTaxTotals(inv.amount ?? 0, vatRate).ttc, 0)
  const totalPaidAll = invoices.reduce((sum, inv) => sum + calculateTotalPaid(inv.payments), 0)
  const totalRemaining = invoices.reduce((sum, inv) => {
    const paid = calculateTotalPaid(inv.payments)
    return sum + calculateInvoiceRemaining(inv.amount ?? 0, paid, vatRate)
  }, 0)

  const getStatusBadge = (status: string) => {
    const badges = {
      'PAID': { label: 'Payée', className: 'bg-green-100 text-green-800' },
      'PARTIAL': { label: 'Partiellement payée', className: 'bg-yellow-100 text-yellow-800' },
      'UNPAID': { label: 'Impayée', className: 'bg-red-100 text-red-800' },
      'CANCELLED': { label: 'Annulée', className: 'bg-gray-100 text-gray-800' }
    }
    return badges[status as keyof typeof badges] || { label: status, className: 'bg-gray-100 text-gray-800' }
  }

  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'ce-mois', label: 'Ce mois' },
    { key: 'mois-precedent', label: 'Mois précédent' },
    { key: '3-mois', label: '3 derniers mois' },
    { key: 'annee', label: 'Année en cours' },
  ]

  const statuses: { key: StatusKey; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'UNPAID', label: 'Impayées' },
    { key: 'PARTIAL', label: 'Partielles' },
    { key: 'PAID', label: 'Payées' },
    { key: 'CANCELLED', label: 'Annulées' },
  ]

  // Build URL with current filters
  function buildUrl(newPeriod?: PeriodKey, newStatus?: StatusKey, newClient?: string) {
    const params = new URLSearchParams()
    const p = newPeriod ?? periodKey
    const s = newStatus ?? statusFilter
    const c = newClient ?? clientFilter
    if (p !== 'tous') params.set('period', p)
    if (s !== 'tous') params.set('status', s)
    if (c) params.set('client', c)
    return params.toString() ? `/comptable/invoices?${params.toString()}` : '/comptable/invoices'
  }

  // Data for CSV export
  const exportData = invoices.map(inv => {
    const totalPaid = calculateTotalPaid(inv.payments)
    const ttc = computeTaxTotals(inv.amount ?? 0, vatRate).ttc
    const remaining = calculateInvoiceRemaining(inv.amount ?? 0, totalPaid, vatRate)
    return {
      numero: inv.invoiceNumber || inv.id.slice(-8),
      date: new Date(inv.createdAt).toLocaleDateString('fr-FR'),
      client: inv.order.user.companyName || inv.order.user.name || '',
      montantHT: inv.amount ?? 0,
      montantTTC: ttc,
      paye: totalPaid,
      reste: remaining,
      statut: getStatusBadge(inv.status).label
    }
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-gray-600">Gestion et suivi des factures</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportInvoicesButton data={exportData} />
          <a
            href="/api/admin/export/invoices"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel complet
          </a>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
        {/* Filtre par période */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Période</p>
          <div className="flex flex-wrap gap-2">
            {periods.map((p) => (
              <Link
                key={p.key}
                href={buildUrl(p.key, statusFilter, clientFilter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  p.key === periodKey ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Filtre par statut */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Statut</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <Link
                key={s.key}
                href={buildUrl(periodKey, s.key, clientFilter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  s.key === statusFilter 
                    ? s.key === 'UNPAID' ? 'bg-red-600 text-white border-red-600'
                    : s.key === 'PARTIAL' ? 'bg-yellow-500 text-white border-yellow-500'
                    : s.key === 'PAID' ? 'bg-green-600 text-white border-green-600'
                    : 'bg-gray-600 text-white border-gray-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recherche client */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Recherche client</p>
          <form action="/comptable/invoices" method="get" className="flex gap-2">
            <input type="hidden" name="period" value={periodKey} />
            <input type="hidden" name="status" value={statusFilter} />
            <input
              type="text"
              name="client"
              defaultValue={clientFilter || ''}
              placeholder="Nom, code, email ou société..."
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              Rechercher
            </button>
            {clientFilter && (
              <Link
                href={buildUrl(periodKey, statusFilter, '')}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition"
              >
                Effacer
              </Link>
            )}
          </form>
        </div>

        {/* Résumé */}
        <div className="pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Factures :</span>
            <span className="ml-2 font-bold text-gray-900">{invoices.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Total TTC :</span>
            <span className="ml-2 font-bold text-gray-900">{formatMoney(totalInvoiced)}</span>
          </div>
          <div>
            <span className="text-gray-500">Encaissé :</span>
            <span className="ml-2 font-bold text-green-600">{formatMoney(totalPaidAll)}</span>
          </div>
          <div>
            <span className="text-gray-500">Reste :</span>
            <span className={`ml-2 font-bold ${totalRemaining > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
              {formatMoney(totalRemaining)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {invoices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Aucune facture correspondant aux filtres.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  const remaining = calculateInvoiceRemaining(invoice.amount ?? 0, totalPaid, vatRate)
                  const statusBadge = getStatusBadge(invoice.status)
                  const invoiceNumber = getInvoiceDisplayNumber(invoice.invoiceNumber, invoice.id, invoice.createdAt)

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link href={`/comptable/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-900">
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
                        {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
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
                          <Link href={`/comptable/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-900">
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
    </div>
  )
}
