import { logout, getSession } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'

import PortalProviders from './PortalProviders'
import CartBadge from './CartBadge'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <PortalProviders>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/portal" className="font-bold text-xl text-blue-900">
                  Douma Dental
                </Link>
                <div className="ml-10 flex items-baseline space-x-8">
                  <Link href="/portal" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                    Catalogue
                  </Link>
                  <Link href="/portal/orders" className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                    Mes Commandes
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">Bonjour, {session?.name}</span>
                
                <Link href="/portal/cart" className="relative p-2 text-gray-600 hover:text-blue-600">
                  <ShoppingCart className="h-6 w-6" />
                  <CartBadge />
                </Link>

                <form
                  action={async () => {
                    'use server'
                    await logout()
                    redirect('/login')
                  }}
                >
                  <button type="submit" className="text-sm text-red-600 hover:text-red-800">
                    Déconnexion
                  </button>
                </form>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          {children}
        </main>
      </div>
    </PortalProviders>
  )
}
