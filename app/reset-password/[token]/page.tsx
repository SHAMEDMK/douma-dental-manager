import { prisma } from '@/lib/prisma'
import ResetPasswordForm from './ResetPasswordForm'
import { notFound } from 'next/navigation'

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Verify token exists and is valid
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true }
  })

  if (!resetToken) {
    notFound()
  }

  if (resetToken.usedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lien déjà utilisé</h1>
          <p className="text-gray-600 mb-6">
            Ce lien de réinitialisation a déjà été utilisé. Veuillez demander un nouveau lien.
          </p>
          <a
            href="/forgot-password"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Demander un nouveau lien
          </a>
        </div>
      </div>
    )
  }

  if (resetToken.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lien expiré</h1>
          <p className="text-gray-600 mb-6">
            Ce lien de réinitialisation a expiré. Les liens sont valides pendant 1 heure.
          </p>
          <a
            href="/forgot-password"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Demander un nouveau lien
          </a>
        </div>
      </div>
    )
  }

  return <ResetPasswordForm token={token} userEmail={resetToken.user.email} />
}
