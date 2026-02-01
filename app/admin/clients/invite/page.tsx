import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import InviteClientForm from './InviteClientForm'

export default async function InviteClientPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/admin')
  }

  return <InviteClientForm />
}
