import { logout } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/admin/Sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  async function handleLogout() {
    'use server'
    await logout()
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
        <Sidebar logoutAction={handleLogout} />
      </div>
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 py-8 px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
