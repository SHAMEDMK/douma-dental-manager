import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPriceForSegment } from '@/app/lib/pricing'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import FavoritesPageClient from './FavoritesPageClient'

export default async function FavoritesPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  // Get user segment and discountRate
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { segment: true, discountRate: true }
  })
  const segment = user?.segment || 'LABO'
  const discountRate = user?.discountRate ?? null

  // Get favorites
  const favorites = await prisma.favoriteProduct.findMany({
    where: { userId: session.id },
    include: {
      product: {
        include: {
          segmentPrices: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get VAT rate from CompanySettings
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })
  const vatRate = companySettings?.vatRate ?? 0.2

  // Calculate prices for each product (with discount like in catalogue)
  const productsWithPrices = favorites.map(fav => {
    // Get base price for segment (before discount)
    const basePriceHT = getPriceForSegment(fav.product, segment as any)
    
    // Calculate discount amount if applicable
    let priceHT = basePriceHT
    let discountAmount = 0
    if (discountRate && discountRate > 0) {
      discountAmount = basePriceHT * (discountRate / 100)
      priceHT = basePriceHT - discountAmount
    }
    
    // Calculate TTC from discounted HT price
    const priceTTC = Math.round((priceHT * (1 + vatRate)) * 100) / 100
    
    return {
      ...fav.product,
      price: priceHT, // HT after discount
      basePriceHT: basePriceHT, // HT before discount
      discountRate: discountRate, // Discount rate
      discountAmount: discountAmount, // Discount amount
      priceTTC: priceTTC, // TTC price
      vatRate: vatRate
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
