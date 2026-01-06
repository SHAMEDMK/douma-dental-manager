import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import EditClientForm from './EditClientForm'
import Link from 'next/link'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const client = await prisma.user.findUnique({
    where: { id, role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      segment: true,
      discountRate: true,
      balance: true,
      creditLimit: true,
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
              <dt className="text-sm font-medium text-gray-500">Solde dû</dt>
              <dd className={`text-sm font-medium ${client.balance && client.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {client.balance ? client.balance.toFixed(2) : '0.00'} €
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Plafond de crédit</dt>
              <dd className="text-sm text-gray-900">
                {client.creditLimit ? client.creditLimit.toFixed(2) : '0.00'} €
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Crédit disponible</dt>
              <dd className={`text-sm font-medium ${
                Math.max(0, (client.creditLimit || 0) - (client.balance || 0)) > 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {Math.max(0, (client.creditLimit || 0) - (client.balance || 0)).toFixed(2)} €
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
          </dl>
        </div>

        {/* Edit Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modifier les paramètres</h2>
          <EditClientForm client={client} />
        </div>
      </div>
    </div>
  )
}
