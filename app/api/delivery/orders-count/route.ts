import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit-middleware'
import { logUnauthorizedAccess } from '@/lib/audit-security'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Rate limiting (more lenient for polling)
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 60,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getSession()
    if (!session || (session.role !== 'MAGASINIER' && session.role !== 'ADMIN')) {
      // Log unauthorized access
      await logUnauthorizedAccess(
        '/api/delivery/orders-count',
        `Non autorisé - rôle requis: MAGASINIER ou ADMIN (actuel: ${session?.role || 'none'})`,
        request.headers,
        session
      )
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    let body: { userName?: string } = {}
    try {
      const raw = await request.text()
      if (raw?.trim()) body = JSON.parse(raw)
    } catch {
      // Empty or invalid JSON body - use empty object
    }
    const userName = (body.userName || session.name || session.email || '').trim()
    const userEmail = (session.email || '').trim()
    
    // Build match conditions: priority to deliveryAgentId (most reliable), fallback to deliveryAgentName
    const matchConditions: any[] = []
    
    // First, try to match by deliveryAgentId (most reliable)
    matchConditions.push({ deliveryAgentId: session.id })
    
    // Fallback: Also match by name or email for backward compatibility
    if (userName) {
      matchConditions.push({ deliveryAgentName: userName })
    }
    if (userEmail && userEmail !== userName) {
      matchConditions.push({ deliveryAgentName: userEmail })
    }
    
    // Also try to find the user in the database to get exact name/email
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
        
        // Add exact matches from database
        if (exactUserName && !matchConditions.some(c => c.deliveryAgentName === exactUserName)) {
          matchConditions.push({ deliveryAgentName: exactUserName })
        }
        if (exactUserEmail && exactUserEmail !== exactUserName && !matchConditions.some(c => c.deliveryAgentName === exactUserEmail)) {
          matchConditions.push({ deliveryAgentName: exactUserEmail })
        }
      }
    } catch (error) {
      console.error('Error fetching user for delivery matching:', error)
    }

    // Count SHIPPED orders assigned to this agent
    // Priority: Use deliveryAgentId (most reliable), fallback to deliveryAgentName matching
    const count = await prisma.order.count({
      where: {
        status: 'SHIPPED',
        OR: matchConditions,
      }
    })

    return NextResponse.json({ count })
  } catch (error: any) {
    console.error('Error counting delivery orders:', error)
    return NextResponse.json(
      { error: 'Erreur lors du comptage des commandes' },
      { status: 500 }
    )
  }
}
