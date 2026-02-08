import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import CreateOrderForClientForm from './CreateOrderForClientForm'

export default async function CreateOrderForClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')) {
    redirect('/login')
  }

  const { id: clientId } = await params
  const client = await prisma.user.findUnique({
    where: { id: clientId, role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      clientCode: true,
      companyName: true,
      segment: true,
      balance: true,
      creditLimit: true,
    },
  })

  if (!client) {
    notFound()
  }

  const isCommercial = session.role === 'COMMERCIAL'

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap gap-3 text-sm mb-2">
          <Link href="/admin/clients" className="text-blue-600 hover:text-blue-900">
            ← Liste des clients
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href={`/admin/clients/${client.id}`}
            className="text-blue-600 hover:text-blue-900"
          >
            Fiche client
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isCommercial ? 'Créer une commande' : 'Créer une commande pour ce client'}
        </h1>
        <p className="text-gray-600 mt-1">
          {client.name}
          {client.clientCode && (
            <span className="ml-2 text-gray-500 font-mono">({client.clientCode})</span>
          )}
          {client.companyName && (
            <span className="ml-2 text-gray-500"> – {client.companyName}</span>
          )}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Segment : {client.segment || 'LABO'} • Crédit disponible :{' '}
          {Math.max(0, (client.creditLimit ?? 0) - (client.balance ?? 0)).toFixed(2)} Dh
        </p>
      </div>
      <CreateOrderForClientForm clientId={client.id} clientName={client.name} />
    </div>
  )
}
