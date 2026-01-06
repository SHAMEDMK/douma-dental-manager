type ProductWithPrices = {
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

type ClientSegment = 'LABO' | 'DENTISTE' | 'REVENDEUR'

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
      // Final fallback to legacy price field
      return product.price
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

