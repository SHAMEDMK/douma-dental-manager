import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'
import { getSession } from '@/lib/auth'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { logUnauthorizedAccess } from '@/lib/audit-security'

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
      // Log unauthorized access
      await logUnauthorizedAccess(
        '/api/upload/product-image',
        'Non autorisé - rôle requis: ADMIN',
        request.headers,
        session
      )
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé. Utilisez JPEG, PNG, GIF ou WebP' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Fichier trop volumineux. Taille maximale: 5MB' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'products')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename (always use .webp for optimized images)
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const filename = `${timestamp}-${randomString}.webp`
    const filepath = join(uploadsDir, filename)

    // Process and compress image with Sharp
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    try {
      // Resize if needed (max 1920x1920) and convert to WebP with 85% quality
      const processedBuffer = await sharp(buffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer()

      // Save compressed file
      await writeFile(filepath, processedBuffer)

      // Return the public URL
      const publicUrl = `/uploads/products/${filename}`
      return NextResponse.json({ url: publicUrl })
    } catch (sharpError: any) {
      // Fallback: if Sharp fails, save original file
      console.warn('Sharp processing failed, saving original:', sharpError)
      const fallbackFilename = `${timestamp}-${randomString}.${file.name.split('.').pop()}`
      const fallbackFilepath = join(uploadsDir, fallbackFilename)
      await writeFile(fallbackFilepath, buffer)
      return NextResponse.json({ url: `/uploads/products/${fallbackFilename}` })
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'upload' }, { status: 500 })
  }
}
