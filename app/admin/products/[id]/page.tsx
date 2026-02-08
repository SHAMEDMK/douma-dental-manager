import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditProductForm from './EditProductForm'
import DeleteProductButton from './DeleteProductButton'
import ProductTabs from '@/components/admin/ProductTabs'

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
      <ProductTabs
        productId={product.id}
        productName={product.name}
        productSku={product.sku}
        current="details"
      />

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

