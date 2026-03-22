import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PackageCheck } from 'lucide-react'
import { formatCurrencyWithSymbol, formatDateTime } from '@/lib/config'
import { isValidEmailFormat } from '@/lib/email-validation'
import SendPurchaseOrderButton from './SendPurchaseOrderButton'
import CancelPurchaseOrderButton from './CancelPurchaseOrderButton'

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

function lineLabel(
  product: { name: string; sku: string | null },
  variant: { name: string | null; sku: string | null } | null
): string {
  if (variant) {
    return `${product.name} – ${variant.name || variant.sku || 'Variante'}`
  }
  return product.name
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (
    !session ||
    (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL' && session.role !== 'MAGASINIER')
  ) {
    redirect('/admin')
  }

  const { id } = await params

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: {
        select: { id: true, code: true, name: true, isActive: true, email: true },
      },
      items: {
        include: {
          product: { select: { name: true, sku: true } },
          productVariant: { select: { name: true, sku: true } },
        },
        orderBy: { id: 'asc' },
      },
      _count: { select: { receipts: true } },
    },
  })

  if (!po) {
    notFound()
  }

  let totalHt = 0
  let sumOrdered = 0
  let sumReceived = 0
  for (const item of po.items) {
    const qo = Number(item.quantityOrdered)
    const qr = Number(item.quantityReceived)
    const uc = Number(item.unitCost)
    totalHt += qo * uc
    sumOrdered += qo
    sumReceived += qr
  }
  const reste = Math.max(0, sumOrdered - sumReceived)
  const statusLabel = STATUS_LABELS[po.status] ?? po.status

  const supplierEmail = po.supplier.email?.trim() ?? ''
  const supplierEmailValid = isValidEmailFormat(supplierEmail)
  const canShowSendPurchase =
    (session.role === 'ADMIN' || session.role === 'COMMERCIAL') && po.status === 'DRAFT'
  const canSend = canShowSendPurchase && supplierEmailValid
  const canCancel =
    session.role === 'ADMIN' &&
    (po.status === 'DRAFT' || po.status === 'SENT') &&
    po._count.receipts === 0
  const canReceive =
    (session.role === 'ADMIN' || session.role === 'MAGASINIER') &&
    (po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') &&
    reste > 0

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/purchases"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux commandes fournisseur
        </Link>
      </div>

      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{po.orderNumber}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Créée le {formatDateTime(po.createdAt)}
            {po.sentAt ? ` · Envoyée le ${formatDateTime(po.sentAt)}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span
            className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${statusBadgeClass(po.status)}`}
          >
            {statusLabel}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            {canReceive && (
              <Link
                href={`/admin/purchases/${po.id}/receive`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <PackageCheck className="w-4 h-4" aria-hidden />
                Réceptionner
              </Link>
            )}
            {canShowSendPurchase && !supplierEmailValid && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 max-w-md text-right">
                E-mail fournisseur manquant ou invalide.{' '}
                <Link
                  href={`/admin/suppliers/${po.supplier.id}`}
                  className="font-medium text-amber-900 underline hover:no-underline"
                >
                  Corriger la fiche fournisseur
                </Link>{' '}
                pour pouvoir passer la commande en « Envoyée ».
              </p>
            )}
            <SendPurchaseOrderButton purchaseOrderId={po.id} visible={canSend} />
            <CancelPurchaseOrderButton purchaseOrderId={po.id} visible={canCancel} />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Fournisseur</h2>
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
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Lignes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qté commandée
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qté réceptionnée
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coût unit. HT
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant HT
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {po.items.map((item) => {
                const qo = Number(item.quantityOrdered)
                const uc = Number(item.unitCost)
                const lineHt = qo * uc
                return (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.product.sku && (
                        <span className="font-mono text-gray-600 mr-2">{item.product.sku}</span>
                      )}
                      {lineLabel(item.product, item.productVariant)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 tabular-nums">{qo}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">
                      {item.quantityReceived}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 tabular-nums">
                      {formatCurrencyWithSymbol(uc)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 tabular-nums">
                      {formatCurrencyWithSymbol(lineHt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between gap-4">
          <div className="text-sm text-gray-600">
            Réception : {sumReceived} / {sumOrdered} (reste {reste})
          </div>
          <div className="text-sm font-semibold text-gray-900">
            Total HT : {formatCurrencyWithSymbol(totalHt)}
          </div>
        </div>
      </div>

      {totalHt === 0 && sumOrdered > 0 && (
        <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
          Le montant est nul car les coûts unitaires des lignes sont à 0 (prix d&apos;achat dans le catalogue produit ou
          saisie à la création). Mettez à jour les coûts dans Admin → Produits, ou créez une commande avec des coûts
          renseignés ; l&apos;édition des lignes après création n&apos;est pas encore disponible.
        </p>
      )}
    </div>
  )
}
