'use client'

import { useState } from 'react'
import ProductVariantForm from '@/components/admin/product-variant-form'
import ProductVariantsList from '@/components/admin/product-variants-list'
import BulkVariantsImport from './BulkVariantsImport'
import GenerateVariantsFromOptions from './GenerateVariantsFromOptions'
import type { ProductVariantDisplay } from '@/lib/types/product.types'

type ProductForForm = {
  id: string
  segmentPrices?: { segment: string; price: number }[]
  priceLabo?: number | null
  priceDentiste?: number | null
  priceRevendeur?: number | null
  options?: Array<{
    id: string
    name: string
    values: Array<{ id: string; value: string }>
  }>
}

type VariantsSectionProps = {
  productId: string
  product: ProductForForm
  variants: ProductVariantDisplay[]
}

function optionsSummary(product: VariantsSectionProps['product']): string | undefined {
  const opts = product.options
  if (!opts?.length) return undefined
  const parts = opts.map((o) => `${o.name} (${o.values?.length ?? 0})`)
  const total = opts.reduce((acc, o) => acc * (o.values?.length || 1), 1)
  return `${parts.join(', ')} → ${total} variante(s) possibles.`
}

export default function VariantsSection({ productId, product, variants }: VariantsSectionProps) {
  const [editingVariant, setEditingVariant] = useState<ProductVariantDisplay | null>(null)
  const hasOptions = (product.options?.length ?? 0) > 0

  return (
    <>
      <BulkVariantsImport productId={productId} />
      <GenerateVariantsFromOptions
        productId={productId}
        hasOptions={hasOptions}
        optionsSummary={optionsSummary(product)}
      />
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Nouvelle variante (à la main)</h2>
        <ProductVariantForm
          productId={productId}
          product={product}
          onSuccess={() => setEditingVariant(null)}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Liste des variantes</h2>
        <ProductVariantsList
          variants={variants}
          productId={productId}
          onEdit={setEditingVariant}
        />
      </div>

      {editingVariant && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-edit-variant"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setEditingVariant(null)}
              aria-hidden="true"
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 id="modal-edit-variant" className="text-lg font-semibold text-gray-900 mb-4">
                Modifier la variante
              </h3>
              <ProductVariantForm
                productId={productId}
                product={product}
                variant={editingVariant}
                showCancel
                onCancel={() => setEditingVariant(null)}
                onSuccess={() => setEditingVariant(null)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
