import { logout, getSession, type SessionPayload } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import PortalProviders from './PortalProviders'
import PortalNav from './PortalNav'

/**
 * Même logique que le post-login dans app/api/auth/callback/route.ts
 * pour renvoyer les comptes internes hors du portail client.
 */
function redirectPathForNonClientSession(session: SessionPayload): string {
  if (session.role === 'ADMIN' || session.role === 'COMMERCIAL') {
    return '/admin'
  }
  if (session.role === 'COMPTABLE') {
    return '/comptable/dashboard'
  }
  if (session.role === 'MAGASINIER') {
    return session.userType === 'MAGASINIER' ? '/magasinier/dashboard' : '/delivery'
  }
  return '/login'
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const isPdfExport = headersList.get('x-pdf-export') === '1'
  if (isPdfExport) {
    return <>{children}</>
  }

  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.role !== 'CLIENT') {
    redirect(redirectPathForNonClientSession(session))
  }

  async function handleLogout() {
    'use server'
    await logout()
    redirect('/login')
  }

  return (
    <PortalProviders>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PortalNav sessionName={session.name} logoutAction={handleLogout} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-8 print:p-0 print:pt-0 print:pb-0 print:max-w-full print:mx-0 min-w-0">
          {children}
        </main>
      </div>
    </PortalProviders>
  )
}
