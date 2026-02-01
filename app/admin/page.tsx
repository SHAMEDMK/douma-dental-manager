import { prisma } from '@/lib/prisma'
import { getCachedAdminDashboardStats } from '@/lib/cache'
import { Package, CreditCard, AlertTriangle, ArrowRight, Users, Truck } from 'lucide-react'
import Link from 'next/link'

type CachedDashboardStats = {
  pendingOrders: number
  unpaidInvoices: { _sum: { balance: number | null } }
  lowStockProducts: number
  internalUsers: Array<{
    email: string
    name: string
    role: string
    userType: string | null
  }>
}

async function fetchDashboardStats(): Promise<CachedDashboardStats> {
  const [pendingOrders, unpaidInvoices, lowStockProducts, internalUsers] = await Promise.all([
    prisma.order.count({
      where: { status: 'CONFIRMED' },
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ['UNPAID', 'PARTIAL'] } },
      _sum: { balance: true },
    }),
    prisma.product.count({
      where: { stock: { lte: 10 } },
    }),
    prisma.user.findMany({
      where: { role: { in: ['MAGASINIER', 'COMPTABLE'] } },
      select: {
        email: true,
        name: true,
        role: true,
        userType: true,
      },
      orderBy: { role: 'asc' },
    }),
  ])
  return { pendingOrders, unpaidInvoices, lowStockProducts, internalUsers }
}

export default async function AdminDashboard() {
  // Cache 30 secondes via lib/cache (getCachedAdminDashboardStats)
  const stats = await getCachedAdminDashboardStats(fetchDashboardStats)
  const { pendingOrders, unpaidInvoices, lowStockProducts, internalUsers } = stats

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de Bord</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Commandes */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Commandes à Préparer</dt>
                  <dd className="text-3xl font-bold text-gray-900">{pendingOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <Link href="/admin/orders" className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
              Voir les commandes <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Finances */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">À Encaisser (COD) TTC</dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {unpaidInvoices._sum.balance?.toFixed(2) || '0.00'} Dh
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <Link href="/admin/invoices" className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
              Gérer les paiements <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Stock */}
        <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Alertes Stock</dt>
                  <dd className="text-3xl font-bold text-gray-900">{lowStockProducts}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <Link href="/admin/stock" className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
              Vérifier le stock <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Comptes Internes */}
      <div className="mt-8 bg-white shadow-sm rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Comptes Internes</h2>
          </div>
        </div>
        <div className="p-6">
          {internalUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Aucun compte interne trouvé</p>
              <p className="text-sm text-gray-400">
                Exécutez: <code className="bg-gray-100 px-2 py-1 rounded">node scripts/ensure-delivery-user.js</code>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {internalUsers.map((user) => {
                // Determine if user is magasinier (warehouse) or livreur (delivery)
                const isMagasinier = user.role === 'MAGASINIER' && user.userType === 'MAGASINIER'
                const isLivreur = user.role === 'MAGASINIER' && (user.userType === 'LIVREUR' || user.userType === null)
                const isComptable = user.role === 'COMPTABLE'
                
                return (
                  <div key={user.email} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isComptable ? (
                            <CreditCard className="h-4 w-4 text-blue-600" />
                          ) : isMagasinier ? (
                            <Package className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Truck className="h-4 w-4 text-green-600" />
                          )}
                          <span className="text-sm font-medium text-gray-900">{user.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            isComptable
                              ? 'bg-blue-100 text-blue-700'
                              : isMagasinier
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {isComptable ? 'Comptable' : isMagasinier ? 'Magasinier' : 'Livreur'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                        {isMagasinier && (
                          <Link 
                            href="/magasinier/dashboard" 
                            className="text-xs text-purple-600 hover:text-purple-800 inline-flex items-center gap-1"
                          >
                            Accéder à l'espace magasinier <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                        {isLivreur && (
                          <Link 
                            href="/delivery" 
                            className="text-xs text-green-600 hover:text-green-800 inline-flex items-center gap-1"
                          >
                            Accéder à l'espace livreur <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              💡 <strong>Note:</strong> Les comptes internes ne sont pas listés dans la page "Clients". 
              Pour créer un nouveau compte livreur, exécutez: <code className="bg-gray-100 px-1 py-0.5 rounded">node scripts/create-delivery-user.js email@example.com "Nom"</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
