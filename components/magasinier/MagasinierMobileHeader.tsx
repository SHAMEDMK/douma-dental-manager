'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, Package } from 'lucide-react'
import { magasinierNavigation } from './Sidebar'

interface MagasinierMobileHeaderProps {
  logoutAction: () => Promise<void>
}

export function MagasinierMobileHeader({ logoutAction }: MagasinierMobileHeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-gray-900 text-white">
        <Link
          href="/magasinier/dashboard"
          className="flex items-center gap-2 font-bold"
          onClick={() => setMenuOpen(false)}
        >
          <Package className="w-5 h-5 text-blue-400" />
          <span>Magasin</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="p-2.5 rounded-lg text-gray-300 hover:bg-gray-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="md:hidden fixed top-0 right-0 z-50 w-72 h-full bg-gray-900 text-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-800 shrink-0">
              <span className="text-sm font-medium text-gray-300">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2.5 rounded-lg text-gray-300 hover:bg-gray-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
              {magasinierNavigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[48px] ${
                      isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t border-gray-800 shrink-0">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 min-h-[48px]"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
