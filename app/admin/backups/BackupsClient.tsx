'use client'

import { useState, useEffect } from 'react'
import { Download, Trash2, RefreshCw, HardDrive, ExternalLink, FileCode } from 'lucide-react'
import { formatDateTime } from '@/lib/config'

interface Backup {
  filename: string
  size: number
  createdAt: string
  type: 'SQLite' | 'PostgreSQL'
  isManual: boolean
}

export default function BackupsClient() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [total, setTotal] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [batchFolder, setBatchFolder] = useState('D:\\Backups')

  const fetchBackups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/backup')
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setBackups(data.backups || [])
        setTotal(data.total || 0)
        setTotalSize(data.totalSize || 0)
        setError(null)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération des backups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  const handleCreateBackup = async () => {
    try {
      setCreating(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/admin/backup', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setSuccess('Backup créé avec succès')
        await fetchBackups()
        setTimeout(() => setSuccess(null), 5000)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du backup')
    } finally {
      setCreating(false)
    }
  }

  const handleDownloadBackup = async (filename: string) => {
    console.log('Download clicked for:', filename)
    try {
      setDownloading(filename)
      setError(null)
      setSuccess(null)

      const response = await fetch(`/api/admin/backup?filename=${encodeURIComponent(filename)}&download=true`)
      
      if (!response.ok) {
        const error = await response.json()
        setError(error.error || 'Erreur lors du téléchargement')
        return
      }

      // Get file blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSuccess('Backup téléchargé avec succès')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Download error:', err)
      setError(err.message || 'Erreur lors du téléchargement du backup')
    } finally {
      setDownloading(null)
    }
  }

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le backup "${filename}" ?`)) {
      return
    }

    try {
      setDeleting(filename)
      setError(null)
      setSuccess(null)

      const response = await fetch(`/api/admin/backup?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setSuccess('Backup supprimé avec succès')
        await fetchBackups()
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression du backup')
    } finally {
      setDeleting(null)
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <HardDrive className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Backups</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <HardDrive className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Taille totale</p>
              <p className="text-2xl font-bold text-gray-900">{formatSize(totalSize)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Créer un backup manuel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Script .bat : backup vers un dossier défini */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <FileCode className="h-5 w-5 text-amber-600" />
          Script .bat (Windows)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Téléchargez un fichier <code className="bg-gray-100 px-1 rounded">backup-manuel.bat</code> qui lance un backup manuel vers un dossier de votre choix. Placez le fichier à la racine du projet et exécutez-le (double-clic ou en ligne de commande).
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-sm font-medium text-gray-700">Dossier de destination</span>
            <input
              type="text"
              value={batchFolder}
              onChange={(e) => setBatchFolder(e.target.value)}
              placeholder="D:\Backups ou C:\Sauvegardes\Douma"
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <a
            href={`/api/admin/backup/batch-script?folder=${encodeURIComponent(batchFolder)}`}
            download="backup-manuel.bat"
            className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger backup-manuel.bat
          </a>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Backups List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Liste des backups</h2>
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 inline ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">Chargement...</div>
        ) : backups.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Aucun backup trouvé. Créez votre premier backup en cliquant sur le bouton ci-dessus.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom du fichier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de création
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taille
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.filename} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        {backup.isManual && (
                          <span className="mr-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            Manuel
                          </span>
                        )}
                        <span className="font-mono text-xs">{backup.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        backup.type === 'PostgreSQL' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {backup.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(backup.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatSize(backup.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDownloadBackup(backup.filename)
                          }}
                          disabled={downloading === backup.filename || deleting === backup.filename}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          title="Télécharger"
                          type="button"
                          aria-label={`Télécharger ${backup.filename}`}
                        >
                          {downloading === backup.filename ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Download className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteBackup(backup.filename)
                          }}
                          disabled={downloading === backup.filename || deleting === backup.filename}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                          title="Supprimer"
                          type="button"
                          aria-label={`Supprimer ${backup.filename}`}
                        >
                          {deleting === backup.filename ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ À propos des backups</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Les backups automatiques sont créés via des tâches planifiées (cron/Task Scheduler)</li>
            <li>• Les backups manuels peuvent être créés depuis cette interface</li>
            <li>• Les anciens backups sont automatiquement supprimés (limite: 30 par défaut)</li>
            <li>• Les backups sont stockés dans le dossier <code className="bg-blue-100 px-1 rounded">backups/</code></li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Transférer les backups vers d'autres supports
          </h3>
          <div className="text-sm text-green-800 space-y-2">
            <p className="font-medium">Méthodes de transfert :</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                <strong>Téléchargement via l'interface :</strong> Cliquez sur l'icône <Download className="h-3 w-3 inline" /> pour télécharger un backup, puis copiez-le sur un disque externe, clé USB, ou service cloud.
              </li>
              <li>
                <strong>Copie manuelle :</strong> Accédez au dossier <code className="bg-green-100 px-1 rounded">backups/</code> sur le serveur et copiez les fichiers manuellement.
              </li>
              <li>
                <strong>Script automatique :</strong> Utilisez le script <code className="bg-green-100 px-1 rounded">scripts/copy-backups.js</code> pour copier automatiquement vers un autre emplacement (disque externe, NAS, etc.).
              </li>
              <li>
                <strong>Script .bat (Windows) :</strong> Depuis cette page, téléchargez <code className="bg-green-100 px-1 rounded">backup-manuel.bat</code> en indiquant le dossier de destination ; exécutez le fichier à la racine du projet pour créer un backup directement dans ce dossier.
              </li>
              <li>
                <strong>Cloud Storage :</strong> Configurez une synchronisation automatique (Dropbox, Google Drive, OneDrive) du dossier <code className="bg-green-100 px-1 rounded">backups/</code>.
              </li>
              <li>
                <strong>FTP/SFTP :</strong> Utilisez un client FTP pour transférer les backups vers un serveur distant.
              </li>
            </ol>
            <p className="mt-2 text-xs text-green-700">
              💡 <strong>Recommandation :</strong> Gardez au moins une copie des backups hors du serveur principal pour une protection maximale.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
