import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getLineItemDisplayName, getLineItemSku } from '@/app/lib/line-item-display'
import EditPurchaseOrderForm from './EditPurchaseOrderForm'

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (
    !session ||
    (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')
  ) {
    redirect('/admin')
  }

  const { id } = await params

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      supplier: { select: { code: true, name: true } },
      items: {
        select: {
          quantityOrdered: true,
          unitCost: true,
          productId: true,
          productVariantId: true,
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

  if (po.status !== 'DRAFT') {
    redirect(`/admin/purchases/${id}`)
  }

  const initialLines = po.items.map((item) => {
    const line = { product: item.product, productVariant: item.productVariant }
    return {
      productId: item.productId,
      productVariantId: item.productVariantId,
      quantity: Number(item.quantityOrdered),
      name: getLineItemDisplayName(line),
      sku: getLineItemSku(line) !== '-' ? getLineItemSku(line) : null,
      unitCost: Number(item.unitCost),
    }
  })

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/admin/purchases/${po.id}`}
          className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à {po.orderNumber}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-mono">
          Modifier les lignes — {po.orderNumber}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-mono text-gray-600">{po.supplier.code}</span>
          <span className="mx-1 text-gray-400">·</span>
          {po.supplier.name}
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Commande en brouillon : vous pouvez ajuster quantités, coûts et articles.
        </p>
      </div>

      <EditPurchaseOrderForm
        purchaseOrderId={po.id}
        orderNumber={po.orderNumber}
        initialLines={initialLines}
      />
    </div>
  )
}
