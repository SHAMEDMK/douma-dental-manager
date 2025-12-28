type ProductWithPrices = {
  price: number
  priceLabo?: number | null
  priceDentiste?: number | null
  priceRevendeur?: number | null
}

type ClientSegment = 'LABO' | 'DENTISTE' | 'REVENDEUR'

/**
 * Returns the correct price for a product based on the client segment.
 * Falls back to legacy price field if segment-specific price is not set.
 * 
 * @param product - Product with price fields
 * @param segment - Client segment (LABO, DENTISTE, REVENDEUR)
 * @returns The price for the given segment
 */
export function getPriceForSegment(
  product: ProductWithPrices,
  segment: ClientSegment | string
): number {
  switch (segment) {
    case 'LABO':
      return product.priceLabo ?? product.price
    case 'DENTISTE':
      return product.priceDentiste ?? product.price
    case 'REVENDEUR':
      return product.priceRevendeur ?? product.price
    default:
      // Fallback to legacy price
      return product.price
  }
}

