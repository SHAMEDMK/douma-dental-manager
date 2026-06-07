import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import PrintButton from '@/app/components/PrintButton'
import DownloadPdfButton from '@/app/components/DownloadPdfButton'
import { PurchaseOrderPdfDocument } from '@/app/components/purchase-order-pdf'
import { getPurchaseOrderPdfData } from '@/app/lib/purchase-order-pdf-data'

export const dynamic = 'force-dynamic'

export default async function PurchaseOrderPrintPage({
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
    redirect('/admin')
  }

  const { id } = await params
  const purchaseOrder = await getPurchaseOrderPdfData(id)
  if (!purchaseOrder) notFound()

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Aperçu bon de commande</div>
          <div className="flex gap-2">
            <Link
              href={`/admin/purchases/${id}`}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm"
            >
              Retour
            </Link>
            <PrintButton />
            <DownloadPdfButton url={`/api/pdf/admin/purchases/${id}`} />
          </div>
        </div>
      </div>

      <PurchaseOrderPdfDocument
        purchaseOrder={purchaseOrder}
        companySettings={companySettings}
      />
    </div>
  )
}
