import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calculator, Truck, Package } from 'lucide-react'
import CreateAccountantModal from './CreateAccountantModal'
import CreateMagasinierModal from './CreateMagasinierModal'
import DeleteAccountantButton from './DeleteAccountantButton'
import DeleteDeliveryAgentButton from '../delivery-agents/DeleteDeliveryAgentButton'
import FixUserTypeButton from './FixUserTypeButton'

export default async function UsersPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/admin')
  }

  // Get all non-client users (COMPTABLE, MAGASINIER)
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ['COMPTABLE', 'MAGASINIER']
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      userType: true,
      createdAt: true,
      _count: {
        select: {
          orders: true // For delivery agents
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const accountants = users.filter(u => u.role === 'COMPTABLE')
  // Magasiniers: role=MAGASINIER AND userType='MAGASINIER'
  const magasiniers = users.filter(u => u.role === 'MAGASINIER' && u.userType === 'MAGASINIER')
  // Livreurs: role=MAGASINIER AND (userType='LIVREUR' OR userType=null for backward compatibility)
  const livreurs = users.filter(u => u.role === 'MAGASINIER' && (u.userType === 'LIVREUR' || u.userType === null))

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
            <p className="text-gray-600 mt-1">Comptables, magasiniers et livreurs</p>
          </div>
          <div className="flex gap-3">
            <CreateAccountantModal />
            <CreateMagasinierModal />
            <Link
              href="/admin/delivery-agents/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouveau livreur
            </Link>
          </div>
        </div>
      </div>

      {/* Accountants Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Comptables</h2>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
            {accountants.length}
          </span>
        </div>

        {accountants.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Calculator className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">Aucun comptable</p>
            <p className="text-gray-400 text-sm mb-4">
              Les comptables peuvent gérer les factures et paiements
            </p>
            <CreateAccountantModal />
          </div>
        ) : (
          <div className="grid gap-4">
            {accountants.map((accountant) => (
              <div key={accountant.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Calculator className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{accountant.name}</h3>
                      <p className="text-sm text-gray-600">{accountant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Comptable
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Créé le {accountant.createdAt.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <DeleteAccountantButton 
                      accountantId={accountant.id}
                      accountantName={accountant.name}
                      accountantEmail={accountant.email}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Magasiniers Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Magasiniers</h2>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
            {magasiniers.length}
          </span>
        </div>

        {magasiniers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">Aucun magasinier</p>
            <p className="text-gray-400 text-sm mb-4">
              Les magasiniers peuvent gérer les commandes et le stock
            </p>
            <CreateMagasinierModal />
          </div>
        ) : (
          <div className="grid gap-4">
            {magasiniers.map((agent) => (
              <div key={agent.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-600">{agent.email}</p>
                      <p className="text-xs text-gray-500">
                        {agent._count.orders} commande{agent._count.orders !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Magasinier
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Créé le {agent.createdAt.toLocaleDateString('fr-FR')}
                      </p>
                      {/* Allow correction to livreur if needed */}
                      <div className="mt-2">
                        <FixUserTypeButton
                          userId={agent.id}
                          userName={agent.name}
                          currentUserType={agent.userType}
                          targetUserType="LIVREUR"
                        />
                      </div>
                    </div>
                    <DeleteDeliveryAgentButton
                      agentId={agent.id}
                      agentName={agent.name}
                      agentEmail={agent.email}
                      ordersCount={agent._count.orders}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Livreurs Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Livreurs</h2>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            {livreurs.length}
          </span>
        </div>

        {livreurs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">Aucun livreur</p>
            <p className="text-gray-400 text-sm mb-4">
              Les livreurs peuvent gérer les livraisons et expéditions
            </p>
            <Link
              href="/admin/delivery-agents/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Créer le premier livreur
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {livreurs.map((agent) => (
              <div key={agent.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Truck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-600">{agent.email}</p>
                      <p className="text-xs text-gray-500">
                        {agent._count.orders} commande{agent._count.orders !== 1 ? 's' : ''}
                      </p>
                      {agent.userType === null && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Type non défini (affiché comme livreur par défaut)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Livreur
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Créé le {agent.createdAt.toLocaleDateString('fr-FR')}
                      </p>
                      {/* Show correction button if userType is null or if admin wants to change it */}
                      {(agent.userType === null || agent.userType === 'LIVREUR') && (
                        <div className="mt-2">
                          <FixUserTypeButton
                            userId={agent.id}
                            userName={agent.name}
                            currentUserType={agent.userType}
                            targetUserType="MAGASINIER"
                          />
                        </div>
                      )}
                    </div>
                    <DeleteDeliveryAgentButton
                      agentId={agent.id}
                      agentName={agent.name}
                      agentEmail={agent.email}
                      ordersCount={agent._count.orders}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}