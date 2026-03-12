/**
 * Upload helper: uses Vercel Blob in production (when BLOB_READ_WRITE_TOKEN is set),
 * filesystem locally.
 */
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN
const isVercel = !!process.env.VERCEL

export async function uploadImage(
  buffer: Buffer,
  pathPrefix: string,
  filename: string,
  options?: { contentType?: string }
): Promise<string> {
  if (useBlob) {
    const blob = await put(`${pathPrefix}/${filename}`, buffer, {
      access: 'public',
      contentType: options?.contentType ?? 'image/webp',
    })
    return blob.url
  }

  if (isVercel) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN manquant. Sur Vercel, créez un Blob Store (Storage) et ajoutez le token aux variables d\'environnement.'
    )
  }

  // Local: filesystem
  const uploadsDir = join(process.cwd(), 'public', 'uploads', pathPrefix)
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }
  const filepath = join(uploadsDir, filename)
  await writeFile(filepath, buffer)
  return `/uploads/${pathPrefix}/${filename}`
}
