'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  LogOut
} from 'lucide-react'

interface SidebarProps {
  logoutAction: () => Promise<void>
}

export const comptableNavigation = [
  { name: 'Tableau de bord', href: '/comptable/dashboard', icon: LayoutDashboard },
  { name: 'Factures', href: '/comptable/invoices', icon: FileText },
  { name: 'Paiements', href: '/comptable/payments', icon: CreditCard },
]

export function ComptableSidebar({ logoutAction }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Logo/Header */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Comptabilité</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {comptableNavigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
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
