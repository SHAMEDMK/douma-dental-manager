import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function MagasinierStockMovementsPage() {
  let movements: Awaited<ReturnType<typeof prisma.stockMovement.findMany<{
    include: { product: true }
  }>>> = []
  let error: string | null = null

  try {
    movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: true
      },
      take: 100
    })
  } catch (e) {
    console.error('Failed to fetch movements:', e)
    error = "Impossible de charger l'historique. La base de données est peut-être en cours de mise à jour."
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'IN': 'Entrée',
      'OUT': 'Sortie',
      'ADJUSTMENT': 'Ajustement'
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'IN':
        return 'bg-green-100 text-green-800'
      case 'OUT':
        return 'bg-red-100 text-red-800'
      case 'ADJUSTMENT':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/magasinier/stock" className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour au stock
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Historique des Mouvements</h1>

      {error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raison</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucun mouvement enregistré
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(movement.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {movement.product.sku && <span className="font-mono text-gray-500 mr-1">{movement.product.sku}</span>}
                      {movement.product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(movement.type)}`}>
                        {getTypeLabel(movement.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.type === 'OUT' ? '-' : '+'}{movement.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {movement.reference || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {movement.reference || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
