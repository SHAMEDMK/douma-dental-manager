'use client'

import { useState, useEffect } from 'react'
import { updateMyProfileAction, getMyProfileAction } from '@/app/actions/user'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userData, setUserData] = useState<{
    companyName: string | null
    phone: string | null
    address: string | null
    city: string | null
    ice: string | null
  } | null>(null)

  // Fetch user data on mount
  useEffect(() => {
    async function fetchUserData() {
      const result = await getMyProfileAction()
      if (result.error) {
        setError(result.error)
      } else {
        setUserData({
          companyName: result.companyName || null,
          phone: result.phone || null,
          address: result.address || null,
          city: result.city || null,
          ice: result.ice || null,
        })
      }
    }
    fetchUserData()
  }, [])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const companyName = formData.get('companyName') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const ice = formData.get('ice') as string

    const result = await updateMyProfileAction({
      companyName: companyName || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      ice: ice || null,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      // Update local state
      setUserData({
        companyName: companyName || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        ice: ice || null,
      })
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    }
  }

  // Show loading state while fetching user data
  if (userData === null) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mes informations</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mes informations</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              name="companyName"
              id="companyName"
              defaultValue={userData.companyName || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="Nom de l'entreprise (optionnel)"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Téléphone
            </label>
            <input
              type="tel"
              name="phone"
              id="phone"
              defaultValue={userData.phone || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="+212 6XX XXX XXX"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <input
              type="text"
              name="address"
              id="address"
              defaultValue={userData.address || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="Rue, numéro..."
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              Ville
            </label>
            <input
              type="text"
              name="city"
              id="city"
              defaultValue={userData.city || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="Ville"
            />
          </div>

          <div>
            <label htmlFor="ice" className="block text-sm font-medium text-gray-700">
              ICE (Identifiant Commun de l'Entreprise)
            </label>
            <input
              type="text"
              name="ice"
              id="ice"
              defaultValue={userData.ice || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="ICE (min. 5 caractères si rempli)"
            />
            <p className="mt-1 text-xs text-gray-500">ICE client (optionnel, minimum 5 caractères si rempli)</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-green-700">Bien enregistré</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
