import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import StockAdjustmentForm from './StockAdjustmentForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function StockAdjustmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // Validate id is not empty or undefined (Product.id is String @id @default(cuid()))
  if (!id || typeof id !== 'string' || id.trim() === '') {
    notFound()
  }
  
  let product
  try {
    product = await prisma.product.findUnique({
      where: { id }
    })
  } catch (error) {
    // Handle Prisma errors (invalid id format, database errors, etc.)
    console.error('Error fetching product:', error)
    notFound()
  }

  if (!product) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/stock" className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour au stock
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ajustement de Stock</h1>
        <p className="text-gray-500 mt-1">
          {product.name}
        </p>
      </div>

      <StockAdjustmentForm productId={product.id} currentStock={product.stock} />
    </div>
  )
}
