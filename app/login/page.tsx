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
        : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-6">
      <div className="bg-white p-4 sm:p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-6 text-blue-900">
          Douma Dental Manager
        </h1>

        {resetSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm text-center">
            ✅ Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
          </div>
        )}

        <form action="/api/auth/callback" method="post" className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-3 text-base min-h-[48px]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-3 text-base min-h-[48px]"
            />
          </div>

          {errorMessage && (
            <div className="text-red-500 text-sm text-center">{errorMessage}</div>
          )}

          <button
            type="submit"
            data-testid="login-submit"
            className="w-full flex justify-center items-center min-h-[48px] py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Se connecter
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link 
            href="/forgot-password" 
            className="inline-block py-2 text-sm text-blue-600 hover:text-blue-800 min-h-[44px] flex items-center justify-center"
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-6">
        <div className="bg-white p-4 sm:p-8 rounded-xl shadow-md w-full max-w-md animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6" />
          <div className="h-12 bg-gray-200 rounded mb-4" />
          <div className="h-12 bg-gray-200 rounded mb-4" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
