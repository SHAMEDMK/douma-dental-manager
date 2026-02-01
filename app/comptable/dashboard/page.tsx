import { prisma } from '@/lib/prisma'
import { FileText, CreditCard, DollarSign, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatMoney } from '@/app/lib/invoice-utils'

type PeriodKey = 'ce-mois' | 'mois-precedent' | '3-mois' | 'annee'

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function getPeriod(period: PeriodKey | undefined) {
  const now = new Date()
  const key: PeriodKey = period ?? 'ce-mois'
  let from: Date
  let to: Date

  if (key === 'ce-mois') {
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
    // annee
    from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    to = endOfMonth(now)
  }

  return { key, from, to }
}

export default async function ComptableDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ period?: PeriodKey }>
}) {
  const sp = (await searchParams) ?? {}
  const { key, from, to } = getPeriod(sp.period)

  // Single round-trip: payments, invoice period stats, unpaid stats in parallel
  const [paymentsInPeriod, invoicesInPeriodStats, unpaidInvoices] = await Promise.all([
    prisma.payment.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        amount: true,
        method: true,
        createdAt: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            order: {
              select: {
                user: {
                  select: { name: true, companyName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ['UNPAID', 'PARTIAL'] } },
      _sum: { balance: true },
      _count: true,
    }),
  ])

  const totalPaymentsInPeriod = paymentsInPeriod.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const totalInvoicedInPeriod = invoicesInPeriodStats._sum.amount ?? 0
  const invoicesInPeriodCount = invoicesInPeriodStats._count
  const pendingInvoicesCount = unpaidInvoices._count

  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'ce-mois', label: 'Ce mois' },
    { key: 'mois-precedent', label: 'Mois précédent' },
    { key: '3-mois', label: '3 derniers mois' },
    { key: 'annee', label: 'Année en cours' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Comptable</h1>
        <p className="text-gray-600 mt-1">Vue d&apos;ensemble de la situation financière</p>
      </div>

      {/* Filtre par période */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Filtrer par période</p>
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <Link
              key={p.key}
              href={`/comptable/dashboard?period=${p.key}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                p.key === key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Du {from.toLocaleDateString('fr-FR')} au {to.toLocaleDateString('fr-FR')}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Paiements période */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Encaissements période</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {formatMoney(totalPaymentsInPeriod)}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    {paymentsInPeriod.length} paiement{paymentsInPeriod.length !== 1 ? 's' : ''}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <Link href={`/comptable/payments?from=${from.toISOString().slice(0,10)}&to=${to.toISOString().slice(0,10)}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Voir les paiements →
            </Link>
          </div>
        </div>

        {/* Factures émises période */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Facturé période</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {formatMoney(totalInvoicedInPeriod)}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    {invoicesInPeriodCount} facture{invoicesInPeriodCount !== 1 ? 's' : ''}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <Link href="/comptable/invoices" className="text-sm font-medium text-green-600 hover:text-green-800">
              Voir les factures →
            </Link>
          </div>
        </div>

        {/* À Encaisser (global) */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">À Encaisser</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {formatMoney(unpaidInvoices._sum.balance || 0)}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    {unpaidInvoices._count} facture{unpaidInvoices._count !== 1 ? 's' : ''}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <Link href="/comptable/invoices?status=UNPAID" className="text-sm font-medium text-orange-600 hover:text-orange-800">
              Voir les factures →
            </Link>
          </div>
        </div>

        {/* En Attente (global) */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">En Attente</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {pendingInvoicesCount}
                  </dd>
                  <dd className="text-xs text-gray-500 mt-1">
                    facture{pendingInvoicesCount !== 1 ? 's' : ''} non payée{pendingInvoicesCount !== 1 ? 's' : ''}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <Link href="/comptable/invoices" className="text-sm font-medium text-yellow-600 hover:text-yellow-800">
              Gérer →
            </Link>
          </div>
        </div>
      </div>

      {/* Paiements de la période */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Paiements de la période</h2>
          <span className="text-sm text-gray-500">
            {from.toLocaleDateString('fr-FR')} – {to.toLocaleDateString('fr-FR')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facture</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant TTC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentsInPeriod.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Aucun paiement sur cette période
                  </td>
                </tr>
              ) : (
                paymentsInPeriod.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.invoice.order.user.companyName || payment.invoice.order.user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        href={`/comptable/invoices/${payment.invoice.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {payment.invoice.invoiceNumber || payment.invoice.id.slice(-8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {payment.method === 'CASH' ? 'Espèces' :
                         payment.method === 'CHECK' ? 'Chèque' :
                         payment.method === 'TRANSFER' ? 'Virement' :
                         payment.method === 'COD' ? 'COD' :
                         payment.method === 'CARD' ? 'Carte Bancaire' : payment.method}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
