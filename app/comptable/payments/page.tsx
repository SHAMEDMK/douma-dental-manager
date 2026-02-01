import { prisma } from '@/lib/prisma'
import { getInvoiceDisplayNumber, formatMoney } from '@/app/lib/invoice-utils'
import Link from 'next/link'
import ExportPaymentsButton from './ExportPaymentsButton'

type PeriodKey = 'tous' | 'ce-mois' | 'mois-precedent' | '3-mois' | 'annee'
type MethodKey = 'tous' | 'CASH' | 'CHECK' | 'TRANSFER' | 'CARD' | 'COD'

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

function getMethodLabel(method: string): string {
  switch (method) {
    case 'CASH': return 'Espèces'
    case 'CHECK': return 'Chèque'
    case 'TRANSFER': return 'Virement'
    case 'CARD': return 'Carte Bancaire'
    case 'COD': return 'COD'
    default: return method
  }
}

export default async function ComptablePaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: PeriodKey; from?: string; to?: string; method?: MethodKey }>
}) {
  const sp = (await searchParams) ?? {}
  const { key, from, to } = getPeriod(sp.period ?? (sp.from && sp.to ? undefined : 'tous'))
  const methodFilter = sp.method ?? 'tous'

  // Support from/to params from dashboard link
  const dateFrom = sp.from ? new Date(sp.from + 'T00:00:00') : from
  const dateTo = sp.to ? new Date(sp.to + 'T23:59:59') : to

  const where: { createdAt?: { gte?: Date; lte?: Date }; method?: string } = {}
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = dateFrom
    if (dateTo) where.createdAt.lte = dateTo
  }
  if (methodFilter !== 'tous') {
    where.method = methodFilter
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          createdAt: true,
          order: {
            include: {
              user: {
                select: {
                  name: true,
                  companyName: true
                }
              }
            }
          }
        }
      }
    }
  })

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'ce-mois', label: 'Ce mois' },
    { key: 'mois-precedent', label: 'Mois précédent' },
    { key: '3-mois', label: '3 derniers mois' },
    { key: 'annee', label: 'Année en cours' },
  ]

  const methods: { key: MethodKey; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'CASH', label: 'Espèces' },
    { key: 'CHECK', label: 'Chèque' },
    { key: 'TRANSFER', label: 'Virement' },
    { key: 'CARD', label: 'Carte Bancaire' },
    { key: 'COD', label: 'COD' },
  ]

  // Build URL with current filters
  function buildUrl(newPeriod?: PeriodKey, newMethod?: MethodKey) {
    const params = new URLSearchParams()
    const p = newPeriod ?? key
    const m = newMethod ?? methodFilter
    if (p !== 'tous') params.set('period', p)
    if (m !== 'tous') params.set('method', m)
    return params.toString() ? `/comptable/payments?${params.toString()}` : '/comptable/payments'
  }

  // Data for CSV export
  const exportData = payments.map(p => ({
    date: new Date(p.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    client: p.invoice.order.user.companyName || p.invoice.order.user.name || '',
    facture: p.invoice.invoiceNumber || p.invoice.id.slice(-8),
    montant: p.amount,
    methode: getMethodLabel(p.method),
    reference: p.reference || ''
  }))

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des Paiements</h1>
          <p className="text-gray-600">Encaissements reçus</p>
        </div>
        <ExportPaymentsButton data={exportData} />
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
                href={buildUrl(p.key, methodFilter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  p.key === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Filtre par méthode de paiement */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Mode de paiement</p>
          <div className="flex flex-wrap gap-2">
            {methods.map((m) => (
              <Link
                key={m.key}
                href={buildUrl(key, m.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  m.key === methodFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Résumé */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{payments.length}</span> paiement{payments.length !== 1 ? 's' : ''} 
            {dateFrom && dateTo && (
              <> du {dateFrom.toLocaleDateString('fr-FR')} au {dateTo.toLocaleDateString('fr-FR')}</>
            )}
            {methodFilter !== 'tous' && <> • {getMethodLabel(methodFilter)}</>}
            {' '}— <span className="font-bold text-gray-900">Total : {formatMoney(totalAmount)}</span>
          </p>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facture</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant TTC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méthode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Aucun paiement correspondant aux filtres
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/comptable/invoices/${payment.invoice.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {getInvoiceDisplayNumber(payment.invoice.invoiceNumber, payment.invoice.id, payment.invoice.createdAt)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatMoney(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      payment.method === 'CASH' ? 'bg-green-100 text-green-800' :
                      payment.method === 'CHECK' ? 'bg-blue-100 text-blue-800' :
                      payment.method === 'TRANSFER' ? 'bg-purple-100 text-purple-800' :
                      payment.method === 'CARD' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getMethodLabel(payment.method)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.reference || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
