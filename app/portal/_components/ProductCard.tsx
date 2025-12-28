'use client'

import { ShoppingCart } from 'lucide-react'
import { useCart } from '../CartContext'
import { useRouter } from 'next/navigation'

export default function ProductCard({ product }: { product: any }) {
  const { addToCart } = useCart()
  const router = useRouter()

  const handleAddToCart = () => {
    if (product.stock <= 0) return
    
    addToCart(product, 1)
    router.push('/portal/cart')
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
      <div className="h-48 bg-gray-200 w-full flex items-center justify-center">
        {/* Placeholder for image */}
        <span className="text-gray-400">No Image</span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-500">{product.category}</p>
          </div>
          <span className="text-lg font-bold text-blue-600">{product.price.toFixed(2)} €</span>
        </div>
        
        <div className="mt-4 flex items-center justify-between mt-auto">
          <span className={`text-xs px-2 py-1 rounded-full ${
            product.stock > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {product.stock} en stock
          </span>
          <button 
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="flex items-center space-x-1 bg-blue-900 text-white px-3 py-2 rounded-md hover:bg-blue-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm">Ajouter</span>
          </button>
        </div>
      </div>
    </div>
  )
}
