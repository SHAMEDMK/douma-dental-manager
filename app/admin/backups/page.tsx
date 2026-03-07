import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BackupsClient from './BackupsClient'

export const dynamic = 'force-dynamic'

export default async function BackupsPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="admin-backups-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Backups</h1>
        <p className="text-gray-600 mt-1">Sauvegardes automatiques et manuelles de la base de données</p>
      </div>

      <BackupsClient />
    </div>
  )
}
