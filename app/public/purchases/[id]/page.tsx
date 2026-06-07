import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatDateLong } from '@/lib/config'
import { resolvePublicPurchaseOrderAccess } from '@/app/lib/purchase-order-public-request'
import { buildPurchaseOrderPublicPdfApiUrl } from '@/app/lib/purchase-order-share-token'

export const dynamic = 'force-dynamic'

function PublicPoError({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}

export default async function PublicPurchaseOrderPage({
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
    if (access.status === 404) notFound()
    return (
      <PublicPoError
        title="Lien indisponible"
        message={access.message}
      />
    )
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: access.purchaseOrderId },
    select: {
      orderNumber: true,
      createdAt: true,
      supplier: { select: { name: true } },
    },
  })

  if (!po) notFound()

  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { name: true },
  })

  const companyName = companySettings?.name || 'SHAMED'
  const pdfUrl = buildPurchaseOrderPublicPdfApiUrl(access.purchaseOrderId, t!.trim())

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
          {companyName}
        </p>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Bon de commande</h1>
        <p className="text-lg font-mono text-shamed-navy mb-4">{po.orderNumber}</p>
        <p className="text-sm text-gray-600 mb-6">
          Fournisseur : <strong>{po.supplier.name}</strong>
          <br />
          Date : {formatDateLong(po.createdAt)}
        </p>
        <a
          href={pdfUrl}
          className="inline-flex items-center justify-center w-full px-4 py-3 rounded-md text-sm font-medium text-white bg-shamed-navy hover:bg-shamed-navy/90"
        >
          Télécharger le PDF
        </a>
        <p className="text-xs text-gray-400 mt-6">
          Lien sécurisé — valable 90 jours. Ne pas partager en dehors de votre organisation.
        </p>
      </div>
    </div>
  )
}
