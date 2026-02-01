import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClientFilters from './ClientFilters'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/admin')
  }
  const params = await searchParams
  const segmentFilter = params.segment as string | undefined
  const searchQuery = params.q as string | undefined
  const dateFromFilter = params.dateFrom as string | undefined
  const dateToFilter = params.dateTo as string | undefined

  // Build where clause for filters
  const where: any = { role: 'CLIENT' }
  
  if (segmentFilter) {
    where.segment = segmentFilter
  }
  
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery } },
      { clientCode: { contains: searchQuery } },
      { email: { contains: searchQuery } },
      { companyName: { contains: searchQuery } },
    ]
  }
  
  if (dateFromFilter || dateToFilter) {
    where.createdAt = {}
    if (dateFromFilter) {
      where.createdAt.gte = new Date(dateFromFilter + 'T00:00:00')
    }
    if (dateToFilter) {
      where.createdAt.lte = new Date(dateToFilter + 'T23:59:59')
    }
  }

  const clients = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
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
      createdAt: true,
      _count: { select: { orders: true } }
    }
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Clients</h1>
        <div className="flex gap-3">
          <a
            href="/api/admin/export/clients"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter Excel
          </a>
          <a 
            href="/admin/clients/invite" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800"
          >
            Inviter un nouveau client
          </a>
        </div>
      </div>

      <ClientFilters />

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entreprise</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remise</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Solde dû TTC</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Plafond TTC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commandes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => {
                const available = Math.max(0, (client.creditLimit || 0) - (client.balance || 0))
                return (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{client.clientCode || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.companyName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {client.segment || 'LABO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.discountRate ? `${client.discountRate.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={client.balance && client.balance > 0 ? 'text-red-600' : 'text-gray-500'}>
                        {client.balance ? client.balance.toFixed(2) : '0.00'} Dh
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-gray-900 font-medium">
                          {client.creditLimit ? client.creditLimit.toFixed(2) : '0.00'} Dh
                        </span>
                        <span className="text-xs text-gray-500">
                          Disponible: {available.toFixed(2)} Dh
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client._count.orders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Modifier
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
