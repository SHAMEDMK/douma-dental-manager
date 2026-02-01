import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import RequestForm from './RequestForm'

export default async function RequestPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  // Get user requests history (last 10)
  // Check if ClientRequest model exists (in case Prisma client hasn't been regenerated)
  let requests: any[] = []
  try {
    if (prisma.clientRequest) {
      requests = await prisma.clientRequest.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          message: true,
          status: true,
          createdAt: true,
          readAt: true,
          resolvedAt: true
        }
      })
    }
  } catch (error) {
    // Model not available yet - will be empty array
    console.warn('ClientRequest model not available yet. Please run: npx prisma generate && npx prisma db push')
    requests = []
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contact & Demandes</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulaire */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Envoyer une demande</h2>
          <RequestForm />
        </div>

        {/* Historique */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes demandes récentes</h2>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune demande envoyée</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        {request.type === 'PRODUCT_REQUEST' && '🔍 Besoin de produit'}
                        {request.type === 'ADVICE' && '💡 Demande de conseil'}
                        {request.type === 'CONTACT' && '📞 Demande de contact'}
                        {request.type === 'REMARK' && '📝 Remarque'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'READ' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {request.status === 'PENDING' ? 'En attente' :
                         request.status === 'READ' ? 'Lue' : 'Résolue'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(request.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{request.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
