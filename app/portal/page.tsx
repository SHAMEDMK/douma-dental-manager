import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import ProductCard from './_components/ProductCard'
import SearchInput from '@/app/components/SearchInput'
import Pagination from '@/app/components/Pagination'
import { getPriceForSegment } from '../lib/pricing'

export default async function CataloguePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const query = (searchParams.q as string) || ''
  const currentPage = Number(searchParams.page) || 1
  const pageSize = 8

  const session = await getSession()
  const where = {
    name: query ? { contains: query } : undefined,
  }

  // Single round-trip: user (if session), products, count, companySettings in parallel
  const [user, products, totalCount, companySettings] = await Promise.all([
    session
      ? prisma.user.findUnique({
          where: { id: session.id },
          select: { segment: true, discountRate: true },
        }).catch(() => null)
      : Promise.resolve(null),
    prisma.product.findMany({
      where,
      include: { segmentPrices: true },
      orderBy: { name: 'asc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
    prisma.companySettings.findUnique({
      where: { id: 'default' },
      select: { vatRate: true },
    }),
  ])

  let segment = user?.segment ?? 'LABO'
  let discountRate: number | null = user?.discountRate ?? null
  const vatRate = companySettings?.vatRate ?? 0.2

  // Calculate prices for each product based on segment (HT) with discount applied, then convert to TTC for display
  const productsWithPrices = products.map(product => {
    // Get base price for segment (before discount)
    const basePriceHT = getPriceForSegment(product, segment as any)
    
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
      ...product,
      price: priceHT, // Keep discounted HT price for cart/calculations (server will recalculate anyway)
      basePriceHT: basePriceHT, // Base price before discount
      discountRate: discountRate, // Discount rate
      discountAmount: discountAmount, // Discount amount
      priceTTC: priceTTC, // TTC price for display only (with discount applied)
      vatRate: vatRate // Pass VAT rate to component
    }
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Catalogue Produits</h1>
        <div className="w-full sm:w-auto">
          <SearchInput placeholder="Rechercher un produit..." />
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Aucun produit trouvé.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productsWithPrices.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination totalPages={totalPages} />
        </>
      )}
    </div>
  )
}
