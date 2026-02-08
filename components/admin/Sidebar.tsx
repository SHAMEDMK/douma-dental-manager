'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  User,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  LogOut,
  Archive,
  Settings,
  FileSearch,
  HardDrive,
  Truck,
  MessageSquare,
  Mail
} from 'lucide-react'

interface SidebarProps {
  logoutAction: () => Promise<void>
}

interface AlertsData {
  pendingOrders: { count: number }
  unpaidInvoices: { count: number }
  lowStock: { count: number }
  ordersRequiringApproval: { count: number }
  pendingRequests: { count: number }
}

const adminNavigationFull = [
  { name: 'Tableau de bord', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/admin/clients', icon: Users },
  { name: 'Utilisateurs', href: '/admin/users', icon: User },
  { name: 'Livreurs', href: '/admin/delivery-agents', icon: Truck },
  { name: 'Produits', href: '/admin/products', icon: Package },
  { name: 'Commandes', href: '/admin/orders', icon: ShoppingCart, badgeKey: 'pendingOrders' as const },
  { name: 'Stock', href: '/admin/stock', icon: Archive, badgeKey: 'lowStock' as const },
  { name: 'Factures', href: '/admin/invoices', icon: FileText, badgeKey: 'unpaidInvoices' as const },
  { name: 'Paiements', href: '/admin/payments', icon: CreditCard },
  { name: 'Demandes Clients', href: '/admin/requests', icon: MessageSquare, badgeKey: 'pendingRequests' as const },
  { name: 'Logs d\'audit', href: '/admin/audit', icon: FileSearch },
  { name: 'Audit Emails', href: '/admin/audit/emails', icon: Mail },
  { name: 'Backups', href: '/admin/backups', icon: HardDrive },
  { name: 'Paramètres', href: '/admin/settings', icon: Settings },
]

/** Navigation items for COMMERCIAL: dashboard, clients, orders only. */
const COMMERCIAL_HREF_PREFIXES = ['/admin/dashboard', '/admin/clients', '/admin/orders']

export function getAdminNavigation(role?: string | null) {
  if (role === 'COMMERCIAL') {
    return adminNavigationFull.filter((item) =>
      COMMERCIAL_HREF_PREFIXES.some((p) => item.href === p || item.href.startsWith(p + '/'))
    )
  }
  return adminNavigationFull
}

/** @deprecated Use getAdminNavigation(role) for role-aware menu. Kept for backward compatibility. */
export const adminNavigation = adminNavigationFull

interface SidebarPropsWithRole extends SidebarProps {
  role?: string | null
}

export function Sidebar({ logoutAction, role }: SidebarPropsWithRole) {
  const pathname = usePathname()
  const [alerts, setAlerts] = useState<AlertsData | null>(null)
  const adminNavigation = getAdminNavigation(role)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/stats/alerts')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data && !data.error) setAlerts(data)
      })
      .catch(() => { /* erreur réseau : ne pas faire échouer la page */ })
    return () => { cancelled = true }
  }, [])

  const isCommercial = role === 'COMMERCIAL'

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="flex items-center justify-center h-16 border-b border-gray-200 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white font-bold ${isCommercial ? 'bg-blue-600' : 'bg-blue-900'}`}>
            {isCommercial ? 'C' : 'D'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-lg font-bold text-blue-900 leading-tight">
              {isCommercial ? 'Espace Commercial' : <>DOUMA<span className="text-blue-500">Admin</span></>}
            </span>
            {isCommercial && <span className="text-xs text-gray-500">Commandes clients</span>}
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {adminNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                aria-hidden="true"
              />
              <span className="flex-1">{item.name}</span>
              {item.badgeKey && alerts && alerts[item.badgeKey]?.count > 0 && (
                <span className="ml-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
                  {alerts[item.badgeKey].count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-200 p-4">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center px-2 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 group"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-500 group-hover:text-red-600" />
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  )
}
