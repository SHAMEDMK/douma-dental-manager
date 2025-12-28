'use client'

import { CartProvider } from './CartContext'

export default function PortalProviders({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
