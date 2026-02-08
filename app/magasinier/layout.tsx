import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { logout } from '@/lib/auth'
import { MagasinierSidebar } from '@/components/magasinier/Sidebar'
import { MagasinierMobileHeader } from '@/components/magasinier/MagasinierMobileHeader'
import ToasterProvider from '@/app/components/ToasterProvider'

export default async function MagasinierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  // MAGASINIER (userType='MAGASINIER') or ADMIN can access
  if (!session) redirect('/login')
  if (session.role === 'MAGASINIER' && session.userType === 'LIVREUR') {
    redirect('/delivery')
  }
  if (session.role !== 'MAGASINIER' && session.role !== 'ADMIN') {
    redirect('/login')
  }
  if (session.role === 'MAGASINIER' && session.userType !== 'MAGASINIER') {
    redirect('/login')
  }

  async function handleLogout() {
    'use server'
    await logout()
    redirect('/login')
  }

  return (
    <>
      <ToasterProvider />
      <div className="flex min-h-screen bg-gray-50">
        <MagasinierMobileHeader logoutAction={handleLogout} />
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 print:hidden">
          <MagasinierSidebar logoutAction={handleLogout} />
        </div>
        <div className="md:pl-64 flex flex-col flex-1 print:pl-0 w-full">
          <main className="flex-1 py-4 sm:py-8 px-3 sm:px-6 print:p-0">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
