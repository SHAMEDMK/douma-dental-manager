import { getSession } from '@/lib/auth'
import { logout } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/admin/Sidebar'
import { AdminMobileHeader } from '@/components/admin/AdminMobileHeader'
import ToasterProvider from '@/app/components/ToasterProvider'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  // ADMIN and COMMERCIAL can access admin routes (COMMERCIAL has restricted menu)
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')) {
    if (session?.role === 'COMPTABLE') {
      redirect('/comptable/dashboard')
    }
    if (session?.role === 'MAGASINIER') {
      redirect('/magasinier/dashboard')
    }
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
        <AdminMobileHeader logoutAction={handleLogout} role={session.role} />
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 print:hidden">
          <Sidebar logoutAction={handleLogout} role={session.role} />
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
