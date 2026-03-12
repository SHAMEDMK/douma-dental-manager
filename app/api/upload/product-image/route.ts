import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getSession } from '@/lib/auth'
import { AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE } from '@/lib/auth-errors'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { logUnauthorizedAccess } from '@/lib/audit-security'
import { uploadImage } from '@/lib/upload'

export async function POST(request: NextRequest) {
  // Rate limiting for uploads
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 20,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Check authentication
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      await logUnauthorizedAccess(
        '/api/upload/product-image',
        'Non autorisé - rôle requis: ADMIN',
        request.headers,
        session
      )
      return NextResponse.json({ error: AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé. Utilisez JPEG, PNG, GIF ou WebP' }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Fichier trop volumineux. Taille maximale: 5MB' }, { status: 400 })
    }

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    try {
      const processedBuffer = await sharp(buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()

      const filename = `${timestamp}-${randomString}.webp`
      const publicUrl = await uploadImage(processedBuffer, 'products', filename)
      return NextResponse.json({ url: publicUrl })
    } catch (sharpError: any) {
      console.warn('Sharp processing failed, saving original:', sharpError)
      const ext = file.name.split('.').pop() || 'jpg'
      const fallbackFilename = `${timestamp}-${randomString}.${ext}`
      const publicUrl = await uploadImage(buffer, 'products', fallbackFilename, {
        contentType: file.type,
      })
      return NextResponse.json({ url: publicUrl })
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'upload' }, { status: 500 })
  }
}
