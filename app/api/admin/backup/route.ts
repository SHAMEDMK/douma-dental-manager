import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit-middleware'
import { requireAdminAuth } from '@/lib/api-guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/backup
 * List all backups OR download a specific backup
 * 
 * Query params:
 *   - download=true&filename=... : Download a specific backup file
 *   - (no params) : List all backups
 */
export async function GET(request: NextRequest) {
  // Check if this is a download request
  const searchParams = request.nextUrl.searchParams
  const filename = searchParams.get('filename')
  const download = searchParams.get('download') === 'true'

  // Handle download request
  if (download && filename) {
    // Rate limiting
    const rateLimitResponse = await withRateLimit(request, {
      maxRequests: 10,
      windowMs: 60 * 1000 // 1 minute
    })
    if (rateLimitResponse) return rateLimitResponse

    // Security guard: require ADMIN only
    const authResponse = await requireAdminAuth(request, ['ADMIN'])
    if (authResponse) return authResponse

    try {
      // Security: prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 })
      }

      const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
      const filePath = path.join(BACKUP_DIR, filename)

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Backup introuvable' }, { status: 404 })
      }

      // Read file and return as download
      const fileBuffer = fs.readFileSync(filePath)
      const stats = fs.statSync(filePath)

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': stats.size.toString(),
        },
      })
    } catch (error: any) {
      console.error('Error downloading backup:', error)
      return NextResponse.json({ error: error.message || 'Erreur lors du téléchargement' }, { status: 500 })
    }
  }

  // Handle list backups request (default)
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 20,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  // Security guard: require ADMIN only (very sensitive)
  const authResponse = await requireAdminAuth(request, ['ADMIN'])
  if (authResponse) return authResponse

  try {
    const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')

    if (!fs.existsSync(BACKUP_DIR)) {
      return NextResponse.json({ backups: [], total: 0, totalSize: 0 })
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(filename => !filename.endsWith('.json')) // Exclude metadata.json
      .map(filename => {
        const filePath = path.join(BACKUP_DIR, filename)
        const stats = fs.statSync(filePath)
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          type: filename.includes('postgres') || filename.includes('pg') ? 'PostgreSQL' : 'SQLite',
          isManual: filename.startsWith('manual'),
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const totalSize = files.reduce((sum, f) => sum + f.size, 0)

    return NextResponse.json({
      backups: files,
      total: files.length,
      totalSize,
    })
  } catch (error: any) {
    console.error('Error listing backups:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de la récupération des backups' }, { status: 500 })
  }
}

/**
 * POST /api/admin/backup
 * Create a manual backup
 */
export async function POST(request: NextRequest) {
  // Rate limiting (stricter for backup creation - heavy operation)
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000 // 1 hour
  })
  if (rateLimitResponse) return rateLimitResponse

  // Security guard: require ADMIN only (very sensitive)
  const authResponse = await requireAdminAuth(request, ['ADMIN'])
  if (authResponse) return authResponse

  try {

    // Run backup script
    const scriptPath = path.join(process.cwd(), 'scripts', 'backup-db.js')
    
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ error: 'Script de backup introuvable' }, { status: 500 })
    }

    try {
      const output = execSync(`node "${scriptPath}" --manual`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
        env: process.env,
      })

      // Parse output to extract backup filename
      const filenameMatch = output.match(/✅ .* backup created: (.+)/)
      const filename = filenameMatch ? filenameMatch[1] : null

      return NextResponse.json({
        success: true,
        message: 'Backup créé avec succès',
        filename,
        output: output.split('\n').filter(line => line.trim()),
      })
    } catch (execError: any) {
      console.error('Backup script error:', execError)
      return NextResponse.json({
        error: 'Erreur lors de la création du backup',
        details: execError.message,
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Error creating backup:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de la création du backup' }, { status: 500 })
  }
}


/**
 * DELETE /api/admin/backup?filename=...
 * Delete a backup
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 10,
    windowMs: 60 * 1000 // 1 minute
  })
  if (rateLimitResponse) return rateLimitResponse

  // Security guard: require ADMIN only (very sensitive)
  const authResponse = await requireAdminAuth(request, ['ADMIN'])
  if (authResponse) return authResponse

  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json({ error: 'Nom de fichier requis' }, { status: 400 })
    }

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 })
    }

    const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
    const filePath = path.join(BACKUP_DIR, filename)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Backup introuvable' }, { status: 404 })
    }

    fs.unlinkSync(filePath)

    return NextResponse.json({
      success: true,
      message: 'Backup supprimé avec succès',
    })
  } catch (error: any) {
    console.error('Error deleting backup:', error)
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression du backup' }, { status: 500 })
  }
}
