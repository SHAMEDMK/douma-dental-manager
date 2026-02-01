import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { logout } from '@/lib/auth'
import { ComptableSidebar } from '@/components/comptable/Sidebar'
import { ComptableMobileHeader } from '@/components/comptable/ComptableMobileHeader'
import ToasterProvider from '@/app/components/ToasterProvider'

export default async function ComptableLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  // Only COMPTABLE role can access
  if (!session || session.role !== 'COMPTABLE') {
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
        <ComptableMobileHeader logoutAction={handleLogout} />
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 print:hidden">
          <ComptableSidebar logoutAction={handleLogout} />
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
