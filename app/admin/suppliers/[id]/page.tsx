import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDate } from '@/lib/config'
import EditSupplierForm from './EditSupplierForm'

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
    },
  })

  if (!supplier) {
    notFound()
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la liste des fournisseurs
        </Link>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Commandes fournisseur</h2>
          <p className="text-sm text-gray-600 mb-2">
            {supplier._count.purchaseOrders} commande{supplier._count.purchaseOrders > 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-500">
            Liste des commandes à venir (Phase C)
          </p>
        </div>
      </div>
    </div>
  )
}
