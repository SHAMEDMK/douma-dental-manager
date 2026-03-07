import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/api-guards'

/**
 * POST /api/e2e/admin/set-accounting-locked-until
 * E2E only: set CompanySettings.accountingLockedUntil to the given ISO date.
 * Guard: E2E_SEED === '1' and admin auth. Returns 200 { ok: true } or 4xx.
 */
export async function POST(request: NextRequest) {
  if (process.env.E2E_SEED !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const authResponse = await requireAdminAuth(request, ['ADMIN'])
  if (authResponse) return authResponse

  let body: { lockedUntilIso?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const lockedUntilIso = body?.lockedUntilIso
  if (typeof lockedUntilIso !== 'string' || !lockedUntilIso.trim()) {
    return NextResponse.json({ error: 'lockedUntilIso required' }, { status: 400 })
  }

  const date = new Date(lockedUntilIso.trim())
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid ISO date' }, { status: 400 })
  }

  try {
    await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: { accountingLockedUntil: date },
      create: {
        id: 'default',
        name: 'E2E',
        address: 'E2E',
        city: 'E2E',
        country: 'MA',
        ice: 'E2E',
        vatRate: 0.2,
        accountingLockedUntil: date,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('E2E set-accounting-locked-until:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Update failed' },
      { status: 500 }
    )
  }
}
