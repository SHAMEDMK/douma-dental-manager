'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, ShoppingCart, Heart, Package, FileText, MessageSquare } from 'lucide-react'
import CartBadge from './CartBadge'
import FavoritesBadge from './FavoritesBadge'

const portalLinks = [
  { name: 'Catalogue', href: '/portal', icon: Package },
  { name: 'Favoris', href: '/portal/favorites', icon: Heart },
  { name: 'Mes Commandes', href: '/portal/orders', icon: FileText },
  { name: 'Contact', href: '/portal/request', icon: MessageSquare },
]

type PortalNavProps = {
  sessionName: string | null
  logoutAction: () => Promise<void>
}

export default function PortalNav({ sessionName, logoutAction }: PortalNavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo - always visible */}
          <Link href="/portal" className="font-bold text-lg sm:text-xl text-blue-900 shrink-0">
            Douma Dental
          </Link>

          {/* Desktop nav - hidden on mobile */}
          <div className="hidden md:flex md:items-center md:gap-1 lg:gap-4">
            <Link href="/portal" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
              Catalogue
            </Link>
            <Link href="/portal/favorites" className="relative text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
              Favoris
              <FavoritesBadge />
            </Link>
            <Link href="/portal/orders" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
              Mes Commandes
            </Link>
            <Link href="/portal/request" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
              Contact
            </Link>
          </div>

          {/* Right: cart + menu (mobile) or cart + user + logout (desktop) */}
          <div className="flex items-center gap-2 sm:gap-4">
            {sessionName && (
              <span className="hidden sm:inline text-sm text-gray-500 truncate max-w-[120px] lg:max-w-none">
                Bonjour, {sessionName}
              </span>
            )}
            <Link
              href="/portal/cart"
              className="relative p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-blue-600 min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-0 md:min-h-0 md:p-2"
              aria-label="Panier"
            >
              <ShoppingCart className="h-6 w-6" />
              <CartBadge />
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Desktop logout */}
            <form action={logoutAction} className="hidden md:block">
              <button
                type="submit"
                className="text-sm text-red-600 hover:text-red-800 px-3 py-2 rounded-md font-medium"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="md:hidden fixed top-0 right-0 z-50 w-72 h-full bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 shrink-0">
              <span className="text-sm font-medium text-gray-700">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-1 flex-1 overflow-y-auto">
              {sessionName && (
                <p className="px-3 py-2 text-sm text-gray-500 border-b border-gray-100 mb-3">
                  Bonjour, {sessionName}
                </p>
              )}
              {portalLinks.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[48px] ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {item.name}
                    {item.name === 'Favoris' && <FavoritesBadge />}
                  </Link>
                )
              })}
            </div>
            <div className="p-4 border-t border-gray-200 shrink-0">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 min-h-[48px]"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </aside>
        </>
      )}
    </nav>
  )
}
