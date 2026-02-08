import { notFound } from 'next/navigation'
import { getProductWithVariantsAndOptions } from '@/app/actions/product'
import ProductTabs from '@/components/admin/ProductTabs'
import ProductOptionsManager from '@/components/admin/product-options-manager'

export default async function ProductOptionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProductWithVariantsAndOptions(id)
  if (!product) notFound()

  const options = (product.options ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    values: (o.values ?? []).map((v) => ({ id: v.id, value: v.value })),
  }))

  return (
    <div className="max-w-3xl mx-auto">
      <ProductTabs
        productId={product.id}
        productName={product.name}
        productSku={product.sku}
        current="options"
      />
      <p className="text-sm text-gray-500 mb-6">
        Définissez les attributs de variantes (ex. Teinte, Dimension). Ensuite, sur l’onglet Variantes, associez des valeurs à chaque variante.
      </p>
      <ProductOptionsManager productId={product.id} options={options} />
    </div>
  )
}
