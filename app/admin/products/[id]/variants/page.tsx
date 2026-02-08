import { notFound } from 'next/navigation'
import { getProductWithVariantsAndOptions } from '@/app/actions/product'
import ProductTabs from '@/components/admin/ProductTabs'
import VariantsSection from './VariantsSection'
import VariantSuccessBanner from './VariantSuccessBanner'

export default async function ProductVariantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const sp = await searchParams
  const created = sp.variant === 'created' || sp.variant === 'updated'

  const product = await getProductWithVariantsAndOptions(id)
  if (!product) notFound()

  const productForForm = {
    id: product.id,
    segmentPrices: product.segmentPrices ?? [],
    priceLabo: product.priceLabo,
    priceDentiste: product.priceDentiste,
    priceRevendeur: product.priceRevendeur,
    options: product.options?.map((o) => ({
      id: o.id,
      name: o.name,
      values: (o.values ?? []).map((v) => ({ id: v.id, value: v.value })),
    })),
  }

  const variants: Array<{
    id: string
    productId: string
    sku: string
    name: string | null
    stock: number
    minStock: number
    priceLabo: number | null
    priceDentiste: number | null
    priceRevendeur: number | null
    cost: number
    optionValues?: Array<{
      optionValue: {
        id: string
        value: string
        option: { id: string; name: string }
      }
    }>
  }> = (product.variants ?? []).map((v) => ({
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    name: v.name,
    stock: v.stock,
    minStock: v.minStock,
    priceLabo: v.priceLabo,
    priceDentiste: v.priceDentiste,
    priceRevendeur: v.priceRevendeur,
    cost: v.cost,
    optionValues: v.optionValues?.map((ov) => ({
      optionValue: {
        id: ov.optionValue.id,
        value: ov.optionValue.value,
        option: { id: ov.optionValue.option.id, name: ov.optionValue.option.name },
      },
    })),
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <ProductTabs
        productId={product.id}
        productName={product.name}
        productSku={product.sku}
        current="variants"
      />
      {created && (
        <VariantSuccessBanner
          variant={typeof sp.variant === 'string' ? sp.variant : undefined}
          productId={product.id}
        />
      )}
      <VariantsSection productId={product.id} product={productForForm} variants={variants} />
    </div>
  )
}
