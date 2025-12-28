'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type CartItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

type CartContextType = {
  items: CartItem[]
  addToCart: (product: any, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('douma_cart')
    if (saved) setItems(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('douma_cart', JSON.stringify(items))
  }, [items])

  const addToCart = (product: any, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(quantity)) // Ensure quantity is at least 1 and is an integer
    setItems(current => {
      const existing = current.find(i => i.productId === product.id)
      if (existing) {
        return current.map(i => 
          i.productId === product.id 
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }
      return [...current, { 
        productId: product.id, 
        name: product.name, 
        price: product.price, 
        quantity: qty 
      }]
    })
  }

  const removeFromCart = (productId: string) => {
    setItems(current => current.filter(i => i.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return
    setItems(current => current.map(i => 
      i.productId === productId ? { ...i, quantity } : i
    ))
  }

  const clearCart = () => setItems([])

  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
