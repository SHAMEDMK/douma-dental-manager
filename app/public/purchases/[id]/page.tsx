import { redirect, notFound } from 'next/navigation'
import { normalizeShareTokenInput } from '@/app/lib/purchase-order-share-token'

export const dynamic = 'force-dynamic'

/** Ancien format ?t= — redirige vers /public/purchases/[id]/[token]. */
export default async function PublicPurchaseOrderLegacyQueryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string | string[] }>
}) {
  const { id } = await params
  const { t } = await searchParams
  const token = normalizeShareTokenInput(t)
  if (!token) notFound()
  redirect(`/public/purchases/${id}/${token}`)
}
