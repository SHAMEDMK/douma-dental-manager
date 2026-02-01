import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { logUnauthorizedAccess } from '@/lib/audit-security'

export async function POST(request: NextRequest) {
  // Rate limiting for uploads
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 10,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Check authentication
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      // Log unauthorized access
      await logUnauthorizedAccess(
        '/api/upload/company-logo',
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

    // Validate file size (max 2MB for logos)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Fichier trop volumineux. Taille maximale: 2MB' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'company')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate filename (always use .webp for optimized images)
    const filename = `logo.webp`
    const filepath = join(uploadsDir, filename)

    // Process and compress image with Sharp
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    try {
      // Resize to max 500x500px (logo size) and convert to WebP with 90% quality
      const processedBuffer = await sharp(buffer)
        .resize(500, 500, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 90 })
        .toBuffer()

      // Save compressed file
      await writeFile(filepath, processedBuffer)

      // Update CompanySettings with logo URL
      const logoUrl = `/uploads/company/${filename}`
      await prisma.companySettings.update({
        where: { id: 'default' },
        data: { logoUrl },
      })

      // Return the public URL
      return NextResponse.json({ url: logoUrl })
    } catch (sharpError: any) {
      // Fallback: if Sharp fails, save original file
      console.warn('Sharp processing failed, saving original:', sharpError)
      const fallbackFilename = `logo.${file.name.split('.').pop()}`
      const fallbackFilepath = join(uploadsDir, fallbackFilename)
      await writeFile(fallbackFilepath, buffer)
      
      const logoUrl = `/uploads/company/${fallbackFilename}`
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
