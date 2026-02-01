import { getAdminSettingsAction } from '@/app/actions/admin-settings'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSettingsForm from './AdminSettingsForm'
import Link from 'next/link'

export default async function AdminSettingsPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  const result = await getAdminSettingsAction()
  
  if (result.error || !result.settings) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">
            {result.error || 'Erreur lors du chargement des paramètres'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>
      
      <div className="mb-6">
        <Link
          href="/admin/settings/company"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Company Settings
        </Link>
      </div>
      
      <AdminSettingsForm initial={result.settings} />
    </div>
  )
}
