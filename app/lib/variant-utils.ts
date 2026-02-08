/**
 * Helpers for product vs variant logic (sellable units, stock, price).
 */

import type { ProductWithPrices, VariantWithPrices, ClientSegment } from './pricing'
import { getPriceForSegment, getPriceForSegmentFromVariant } from './pricing'

export type ProductWithVariants = {
  id: string
  name: string
  stock: number
  variants?: Array<{
    id: string
    sku: string
    name: string | null
    stock: number
    priceLabo?: number | null
    priceDentiste?: number | null
    priceRevendeur?: number | null
    cost: number
  }>
} & ProductWithPrices

/**
 * True if the product has at least one variant (then stock/price are per variant).
 */
export function hasVariants(product: { variants?: unknown[] }): boolean {
  return Array.isArray(product.variants) && product.variants.length > 0
}

/**
 * Returns sellable units: either one entry for the product (no variants) or one per variant.
 * Useful for catalogue and getAvailableProducts.
 */
export function getSellableUnits(product: ProductWithVariants): Array<
  | { type: 'product'; product: ProductWithVariants; variant: null }
  | { type: 'variant'; product: ProductWithVariants; variant: NonNullable<ProductWithVariants['variants']>[number] }
> {
  if (hasVariants(product)) {
    return (product.variants ?? []).map(variant => ({
      type: 'variant' as const,
      product,
      variant,
    }))
  }
  return [{ type: 'product' as const, product, variant: null }]
}

export type ProductWithOptions = ProductWithVariants & {
  options?: Array<{
    id: string
    name: string
    order?: number
    values?: Array<{ id: string; value: string }>
  }>
}

/**
 * Option "Variété" : order === 1 ou nom contient "Variété".
 * Les 3 options sont : Variété (1), Teinte (2), Dimension (3).
 */
function getVarieteOption<T extends { id: string; name: string; order?: number; values?: unknown[] }>(
  options: T[]
): T | undefined {
  const byOrder = options.find((o) => (o.order ?? 0) === 1)
  if (byOrder) return byOrder
  return options.find((o) => /variété/i.test(o.name))
}

/**
 * Si le produit a exactement 3 options (Variété, Teinte, Dimension),
 * retourne une entrée par valeur de l'option Variété pour afficher le catalogue "par variété"
 * (ex. 6 cartes pour Zircone). Le client ajoute une variété au panier puis choisit Teinte et Dimension dans le panier.
 * Sinon retourne [] et le catalogue utilisera getSellableUnits.
 */
export function getSellableUnitsByVariety(product: ProductWithOptions): Array<{
  type: 'byVariety'
  product: ProductWithOptions
  varieteOptionValueId: string
  varieteLabel: string
}> {
  const options = product.options ?? []
  if (options.length !== 3) return []
  const varieteOption = getVarieteOption(options)
  if (!varieteOption) return []
  const values = varieteOption.values ?? []
  if (values.length === 0) return []
  return values.map((v: { id: string; value: string }) => ({
    type: 'byVariety' as const,
    product,
    varieteOptionValueId: v.id,
    varieteLabel: v.value,
  }))
}

/**
 * Stock for a sellable unit: product stock if no variant, else variant stock.
 */
export function getStockForUnit(
  product: { stock: number; variants?: Array<{ id: string; stock: number }> },
  variantId?: string | null
): number {
  if (variantId && product.variants?.length) {
    const v = product.variants.find(vr => vr.id === variantId)
    return v?.stock ?? 0
  }
  return product.stock
}

/**
 * Price for a sellable unit (product or variant) for the given segment.
 */
export function getPriceForUnit(
  product: ProductWithVariants,
  variant: VariantWithPrices | null | undefined,
  segment: ClientSegment | string
): number {
  if (variant) {
    return getPriceForSegmentFromVariant(variant, segment)
  }
  return getPriceForSegment(product, segment as ClientSegment)
}
