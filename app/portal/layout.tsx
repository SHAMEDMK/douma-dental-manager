import { logout, getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

import PortalProviders from './PortalProviders'
import PortalNav from './PortalNav'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  async function handleLogout() {
    'use server'
    await logout()
    redirect('/login')
  }

  return (
    <PortalProviders>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PortalNav sessionName={session?.name ?? null} logoutAction={handleLogout} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-8 print:p-0 print:pt-0 print:pb-0 print:max-w-full print:mx-0">
          {children}
        </main>
      </div>
    </PortalProviders>
  )
}
