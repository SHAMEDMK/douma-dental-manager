import { prisma } from '@/lib/prisma'
import InviteForm from './InviteForm'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  // 1. Fetch invitation using findUnique (token is @unique in schema)
  let invitation = null
  try {
    invitation = await prisma.invitation.findUnique({
    where: { token }
  })
  } catch (e) {
    console.error('Failed to fetch invitation:', e)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white shadow-lg rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Erreur Système</h1>
          <p className="text-gray-600">Une erreur est survenue lors de la vérification de l'invitation.</p>
        </div>
      </div>
    )
  }

  // 2. Check if invitation exists
  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white shadow-lg rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Invitation Invalide</h1>
          <p className="text-gray-600">Ce lien d'invitation n'existe pas ou est incorrect.</p>
        </div>
      </div>
    )
  }

  // 3. Check if invitation is already used
  if (invitation.usedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white shadow-lg rounded-lg text-center">
          <h1 className="text-xl font-bold text-yellow-600 mb-2">Invitation Déjà Utilisée</h1>
          <p className="text-gray-600">Ce lien a déjà été utilisé pour activer un compte.</p>
          <div className="mt-4">
             <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium">Se connecter</a>
          </div>
        </div>
      </div>
    )
  }

  // 4. Check if invitation is expired
  if (invitation.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white shadow-lg rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Invitation Expirée</h1>
          <p className="text-gray-600">Ce lien d'invitation a expiré.</p>
        </div>
      </div>
    )
  }

  // 5. Fetch user by email
  let user = null
  try {
    user = await prisma.user.findUnique({
    where: { email: invitation.email }
  })
  } catch (e) {
    console.error('Failed to fetch user:', e)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white shadow-lg rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Erreur Système</h1>
          <p className="text-gray-600">Une erreur est survenue lors de la récupération des informations utilisateur.</p>
        </div>
      </div>
    )
  }

  // 6. Check if user exists
  if (!user) {
     return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white shadow-lg rounded-lg text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Erreur Système</h1>
          <p className="text-gray-600">L'utilisateur associé à cette invitation est introuvable.</p>
        </div>
      </div>
    )
  }

  // 7. Check if user already has a password (already activated)
  if (user.passwordHash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white shadow-lg rounded-lg text-center">
          <h1 className="text-xl font-bold text-yellow-600 mb-2">Compte Déjà Activé</h1>
          <p className="text-gray-600">Ce compte a déjà été activé. Vous pouvez vous connecter avec votre mot de passe.</p>
          <div className="mt-4">
            <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium">Se connecter</a>
          </div>
        </div>
      </div>
    )
  }

  // 8. All checks passed - show invitation form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold text-2xl">D</div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Bienvenue chez DOUMA Dental</h2>
          <p className="mt-2 text-sm text-gray-600">
            Bonjour <strong>{user.name}</strong>, veuillez définir votre mot de passe pour activer votre compte.
          </p>
        </div>
        
        <InviteForm token={token} />
      </div>
    </div>
  )
}
