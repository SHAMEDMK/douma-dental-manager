'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-bold text-red-600">Une erreur est survenue</h2>
          <p className="mt-2 text-sm text-gray-600">
            Désolé, une erreur inattendue s'est produite.
          </p>
        </div>
        <div className="mt-5 space-x-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800"
          >
            Réessayer
          </button>
          <button
             onClick={() => window.location.href = '/'}
             className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Accueil
          </button>
        </div>
      </div>
    </div>
  )
}
