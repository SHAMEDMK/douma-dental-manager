/**
 * Centralized access to AdminSettings and CompanySettings.
 * Use these helpers to:
 * 1. Fetch both in one round-trip with getSettingsForOrders()
 * 2. Optionally cache (Next.js unstable_cache) for rarely-changing data
 */
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

const CACHE_SECONDS = 60 // 1 minute - settings change rarely

export type AdminSettingsRow = Awaited<ReturnType<typeof getAdminSettings>>
export type CompanySettingsRow = Awaited<ReturnType<typeof getCompanySettings>>

/** AdminSettings id is always 'default'. Cached for 1 minute. */
export async function getAdminSettings() {
  return unstable_cache(
    async () => {
      return prisma.adminSettings.findUnique({
        where: { id: 'default' },
        select: { id: true, approvalMessage: true },
      })
    },
    ['admin-settings-default'],
    { revalidate: CACHE_SECONDS }
  )()
}

/** CompanySettings id is always 'default'. Cached for 1 minute. */
export async function getCompanySettings() {
  return unstable_cache(
    async () => {
      return prisma.companySettings.findUnique({
        where: { id: 'default' },
        select: { id: true, vatRate: true },
      })
    },
    ['company-settings-default'],
    { revalidate: CACHE_SECONDS }
  )()
}

/**
 * Fetch both AdminSettings and CompanySettings in one round-trip (parallel).
 * Use on pages that need approvalMessage + vatRate (orders, invoices).
 */
export async function getSettingsForOrders(): Promise<{
  approvalMessage: string
  vatRate: number
}> {
  const [admin, company] = await Promise.all([
    getAdminSettings(),
    getCompanySettings(),
  ])
  return {
    approvalMessage: admin?.approvalMessage ?? 'À valider (marge négative)',
    vatRate: company?.vatRate ?? 0.2,
  }
}

/**
 * Fetch only company settings (vatRate). Use when you don't need admin approval message.
 */
export async function getVatRate(): Promise<number> {
  const company = await getCompanySettings()
  return company?.vatRate ?? 0.2
}
