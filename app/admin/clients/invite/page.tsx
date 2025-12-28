'use client'

import { useState } from 'react'
import { createInvitation } from '@/app/actions/invitation'
import Link from 'next/link'
import { ArrowLeft, Copy, Check } from 'lucide-react'

export default function InviteClientPage() {
  const [copied, setCopied] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    setInviteLink(null)
    
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const companyName = formData.get('companyName') as string
    const segment = formData.get('segment') as string

    const result = await createInvitation({ email, name, companyName, segment: segment as any })

    if (result.error) {
      setError(result.error)
    } else if (result.link) {
      setInviteLink(result.link)
    }
    setLoading(false)
  }

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/clients" className="flex items-center text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux clients
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Inviter un nouveau client</h1>

        {!inviteLink ? (
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom complet</label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="Dr. Jean Dupont"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="jean.dupont@cabinet.com"
              />
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Nom du cabinet / clinique (Optionnel)</label>
              <input
                type="text"
                name="companyName"
                id="companyName"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                placeholder="Cabinet Dentaire du Centre"
              />
            </div>

            <div>
              <label htmlFor="segment" className="block text-sm font-medium text-gray-700">Segment client</label>
              <select
                name="segment"
                id="segment"
                required
                defaultValue="LABO"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              >
                <option value="LABO">LABO</option>
                <option value="DENTISTE">DENTISTE</option>
                <option value="REVENDEUR">REVENDEUR</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Le segment détermine les prix affichés dans le catalogue</p>
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

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Générer l\'invitation'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Client créé et invitation générée avec succès !
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lien d'invitation</label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-2">{copied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Envoyez ce lien au client. Il expirera dans 7 jours.
              </p>
            </div>

            <button
              onClick={() => setInviteLink(null)}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Inviter un autre client
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
