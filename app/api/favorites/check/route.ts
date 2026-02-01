import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/rate-limit-middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/favorites/check?productId=...
 * Check if a product is favorited by the current user
 */
export async function GET(request: NextRequest) {
  // Rate limiting (more lenient for checks)
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 100,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ isFavorite: false })
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ isFavorite: false })
    }

    const favorite = await prisma.favoriteProduct.findUnique({
      where: {
        userId_productId: {
          userId: session.id,
          productId: productId,
        },
      },
    })

    return NextResponse.json({ isFavorite: !!favorite })
  } catch (error: any) {
    console.error('Error checking favorite:', error)
    return NextResponse.json({ isFavorite: false })
  }
}
