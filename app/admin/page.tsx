import { prisma } from '@/lib/prisma'
import { Package, CreditCard, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const pendingOrders = await prisma.order.count({
    where: { status: 'CONFIRMED' },
  })
  
  const unpaidInvoices = await prisma.invoice.aggregate({
    where: { status: 'UNPAID' },
    _sum: { amount: true },
  })

  const lowStockProducts = await prisma.product.count({
    where: { stock: { lte: 10 } },
  })

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
                  <dt className="text-sm font-medium text-gray-500 truncate">À Encaisser (COD)</dt>
                  <dd className="text-3xl font-bold text-gray-900">
                    {unpaidInvoices._sum.amount?.toFixed(2) || '0.00'} €
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
    </div>
  )
}
