'use client'

import { FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface DownloadPdfButtonProps {
  url?: string
  href?: string // Support both for backward compatibility
  label?: string
  className?: string
}

export default function DownloadPdfButton({ 
  url,
  href,
  label = 'Télécharger PDF',
  className = 'px-3 py-1.5 text-sm font-medium text-white rounded-md bg-gray-800 hover:bg-gray-900'
}: DownloadPdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)

  // Support both url and href props for backward compatibility
  const downloadUrl = url || href

  if (!downloadUrl) {
    console.error('DownloadPdfButton: url or href prop is required')
    return null
  }

  const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setIsDownloading(true)
    setError(null)
    setShowError(false) // Hide error immediately when starting new download

    try {
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text()
            if (errorText) {
              errorMessage = errorText.length > 100 ? errorText.substring(0, 100) + '...' : errorText
            }
          } catch {
            // Keep default error message
          }
        }
        throw new Error(errorMessage)
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'facture.pdf'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Create blob and download
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
      // Success - clear any previous errors
      setError(null)
      setShowError(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du téléchargement du PDF'
      setError(errorMessage)
      // Show error after a small delay to avoid flash during normal loading
      setTimeout(() => {
        setShowError(true)
        // Auto-hide error after 5 seconds
        setTimeout(() => {
          setShowError(false)
          setError(null)
        }, 5000)
      }, 500) // Small delay to prevent flash during normal loading
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="relative">
      <a
        href={downloadUrl}
        onClick={handleDownload}
        className={`${className} inline-flex items-center gap-2 transition-all ${isDownloading ? 'opacity-70 cursor-wait' : 'hover:opacity-90'}`}
        aria-disabled={isDownloading}
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Téléchargement...</span>
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            <span>{label}</span>
          </>
        )}
      </a>
      {error && showError && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-red-100 text-red-800 text-sm rounded-md shadow-lg z-50 whitespace-nowrap border border-red-300 animate-in fade-in slide-in-from-top-2 duration-200">
          {error}
        </div>
      )}
    </div>
  )
}
