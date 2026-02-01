import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditProductForm from './EditProductForm'
import DeleteProductButton from './DeleteProductButton'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      segmentPrices: true,
    },
  })

  if (!product) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/products" className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux produits
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Modifier le produit</h1>
        <p className="text-gray-500 mt-1">
          {product.sku && <span className="font-mono text-gray-600 mr-2">{product.sku}</span>}
          Modifiez les informations du produit: {product.name}
        </p>
      </div>

      <EditProductForm product={product} />

      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Zone de danger</h2>
        <p className="text-sm text-gray-500 mb-4">
          La suppression d'un produit est définitive. Un produit ne peut pas être supprimé s'il est utilisé dans des commandes existantes.
        </p>
        <DeleteProductButton productId={product.id} productName={product.name} />
      </div>
    </div>
  )
}

