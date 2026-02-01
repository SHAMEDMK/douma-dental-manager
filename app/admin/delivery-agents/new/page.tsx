import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CreateDeliveryAgentForm from './CreateDeliveryAgentForm'

export default async function NewDeliveryAgentPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/delivery-agents" className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux livreurs
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nouveau Livreur</h1>
        <p className="text-gray-500 mt-1">
          Créez un nouveau compte livreur (MAGASINIER)
        </p>
      </div>

      <CreateDeliveryAgentForm />
    </div>
  )
}
