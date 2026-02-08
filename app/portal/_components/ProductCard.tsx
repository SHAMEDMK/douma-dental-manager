'use client'

import { ShoppingCart, Heart } from 'lucide-react'
import { useCart } from '../CartContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import { getUserCreditInfo } from '@/app/actions/user'
import toast from 'react-hot-toast'
import type { SellableUnit } from '@/lib/types/product.types'

export default function ProductCard({ product }: { product: SellableUnit }) {
  const { addToCart, items, total } = useCart()
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [creditInfo, setCreditInfo] = useState<{ balance: number; creditLimit: number; available: number } | null>(null)
  const [isCheckingCredit, setIsCheckingCredit] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)

  // Fetch user credit info and favorite status
  useEffect(() => {
    getUserCreditInfo().then((result) => {
      if (result && 'balance' in result && !('error' in result && result.error)) {
        setCreditInfo(result as { balance: number; creditLimit: number; available: number })
      }
    }).catch(() => {
      // Silently fail
    })

    // Check if product/variant is favorited
    const vid = product.productVariantId ?? ''
    const checkUrl = vid ? `/api/favorites/check?productId=${product.productId}&productVariantId=${vid}` : `/api/favorites/check?productId=${product.productId}`
    fetch(checkUrl)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.isFavorite !== undefined) {
          setIsFavorite(data.isFavorite)
        }
      })
      .catch(() => {})
  }, [product.productId, product.productVariantId])

  const isByVariety = product.type === 'byVariety'
  const maxQuantity = product.stock > 0 ? product.stock : 1
  const isOutOfStock = !isByVariety && product.stock <= 0

  // Check if adding this product would exceed credit limit
  // Only block if creditInfo is loaded AND it would exceed the limit
  // If creditInfo is not loaded yet, allow (will be validated server-side)
  const wouldExceedCreditLimit = (() => {
    if (isByVariety) return false
    // If creditInfo not loaded yet, don't block (allow adding to cart)
    if (!creditInfo) return false
    
    // Calculate new total if we add this product
    const productTotal = product.price * quantity
    const newTotal = total + productTotal
    
    // If creditLimit is 0 or null/undefined, no credit is allowed
    // But we should still allow adding to cart - validation happens at checkout
    if (!creditInfo.creditLimit || creditInfo.creditLimit <= 0) {
      // Don't block here - let server-side validation handle it
      return false
    }
    
    // If creditLimit > 0, check if order would exceed it
    const newBalance = (creditInfo.balance || 0) + newTotal
    return newBalance > creditInfo.creditLimit
  })()

  const handleQuantityChange = (newQty: number, shouldCheckCredit: boolean = false) => {
    const clamped = Math.max(1, Math.min(newQty, maxQuantity))
    
    // Check credit limit if requested
    if (shouldCheckCredit && creditInfo) {
      const productTotal = product.price * clamped
      const newTotal = total + productTotal
      if (creditInfo.creditLimit && creditInfo.creditLimit > 0) {
        const newBalance = (creditInfo.balance || 0) + newTotal
        if (newBalance > creditInfo.creditLimit) {
          setError(`Plafond de crédit dépassé. Votre plafond est ${creditInfo.creditLimit.toFixed(2)}, solde dû ${(creditInfo.balance || 0).toFixed(2)}, cet article ${productTotal.toFixed(2)}. Total après ajout: ${newBalance.toFixed(2)}. Veuillez contacter la société.`)
          return // Don't update quantity
        }
      } else if (newTotal > 0) {
        setError('Aucun crédit autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
        return // Don't update quantity
      }
      // If we get here, the quantity is valid - clear any previous error
      setError('')
    } else if (!shouldCheckCredit) {
      // If not checking credit, just update quantity (for decrease button)
      setError('')
    }
    
    setQuantity(clamped)
  }

  const handleToggleFavorite = async () => {
    setIsTogglingFavorite(true)
    try {
      const pid = product.productId ?? product.id
      const vid = product.productVariantId ?? null
      if (isFavorite) {
        const deleteUrl = vid ? `/api/favorites?productId=${pid}&productVariantId=${vid}` : `/api/favorites?productId=${pid}`
        const res = await fetch(deleteUrl, { method: 'DELETE' })
        if (res.ok) {
          setIsFavorite(false)
          toast.success('Produit retiré des favoris')
        } else {
          toast.error('Erreur lors de la suppression')
        }
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: pid, productVariantId: vid }),
        })
        if (res.ok) {
          setIsFavorite(true)
          toast.success('Produit ajouté aux favoris')
        } else {
          const data = await res.json()
          toast.error(data.error || 'Erreur lors de l\'ajout')
        }
      }
    } catch (error) {
      toast.error('Erreur lors de la modification des favoris')
    } finally {
      setIsTogglingFavorite(false)
    }
  }

  const handleAddToCart = () => {
    if (isOutOfStock) {
      setError('Rupture de stock')
      return
    }

    if (quantity > product.stock) {
      setError(`Stock insuffisant. Disponible: ${product.stock}`)
      return
    }

    if (quantity < 1) {
      setError('La quantité doit être au moins 1')
      return
    }

    // Check credit limit before adding
    if (wouldExceedCreditLimit) {
      if (creditInfo && creditInfo.creditLimit && creditInfo.creditLimit > 0) {
        const productTotal = product.price * quantity
        const newTotal = total + productTotal
        const newBalance = (creditInfo.balance || 0) + newTotal
        setError(`Plafond de crédit dépassé. Votre plafond est ${creditInfo.creditLimit.toFixed(2)}, solde dû ${(creditInfo.balance || 0).toFixed(2)}, cet article ${productTotal.toFixed(2)}. Total après ajout: ${newBalance.toFixed(2)}. Veuillez contacter la société.`)
      } else {
        setError('Aucun crédit autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
      }
      return
    }

    setError('')
    if (isByVariety && product.varieteOptionValueId) {
      addToCart(
        {
          productId: product.productId,
          name: product.name,
          price: 0,
          pendingVariant: { varieteOptionValueId: product.varieteOptionValueId },
        },
        quantity
      )
    } else {
      addToCart(product, quantity)
    }
    router.push(`/portal/cart?added=1&qty=${quantity}`)
  }

  // Filter out Windows file paths - only show valid URLs
  const isValidImageUrl = product.imageUrl && 
    !product.imageUrl.includes('\\') && 
    !product.imageUrl.match(/^[A-Z]:\\/) &&
    (product.imageUrl.startsWith('http://') || 
     product.imageUrl.startsWith('https://') || 
     product.imageUrl.startsWith('/uploads/'))

  // Normalize image URL: 
  // - If it starts with /uploads/, use it as-is (Next.js serves public files at root)
  // - If it's already a full URL (http:// or https://), use it as-is
  // - Otherwise, it's invalid
  const imageSrc = isValidImageUrl ? product.imageUrl : null

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
      <div className="h-48 bg-gray-200 w-full flex items-center justify-center overflow-hidden relative group">
        {/* Favorite button */}
        <button
          onClick={handleToggleFavorite}
          disabled={isTogglingFavorite}
          className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-50"
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              console.error('Image failed to load:', imageSrc)
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent && !parent.querySelector('span')) {
                const span = document.createElement('span')
                span.className = 'text-gray-400'
                span.textContent = 'No Image'
                parent.appendChild(span)
              }
            }}
            onLoad={() => {
              console.log('Image loaded successfully:', imageSrc)
            }}
          />
        ) : (
          <span className="text-gray-400">No Image</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
            {product.sku && (
              <p className="text-xs font-mono text-gray-500 mt-0.5">{product.sku}</p>
            )}
            {product.category && (
              <p className="text-sm text-gray-500 mt-1">{product.category}</p>
            )}
          </div>
          <div className="text-right ml-2 flex flex-col items-end">
            <div className="group relative flex flex-col items-end gap-1">
              {isByVariety ? (
                <span className="text-sm text-gray-600">Prix selon dimension (au panier)</span>
              ) : product.discountRate && product.discountRate > 0 && product.basePriceHT && product.vatRate ? (
                <>
                  {/* Prix de base barré */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 line-through">
                      {(product.basePriceHT * (1 + product.vatRate)).toFixed(2)} Dh TTC
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      -{product.discountRate}%
                    </span>
                  </div>
                  {/* Prix après remise en évidence */}
                  <span className="text-lg font-bold text-blue-600">
                    {(product.priceTTC ?? 0).toFixed(2)} Dh TTC
                  </span>
                  {/* Tooltip avec détails au survol */}
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                    <div className="space-y-1.5 text-xs text-gray-700">
                      <div className="font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">Détail du prix</div>
                      <div className="flex justify-between">
                        <span>HT de base:</span>
                        <span className="font-medium">{product.basePriceHT.toFixed(2)} Dh</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Remise ({product.discountRate}%):</span>
                        <span className="font-medium">-{(product.discountAmount ?? 0).toFixed(2)} Dh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HT après remise:</span>
                        <span className="font-medium">{product.price.toFixed(2)} Dh</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-gray-200">
                        <span className="font-semibold">TTC:</span>
                        <span className="font-bold text-blue-600">{(product.priceTTC ?? 0).toFixed(2)} Dh</span>
                      </div>
                    </div>
                    {/* Flèche du tooltip */}
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                  </div>
                </>
              ) : (
                /* Pas de remise : affichage simple */
                <span className="text-lg font-bold text-blue-600">
                  {(product.priceTTC ?? product.price).toFixed(2)} Dh TTC
                </span>
              )}
            </div>
          </div>
        </div>
        
        {product.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
        )}
        
        <div className="mt-4 flex flex-col gap-2 mt-auto">
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full ${
              isByVariety ? 'bg-blue-100 text-blue-800' :
              product.stock > 10 ? 'bg-green-100 text-green-800' : 
              product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {isByVariety ? 'Teinte et dimension au panier' : isOutOfStock ? 'Rupture' : `${product.stock} en stock`}
            </span>
          </div>

          {!isOutOfStock && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Diminuer la quantité"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => {
                    const newQty = parseInt(e.target.value) || 1
                    handleQuantityChange(newQty, true) // Check credit when changing quantity
                  }}
                  disabled={isOutOfStock}
                  className="w-12 text-center text-sm border-0 focus:ring-0 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1, true)}
                  disabled={quantity >= maxQuantity || isOutOfStock}
                  className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Augmenter la quantité"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                data-testid="add-to-cart"
                className="flex items-center space-x-1 bg-blue-900 text-white px-3 py-2 rounded-md hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm">Ajouter</span>
              </button>
            </div>
          )}

          {isOutOfStock && (
            <button 
              disabled
              className="flex items-center justify-center space-x-1 bg-gray-300 text-gray-500 px-3 py-2 rounded-md cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm">Rupture de stock</span>
            </button>
          )}

          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
