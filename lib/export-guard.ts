import { NextResponse } from 'next/server'
import { EXPORT_MAX_ROWS } from '@/lib/config'

/**
 * Maximum rows allowed for admin Excel exports.
 * Default: EXPORT_MAX_ROWS (20000). Overridable via env EXPORT_MAX_ROWS.
 */
export function getExportMaxRows(): number {
  const raw = process.env.EXPORT_MAX_ROWS
  if (raw != null && raw !== '') {
    const n = parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 1) return n
  }
  return EXPORT_MAX_ROWS
}

/** Message affiché lorsque l'export dépasse la limite. */
export const EXPORT_TOO_LARGE_MESSAGE = 'Export trop volumineux. Veuillez affiner les filtres.'

/**
 * Returns a 413 response if count > max (export too large).
 * Use after auth, before loading full dataset.
 */
export function rejectExportTooLarge(
  count: number,
  max: number,
  _exportLabel: string
): NextResponse | null {
  if (count <= max) return null
  return NextResponse.json(
    {
      error: EXPORT_TOO_LARGE_MESSAGE,
      count,
      max,
    },
    { status: 413 }
  )
}
