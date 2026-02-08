import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import ProductCard from './_components/ProductCard'
import SearchInput from '@/app/components/SearchInput'
import Pagination from '@/app/components/Pagination'
import { getSellableUnits, getSellableUnitsByVariety, getPriceForUnit } from '../lib/variant-utils'
import type { SellableUnit } from '@/lib/types/product.types'
import type { ClientSegment } from '../lib/pricing'

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

  const [user, products, totalCount, companySettings] = await Promise.all([
    session
      ? prisma.user.findUnique({
          where: { id: session.id },
          select: { segment: true, discountRate: true },
        }).catch(() => null)
      : Promise.resolve(null),
    prisma.product.findMany({
      where,
      include: {
        segmentPrices: true,
        variants: true,
        options: { include: { values: true }, orderBy: { name: 'asc' } },
      },
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

  const segment = (user?.segment ?? 'LABO') as ClientSegment
  const discountRate: number | null = user?.discountRate ?? null
  const vatRate = companySettings?.vatRate ?? 0.2

  // Construire les unités vendables : par variété (3 options) ou classique (1 par produit/variante)
  const units: SellableUnit[] = []
  for (const product of products) {
    const productWithOpts = product as import('../lib/variant-utils').ProductWithOptions
    const byVariety = getSellableUnitsByVariety(productWithOpts)
    if (byVariety.length > 0) {
      for (const unit of byVariety) {
        units.push({
          id: `${product.id}:${unit.varieteOptionValueId}`,
          type: 'byVariety',
          productId: product.id,
          productVariantId: null,
          varieteOptionValueId: unit.varieteOptionValueId,
          varieteLabel: unit.varieteLabel,
          name: `${product.name} – ${unit.varieteLabel}`,
          sku: (product.sku ?? product.id.slice(0, 6)) + '-' + unit.varieteLabel.replace(/\s+/g, '-'),
          stock: 999,
          minStock: 0,
          price: 0,
          basePriceHT: 0,
          discountRate,
          discountAmount: 0,
          priceTTC: 0,
          vatRate,
          category: product.category,
          imageUrl: product.imageUrl,
          description: product.description ?? undefined,
        })
      }
      continue
    }
    const sellableUnits = getSellableUnits(product as import('../lib/variant-utils').ProductWithVariants)
    for (const unit of sellableUnits) {
      const basePriceHT = getPriceForUnit(unit.product, unit.variant ?? undefined, segment)
      let priceHT = basePriceHT
      let discountAmount = 0
      if (discountRate != null && discountRate > 0) {
        discountAmount = basePriceHT * (discountRate / 100)
        priceHT = basePriceHT - discountAmount
      }
      const priceTTC = Math.round(priceHT * (1 + vatRate) * 100) / 100

      if (unit.type === 'variant' && unit.variant) {
        units.push({
          id: unit.variant.id,
          type: 'variant',
          productId: product.id,
          productVariantId: unit.variant.id,
          name: `${product.name} – ${unit.variant.name || unit.variant.sku}`,
          sku: unit.variant.sku,
          stock: unit.variant.stock,
          minStock: (unit.variant as { minStock?: number }).minStock ?? 0,
          price: priceHT,
          priceLabo: unit.variant.priceLabo ?? undefined,
          priceDentiste: unit.variant.priceDentiste ?? undefined,
          priceRevendeur: unit.variant.priceRevendeur ?? undefined,
          basePriceHT,
          discountRate,
          discountAmount,
          priceTTC,
          vatRate,
          category: product.category,
          imageUrl: product.imageUrl,
          description: product.description,
        })
      } else {
        units.push({
          id: product.id,
          type: 'product',
          productId: product.id,
          productVariantId: null,
          name: product.name,
          sku: product.sku ?? '-',
          stock: product.stock,
          minStock: product.minStock,
          price: priceHT,
          basePriceHT,
          discountRate,
          discountAmount,
          priceTTC,
          vatRate,
          category: product.category,
          imageUrl: product.imageUrl,
          description: product.description,
        })
      }
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Catalogue Produits</h1>
        <div className="w-full sm:w-auto">
          <SearchInput placeholder="Rechercher un produit..." />
        </div>
      </div>

      {units.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Aucun produit trouvé.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {units.map((unit) => (
              <ProductCard key={unit.id} product={unit} />
            ))}
          </div>
          <Pagination totalPages={totalPages} />
        </>
      )}
    </div>
  )
}
