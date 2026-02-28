import { NextResponse } from 'next/server'

/**
 * Maximum rows allowed for admin Excel exports (optional env EXPORT_MAX_ROWS).
 * If not set, no limit is applied (backward compatible).
 */
export function getExportMaxRows(): number | undefined {
  const raw = process.env.EXPORT_MAX_ROWS
  if (raw == null || raw === '') return undefined
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return undefined
  return n
}

/**
 * Returns a 413 response if count > max (export too large).
 * Use after auth, before loading full dataset.
 */
export function rejectExportTooLarge(
  count: number,
  max: number,
  exportLabel: string
): NextResponse | null {
  if (count <= max) return null
  return NextResponse.json(
    {
      error: `Export refusé : trop de lignes (${count} > ${max}). Réduisez la période ou contactez l'administrateur.`,
      count,
      max,
    },
    { status: 413 }
  )
}
