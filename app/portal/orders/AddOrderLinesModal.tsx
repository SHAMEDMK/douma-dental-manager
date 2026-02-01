'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, Search, Check } from 'lucide-react'
import { getAvailableProducts } from '@/app/actions/product'
import { addOrderLinesAction } from '@/app/actions/order'

type Product = {
  id: string
  name: string
  stock: number
  price: number
}

type SelectedLine = {
  productId: string
  productName: string
  quantity: number
  price: number
  maxQuantity: number
}

type AddOrderLinesModalProps = {
  orderId: string
  existingProductIds: string[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddOrderLinesModal({
  orderId,
  existingProductIds,
  isOpen,
  onClose,
  onSuccess
}: AddOrderLinesModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadProducts()
      setSelectedLines([])
      setSearchQuery('')
      setError(null)
    }
  }, [isOpen])

  const loadProducts = async () => {
    setLoading(true)
    setError(null)
    const result = await getAvailableProducts()
    if (result.error) {
      setError(result.error)
    } else if (result.products) {
      setProducts(result.products)
    }
    setLoading(false)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addProductToSelection = (product: Product, quantity: number = 1) => {
    // Check if already selected
    const existingLine = selectedLines.find(line => line.productId === product.id)
    if (existingLine) {
      // Update quantity if already selected
      updateLineQuantity(product.id, existingLine.quantity + quantity)
      return
    }

    const newLine: SelectedLine = {
      productId: product.id,
      productName: product.name,
      quantity: Math.min(quantity, product.stock),
      price: product.price,
      maxQuantity: product.stock
    }

    setSelectedLines([...selectedLines, newLine])
  }

  const removeLine = (productId: string) => {
    setSelectedLines(selectedLines.filter(line => line.productId !== productId))
  }

  const updateLineQuantity = (productId: string, quantity: number) => {
    setSelectedLines(selectedLines.map(line => {
      if (line.productId === productId) {
        const newQty = Math.max(1, Math.min(quantity, line.maxQuantity))
        return { ...line, quantity: newQty }
      }
      return line
    }))
  }

  const getProductQuantity = (productId: string): number => {
    const line = selectedLines.find(l => l.productId === productId)
    return line ? line.quantity : 0
  }

  const setProductQuantity = (productId: string, quantity: number, product: Product) => {
    if (quantity <= 0) {
      removeLine(productId)
      return
    }
    
    const existingLine = selectedLines.find(line => line.productId === productId)
    if (existingLine) {
      updateLineQuantity(productId, Math.min(quantity, product.stock))
    } else {
      addProductToSelection(product, Math.min(quantity, product.stock))
    }
  }

  const handleSubmit = async () => {
    if (selectedLines.length === 0) {
      setError('Veuillez sélectionner au moins un produit')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const lines = selectedLines.map(line => ({
        productId: line.productId,
        quantity: line.quantity
      }))

      const result = await addOrderLinesAction(orderId, lines)

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
      } else {
        // Success
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'ajout des articles')
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const totalAmount = selectedLines.reduce((sum, line) => sum + (line.price * line.quantity), 0)

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Ajouter des produits à la commande
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Chargement des produits...</div>
            ) : (
              <>
                {error && !isSubmitting && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
                    {error}
                  </div>
                )}
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un produit..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Product list */}
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    {searchQuery ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
                  </div>
                ) : (
                  <div className="mb-4 max-h-64 overflow-y-auto space-y-2">
                    {filteredProducts.map((product) => {
                      const isSelected = selectedLines.some(line => line.productId === product.id)
                      const isExisting = existingProductIds.includes(product.id)
                      const currentQuantity = getProductQuantity(product.id)
                      
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center justify-between p-3 border rounded-md transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : product.stock === 0
                              ? 'border-gray-200 bg-gray-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
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
                                onClick={() => setProductQuantity(product.id, currentQuantity - 1, product)}
                                disabled={isSubmitting || currentQuantity <= 0 || product.stock === 0}
                                className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={product.stock}
                                value={currentQuantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  setProductQuantity(product.id, val, product)
                                }}
                                disabled={isSubmitting || product.stock === 0}
                                className="w-12 text-center text-sm border-0 focus:ring-0 focus:outline-none disabled:opacity-50"
                              />
                              <button
                                type="button"
                                onClick={() => setProductQuantity(product.id, currentQuantity + 1, product)}
                                disabled={isSubmitting || currentQuantity >= product.stock || product.stock === 0}
                                className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Summary of selected products */}
                {selectedLines.length > 0 && (
                  <div className="mb-4 border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {selectedLines.length} article{selectedLines.length > 1 ? 's' : ''} sélectionné{selectedLines.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        Total: {(totalAmount * 1.2).toFixed(2)} Dh TTC
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || selectedLines.length === 0}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-pulse">...</span>
                        <span>Ajout...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Ajouter {selectedLines.length} article{selectedLines.length > 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
