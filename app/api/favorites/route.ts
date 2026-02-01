import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { logUnauthorizedAccess } from '@/lib/audit-security'

export const dynamic = 'force-dynamic'

/**
 * GET /api/favorites
 * Get user's favorite products
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 60,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getSession()
    if (!session) {
      // Log unauthorized access
      await logUnauthorizedAccess(
        '/api/favorites',
        'Non authentifié',
        request.headers,
        null
      )
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const favorites = await prisma.favoriteProduct.findMany({
      where: { userId: session.id },
      include: {
        product: {
          include: {
            segmentPrices: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ favorites })
  } catch (error: any) {
    console.error('Error fetching favorites:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de la récupération des favoris' }, { status: 500 })
  }
}

/**
 * POST /api/favorites
 * Add a product to favorites
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 30,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getSession()
    if (!session) {
      // Log unauthorized access
      await logUnauthorizedAccess(
        '/api/favorites',
        'Non authentifié',
        request.headers,
        null
      )
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: 'ID produit requis' }, { status: 400 })
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    // Check if already favorited
    const existing = await prisma.favoriteProduct.findUnique({
      where: {
        userId_productId: {
          userId: session.id,
          productId: productId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Produit déjà dans les favoris' }, { status: 400 })
    }

    // Add to favorites
    const favorite = await prisma.favoriteProduct.create({
      data: {
        userId: session.id,
        productId: productId,
      },
      include: {
        product: {
          include: {
            segmentPrices: true,
          },
        },
      },
    })

    return NextResponse.json({ favorite, message: 'Produit ajouté aux favoris' })
  } catch (error: any) {
    console.error('Error adding favorite:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Produit déjà dans les favoris' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'ajout aux favoris' }, { status: 500 })
  }
}

/**
 * DELETE /api/favorites?productId=...
 * Remove a product from favorites
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 30,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getSession()
    if (!session) {
      // Log unauthorized access
      await logUnauthorizedAccess(
        '/api/favorites',
        'Non authentifié',
        request.headers,
        null
      )
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'ID produit requis' }, { status: 400 })
    }

    // Remove from favorites
    await prisma.favoriteProduct.delete({
      where: {
        userId_productId: {
          userId: session.id,
          productId: productId,
        },
      },
    })

    return NextResponse.json({ message: 'Produit retiré des favoris' })
  } catch (error: any) {
    console.error('Error removing favorite:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Produit non trouvé dans les favoris' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression des favoris' }, { status: 500 })
  }
}
