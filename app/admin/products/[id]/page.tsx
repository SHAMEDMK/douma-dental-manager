import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditProductForm from './EditProductForm'

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
          Modifiez les informations du produit: {product.name}
        </p>
      </div>

      <EditProductForm product={product} />
    </div>
  )
}

