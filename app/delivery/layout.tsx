import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { logout } from '@/lib/auth'
import ToasterProvider from '@/app/components/ToasterProvider'
import { prisma } from '@/lib/prisma'

export default async function DeliveryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  
  // Only MAGASINIER with userType='LIVREUR' (or null for backward compatibility) and ADMIN can access
  // Magasiniers (userType='MAGASINIER') should use /magasinier interface
  if (!session || (session.role !== 'MAGASINIER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }
  
  // If user is a magasinier (warehouse), redirect to magasinier interface
  if (session.role === 'MAGASINIER' && session.userType === 'MAGASINIER') {
    redirect('/magasinier/dashboard')
  }

  // Count orders for this delivery agent
  // Priority: Use deliveryAgentId (most reliable), fallback to deliveryAgentName matching
  const matchConditions: any[] = []
  
  // First, try to match by deliveryAgentId (most reliable)
  matchConditions.push({ deliveryAgentId: session.id })
  
  // Fallback: Also match by name or email for backward compatibility
  // Note: SQLite doesn't support case-insensitive LIKE easily, so we'll match exact and also try common variations
  const userName = (session.name || session.email || '').trim()
  const userEmail = (session.email || '').trim()
  
  if (userName) {
    // Try exact match
    matchConditions.push({ deliveryAgentName: userName })
    // Try uppercase version (for "ALI BOB" vs "Ali bob")
    matchConditions.push({ deliveryAgentName: userName.toUpperCase() })
    // Try lowercase version
    matchConditions.push({ deliveryAgentName: userName.toLowerCase() })
    // Try capitalized version (first letter uppercase)
    matchConditions.push({ deliveryAgentName: userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase() })
  }
  
  if (userEmail && userEmail !== userName) {
    matchConditions.push({ deliveryAgentName: userEmail })
  }
  
  // Also try to find the user in the database to get exact name/email
  // This helps if the session name/email doesn't match exactly what was stored
  let exactUserName: string | null = null
  let exactUserEmail: string | null = null
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true, email: true }
    })
    if (currentUser) {
      exactUserName = currentUser.name.trim()
      exactUserEmail = currentUser.email.trim()
      
      // Add exact matches from database (with case variations)
      if (exactUserName) {
        if (!matchConditions.some(c => c.deliveryAgentName === exactUserName)) {
          matchConditions.push({ deliveryAgentName: exactUserName })
        }
        // Add case variations
        matchConditions.push({ deliveryAgentName: exactUserName.toUpperCase() })
        matchConditions.push({ deliveryAgentName: exactUserName.toLowerCase() })
      }
      if (exactUserEmail && exactUserEmail !== exactUserName && !matchConditions.some(c => c.deliveryAgentName === exactUserEmail)) {
        matchConditions.push({ deliveryAgentName: exactUserEmail })
      }
    }
  } catch (error) {
    console.error('Error fetching user for delivery matching:', error)
  }
  
  // Remove duplicates (same deliveryAgentName)
  const uniqueConditions = matchConditions.filter((condition, index, self) => 
    index === self.findIndex(c => JSON.stringify(c) === JSON.stringify(condition))
  )
  
  const ordersCount = await prisma.order.count({
    where: {
      status: 'SHIPPED',
      OR: uniqueConditions,
    }
  })

  async function handleLogout() {
    'use server'
    await logout()
    redirect('/login')
  }

  return (
    <>
      <ToasterProvider />
      <div className="min-h-screen bg-gray-100">
        {/* Header - compact and mobile-friendly */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-lg shrink-0" aria-hidden>
                L
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">Espace Livreur</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Tournée de livraison</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {ordersCount > 0 && (
                <div className="flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-2 shadow-sm">
                  <span className="text-sm font-bold tabular-nums">{ordersCount}</span>
                  <span className="text-xs font-medium hidden sm:inline">à livrer</span>
                </div>
              )}
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none" title={session.name || session.email}>
                {session.name || session.email}
              </span>
              <form action={handleLogout}>
                <button
                  type="submit"
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 border border-gray-200"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="pb-8">{children}</main>
      </div>
    </>
  )
}
