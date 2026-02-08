import { z } from 'zod'

/** Segment pricing keys used in the app */
export const SEGMENTS = ['LABO', 'DENTISTE', 'REVENDEUR'] as const
export type Segment = (typeof SEGMENTS)[number]

/** Zod schema for creating/editing a product variant (form validation) */
export const variantFormSchema = z.object({
  sku: z.string().min(1, 'Le SKU est requis').trim(),
  name: z.string().trim().optional().nullable(),
  stock: z.coerce.number().int().min(0, 'Le stock doit être ≥ 0'),
  minStock: z.coerce.number().int().min(0, 'Le stock minimum doit être ≥ 0'),
  useParentPrices: z.boolean().optional().default(true),
  priceLabo: z.coerce.number().min(0).optional().nullable(),
  priceDentiste: z.coerce.number().min(0).optional().nullable(),
  priceRevendeur: z.coerce.number().min(0).optional().nullable(),
  cost: z.coerce.number().min(0).default(0),
  optionValueIds: z.array(z.string()).optional().default([]),
})

export type VariantFormValues = z.infer<typeof variantFormSchema>

/** Input type for creating a variant (aligns with createVariantAction FormData) */
export type CreateVariantInput = {
  sku: string
  name?: string | null
  stock: number
  minStock: number
  useParentPrices?: boolean
  priceLabo?: number | null
  priceDentiste?: number | null
  priceRevendeur?: number | null
  cost: number
  optionValueIds?: string[]
}

/** Product variant as returned from getProductWithVariantsAndOptions (for list/display) */
export type ProductVariantDisplay = {
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
}

/** Product option with values (for options manager and variant form) */
export type ProductOptionWithValues = {
  id: string
  productId: string
  name: string
  values: Array<{ id: string; value: string }>
}

/**
 * Unité vendable pour le catalogue client : produit seul, variante, ou "par variété" (teinte/dimension au panier).
 */
export type SellableUnit = {
  id: string
  type: 'product' | 'variant' | 'byVariety'
  productId: string
  productVariantId?: string | null
  /** Pour type 'byVariety' : valeur d'option Variété (order=1) */
  varieteOptionValueId?: string | null
  varieteLabel?: string | null
  name: string
  sku: string
  stock: number
  minStock: number
  price: number
  priceLabo?: number
  priceDentiste?: number
  priceRevendeur?: number
  basePriceHT?: number
  discountRate?: number | null
  discountAmount?: number
  priceTTC?: number
  vatRate?: number
  category?: string | null
  imageUrl?: string | null
  description?: string | null
}
