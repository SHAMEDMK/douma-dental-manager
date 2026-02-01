import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { logUnauthorizedAccess } from '@/lib/audit-security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 30,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getSession()
    // Allow ADMIN and MAGASINIER to access (magasinier needs to assign orders to livreurs)
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MAGASINIER')) {
      // Log unauthorized access
      await logUnauthorizedAccess(
        '/api/delivery/agents',
        `Non autorisé - rôle requis: ADMIN ou MAGASINIER (actuel: ${session?.role || 'none'})`,
        request.headers,
        session
      )
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Get only delivery agents (LIVREUR), not magasiniers
    // userType='LIVREUR' or null (for backward compatibility) = livreur
    // userType='MAGASINIER' = magasinier (should not appear in delivery agents list)
    const agents = await prisma.user.findMany({
      where: { 
        role: 'MAGASINIER',
        OR: [
          { userType: 'LIVREUR' },
          { userType: null } // Backward compatibility: null = livreur
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ agents })
  } catch (error: any) {
    console.error('Error fetching delivery agents:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des livreurs' },
      { status: 500 }
    )
  }
}
