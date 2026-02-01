import { getCompanySettingsAction } from '@/app/actions/company-settings'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CompanySettingsForm from './CompanySettingsForm'
import Link from 'next/link'

export default async function CompanySettingsPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  const result = await getCompanySettingsAction()
  
  if (result.error || !result.settings) {
    return (
      <div>
        <div className="mb-4">
          <Link href="/admin/settings" className="text-blue-600 hover:text-blue-900 text-sm">
            ← Retour aux paramètres
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Settings</h1>
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
      <div className="mb-4">
        <Link href="/admin/settings" className="text-blue-600 hover:text-blue-900 text-sm">
          ← Retour aux paramètres
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Settings</h1>
      <CompanySettingsForm initial={result.settings} />
    </div>
  )
}
