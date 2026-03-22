import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CreatePurchaseOrderForm from './CreatePurchaseOrderForm'

export default async function NewPurchaseOrderPage() {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')) {
    redirect('/admin')
  }

  const suppliers = await prisma.supplier.findMany({
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  })

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/purchases"
          className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux commandes fournisseur
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle commande fournisseur</h1>
        <p className="text-gray-500 mt-1">
          La commande est enregistrée en <strong>brouillon</strong> ; vous pourrez l&apos;envoyer depuis le détail.
        </p>
      </div>

      <CreatePurchaseOrderForm suppliers={suppliers} />
    </div>
  )
}
