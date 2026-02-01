import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Mail, Phone, MapPin } from 'lucide-react'
import RequestActions from './RequestActions'

export default async function RequestsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/admin')
  }

  const searchParams = await props.searchParams
  const statusFilter = (searchParams.status as string) || 'all'

  const where: any = {}
  if (statusFilter !== 'all') {
    where.status = statusFilter
  }

  // Check if ClientRequest model exists (in case Prisma client hasn't been regenerated)
  let requests: any[] = []
  let stats = { total: 0, pending: 0, read: 0, resolved: 0 }
  
  try {
    if (prisma.clientRequest) {
      requests = await prisma.clientRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              clientCode: true,
              email: true,
              phone: true,
              companyName: true,
              city: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Statistics
      stats = {
        total: await prisma.clientRequest.count(),
        pending: await prisma.clientRequest.count({ where: { status: 'PENDING' } }),
        read: await prisma.clientRequest.count({ where: { status: 'READ' } }),
        resolved: await prisma.clientRequest.count({ where: { status: 'RESOLVED' } })
      }
    }
  } catch (error) {
    // Model not available yet
    console.warn('ClientRequest model not available yet. Please run: npx prisma generate && npx prisma db push')
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PRODUCT_REQUEST': return { label: '🔍 Besoin de produit', color: 'bg-blue-100 text-blue-800' }
      case 'ADVICE': return { label: '💡 Demande de conseil', color: 'bg-purple-100 text-purple-800' }
      case 'CONTACT': return { label: '📞 Demande de contact', color: 'bg-green-100 text-green-800' }
      case 'REMARK': return { label: '📝 Remarque/Suggestion', color: 'bg-yellow-100 text-yellow-800' }
      default: return { label: type, color: 'bg-gray-100 text-gray-800' }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' }
      case 'READ': return { label: 'Lue', color: 'bg-blue-100 text-blue-800' }
      case 'RESOLVED': return { label: 'Résolue', color: 'bg-green-100 text-green-800' }
      default: return { label: status, color: 'bg-gray-100 text-gray-800' }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Demandes Clients</h1>
        
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">En attente</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">Lues</div>
            <div className="text-2xl font-bold text-blue-600">{stats.read}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">Résolues</div>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/requests"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes ({stats.total})
            </Link>
            <Link
              href="/admin/requests?status=PENDING"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              En attente ({stats.pending})
            </Link>
            <Link
              href="/admin/requests?status=READ"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'READ'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Lues ({stats.read})
            </Link>
            <Link
              href="/admin/requests?status=RESOLVED"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'RESOLVED'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Résolues ({stats.resolved})
            </Link>
          </div>
        </div>
      </div>

      {/* Requests list */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Aucune demande {statusFilter !== 'all' ? `avec le statut "${getStatusLabel(statusFilter).label}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const typeInfo = getTypeLabel(request.type)
            const statusInfo = getStatusLabel(request.status)
            const isNew = request.status === 'PENDING' && !request.readAt

            return (
              <div
                key={request.id}
                className={`bg-white rounded-lg shadow p-6 ${
                  isNew ? 'border-l-4 border-yellow-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {isNew && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Nouveau
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      {new Date(request.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Client info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="font-medium text-gray-900 mb-2">{request.user.name}</div>
                  {request.user.clientCode && (
                    <div className="text-xs font-mono text-gray-500 mb-1">Code: {request.user.clientCode}</div>
                  )}
                  {request.user.companyName && (
                    <div className="text-sm text-gray-600 mb-1">{request.user.companyName}</div>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span>{request.user.email}</span>
                    </div>
                    {request.user.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span>{request.user.phone}</span>
                      </div>
                    )}
                    {request.user.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{request.user.city}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-1">Message :</div>
                  <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                    {request.message}
                  </div>
                </div>

                {/* Admin notes */}
                {request.adminNotes && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">Notes internes :</div>
                    <div className="text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-200">
                      {request.adminNotes}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-4">
                  {request.readAt && (
                    <div>Lue le : {new Date(request.readAt).toLocaleDateString('fr-FR')}</div>
                  )}
                  {request.resolvedAt && (
                    <div>Résolue le : {new Date(request.resolvedAt).toLocaleDateString('fr-FR')}</div>
                  )}
                </div>

                {/* Actions */}
                <RequestActions request={request} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
