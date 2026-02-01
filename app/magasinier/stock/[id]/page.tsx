import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import StockAdjustmentForm from '@/app/admin/stock/[id]/StockAdjustmentForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function MagasinierStockAdjustmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  if (!id || typeof id !== 'string' || id.trim() === '') {
    notFound()
  }
  
  let product
  try {
    product = await prisma.product.findUnique({
      where: { id }
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    notFound()
  }

  if (!product) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/magasinier/stock" className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour au stock
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ajustement de Stock</h1>
        <p className="text-gray-500 mt-1">
          {product.sku && <span className="font-mono text-gray-600 mr-2">{product.sku}</span>}
          {product.name}
        </p>
      </div>

      <StockAdjustmentForm productId={product.id} currentStock={product.stock} />
    </div>
  )
}
