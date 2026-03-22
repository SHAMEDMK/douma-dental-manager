'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { getAdminNavigation } from './Sidebar'

interface AdminMobileHeaderProps {
  logoutAction: () => Promise<void>
  role?: string | null
}

export function AdminMobileHeader({ logoutAction, role }: AdminMobileHeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const adminNavigation = getAdminNavigation(role)

  useEffect(() => {
    if (!menuOpen) return
    queueMicrotask(() => setMenuOpen(false))
  }, [pathname, menuOpen])

  return (
    <>
      <header className="md:hidden print:hidden sticky top-0 z-40 flex items-center justify-between min-h-[3.5rem] h-14 px-4 py-2 bg-white border-b border-gray-200 safe-area-top">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 text-blue-900 font-bold"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold ${
              role === 'COMMERCIAL' ? 'bg-blue-600' : role === 'MAGASINIER' ? 'bg-purple-700' : 'bg-blue-900'
            }`}
          >
            {role === 'COMMERCIAL' ? 'C' : role === 'MAGASINIER' ? 'M' : 'D'}
          </div>
          <span>
            {role === 'COMMERCIAL'
              ? 'Espace Commercial'
              : role === 'MAGASINIER'
                ? 'Espace Magasin'
                : (
                    <>
                      DOUMA<span className="text-blue-500">Admin</span>
                    </>
                  )}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {menuOpen && (
        <>
          <div
            className="md:hidden print:hidden fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="md:hidden print:hidden fixed top-0 right-0 z-50 w-[min(20rem,100vw)] max-w-full h-[100dvh] bg-white shadow-xl flex flex-col safe-area-top safe-area-bottom">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 shrink-0">
              <span className="text-sm font-medium text-gray-700">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 min-h-[2.75rem] rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t border-gray-200 bg-white shrink-0">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-3 py-3 min-h-[2.75rem] text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 active:bg-red-100"
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
