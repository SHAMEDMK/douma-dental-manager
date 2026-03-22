import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import AdminPagination from '@/app/components/AdminPagination'
import { parsePaginationParams, computeSkipTake, computeTotalPages } from '@/lib/pagination'
import { formatCurrencyWithSymbol, formatDateTime } from '@/lib/config'

const PAGE_SIZE = 20

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PARTIALLY_RECEIVED: 'Part. réceptionnée',
  RECEIVED: 'Réceptionnée',
  CANCELLED: 'Annulée',
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800'
    case 'SENT':
      return 'bg-blue-100 text-blue-800'
    case 'PARTIALLY_RECEIVED':
      return 'bg-amber-100 text-amber-800'
    case 'RECEIVED':
      return 'bg-green-100 text-green-800'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function aggregatePurchaseOrderLines(
  items: { quantityOrdered: number; quantityReceived: number; unitCost: number }[]
) {
  let totalHt = 0
  let sumOrdered = 0
  let sumReceived = 0
  for (const i of items) {
    const qo = Number(i.quantityOrdered)
    const qr = Number(i.quantityReceived)
    const uc = Number(i.unitCost)
    totalHt += qo * uc
    sumOrdered += qo
    sumReceived += qr
  }
  const reste = Math.max(0, sumOrdered - sumReceived)
  return { totalHt, sumOrdered, sumReceived, reste }
}

export default async function AdminPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()
  if (
    !session ||
    (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL' && session.role !== 'MAGASINIER')
  ) {
    redirect('/admin')
  }
  const isCommercial = session.role === 'COMMERCIAL'
  const canCreatePurchaseOrder = session.role === 'ADMIN' || session.role === 'COMMERCIAL'
  const params = await searchParams
  const { page } = parsePaginationParams(params)
  const pageSize = PAGE_SIZE
  const { skip, take } = computeSkipTake(page, pageSize)

  const [purchaseOrders, totalCount] = await Promise.all([
    prisma.purchaseOrder.findMany({
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        sentAt: true,
        supplier: {
          select: { id: true, code: true, name: true, isActive: true },
        },
        items: {
          select: {
            quantityOrdered: true,
            quantityReceived: true,
            unitCost: true,
          },
        },
      },
    }),
    prisma.purchaseOrder.count(),
  ])
  const totalPages = computeTotalPages(totalCount, pageSize)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCommercial ? 'Commandes achat' : 'Commandes fournisseur'}
          </h1>
          {isCommercial && (
            <p className="text-sm text-gray-500 mt-1">
              Consultez et créez des commandes d&apos;achat auprès des fournisseurs.
            </p>
          )}
        </div>
        {canCreatePurchaseOrder && (
          <Link
            href="/admin/purchases/new"
            title="Nouvelle commande"
            aria-label="Nouvelle commande"
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md text-white bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-sm font-medium"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nouvelle commande
          </Link>
        )}
      </div>

      {purchaseOrders.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Aucune commande fournisseur</p>
          <p className="text-sm text-gray-400 mb-4">
            {canCreatePurchaseOrder
              ? 'Créez une première commande pour démarrer le module achats.'
              : 'Aucune commande à afficher.'}
          </p>
          {canCreatePurchaseOrder && (
            <Link
              href="/admin/purchases/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Nouvelle commande
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° commande
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fournisseur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créée le
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Envoyée le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant HT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Réception
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseOrders.map((po) => {
                  const { totalHt, sumOrdered, sumReceived, reste } = aggregatePurchaseOrderLines(po.items)
                  const statusLabel = STATUS_LABELS[po.status] ?? po.status
                  return (
                    <tr key={po.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {po.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/suppliers/${po.supplier.id}`}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            <span className="font-mono text-gray-600">{po.supplier.code}</span>
                            <span className="mx-1 text-gray-400">·</span>
                            <span>{po.supplier.name}</span>
                          </Link>
                          {!po.supplier.isActive && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                              Inactif
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass(po.status)}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(po.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {po.sentAt ? formatDateTime(po.sentAt) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrencyWithSymbol(totalHt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                        {sumReceived} / {sumOrdered} (reste {reste})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/admin/purchases/${po.id}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            totalPages={totalPages}
            totalCount={totalCount}
            itemLabel={{ singular: 'commande', plural: 'commandes' }}
          />
        </div>
      )}
    </div>
  )
}
