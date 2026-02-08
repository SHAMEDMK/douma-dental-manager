'use client'

import { useState, useTransition } from 'react'
import { updateCompanySettingsAction } from '@/app/actions/company-settings'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type CompanySettings = {
  id: string
  name: string
  address: string
  city: string
  country: string
  ice: string
  if: string | null
  rc: string | null
  tp: string | null
  phone: string | null
  email: string | null
  vatRate: number
  paymentTerms: string | null
  vatMention: string | null
  latePaymentMention: string | null
  logoUrl: string | null
  bankName: string | null
  rib: string | null
}

type CompanySettingsFormProps = {
  initial: CompanySettings
}

export default function CompanySettingsForm({ initial }: CompanySettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl || null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: initial.name || '',
    address: initial.address || '',
    city: initial.city || '',
    country: initial.country || '',
    ice: initial.ice || '',
    if: initial.if || '',
    rc: initial.rc || '',
    tp: initial.tp || '',
    phone: initial.phone || '',
    email: initial.email || '',
    vatRate: (initial.vatRate * 100).toFixed(2) || '20.00', // Convert to percentage for display
    paymentTerms: initial.paymentTerms ?? '',
    vatMention: initial.vatMention || 'TVA incluse selon le taux en vigueur',
    latePaymentMention: initial.latePaymentMention || 'Tout retard de paiement peut entraîner des pénalités',
    bankName: initial.bankName ?? '',
    rib: initial.rib ?? ''
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    
    // Client-side validation
    if (!formData.name || !formData.address || !formData.city || !formData.country || !formData.ice) {
      setError('Tous les champs obligatoires doivent être remplis')
      return
    }
    
    const vatRate = parseFloat(formData.vatRate)
    if (isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
      setError('Le taux TVA doit être un nombre entre 0 et 100 (ex: 20 pour 20%)')
      return
    }
    
    const formDataToSend = new FormData()
    formDataToSend.append('name', formData.name)
    formDataToSend.append('address', formData.address)
    formDataToSend.append('city', formData.city)
    formDataToSend.append('country', formData.country)
    formDataToSend.append('ice', formData.ice)
    formDataToSend.append('if', formData.if)
    formDataToSend.append('rc', formData.rc)
    formDataToSend.append('tp', formData.tp)
    formDataToSend.append('phone', formData.phone)
    formDataToSend.append('email', formData.email)
    formDataToSend.append('vatRate', (vatRate / 100).toString()) // Convert percentage to decimal
    formDataToSend.append('paymentTerms', formData.paymentTerms)
    formDataToSend.append('vatMention', formData.vatMention)
    formDataToSend.append('latePaymentMention', formData.latePaymentMention)
    formDataToSend.append('bankName', formData.bankName)
    formDataToSend.append('rib', formData.rib)
    
    startTransition(async () => {
      const result = await updateCompanySettingsAction(formDataToSend)
      
      if (result.success) {
        setSuccess(true)
        setError(null)
        router.refresh()
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || 'Erreur lors de la sauvegarde')
        setSuccess(false)
      }
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Type de fichier non autorisé. Utilisez JPEG, PNG, GIF ou WebP')
      return
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      setUploadError('Fichier trop volumineux. Taille maximale: 2MB')
      return
    }

    setIsUploadingLogo(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/company-logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const data = await response.json()
      setLogoUrl(data.url)
      toast.success('Logo téléchargé avec succès')
      router.refresh()
    } catch (err: any) {
      setUploadError(err.message || 'Erreur lors de l\'upload du logo')
      toast.error(err.message || 'Erreur lors de l\'upload du logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
          <p className="text-sm text-green-700 font-medium">
            Paramètres enregistrés avec succès
          </p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo de l'entreprise */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo de l'entreprise</h2>
          <div className="space-y-4">
            {logoUrl && (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <img 
                    src={logoUrl} 
                    alt="Logo de l'entreprise" 
                    className="h-20 w-auto object-contain border border-gray-300 rounded p-2 bg-white"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    Le logo sera affiché sur les factures et bons de livraison.
                  </p>
                  <p className="text-xs text-gray-500">
                    Format recommandé : carré ou rectangulaire horizontal, max 500x500px
                  </p>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="logoUpload" className="block text-sm font-medium text-gray-700 mb-1">
                {logoUrl ? 'Remplacer le logo' : 'Télécharger un logo'}
              </label>
              <input
                type="file"
                id="logoUpload"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleLogoUpload}
                disabled={isUploadingLogo}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {isUploadingLogo && (
                <p className="mt-2 text-sm text-blue-600">Téléchargement en cours...</p>
              )}
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Taille maximale : 2MB. Formats acceptés : JPEG, PNG, GIF, WebP
              </p>
            </div>
          </div>
        </div>

        {/* Informations obligatoires */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations obligatoires</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Raison sociale (nom de l’expéditeur) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Nom affiché comme expéditeur dans les emails envoyés aux clients.
              </p>
            </div>
            
            <div>
              <label htmlFor="ice" className="block text-sm font-medium text-gray-700 mb-1">
                ICE <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ice"
                name="ice"
                value={formData.ice}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Adresse <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                Ville <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Pays <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Informations facultatives */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations facultatives</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="if" className="block text-sm font-medium text-gray-700 mb-1">
                IF
              </label>
              <input
                type="text"
                id="if"
                name="if"
                value={formData.if}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="rc" className="block text-sm font-medium text-gray-700 mb-1">
                RC
              </label>
              <input
                type="text"
                id="rc"
                name="rc"
                value={formData.rc}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="tp" className="block text-sm font-medium text-gray-700 mb-1">
                TP
              </label>
              <input
                type="text"
                id="tp"
                name="tp"
                value={formData.tp}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email (expéditeur des emails)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ex: contact@votre-domaine.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Adresse utilisée comme expéditeur pour tous les emails envoyés aux clients (confirmation de commande, invitation, etc.). Avec Resend, le domaine doit être vérifié.
              </p>
            </div>
          </div>
        </div>

        {/* Taux TVA */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Taux TVA</h2>
          <div className="max-w-xs">
            <label htmlFor="vatRate" className="block text-sm font-medium text-gray-700 mb-1">
              Taux TVA (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="vatRate"
              name="vatRate"
              value={formData.vatRate}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Exemple: 20 pour 20%</p>
          </div>
        </div>

        {/* Conditions de paiement */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conditions de paiement</h2>
          <div className="max-w-md">
            <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
              Conditions de paiement <span className="text-gray-400 text-xs">(facultatif)</span>
            </label>
            <input
              type="text"
              id="paymentTerms"
              name="paymentTerms"
              value={formData.paymentTerms}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Paiement à réception"
            />
            <p className="mt-1 text-xs text-gray-500">Affichées sur les factures si renseignées</p>
          </div>
        </div>

        {/* Coordonnées bancaires */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Coordonnées bancaires</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la banque <span className="text-gray-400 text-xs">(facultatif)</span>
              </label>
              <input
                type="text"
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Banque Populaire"
              />
            </div>
            <div>
              <label htmlFor="rib" className="block text-sm font-medium text-gray-700 mb-1">
                RIB <span className="text-gray-400 text-xs">(facultatif)</span>
              </label>
              <textarea
                id="rib"
                name="rib"
                value={formData.rib}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Code banque, code guichet, N° compte, clé RIB..."
              />
              <p className="mt-1 text-xs text-gray-500">Relevé d'identité bancaire – affiché sur les factures si renseigné</p>
            </div>
          </div>
        </div>

        {/* Mentions légales */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mentions légales</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="vatMention" className="block text-sm font-medium text-gray-700 mb-1">
                Mention TVA
              </label>
              <textarea
                id="vatMention"
                name="vatMention"
                value={formData.vatMention}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="TVA incluse selon le taux en vigueur"
              />
              <p className="mt-1 text-xs text-gray-500">Mention affichée sur les factures concernant la TVA</p>
            </div>
            
            <div>
              <label htmlFor="latePaymentMention" className="block text-sm font-medium text-gray-700 mb-1">
                Mention retard de paiement
              </label>
              <textarea
                id="latePaymentMention"
                name="latePaymentMention"
                value={formData.latePaymentMention}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tout retard de paiement peut entraîner des pénalités"
              />
              <p className="mt-1 text-xs text-gray-500">Mention affichée sur les factures concernant le retard de paiement</p>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
