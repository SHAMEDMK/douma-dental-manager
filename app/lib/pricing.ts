export type ProductWithPrices = {
  price: number
  segmentPrices?: Array<{
    segment: string
    price: number
  }>
  // Legacy fields for backward compatibility
  priceLabo?: number | null
  priceDentiste?: number | null
  priceRevendeur?: number | null
}

/** Variant has segment prices on the model (no ProductPrice table). */
export type VariantWithPrices = {
  priceLabo?: number | null
  priceDentiste?: number | null
  priceRevendeur?: number | null
}

export type ClientSegment = 'LABO' | 'DENTISTE' | 'REVENDEUR'

/**
 * Returns the correct price for a product based on the client segment.
 * First checks ProductPrice table, then falls back to legacy price fields,
 * then falls back to product.price.
 *
 * @param product - Product with segmentPrices relation or legacy price fields
 * @param segment - Client segment (LABO, DENTISTE, REVENDEUR)
 * @returns The price for the given segment
 */
export function getPriceForSegment(
  product: ProductWithPrices,
  segment: ClientSegment | string
): number {
  // First, check ProductPrice table (new system)
  if (product.segmentPrices && product.segmentPrices.length > 0) {
    const segmentPrice = product.segmentPrices.find(sp => sp.segment === segment)
    if (segmentPrice) {
      return segmentPrice.price
    }
  }

  // Fallback to legacy price fields (backward compatibility)
  switch (segment) {
    case 'LABO':
      return product.priceLabo ?? product.price
    case 'DENTISTE':
      return product.priceDentiste ?? product.price
    case 'REVENDEUR':
      return product.priceRevendeur ?? product.price
    default:
      return product.price
  }
}

/**
 * Returns the price for a variant based on the client segment.
 * Variants store prices in priceLabo, priceDentiste, priceRevendeur.
 *
 * @param variant - ProductVariant with price fields
 * @param segment - Client segment (LABO, DENTISTE, REVENDEUR)
 * @returns The price for the given segment (fallback to priceLabo then 0)
 */
export function getPriceForSegmentFromVariant(
  variant: VariantWithPrices,
  segment: ClientSegment | string
): number {
  switch (segment) {
    case 'LABO':
      return variant.priceLabo ?? 0
    case 'DENTISTE':
      return variant.priceDentiste ?? variant.priceLabo ?? 0
    case 'REVENDEUR':
      return variant.priceRevendeur ?? variant.priceLabo ?? 0
    default:
      return variant.priceLabo ?? 0
  }
}

/**
 * Helper function to get price for a user segment.
 * Same as getPriceForSegment but with explicit naming.
 */
export function getPriceForUserSegment(
  product: ProductWithPrices,
  segment: ClientSegment | string
): number {
  return getPriceForSegment(product, segment)
}

