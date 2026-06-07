/** Fournisseurs de messagerie grand public — Resend n’accepte pas ces domaines comme expéditeur. */
const PUBLIC_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.fr',
  'hotmail.com',
  'hotmail.fr',
  'live.com',
  'outlook.com',
  'outlook.fr',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
  'gmx.fr',
  'mail.com',
  'yandex.com',
  'laposte.net',
  'orange.fr',
  'free.fr',
  'sfr.fr',
])

function extractEmailAddress(from: string): string {
  const match = from.trim().match(/<([^>]+)>/)
  return (match ? match[1] : from).trim()
}

export function getEmailDomain(address: string): string | null {
  const raw = extractEmailAddress(address)
  const at = raw.lastIndexOf('@')
  if (at < 0) return null
  return raw.slice(at + 1).toLowerCase()
}

export function isPublicMailDomain(domain: string): boolean {
  return PUBLIC_MAIL_DOMAINS.has(domain)
}

export function resolveEmailFrom(params: {
  companyName: string
  companyEmail: string
  explicitFrom?: string
}): { from: string } | { error: string } {
  if (params.explicitFrom?.trim()) {
    return { from: params.explicitFrom.trim() }
  }

  const resendFrom = process.env.RESEND_FROM?.trim()
  if (resendFrom) {
    return { from: resendFrom }
  }

  const companyEmail = params.companyEmail?.trim()
  const domain = companyEmail ? getEmailDomain(companyEmail) : null
  if (companyEmail && domain && !isPublicMailDomain(domain)) {
    return { from: `${params.companyName} <${companyEmail}>` }
  }

  const hasRealApiKey =
    !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_placeholder_key'

  if (hasRealApiKey) {
    return {
      error:
        'Expéditeur non configuré : définissez RESEND_FROM dans Vercel (ex. SHAMED <noreply@shamed.ma>) avec un domaine vérifié sur resend.com/domains. Une adresse Gmail/Outlook ne peut pas servir d’expéditeur.',
    }
  }

  const fallbackEmail = companyEmail || 'noreply@douma.com'
  return { from: `${params.companyName} <${fallbackEmail}>` }
}

/** Message utilisateur en français pour les erreurs Resend courantes. */
export function humanizeResendError(message: string): string {
  if (/gmail\.com domain is not verified/i.test(message)) {
    return 'Impossible d’expédier depuis @gmail.com. Définissez RESEND_FROM avec une adresse @votre-domaine vérifié (Vercel → Variables d’environnement, puis resend.com/domains).'
  }
  if (/domain is not verified/i.test(message)) {
    return 'Domaine expéditeur non vérifié sur Resend. Vérifiez le domaine sur resend.com/domains et définissez RESEND_FROM dans Vercel (ex. SHAMED <noreply@shamed.ma>).'
  }
  return message
}
