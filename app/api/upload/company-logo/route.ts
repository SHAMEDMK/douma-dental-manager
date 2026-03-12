import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getSession } from '@/lib/auth'
import { AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE } from '@/lib/auth-errors'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { logUnauthorizedAccess } from '@/lib/audit-security'
import { uploadImage } from '@/lib/upload'

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 10,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      await logUnauthorizedAccess(
        '/api/upload/company-logo',
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

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Fichier trop volumineux. Taille maximale: 2MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const timestamp = Date.now()

    try {
      const processedBuffer = await sharp(buffer)
        .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer()

      const filename = `logo-${timestamp}.webp`
      const logoUrl = await uploadImage(processedBuffer, 'company', filename)
      await prisma.companySettings.update({
        where: { id: 'default' },
        data: { logoUrl },
      })
      return NextResponse.json({ url: logoUrl })
    } catch (sharpError: any) {
      console.warn('Sharp processing failed, saving original:', sharpError)
      const ext = file.name.split('.').pop() || 'jpg'
      const fallbackFilename = `logo-${timestamp}.${ext}`
      const logoUrl = await uploadImage(buffer, 'company', fallbackFilename, {
        contentType: file.type,
      })
      await prisma.companySettings.update({
        where: { id: 'default' },
        data: { logoUrl },
      })
      return NextResponse.json({ url: logoUrl })
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'upload' }, { status: 500 })
  }
}
