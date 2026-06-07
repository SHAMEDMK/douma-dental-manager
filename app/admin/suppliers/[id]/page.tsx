import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/config'
import EditSupplierForm from './EditSupplierForm'

const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PARTIALLY_RECEIVED: 'Part. réceptionnée',
  RECEIVED: 'Réceptionnée',
  CANCELLED: 'Annulée',
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')) {
    redirect('/admin')
  }

  const isAdmin = session.role === 'ADMIN'

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      contact: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      ice: true,
      notes: true,
      isActive: true,
      createdAt: true,
      _count: { select: { purchaseOrders: true } },
      purchaseOrders: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
        },
      },
    },
  })

  if (!supplier) {
    notFound()
  }

  const canCreatePo = supplier.isActive

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la liste des fournisseurs
        </Link>
        {canCreatePo && (
          <Link
            href={`/admin/purchases/new?supplierId=${supplier.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-shamed-navy hover:bg-shamed-navy/90"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nouvelle commande
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs text-gray-500 mb-2">Créé le {formatDate(supplier.createdAt)}</p>
          <EditSupplierForm
            supplier={{
              id: supplier.id,
              code: supplier.code,
              name: supplier.name,
              contact: supplier.contact,
              email: supplier.email,
              phone: supplier.phone,
              address: supplier.address,
              city: supplier.city,
              ice: supplier.ice,
              notes: supplier.notes,
              isActive: supplier.isActive,
            }}
            canEditCode={isAdmin}
            canEditActive={isAdmin}
          />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Commandes fournisseur</h2>
            {supplier._count.purchaseOrders > 0 && (
              <Link
                href={`/admin/purchases?supplierId=${supplier.id}`}
                className="text-sm text-shamed-navy hover:text-shamed-navy font-medium"
              >
                Voir tout
              </Link>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {supplier._count.purchaseOrders} commande{supplier._count.purchaseOrders > 1 ? 's' : ''}
          </p>
          {supplier.purchaseOrders.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune commande pour ce fournisseur.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {supplier.purchaseOrders.map((po) => (
                <li key={po.id} className="py-3 flex justify-between items-center gap-2">
                  <div>
                    <Link
                      href={`/admin/purchases/${po.id}`}
                      className="text-sm font-mono text-shamed-navy hover:text-shamed-navy font-medium"
                    >
                      {po.orderNumber}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDateTime(po.createdAt)} · {PO_STATUS_LABELS[po.status] ?? po.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
