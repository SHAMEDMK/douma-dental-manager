import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditClientForm from './EditClientForm'
import DeleteClientButton from './DeleteClientButton'
import Link from 'next/link'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const isAdmin = session?.role === 'ADMIN'

  const client = await prisma.user.findUnique({
    where: { id, role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      clientCode: true,
      email: true,
      companyName: true,
      segment: true,
      discountRate: true,
      balance: true,
      creditLimit: true,
      phone: true,
      address: true,
      city: true,
      ice: true,
      createdAt: true,
      _count: { select: { orders: true } }
    }
  })

  if (!client) {
    notFound()
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/clients" className="text-blue-600 hover:text-blue-900 text-sm mb-2 inline-block">
          ← Retour à la liste des clients
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le client</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Client Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du client</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nom</dt>
              <dd className="text-sm text-gray-900">{client.name}</dd>
            </div>
            {client.clientCode && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Code client</dt>
                <dd className="text-sm text-gray-900 font-mono">{client.clientCode}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="text-sm text-gray-900">{client.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Entreprise</dt>
              <dd className="text-sm text-gray-900">{client.companyName || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Segment actuel</dt>
              <dd className="text-sm text-gray-900">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {client.segment || 'LABO'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Remise actuelle</dt>
              <dd className="text-sm text-gray-900">
                {client.discountRate ? `${client.discountRate.toFixed(2)}%` : 'Aucune'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Solde dû TTC</dt>
              <dd className={`text-sm font-medium ${client.balance && client.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {client.balance ? client.balance.toFixed(2) : '0.00'} Dh
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Plafond de crédit TTC</dt>
              <dd className="text-sm text-gray-900">
                {client.creditLimit ? client.creditLimit.toFixed(2) : '0.00'} Dh
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Crédit disponible TTC</dt>
              <dd className={`text-sm font-medium ${
                Math.max(0, (client.creditLimit || 0) - (client.balance || 0)) > 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {Math.max(0, (client.creditLimit || 0) - (client.balance || 0)).toFixed(2)} Dh
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Nombre de commandes</dt>
              <dd className="text-sm text-gray-900">{client._count.orders}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Date d'inscription</dt>
              <dd className="text-sm text-gray-900">
                {new Date(client.createdAt).toLocaleDateString('fr-FR')}
              </dd>
            </div>
            {client.phone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                <dd className="text-sm text-gray-900">{client.phone}</dd>
              </div>
            )}
            {(client.address || client.city) && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Adresse</dt>
                <dd className="text-sm text-gray-900">
                  {[client.address, client.city].filter(Boolean).join(' – ')}
                </dd>
              </div>
            )}
            {client.ice && (
              <div>
                <dt className="text-sm font-medium text-gray-500">ICE</dt>
                <dd className="text-sm text-gray-900">{client.ice}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Create order for client (ADMIN + COMMERCIAL) */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Commande</h2>
          <p className="text-sm text-gray-500 mb-4">
            Passer une commande au nom de ce client (admin ou commercial).
          </p>
          <Link
            href={`/admin/clients/${client.id}/create-order`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Créer une commande pour ce client
          </Link>
        </div>

        {/* Edit Form (ADMIN only) */}
        {isAdmin && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Modifier les paramètres</h2>
            <EditClientForm client={client} />
          </div>
        )}
      </div>

      {/* Danger Zone (ADMIN only) */}
      {isAdmin && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Zone de danger</h2>
            <p className="text-sm text-gray-500 mb-4">
              La suppression d'un client est définitive. Un client ne peut pas être supprimé s'il a des commandes existantes.
            </p>
            <DeleteClientButton clientId={client.id} clientName={client.name} clientEmail={client.email} />
          </div>
        </div>
      )}
    </div>
  )
}
