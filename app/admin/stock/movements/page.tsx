import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function StockMovementsPage() {
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
      take: 100 // Limit to last 100 for now
    })
  } catch (e) {
    console.error('Failed to fetch movements:', e)
    error = "Impossible de charger l'historique. La base de données est peut-être en cours de mise à jour."
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/stock" className="flex items-center text-gray-500 hover:text-gray-700">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movements.map((movement) => {
              const badgeClass = movement.type === 'IN' ? 'bg-green-100 text-green-800' : movement.type === 'OUT' ? 'bg-red-100 text-red-800' : movement.type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-800' : movement.type === 'RESERVED' ? 'bg-blue-100 text-blue-800' : ''
              return (
              <tr key={movement.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(movement.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {movement.product.sku && <span className="font-mono text-gray-500 mr-1">{movement.product.sku}</span>}
                    {movement.product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}`}>
                        {movement.type}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.reference || '-'}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
