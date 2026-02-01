'use client'

import { useState, useEffect } from 'react'
import { Plus, Minus, X } from 'lucide-react'
import { getAvailableProducts } from '@/app/actions/product'

type Product = {
  id: string
  name: string
  stock: number
  price: number
}

type AddProductPanelProps = {
  orderId: string
  existingProductIds: string[]
  onAddSuccess: () => void
}

// Component for individual product row with quantity
function ProductRow({ 
  product, 
  isExisting, 
  orderId, 
  onAddSuccess, 
  setError, 
  setSuccess 
}: { 
  product: Product
  isExisting: boolean
  orderId: string
  onAddSuccess: () => void
  setError: (error: string | null) => void
  setSuccess: (success: boolean) => void
}) {
  const [productQuantity, setProductQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddProduct = async () => {
    if (productQuantity < 1 || productQuantity > product.stock) {
      setError(`Quantité invalide. Disponible: ${product.stock}`)
      return
    }

    setIsAdding(true)
    setError(null)
    setSuccess(false)

    try {
      const { addOrderItemAction } = await import('@/app/actions/order')
      const result = await addOrderItemAction(orderId, product.id, productQuantity)
      
      if (result.error) {
        setError(result.error)
        setIsAdding(false)
      } else {
        setSuccess(true)
        setProductQuantity(1)
        setIsAdding(false)
        onAddSuccess()
        setTimeout(() => {
          setSuccess(false)
        }, 2000)
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'ajout de l\'article')
      setIsAdding(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0 mr-3">
        <div className="font-medium text-sm text-gray-900">{product.name}</div>
        <div className="text-xs text-gray-500 mt-1">
          Stock: {product.stock} | Prix: {(product.price * 1.2).toFixed(2)} Dh TTC
          {isExisting && <span className="ml-2 text-blue-600">(déjà dans la commande)</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center border border-gray-300 rounded-md">
          <button
            type="button"
            onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
            disabled={isAdding || productQuantity <= 1}
            className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="h-3 w-3" />
          </button>
          <input
            type="number"
            min="1"
            max={product.stock}
            value={productQuantity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1
              setProductQuantity(Math.max(1, Math.min(val, product.stock)))
            }}
            disabled={isAdding}
            className="w-12 text-center text-sm border-0 focus:ring-0 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setProductQuantity(Math.min(product.stock, productQuantity + 1))}
            disabled={isAdding || productQuantity >= product.stock}
            className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleAddProduct}
          disabled={isAdding || productQuantity < 1 || product.stock === 0}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isAdding ? '...' : 'Ajouter'}
        </button>
      </div>
    </div>
  )
}

export default function AddProductPanel({ orderId, existingProductIds, onAddSuccess }: AddProductPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadProducts()
    }
  }, [isOpen])

  const loadProducts = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    const result = await getAvailableProducts()
    if (result.error) {
      setError(result.error)
    } else if (result.products) {
      // Don't filter - allow adding products that already exist (will increment quantity)
      setProducts(result.products)
    }
    setLoading(false)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedProductData = products.find(p => p.id === selectedProduct)

  const handleAdd = async () => {
    if (!selectedProduct || quantity < 1) return
    if (selectedProductData && quantity > selectedProductData.stock) {
      setError(`Stock insuffisant. Disponible: ${selectedProductData.stock}`)
      return
    }

    setIsAdding(true)
    setError(null)
    setSuccess(false)

    try {
      const { addOrderItemAction } = await import('@/app/actions/order')
      const result = await addOrderItemAction(orderId, selectedProduct, quantity)
      
      if (result.error) {
        setError(result.error)
        setIsAdding(false)
      } else {
        setSuccess(true)
        setSelectedProduct('')
        setQuantity(1)
        setSearchQuery('')
        setIsAdding(false)
        // Call parent callback to refresh
        onAddSuccess()
        // Auto-close after 2 seconds
        setTimeout(() => {
          setIsOpen(false)
          setSuccess(false)
        }, 2000)
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'ajout de l\'article')
      setIsAdding(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-4 py-2 text-sm rounded-md border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Ajouter un article</span>
      </button>
    )
  }

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Ajouter un article</h3>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false)
            setSelectedProduct('')
            setQuantity(1)
            setSearchQuery('')
            setError(null)
            setSuccess(false)
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4 text-sm text-gray-500">Chargement...</div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-3">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm mb-3">
              ✅ Article ajouté à la commande
            </div>
          )}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              {searchQuery ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
            </div>
          ) : (
            <div className="mb-3 max-h-64 overflow-y-auto space-y-2">
              {filteredProducts.map((product) => {
                const isExisting = existingProductIds.includes(product.id)
                return (
                  <ProductRow
                    key={product.id}
                    product={product}
                    isExisting={isExisting}
                    orderId={orderId}
                    onAddSuccess={onAddSuccess}
                    setError={setError}
                    setSuccess={setSuccess}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
