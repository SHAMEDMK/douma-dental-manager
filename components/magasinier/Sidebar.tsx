'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package,
  History,
  LogOut
} from 'lucide-react'

interface SidebarProps {
  logoutAction: () => Promise<void>
}

export const magasinierNavigation = [
  { name: 'Tableau de bord', href: '/magasinier/dashboard', icon: LayoutDashboard },
  { name: 'Commandes à préparer', href: '/magasinier/orders', icon: ShoppingCart },
  { name: 'Stock', href: '/magasinier/stock', icon: Package },
  { name: 'Mouvements', href: '/magasinier/stock/movements', icon: History },
]

export function MagasinierSidebar({ logoutAction }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Logo/Header */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Magasin</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {magasinierNavigation.map((item) => {
          // Only highlight exact matches to avoid parent/child conflicts
          // For example: '/magasinier/stock' should not be active when on '/magasinier/stock/movements'
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-800">
        <button
          onClick={logoutAction}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}
