import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import StockAdjustmentForm from './StockAdjustmentForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function StockAdjustmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ variantId?: string }>
}) {
  const { id: productId } = await params
  const { variantId } = await searchParams

  if (!productId || typeof productId !== 'string' || productId.trim() === '') {
    notFound()
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: variantId ? { where: { id: variantId } } : true,
    },
  }).catch(() => null)

  if (!product) notFound()

  if (variantId) {
    const variant = product.variants?.[0]
    if (!variant) notFound()

    const variantDisplayName = variant.name || variant.sku

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/stock" className="flex items-center text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour au stock
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Ajustement de Stock – {variantDisplayName}</h1>
          <p className="text-gray-500 mt-1">Variante du produit {product.name}</p>
          {variant.sku && (
            <p className="text-sm font-mono text-gray-400 mt-0.5">SKU : {variant.sku}</p>
          )}
        </div>
        <StockAdjustmentForm
          productId={product.id}
          currentStock={variant.stock}
          productVariantId={variant.id}
        />
      </div>
    )
  }

  const productDisplayName = product.name

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/stock" className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour au stock
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ajustement de Stock – {productDisplayName}</h1>
        {product.sku && (
          <p className="text-gray-500 mt-1 font-mono text-sm">SKU : {product.sku}</p>
        )}
      </div>
      <StockAdjustmentForm productId={product.id} currentStock={product.stock} />
    </div>
  )
}
