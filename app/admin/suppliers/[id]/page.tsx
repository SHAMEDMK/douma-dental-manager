import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDate } from '@/lib/config'

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')) {
    redirect('/admin')
  }

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
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fiche fournisseur</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Code</dt>
              <dd className="text-sm text-gray-900 font-mono">{supplier.code}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Nom</dt>
              <dd className="text-sm text-gray-900">{supplier.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Actif</dt>
              <dd className="text-sm text-gray-900">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {supplier.isActive ? 'Oui' : 'Non'}
                </span>
              </dd>
            </div>
            {supplier.contact && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact</dt>
                <dd className="text-sm text-gray-900">{supplier.contact}</dd>
              </div>
            )}
            {supplier.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{supplier.email}</dd>
              </div>
            )}
            {supplier.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                <dd className="text-sm text-gray-900">{supplier.phone}</dd>
              </div>
            )}
            {(supplier.address || supplier.city) && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Adresse</dt>
                <dd className="text-sm text-gray-900">
                  {[supplier.address, supplier.city].filter(Boolean).join(' – ')}
                </dd>
              </div>
            )}
            {supplier.ice && (
              <div>
                <dt className="text-sm font-medium text-gray-500">ICE</dt>
                <dd className="text-sm text-gray-900 font-mono">{supplier.ice}</dd>
              </div>
            )}
            {supplier.notes && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{supplier.notes}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Créé le</dt>
              <dd className="text-sm text-gray-900">{formatDate(supplier.createdAt)}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <button
              type="button"
              disabled
              title="À implémenter en étape 2"
              className="px-4 py-2 bg-gray-200 text-gray-500 rounded-md text-sm font-medium cursor-not-allowed"
            >
              Modifier
            </button>
          </div>
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
