import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

async function getAuditLogs(page: number = 1, limit: number = 50) {
  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        userEmail: true,
        userRole: true,
        details: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count(),
  ])

  return { logs, total, page, totalPages: Math.ceil(total / limit) }
}

function parseDetails(details: string | null): Record<string, any> | null {
  if (!details) return null
  try {
    return JSON.parse(details)
  } catch {
    return null
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    ORDER_CREATED: 'Commande créée',
    ORDER_UPDATED: 'Commande modifiée',
    ORDER_STATUS_CHANGED: 'Statut commande changé',
    ORDER_CANCELLED: 'Commande annulée',
    ORDER_ITEM_ADDED: 'Article ajouté à commande',
    INVOICE_CREATED: 'Facture créée',
    INVOICE_UPDATED: 'Facture modifiée',
    INVOICE_STATUS_CHANGED: 'Statut facture changé',
    PAYMENT_RECORDED: 'Paiement enregistré',
    PAYMENT_DELETED: 'Paiement supprimé',
    PRODUCT_CREATED: 'Produit créé',
    PRODUCT_UPDATED: 'Produit modifié',
    PRODUCT_DELETED: 'Produit supprimé',
    STOCK_ADJUSTED: 'Stock ajusté',
    CLIENT_CREATED: 'Client créé',
    CLIENT_UPDATED: 'Client modifié',
    CLIENT_DELETED: 'Client supprimé',
    LOGIN: 'Connexion',
    LOGOUT: 'Déconnexion',
    LOGIN_FAILED: 'Tentative de connexion échouée',
    SETTINGS_UPDATED: 'Paramètres modifiés',
    ACCOUNTANT_CREATED: 'Comptable créé',
    ACCOUNTANT_DELETED: 'Comptable supprimé',
    DELIVERY_AGENT_CREATED: 'Livreur créé',
    DELIVERY_AGENT_DELETED: 'Livreur supprimé',
    INVITATION_CREATED: 'Invitation créée',
    ORDER_APPROVED: 'Commande approuvée',
    PAYMENT_UPDATED: 'Paiement modifié',
    CLIENT_REQUEST_CREATED: 'Demande client créée',
    CLIENT_REQUEST_STATUS_CHANGED: 'Statut demande client changé',
    RATE_LIMIT_EXCEEDED: 'Limite de taux dépassée',
    UNAUTHORIZED_ACCESS: 'Accès non autorisé',
    EMAIL_SENT: 'Email envoyé',
    EMAIL_FAILED: 'Email échoué',
    PASSWORD_RESET_REQUESTED: 'Demande de réinitialisation de mot de passe',
    PASSWORD_RESET: 'Mot de passe réinitialisé',
    USER_TYPE_UPDATED: 'Type d\'utilisateur mis à jour',
  }
  return labels[action] || action
}

function getActionColor(action: string): string {
  if (action.includes('CREATED')) return 'bg-green-100 text-green-800'
  if (action.includes('UPDATED') || action.includes('CHANGED')) return 'bg-blue-100 text-blue-800'
  if (action.includes('DELETED') || action.includes('CANCELLED')) return 'bg-red-100 text-red-800'
  if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-800'
  if (action.includes('PAYMENT')) return 'bg-yellow-100 text-yellow-800'
  if (action.includes('RATE_LIMIT') || action.includes('UNAUTHORIZED')) return 'bg-orange-100 text-orange-800'
  if (action.includes('EMAIL_SENT')) return 'bg-green-100 text-green-800'
  if (action.includes('EMAIL_FAILED')) return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

function getEntityTypeLabel(entityType: string): string {
  const labels: Record<string, string> = {
    ORDER: 'Commande',
    INVOICE: 'Facture',
    PAYMENT: 'Paiement',
    PRODUCT: 'Produit',
    STOCK: 'Stock',
    USER: 'Utilisateur',
    CLIENT: 'Client',
    CLIENT_REQUEST: 'Demande client',
    SETTINGS: 'Paramètres',
    EMAIL: 'Email',
    SECURITY: 'Sécurité',
  }
  return labels[entityType] || entityType
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const { logs, total, totalPages } = await getAuditLogs(page)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs d'audit</h1>
        <p className="text-gray-600 mt-1">Historique de toutes les actions importantes dans le système</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              Total : <span className="font-semibold">{total}</span> actions
            </p>
          </div>
          <div className="text-sm text-gray-600">
            Page {page} sur {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Détails
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Aucun log d'audit trouvé
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const details = parseDetails(log.details)
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(
                            log.action
                          )}`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getEntityTypeLabel(log.entityType)}
                        {log.entityId && (
                          <span className="text-gray-500 text-xs ml-2">({log.entityId.slice(-8)})</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {log.userEmail && (
                            <div className="font-medium">{log.userEmail}</div>
                          )}
                          {log.userRole && (
                            <div className="text-xs text-gray-500">{log.userRole}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {details ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-800">
                              Voir détails
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                              {JSON.stringify(details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div>
              {page > 1 && (
                <a
                  href={`/admin/audit?page=${page - 1}`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Précédent
                </a>
              )}
            </div>
            <div className="text-sm text-gray-700">
              Page {page} sur {totalPages}
            </div>
            <div>
              {page < totalPages && (
                <a
                  href={`/admin/audit?page=${page + 1}`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Suivant
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
