'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'
  const errorParam = searchParams.get('error')
  const errorMessage =
    errorParam === 'invalid'
      ? 'Identifiants invalides'
      : errorParam === 'rate'
        ? 'Trop de tentatives. Réessayez plus tard.'
        : errorParam === 'server'
          ? 'Erreur serveur temporaire. Réessayez ou contactez l’administrateur.'
          : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-shamed-bg px-4 py-6">
      <div className="bg-white p-4 sm:p-8 rounded-xl shadow-md w-full max-w-md border border-shamed-border">
        <div className="text-center mb-2">
          <div
            className="mx-auto mb-4 w-12 h-12 rounded-lg bg-shamed-navy text-white font-bold text-xl flex items-center justify-center"
            aria-hidden
          >
            S
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-shamed-navy">Connexion à votre espace client SHAMED</h1>
        </div>
        <p className="text-sm text-gray-600 text-center mb-6">
          Accédez à vos commandes, factures et informations professionnelles.
        </p>
        <p className="text-xs text-gray-500 text-center mb-6">
          Plateforme propulsée par <span className="font-medium text-shamed-navy">Douma Dental Manager</span>.
        </p>

        {resetSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm text-center">
            Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
          </div>
        )}

        <form action="/api/auth/callback" method="post" className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-shamed-ink">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-lg border-shamed-border shadow-sm focus:border-shamed-navy focus:ring-shamed-navy border p-3 text-base min-h-[48px]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-shamed-ink">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-lg border-shamed-border shadow-sm focus:border-shamed-navy focus:ring-shamed-navy border p-3 text-base min-h-[48px]"
            />
          </div>

          {errorMessage && <div className="text-red-600 text-sm text-center">{errorMessage}</div>}

          <button
            type="submit"
            data-testid="login-submit"
            className="w-full flex justify-center items-center min-h-[48px] py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-shamed-navy hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-shamed-copper disabled:opacity-50"
          >
            Se connecter
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/forgot-password"
            className="inline-block py-2 text-sm text-shamed-navy hover:text-shamed-copper min-h-[44px] flex items-center justify-center underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-shamed-bg px-4 py-6">
          <div className="bg-white p-4 sm:p-8 rounded-xl shadow-md w-full max-w-md border border-shamed-border animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6" />
            <div className="h-12 bg-gray-200 rounded mb-4" />
            <div className="h-12 bg-gray-200 rounded mb-4" />
            <div className="h-12 bg-gray-200 rounded" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
