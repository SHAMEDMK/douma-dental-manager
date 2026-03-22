import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CreateSupplierForm from './CreateSupplierForm'

export default async function NewSupplierPage() {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')) {
    redirect('/admin')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la liste des fournisseurs
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nouveau fournisseur</h1>
        <p className="text-gray-500 mt-1">Renseignez les informations du fournisseur. Le code peut être laissé vide.</p>
      </div>

      <CreateSupplierForm />
    </div>
  )
}
