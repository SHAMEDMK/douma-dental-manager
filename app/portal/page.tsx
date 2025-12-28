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

  // Get user segment for pricing (with safe fallback)
  const session = await getSession()
  let segment = 'LABO' // Default fallback
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { segment: true }
      })
      segment = user?.segment || 'LABO'
    } catch (error) {
      // If segment field doesn't exist yet, fallback to LABO
      console.warn('Segment field not available, using LABO default')
      segment = 'LABO'
    }
  }

  const where = {
    stock: { gt: 0 },
    name: { contains: query }, // SQLite case-insensitive by default for LIKE? No, usually case-sensitive unless configured? 
    // Prisma on SQLite maps contains to LIKE.
  }

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where })
  ])

  // Calculate prices for each product based on segment
  const productsWithPrices = products.map(product => ({
    ...product,
    price: getPriceForSegment(product, segment as any)
  }))

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
