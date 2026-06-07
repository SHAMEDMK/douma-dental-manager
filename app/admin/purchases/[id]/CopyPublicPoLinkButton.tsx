'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import toast from 'react-hot-toast'

type Props = {
  publicUrl: string
}

export default function CopyPublicPoLinkButton({ publicUrl }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Lien copié dans le presse-papiers')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier le lien')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
      title="Lien public signé (90 jours) pour le fournisseur"
    >
      <Link2 className="w-4 h-4" aria-hidden />
      {copied ? 'Copié !' : 'Copier lien fournisseur'}
    </button>
  )
}
