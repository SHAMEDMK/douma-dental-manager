import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { PurchaseOrderPdfDocument } from '@/app/components/purchase-order-pdf'
import { getPurchaseOrderPdfData } from '@/app/lib/purchase-order-pdf-data'

export const dynamic = 'force-dynamic'

/** Page dédiée à l'export PDF (PDFShift) — bon de commande fournisseur. */
export default async function PdfExportAdminPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login?role=admin')
  if (
    session.role !== 'ADMIN' &&
    session.role !== 'COMMERCIAL' &&
    session.role !== 'MAGASINIER'
  ) {
    notFound()
  }

  const { id } = await params
  const purchaseOrder = await getPurchaseOrderPdfData(id)
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
