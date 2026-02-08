import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPriceForSegment, getPriceForSegmentFromVariant } from '@/app/lib/pricing'
import FavoritesPageClient from './FavoritesPageClient'

export default async function FavoritesPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { segment: true, discountRate: true },
  })
  const segment = (user?.segment || 'LABO') as 'LABO' | 'DENTISTE' | 'REVENDEUR'
  const discountRate = user?.discountRate ?? null

  const favorites = await prisma.favoriteProduct.findMany({
    where: { userId: session.id },
    include: {
      product: {
        include: { segmentPrices: true },
      },
      productVariant: {
        select: { id: true, sku: true, name: true, stock: true, priceLabo: true, priceDentiste: true, priceRevendeur: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  })
  const vatRate = companySettings?.vatRate ?? 0.2

  const productsWithPrices = favorites.map((fav) => {
    const product = fav.product
    const variant = fav.productVariant
    const basePriceHT = variant
      ? getPriceForSegmentFromVariant(variant, segment)
      : getPriceForSegment(product, segment)
    let priceHT = basePriceHT
    let discountAmount = 0
    if (discountRate && discountRate > 0) {
      discountAmount = basePriceHT * (discountRate / 100)
      priceHT = basePriceHT - discountAmount
    }
    const priceTTC = Math.round((priceHT * (1 + vatRate)) * 100) / 100

    return {
      id: variant?.id ?? product.id,
      productId: product.id,
      productVariantId: variant?.id ?? null,
      name: variant ? `${product.name} – ${variant.name || variant.sku}` : product.name,
      stock: variant?.stock ?? product.stock,
      sku: variant?.sku ?? product.sku,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      price: priceHT,
      basePriceHT,
      discountRate,
      discountAmount,
      priceTTC,
      vatRate,
    }
  })

  // Calculate statistics
  const totalCount = productsWithPrices.length
  const inStockCount = productsWithPrices.filter(p => p.stock > 0).length
  const outOfStockCount = totalCount - inStockCount

  return (
    <FavoritesPageClient
      products={productsWithPrices}
      totalCount={totalCount}
      inStockCount={inStockCount}
      outOfStockCount={outOfStockCount}
    />
  )
}
