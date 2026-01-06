import { getAdminSettingsAction } from '@/app/actions/admin-settings'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSettingsForm from './AdminSettingsForm'

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
      <AdminSettingsForm initial={result.settings} />
    </div>
  )
}
