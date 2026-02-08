'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createVariantAction, updateVariantAction, checkSkuAvailableAction } from '@/app/actions/product'
import type { ProductVariantDisplay } from '@/lib/types/product.types'

type SegmentPrice = { segment: string; price: number }

type ProductForForm = {
  id: string
  segmentPrices?: SegmentPrice[]
  priceLabo?: number | null
  priceDentiste?: number | null
  priceRevendeur?: number | null
  options?: Array<{
    id: string
    name: string
    values: Array<{ id: string; value: string }>
  }>
}

type ProductVariantFormProps = {
  productId: string
  product: ProductForForm
  variant?: ProductVariantDisplay | null
  onSuccess?: () => void
  onCancel?: () => void
  showCancel?: boolean
}

const SEGMENT_LABELS: Record<string, string> = {
  LABO: 'Prix LABO (Dh)',
  DENTISTE: 'Prix DENTISTE (Dh)',
  REVENDEUR: 'Prix REVENDEUR (Dh)',
}

function getSegmentPrice(product: ProductForForm, segment: string): number | null {
  if (product.segmentPrices?.length) {
    const sp = product.segmentPrices.find((s) => s.segment === segment)
    return sp ? sp.price : null
  }
  switch (segment) {
    case 'LABO':
      return product.priceLabo ?? null
    case 'DENTISTE':
      return product.priceDentiste ?? null
    case 'REVENDEUR':
      return product.priceRevendeur ?? null
    default:
      return null
  }
}

export default function ProductVariantForm({
  productId,
  product,
  variant,
  onSuccess,
  onCancel,
  showCancel = false,
}: ProductVariantFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [skuCheckMessage, setSkuCheckMessage] = useState<string | null>(null)
  const [useParentPrices, setUseParentPrices] = useState(!variant || (variant.priceLabo == null && variant.priceDentiste == null && variant.priceRevendeur == null))
  const skuCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEdit = !!variant

  useEffect(() => {
    if (variant) {
      setUseParentPrices(
        variant.priceLabo == null && variant.priceDentiste == null && variant.priceRevendeur == null
      )
    }
  }, [variant])

  const handleSkuBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const sku = (e.target.value ?? '').trim()
    if (!sku) {
      setSkuCheckMessage(null)
      return
    }
    if (skuCheckTimeout.current) clearTimeout(skuCheckTimeout.current)
    skuCheckTimeout.current = setTimeout(async () => {
      const result = await checkSkuAvailableAction(sku, {
        excludeVariantId: variant?.id,
        excludeProductId: undefined,
      })
      setSkuCheckMessage(result.available ? null : (result.error || 'Ce SKU est déjà utilisé.'))
      skuCheckTimeout.current = null
    }, 400)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const form = e.currentTarget
    const formData = new FormData(form)

    const optionValueIds: string[] = []
    product.options?.forEach((opt) => {
      const val = formData.get(`option_${opt.id}`) as string | null
      if (val) optionValueIds.push(val)
    })
    formData.set('optionValueIds', optionValueIds.join(','))

    if (useParentPrices) {
      formData.delete('priceLabo')
      formData.delete('priceDentiste')
      formData.delete('priceRevendeur')
    }

    try {
      if (isEdit && variant) {
        const result = await updateVariantAction(variant.id, formData)
        if (result?.error) {
          setError(result.error)
          setIsSubmitting(false)
          return
        }
      } else {
        const result = await createVariantAction(productId, formData)
        if (result?.error) {
          setError(result.error)
          setIsSubmitting(false)
          return
        }
      }
      onSuccess?.()
      router.refresh()
      if (!isEdit) form.reset()
    } catch (err: any) {
      // Server action success uses redirect(), which throws; don't show as error
      if (err?.digest === 'NEXT_REDIRECT' || err?.message?.includes('NEXT_REDIRECT')) {
        setIsSubmitting(false)
        onSuccess?.()
        return
      }
      setError(err?.message ?? 'Erreur lors de l\'enregistrement.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border border-gray-200">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="variant-sku" className="block text-sm font-medium text-gray-700">
            SKU <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="variant-sku"
            name="sku"
            required
            defaultValue={variant?.sku ?? ''}
            onBlur={handleSkuBlur}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Ex: KEROX-BLANC-A"
          />
          {skuCheckMessage && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {skuCheckMessage}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="variant-name" className="block text-sm font-medium text-gray-700">
            Nom (optionnel)
          </label>
          <input
            type="text"
            id="variant-name"
            name="name"
            defaultValue={variant?.name ?? ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Ex: Kerox Blanc Dimension A"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="variant-stock" className="block text-sm font-medium text-gray-700">
            Stock initial
          </label>
          <input
            type="number"
            id="variant-stock"
            name="stock"
            min={0}
            defaultValue={variant?.stock ?? 0}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="variant-minStock" className="block text-sm font-medium text-gray-700">
            Stock minimum
          </label>
          <input
            type="number"
            id="variant-minStock"
            name="minStock"
            min={0}
            defaultValue={variant?.minStock ?? 5}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {product.options && product.options.length > 0 && (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-gray-700">Valeurs d’options</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {product.options.map((opt) => {
              const selectedId =
                variant?.optionValues?.find((ov) => ov.optionValue.option.id === opt.id)?.optionValue.id ?? ''
              return (
                <div key={opt.id}>
                  <label htmlFor={`option_${opt.id}`} className="block text-xs font-medium text-gray-600">
                    {opt.name}
                  </label>
                  <select
                    id={`option_${opt.id}`}
                    name={`option_${opt.id}`}
                    defaultValue={selectedId}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">— Choisir —</option>
                    {opt.values.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.value}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useParentPrices}
            onChange={(e) => setUseParentPrices(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Utiliser les prix du produit parent</span>
        </label>
      </div>

      {!useParentPrices && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['LABO', 'DENTISTE', 'REVENDEUR'] as const).map((seg) => (
            <div key={seg}>
              <label htmlFor={`price_${seg}`} className="block text-sm font-medium text-gray-700">
                {SEGMENT_LABELS[seg]}
              </label>
              <input
                type="number"
                id={`price_${seg}`}
                name={seg === 'LABO' ? 'priceLabo' : seg === 'DENTISTE' ? 'priceDentiste' : 'priceRevendeur'}
                min={0}
                step={0.01}
                defaultValue={
                  variant
                    ? (seg === 'LABO' ? variant.priceLabo : seg === 'DENTISTE' ? variant.priceDentiste : variant.priceRevendeur) ?? ''
                    : getSegmentPrice(product, seg) ?? ''
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="variant-cost" className="block text-sm font-medium text-gray-700">
          Coût (Dh)
        </label>
        <input
          type="number"
          id="variant-cost"
          name="cost"
          min={0}
          step={0.01}
          defaultValue={variant?.cost ?? 0}
          className="mt-1 block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la variante'}
        </button>
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  )
}
