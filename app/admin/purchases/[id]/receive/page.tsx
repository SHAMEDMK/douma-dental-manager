import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDateTime } from '@/lib/config'
import PurchaseReceiptForm from './PurchaseReceiptForm'

function lineLabel(
  product: { name: string; sku: string | null },
  variant: { name: string | null; sku: string | null } | null
): string {
  if (variant) {
    return `${product.name} – ${variant.name || variant.sku || 'Variante'}`
  }
  return product.name
}

export default async function ReceivePurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.role === 'COMMERCIAL') {
    const { id } = await params
    redirect(`/admin/purchases/${id}`)
  }

  if (session.role !== 'ADMIN' && session.role !== 'MAGASINIER') {
    redirect('/admin')
  }

  if (session.role === 'MAGASINIER') {
    if (session.userType === 'LIVREUR') {
      redirect('/delivery')
    }
    if (session.userType !== 'MAGASINIER') {
      redirect('/login')
    }
  }

  const { id } = await params

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { select: { code: true, name: true } },
      items: {
        include: {
          product: { select: { name: true, sku: true } },
          productVariant: { select: { name: true, sku: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
  })

  if (!po) {
    notFound()
  }

  if (po.status !== 'SENT' && po.status !== 'PARTIALLY_RECEIVED') {
    redirect(`/admin/purchases/${id}`)
  }

  const lines = po.items
    .map((item) => {
      const qo = Number(item.quantityOrdered)
      const qr = Number(item.quantityReceived)
      const remaining = qo - qr
      return {
        purchaseOrderItemId: item.id,
        productLabel: lineLabel(item.product, item.productVariant),
        sku: item.product.sku,
        quantityOrdered: qo,
        quantityReceivedAlready: qr,
        remaining,
      }
    })
    .filter((l) => l.remaining > 0)

  if (lines.length === 0) {
    redirect(`/admin/purchases/${id}`)
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/admin/purchases/${id}`}
          className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la commande
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-mono">Réception — {po.orderNumber}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Créée le {formatDateTime(po.createdAt)}
          {po.sentAt ? ` · Envoyée le ${formatDateTime(po.sentAt)}` : ''}
        </p>
        <p className="text-sm text-gray-700 mt-2">
          <span className="font-mono text-gray-600">{po.supplier.code}</span>
          <span className="mx-1 text-gray-400">·</span>
          {po.supplier.name}
        </p>
      </div>

      <PurchaseReceiptForm purchaseOrderId={id} orderNumber={po.orderNumber} lines={lines} />
    </div>
  )
}
