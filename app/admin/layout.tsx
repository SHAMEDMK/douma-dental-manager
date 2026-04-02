import { getSession } from '@/lib/auth'
import { logout } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Sidebar } from '@/components/admin/Sidebar'
import { AdminMobileHeader } from '@/components/admin/AdminMobileHeader'
import ToasterProvider from '@/app/components/ToasterProvider'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const headersList = await headers()
  const invokePath = headersList.get('x-invoke-path') ?? ''
  const isComptableInvoicePrint =
    /^\/admin\/invoices\/[^/]+\/print\/?$/.test(invokePath)

  // Comptable : espace dédié /comptable, sauf aperçu imprimable facture (liens partagés / PDF / favoris).
  if (session.role === 'COMPTABLE' && !isComptableInvoicePrint) {
    redirect('/comptable/dashboard')
  }

  if (session.role === 'MAGASINIER') {
    if (session.userType === 'LIVREUR') {
      redirect('/delivery')
    }
    if (session.userType !== 'MAGASINIER') {
      redirect('/login')
    }
  } else if (
    session.role !== 'ADMIN' &&
    session.role !== 'COMMERCIAL' &&
    session.role !== 'COMPTABLE'
  ) {
    redirect('/login')
  }

  const isPdfExport = headersList.get('x-pdf-export') === '1'
  if (isPdfExport) {
    return <>{children}</>
  }

  async function handleLogout() {
    'use server'
    await logout()
    redirect('/login')
  }

  return (
    <>
      <ToasterProvider />
      <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
        <AdminMobileHeader logoutAction={handleLogout} role={session.role} />
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 print:hidden">
          <Sidebar logoutAction={handleLogout} role={session.role} />
        </div>
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col md:pl-64 print:pl-0">
          <main className="flex-1 py-4 sm:py-8 px-4 sm:px-6 print:p-0 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
