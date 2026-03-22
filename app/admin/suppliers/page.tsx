import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Building2 } from 'lucide-react'
import AdminPagination from '@/app/components/AdminPagination'
import { parsePaginationParams, computeSkipTake, computeTotalPages } from '@/lib/pagination'

const PAGE_SIZE = 20

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')) {
    redirect('/admin')
  }
  const isCommercial = session.role === 'COMMERCIAL'
  const params = await searchParams
  const { page } = parsePaginationParams(params)
  const pageSize = PAGE_SIZE
  const { skip, take } = computeSkipTake(page, pageSize)

  const [suppliers, totalCount] = await Promise.all([
    prisma.supplier.findMany({
      skip,
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        _count: { select: { purchaseOrders: true } },
      },
    }),
    prisma.supplier.count(),
  ])
  const totalPages = computeTotalPages(totalCount, pageSize)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCommercial ? 'Fournisseurs' : 'Gestion des Fournisseurs'}
          </h1>
          {isCommercial && (
            <p className="text-sm text-gray-500 mt-1">
              Consultez les fournisseurs et créez des commandes d&apos;achat.
            </p>
          )}
        </div>
        <Link
          href="/admin/suppliers/new"
          title="Nouveau fournisseur"
          aria-label="Nouveau fournisseur"
          className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md text-white bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" aria-hidden />
          Nouveau fournisseur
        </Link>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Aucun fournisseur enregistré</p>
          <p className="text-sm text-gray-400 mb-4">
            Créez votre premier fournisseur pour commencer à passer des commandes d&apos;achat.
          </p>
          <Link
            href="/admin/suppliers/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Nouveau fournisseur
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ville
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commandes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {supplier.code?.trim() ? supplier.code.trim() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {supplier.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.city || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier._count.purchaseOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/suppliers/${supplier.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            totalPages={totalPages}
            totalCount={totalCount}
            itemLabel={{ singular: 'fournisseur', plural: 'fournisseurs' }}
          />
        </div>
      )}
    </div>
  )
}
