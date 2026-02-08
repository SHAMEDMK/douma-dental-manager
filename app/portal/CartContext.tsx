'use client'

import { createContext, useContext, useState, useEffect } from 'react'

/** Ligne en attente de choix Teinte + Dimension (ajout au panier par variété uniquement). */
export type PendingVariantSelection = {
  varieteOptionValueId: string
  teinteOptionValueId?: string | null
  dimensionOptionValueId?: string | null
}

export type CartItem = {
  productId: string
  productVariantId?: string | null
  /** Présent quand la ligne est ajoutée par variété et que Teinte/Dimension ne sont pas encore choisis. */
  pendingVariant?: PendingVariantSelection | null
  name: string
  price: number // Price HT after discount (0 si pending et non résolu)
  basePriceHT?: number // Base price HT before discount
  discountRate?: number | null // Discount rate percentage
  discountAmount?: number // Discount amount
  quantity: number
}

/** Unique key for a cart line: product only, product + variant, or product + pending variété */
export function cartItemKey(item: {
  productId: string
  productVariantId?: string | null
  pendingVariant?: PendingVariantSelection | null
}): string {
  if (item.productVariantId) return `${item.productId}:${item.productVariantId}`
  if (item.pendingVariant?.varieteOptionValueId) {
    const t = item.pendingVariant.teinteOptionValueId ?? ''
    const d = item.pendingVariant.dimensionOptionValueId ?? ''
    return `${item.productId}:pending:${item.pendingVariant.varieteOptionValueId}:${t}:${d}`
  }
  return item.productId
}

/** True si la ligne doit afficher les sélecteurs Teinte/Dimension dans le panier */
export function isCartItemConfigurable(item: CartItem): boolean {
  return !!(
    item.pendingVariant?.varieteOptionValueId &&
    (!item.pendingVariant.teinteOptionValueId || !item.pendingVariant.dimensionOptionValueId)
  )
}

/** True si la ligne a une variante résolue (prix et stock connus) */
export function isCartItemResolved(item: CartItem): boolean {
  return !!item.productVariantId && !item.pendingVariant
}

type CartContextType = {
  items: CartItem[]
  addToCart: (product: any, quantity?: number) => void
  removeFromCart: (productId: string, productVariantId?: string | null, pendingVarieteValueId?: string | null) => void
  updateQuantity: (productId: string, quantity: number, productVariantId?: string | null, pendingVarieteValueId?: string | null) => void
  /** Met à jour la sélection Teinte/Dimension d'une ligne pending ; si les deux sont renseignés, résolution côté appelant (voir resolveAndUpdateCartItem). */
  updatePendingVariantSelection: (
    productId: string,
    varieteOptionValueId: string,
    teinteOptionValueId: string | null,
    dimensionOptionValueId: string | null
  ) => void
  /** Remplace une ligne pending par la variante résolue (après appel à resolveVariantFromOptions). */
  resolveCartItem: (
    productId: string,
    varieteOptionValueId: string,
    resolved: { productVariantId: string; name: string; price: number; basePriceHT?: number; discountRate?: number | null; discountAmount?: number }
  ) => void
  clearCart: () => void
  total: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function matchCartItem(
  i: CartItem,
  productId: string,
  productVariantId?: string | null,
  varieteOptionValueId?: string | null
): boolean {
  if (varieteOptionValueId != null) {
    return i.productId === productId && i.pendingVariant?.varieteOptionValueId === varieteOptionValueId
  }
  const vid = productVariantId ?? null
  return i.productId === productId && (i.productVariantId ?? null) === vid && !i.pendingVariant
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('douma_cart')
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (_) {
        setItems([])
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('douma_cart', JSON.stringify(items))
  }, [items])

  const addToCart = (product: any, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(quantity))
    const pid = product.productId ?? product.id
    const vid = product.productVariantId ?? null
    const pending = product.pendingVariant ?? null
    setItems(current => {
      const existing = pending?.varieteOptionValueId
        ? current.find(i => i.productId === pid && i.pendingVariant?.varieteOptionValueId === pending.varieteOptionValueId)
        : current.find(i => i.productId === pid && (i.productVariantId ?? null) === vid && !i.pendingVariant)
      if (existing) {
        return current.map(i =>
          (pending?.varieteOptionValueId
            ? i.productId === pid && i.pendingVariant?.varieteOptionValueId === pending.varieteOptionValueId
            : i.productId === pid && (i.productVariantId ?? null) === vid && !i.pendingVariant)
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }
      return [...current, {
        productId: pid,
        productVariantId: vid || undefined,
        pendingVariant: pending || undefined,
        name: product.name ?? 'Produit',
        price: product.price ?? 0,
        basePriceHT: product.basePriceHT,
        discountRate: product.discountRate,
        discountAmount: product.discountAmount,
        quantity: qty,
      }]
    })
  }

  const removeFromCart = (productId: string, productVariantId?: string | null, pendingVarieteValueId?: string | null) => {
    setItems(current =>
      current.filter(i => !matchCartItem(i, productId, productVariantId ?? null, pendingVarieteValueId ?? null))
    )
  }

  const updateQuantity = (
    productId: string,
    quantity: number,
    productVariantId?: string | null,
    pendingVarieteValueId?: string | null
  ) => {
    if (quantity < 1) return
    setItems(current =>
      current.map(i =>
        matchCartItem(i, productId, productVariantId ?? null, pendingVarieteValueId ?? null) ? { ...i, quantity } : i
      )
    )
  }

  const updatePendingVariantSelection = (
    productId: string,
    varieteOptionValueId: string,
    teinteOptionValueId: string | null,
    dimensionOptionValueId: string | null
  ) => {
    setItems(current =>
      current.map(i =>
        i.productId === productId && i.pendingVariant?.varieteOptionValueId === varieteOptionValueId
          ? {
              ...i,
              pendingVariant: {
                ...i.pendingVariant!,
                varieteOptionValueId,
                teinteOptionValueId: teinteOptionValueId ?? undefined,
                dimensionOptionValueId: dimensionOptionValueId ?? undefined,
              },
            }
          : i
      )
    )
  }

  const resolveCartItem = (
    productId: string,
    varieteOptionValueId: string,
    resolved: {
      productVariantId: string
      name: string
      price: number
      basePriceHT?: number
      discountRate?: number | null
      discountAmount?: number
    }
  ) => {
    setItems(current =>
      current.map(i =>
        i.productId === productId && i.pendingVariant?.varieteOptionValueId === varieteOptionValueId
          ? {
              ...i,
              productVariantId: resolved.productVariantId,
              pendingVariant: undefined,
              name: resolved.name,
              price: resolved.price,
              basePriceHT: resolved.basePriceHT,
              discountRate: resolved.discountRate,
              discountAmount: resolved.discountAmount ?? 0,
            }
          : i
      )
    )
  }

  const clearCart = () => setItems([])

  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        updatePendingVariantSelection,
        resolveCartItem,
        clearCart,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
