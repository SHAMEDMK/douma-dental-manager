import { redirect, notFound } from 'next/navigation'
import { normalizeShareTokenInput } from '@/app/lib/purchase-order-share-token'

export const dynamic = 'force-dynamic'

/** Ancien format ?t= pour PDFShift — redirige vers le chemin avec jeton. */
export default async function PdfExportPublicPurchaseOrderLegacyPage({
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
  redirect(`/pdf-export/public/purchases/${id}/${token}`)
}
