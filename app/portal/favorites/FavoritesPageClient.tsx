'use client'

import { useState, useMemo } from 'react'
import ProductCard from '../_components/ProductCard'
import { Search, Filter, SortAsc, X, ShoppingCart } from 'lucide-react'
import { useCart } from '../CartContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type Product = {
  id: string
  name: string
  category: string | null
  stock: number
  price: number
  basePriceHT?: number
  discountRate?: number | null
  discountAmount?: number
  priceTTC: number
  vatRate: number
  [key: string]: any
}

type FavoritesPageClientProps = {
  products: Product[]
  totalCount: number
  inStockCount: number
  outOfStockCount: number
}

export default function FavoritesPageClient({
  products,
  totalCount,
  inStockCount,
  outOfStockCount
}: FavoritesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'date'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { addToCart } = useCart()
  const router = useRouter()

  // Get unique categories
  const categories = useMemo(() => {
    const cats = products
      .map(p => p.category)
      .filter((cat): cat is string => cat !== null && cat !== '')
    return Array.from(new Set(cats)).sort()
  }, [products])

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query))
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Stock filter
    if (stockFilter === 'inStock') {
      filtered = filtered.filter(p => p.stock > 0)
    } else if (stockFilter === 'outOfStock') {
      filtered = filtered.filter(p => p.stock <= 0)
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'price':
          comparison = a.priceTTC - b.priceTTC
          break
        case 'stock':
          comparison = a.stock - b.stock
          break
        case 'date':
          // Keep original order (already sorted by date from server)
          return 0
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy, sortOrder])

  const handleAddAllToCart = async () => {
    const inStockProducts = filteredAndSortedProducts.filter(p => p.stock > 0)
    
    if (inStockProducts.length === 0) {
      toast.error('Aucun produit en stock à ajouter')
      return
    }

    let addedCount = 0
    for (const product of inStockProducts) {
      try {
        addToCart(product, 1)
        addedCount++
      } catch (error) {
        console.error('Error adding product to cart:', error)
      }
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} produit(s) ajouté(s) au panier`)
      router.push('/portal/cart')
    }
  }

  const canAddAllToCart = filteredAndSortedProducts.some(p => p.stock > 0)

  return (
    <div>
      {/* Header with stats */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes Produits Favoris</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="font-medium">Total: {totalCount} produit(s)</span>
              <span className="text-green-600">En stock: {inStockCount}</span>
              {outOfStockCount > 0 && (
                <span className="text-red-600">Rupture: {outOfStockCount}</span>
              )}
            </div>
          </div>
          {canAddAllToCart && (
            <button
              onClick={handleAddAllToCart}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Ajouter tout au panier</span>
            </button>
          )}
        </div>

        {/* Search and filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Category filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Stock filter */}
            <div className="flex items-center gap-2">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as 'all' | 'inStock' | 'outOfStock')}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tous les produits</option>
                <option value="inStock">En stock uniquement</option>
                <option value="outOfStock">Rupture de stock</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'stock' | 'date')}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Date d'ajout</option>
                <option value="name">Nom</option>
                <option value="price">Prix</option>
                <option value="stock">Stock</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Results count */}
          {filteredAndSortedProducts.length !== totalCount && (
            <div className="text-sm text-gray-600">
              {filteredAndSortedProducts.length} produit(s) trouvé(s)
            </div>
          )}
        </div>
      </div>

      {/* Products grid */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">
            {searchQuery || selectedCategory !== 'all' || stockFilter !== 'all'
              ? 'Aucun produit ne correspond à vos critères'
              : 'Aucun produit favori pour le moment'}
          </p>
          {(searchQuery || selectedCategory !== 'all' || stockFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setStockFilter('all')
              }}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredAndSortedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
