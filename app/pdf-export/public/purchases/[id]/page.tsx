import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PurchaseOrderPdfDocument } from '@/app/components/purchase-order-pdf'
import { getPurchaseOrderPdfData } from '@/app/lib/purchase-order-pdf-data'
import { resolvePublicPurchaseOrderAccess } from '@/app/lib/purchase-order-public-request'

export const dynamic = 'force-dynamic'

/** Page HTML pour PDFShift — bon de commande via lien signé (?t=). */
export default async function PdfExportPublicPurchaseOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams

  const access = await resolvePublicPurchaseOrderAccess(id, t)
  if (!access.ok) {
    notFound()
  }

  const purchaseOrder = await getPurchaseOrderPdfData(access.purchaseOrderId)
  if (!purchaseOrder) notFound()

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  })

  return (
    <PurchaseOrderPdfDocument
      purchaseOrder={purchaseOrder}
      companySettings={companySettings}
    />
  )
}
