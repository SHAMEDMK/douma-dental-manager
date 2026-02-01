import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EmailAuditPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/admin')
  }

  // Get all email-related audit logs
  const emailLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: ['EMAIL_SENT', 'EMAIL_FAILED']
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100, // Last 100 email logs
    select: {
      id: true,
      action: true,
      entityType: true,
      details: true,
      userEmail: true,
      userRole: true,
      createdAt: true
    }
  })

  // Parse details from JSON string
  const parsedLogs = emailLogs.map(log => ({
    ...log,
    details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
  }))

  // Group by email type
  const byType = parsedLogs.reduce((acc, log) => {
    const emailType = log.details?.emailType || 'UNKNOWN'
    if (!acc[emailType]) {
      acc[emailType] = { sent: 0, failed: 0, logs: [] }
    }
    if (log.action === 'EMAIL_SENT') {
      acc[emailType].sent++
    } else {
      acc[emailType].failed++
    }
    acc[emailType].logs.push(log)
    return acc
  }, {} as Record<string, { sent: number; failed: number; logs: any[] }>)

  const isDevMode = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder_key'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit des Emails</h1>
        <p className="text-gray-600 mt-1">
          Historique des emails envoyés et échoués
          {isDevMode && (
            <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
              Mode Debug — les emails ne sont pas envoyés au destinataire
            </span>
          )}
        </p>
        {isDevMode && (
          <p className="mt-2 text-xs text-gray-500 font-medium">
            Phase 2.1 — Audit emails en mode debug
          </p>
        )}
      </div>

      {/* Phase 2.1 - Mode Debug : explication */}
      {isDevMode && (
        <div className="mb-6 p-4 bg-slate-100 border border-slate-300 rounded-lg">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Phase 2.1 — Audit emails en mode debug</h2>
          <p className="text-sm text-slate-700">
            En mode debug, chaque tentative d’envoi d’email (confirmation de commande, invitation, etc.) est enregistrée ici mais <strong>aucun email n’est envoyé</strong> au destinataire. Les entrées marquées « simulé, non livré » correspondent à ces enregistrements.
          </p>
        </div>
      )}

      {/* À propos des emails envoyés */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-blue-900 mb-2">À propos des emails envoyés</h2>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>
            <strong>ORDER_CONFIRMATION</strong> : envoyé au client après une commande (adresse = email du compte connecté). Si le destinataire ne le reçoit pas, voir ci-dessous.
          </li>
          <li>Autres types : invitation client, réinitialisation mot de passe, mise à jour de commande, facture, etc.</li>
        </ul>
        {isDevMode ? (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
            <strong>Pourquoi les emails (ORDER_CONFIRMATION, etc.) n’aboutissent pas au destinataire ?</strong>
            <p className="mt-1">
              En <strong>mode Debug</strong>, la clé Resend n’est pas configurée ou est factice. Les emails sont uniquement enregistrés dans cet audit et <strong>ne sont pas envoyés</strong> au destinataire.
            </p>
            <p className="mt-2 font-medium">
              Pour que les emails atteignent le client : configurez <code className="bg-amber-100 px-1 rounded">RESEND_API_KEY</code> dans <code className="bg-amber-100 px-1 rounded">.env</code>, puis vérifiez le domaine expéditeur dans le tableau Resend.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-blue-700">
            Les emails sont envoyés via Resend. Si un destinataire ne reçoit pas l’email, vérifiez le domaine expéditeur (Company Settings) dans Resend et les spams.
          </p>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total emails</div>
          <div className="text-2xl font-bold text-gray-900">{parsedLogs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">
            {isDevMode ? 'Emails simulés (non livrés)' : 'Emails envoyés'}
          </div>
          <div className="text-2xl font-bold text-green-600">
            {parsedLogs.filter(l => l.action === 'EMAIL_SENT').length}
          </div>
          {isDevMode && (
            <p className="text-xs text-amber-600 mt-1">En mode Debug, aucun email n’est envoyé au destinataire.</p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Emails échoués</div>
          <div className="text-2xl font-bold text-red-600">
            {parsedLogs.filter(l => l.action === 'EMAIL_FAILED').length}
          </div>
        </div>
      </div>

      {/* Grouped by email type */}
      <div className="space-y-6">
        {Object.entries(byType).map(([emailType, stats]) => (
          <div key={emailType} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{emailType}</h2>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">✅ {stats.sent} {isDevMode ? 'simulés' : 'envoyés'}</span>
                  {stats.failed > 0 && (
                    <span className="text-red-600">❌ {stats.failed} échoués</span>
                  )}
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {stats.logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className={`px-6 py-3 ${log.action === 'EMAIL_FAILED' ? 'bg-red-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {log.action === 'EMAIL_SENT' ? (
                          <span className="text-green-600">✅</span>
                        ) : (
                          <span className="text-red-600">❌</span>
                        )}
                        <span className="font-medium text-gray-900">
                          {log.details?.subject || 'Sans sujet'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {log.details?.mode === 'DEV' ? (
                            <span className="text-amber-600 font-medium" title="Email simulé, non envoyé au destinataire">(simulé, non livré)</span>
                          ) : (
                            `(${log.details?.mode || 'PRODUCTION'})`
                          )}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 ml-6">
                        <div>À: {log.details?.to || 'N/A'}</div>
                        {log.details?.from && (
                          <div>De: {log.details.from}</div>
                        )}
                        {log.details?.error && (
                          <div className="text-red-600 mt-1">
                            Erreur: {log.details.error}
                          </div>
                        )}
                        {log.details?.resendId && (
                          <div className="text-xs text-gray-500 mt-1">
                            Resend ID: {log.details.resendId}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))}
              {stats.logs.length > 10 && (
                <div className="px-6 py-2 text-sm text-gray-500 text-center">
                  ... et {stats.logs.length - 10} autres
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {parsedLogs.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Aucun email enregistré dans l'audit.</p>
          <p className="text-sm text-gray-400 mt-2">
            Les emails seront enregistrés ici une fois qu'ils seront envoyés.
          </p>
        </div>
      )}
    </div>
  )
}
