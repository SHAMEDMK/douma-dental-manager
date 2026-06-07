import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PurchaseOrderPdfDocument } from '@/app/components/purchase-order-pdf'
import { getPurchaseOrderPdfData } from '@/app/lib/purchase-order-pdf-data'
import { resolvePublicPurchaseOrderAccess } from '@/app/lib/purchase-order-public-request'

export const dynamic = 'force-dynamic'

/** Page HTML pour PDFShift — bon de commande via lien signé dans le chemin. */
export default async function PdfExportPublicPurchaseOrderTokenPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>
}) {
  const { id, token } = await params

  const access = await resolvePublicPurchaseOrderAccess(id, token)
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
