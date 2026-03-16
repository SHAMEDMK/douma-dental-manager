import { Resend } from 'resend'
import { formatDateLong, formatDateTime, formatCurrencyWithSymbol } from '@/lib/config'

/** Base URL for links in emails (invitation, reset password). Prefer APP_URL then NEXT_PUBLIC_APP_URL. */
export function getAppUrl(): string {
  const url = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return url.replace(/\/$/, '')
}

// Initialize Resend client (fallback placeholder so app does not crash if key missing)
const resendApiKey = process.env.RESEND_API_KEY || 're_placeholder_key'
const resend = new Resend(resendApiKey)

// Get company settings for email sender info
async function getCompanyInfo() {
  const { prisma } = await import('@/lib/prisma')
  const companySettings = await prisma.companySettings.findUnique({
    where: { id: 'default' }
  })

  return {
    name: companySettings?.name || 'DOUMA Dental Manager',
    email: companySettings?.email || 'noreply@douma.com',
    phone: companySettings?.phone || null,
    address: companySettings?.address || null,
    city: companySettings?.city || null,
    ice: companySettings?.ice || null,
  }
}

// Base email template
function getEmailTemplate(content: string, subject: string) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">DOUMA Dental Manager</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
              <p style="margin: 0 0 10px;">© ${new Date().getFullYear()} DOUMA Dental Manager. Tous droits réservés.</p>
              <p style="margin: 0;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

// Send email function with audit logging
export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  from?: string
  emailType?: string // Type d'email pour l'audit (ex: 'ORDER_CONFIRMATION', 'PASSWORD_RESET', etc.)
  metadata?: Record<string, any> // Métadonnées supplémentaires pour l'audit
}) {
  const isDevMode = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder_key'
  const emailType = params.emailType || 'UNKNOWN'
  
  // Get company info for sender (RESEND_FROM overrides for production)
  const companyInfo = await getCompanyInfo()
  const from = params.from || process.env.RESEND_FROM || `${companyInfo.name} <${companyInfo.email}>`

  if (isDevMode) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder_key') {
      console.warn('[EMAIL] RESEND_API_KEY not set or placeholder: emails will not be sent (simulation only).')
    }
    const debugInfo = {
      mode: 'DEV (no API key)',
      to: params.to,
      from,
      subject: params.subject,
      emailType,
      timestamp: new Date().toISOString(),
      metadata: params.metadata || {}
    }
    
    console.log('📧 [EMAIL DEBUG] Email would be sent:', JSON.stringify(debugInfo, null, 2))
    
    // Log to audit in dev mode too
    try {
      const { logEmailSent } = await import('./audit-email')
      await logEmailSent({
        to: params.to,
        from,
        subject: params.subject,
        emailType,
        success: true,
        mode: 'DEV',
        metadata: params.metadata
      })
    } catch (auditError) {
      // Non-blocking: if audit fails, just log to console
      console.warn('Failed to log email to audit (dev mode):', auditError)
    }
    
    return { success: true, id: 'dev-mode' }
  }

  // Production mode: actually send email
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    if (error) {
      console.error('❌ [EMAIL ERROR] Failed to send email:', {
        to: params.to,
        subject: params.subject,
        error,
        emailType
      })
      
      // Log failed email to audit
      try {
        const { logEmailFailed } = await import('./audit-email')
        await logEmailFailed({
          to: params.to,
          from,
          subject: params.subject,
          emailType,
          success: false,
          mode: 'PRODUCTION',
          error: error.message || String(error),
          metadata: params.metadata
        })
      } catch (auditError) {
        console.warn('Failed to log email failure to audit:', auditError)
      }
      
      return { success: false, error }
    }

    // Log successful email to audit
    try {
      const { logEmailSent } = await import('./audit-email')
      await logEmailSent({
        to: params.to,
        from,
        subject: params.subject,
        emailType,
        success: true,
        mode: 'PRODUCTION',
        resendId: data?.id,
        metadata: params.metadata
      })
    } catch (auditError) {
      // Non-blocking: if audit fails, just log to console
      console.warn('Failed to log email to audit:', auditError)
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('❌ [EMAIL EXCEPTION] Error sending email:', {
      to: params.to,
      subject: params.subject,
      error,
      emailType
    })
    
    // Log exception to audit
    try {
      const { logEmailFailed } = await import('./audit-email')
      await logEmailFailed({
        to: params.to,
        from,
        subject: params.subject,
        emailType,
        success: false,
        mode: isDevMode ? 'DEV' : 'PRODUCTION',
        error: error instanceof Error ? error.message : String(error),
        metadata: params.metadata
      })
    } catch (auditError) {
      console.warn('Failed to log email exception to audit:', auditError)
    }
    
    return { success: false, error }
  }
}

// Order confirmation email
export async function sendOrderConfirmationEmail(params: {
  to: string
  orderNumber: string
  orderDate: Date
  total: number
  items: Array<{ productName: string; sku?: string; quantity: number; price: number }>
  clientName: string
  orderLink?: string
}) {
  const formattedDate = formatDateTime(params.orderDate)

  const itemsHtml = params.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 12px; color: #6b7280;">${item.sku ?? ''}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${item.productName}</td>
        <td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
        <td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #e5e7eb;">${formatCurrencyWithSymbol(item.price * item.quantity)}</td>
      </tr>
    `
    )
    .join('')

  const content = `
    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">Confirmation de votre commande</h2>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Bonjour ${params.clientName},
    </p>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Nous avons bien reçu votre commande <strong>${params.orderNumber}</strong> du ${formattedDate}.
    </p>
    
    <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 6px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px 0; text-align: left; font-weight: 600; color: #374151;">Réf.</th>
            <th style="padding: 8px 0; text-align: left; font-weight: 600; color: #374151;">Désignation</th>
            <th style="padding: 8px 0; text-align: right; font-weight: 600; color: #374151;">Qté</th>
            <th style="padding: 8px 0; text-align: right; font-weight: 600; color: #374151;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 12px 0 0; text-align: right; font-weight: 600; color: #1f2937;">Total TTC :</td>
            <td style="padding: 12px 0 0; text-align: right; font-weight: 600; font-size: 18px; color: #1f2937;">${formatCurrencyWithSymbol(params.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    ${params.orderLink ? `
    <div style="margin: 30px 0; text-align: center;">
      <a href="${params.orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Voir ma commande
      </a>
    </div>
    ` : ''}
    
    <p style="margin: 20px 0 0; color: #4b5563; line-height: 1.6; font-size: 14px;">
      Votre commande est en cours de traitement. Vous recevrez une notification dès qu'elle sera préparée.
    </p>
  `

  return sendEmail({
    to: params.to,
    subject: `Confirmation de commande ${params.orderNumber}`,
    html: getEmailTemplate(content, `Confirmation de commande ${params.orderNumber}`),
    emailType: 'ORDER_CONFIRMATION',
    metadata: {
      orderNumber: params.orderNumber,
      clientName: params.clientName,
      total: params.total,
      itemsCount: params.items.length
    }
  })
}

// Order status update email
export async function sendOrderStatusUpdateEmail(params: {
  to: string
  orderNumber: string
  status: string
  statusLabel: string
  clientName: string
  orderLink?: string
}) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    PREPARED: { bg: '#dbeafe', text: '#1e40af' },
    SHIPPED: { bg: '#fef3c7', text: '#92400e' },
    DELIVERED: { bg: '#d1fae5', text: '#065f46' },
    CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
  }

  const color = statusColors[params.status] || { bg: '#f3f4f6', text: '#374151' }

  const content = `
    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">Mise à jour de votre commande</h2>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Bonjour ${params.clientName},
    </p>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Le statut de votre commande <strong>${params.orderNumber}</strong> a été mis à jour :
    </p>
    
    <div style="margin: 20px 0; padding: 16px; background-color: ${color.bg}; border-left: 4px solid ${color.text}; border-radius: 6px;">
      <p style="margin: 0; color: ${color.text}; font-weight: 600; font-size: 18px;">
        ${params.statusLabel}
      </p>
    </div>
    
    ${params.orderLink ? `
    <div style="margin: 30px 0; text-align: center;">
      <a href="${params.orderLink}" style="display: inline-block; padding: 12px 24px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Voir ma commande
      </a>
    </div>
    ` : ''}
    
    <p style="margin: 20px 0 0; color: #4b5563; line-height: 1.6; font-size: 14px;">
      Merci pour votre confiance.
    </p>
  `

  return sendEmail({
    to: params.to,
    subject: `Commande ${params.orderNumber} : ${params.statusLabel}`,
    html: getEmailTemplate(content, `Commande ${params.orderNumber} : ${params.statusLabel}`),
  })
}

// Invoice email
export async function sendInvoiceEmail(params: {
  to: string
  invoiceNumber: string
  invoiceDate: Date
  amount: number
  clientName: string
  orderNumber: string
  invoiceLink?: string
  pdfLink?: string
}) {
  const formattedDate = formatDateLong(params.invoiceDate)

  const content = `
    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">Votre facture est disponible</h2>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Bonjour ${params.clientName},
    </p>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Votre facture <strong>${params.invoiceNumber}</strong> pour la commande <strong>${params.orderNumber}</strong> du ${formattedDate} est disponible.
    </p>
    
    <div style="margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 6px; text-align: center;">
      <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">Montant TTC</p>
      <p style="margin: 0; color: #1f2937; font-size: 32px; font-weight: 600;">${formatCurrencyWithSymbol(params.amount)}</p>
    </div>
    
    ${params.invoiceLink || params.pdfLink ? `
    <div style="margin: 30px 0; text-align: center;">
      ${params.invoiceLink ? `
        <a href="${params.invoiceLink}" style="display: inline-block; padding: 12px 24px; margin: 0 5px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Voir la facture
        </a>
      ` : ''}
      ${params.pdfLink ? `
        <a href="${params.pdfLink}" style="display: inline-block; padding: 12px 24px; margin: 0 5px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Télécharger PDF
        </a>
      ` : ''}
    </div>
    ` : ''}
    
    <p style="margin: 20px 0 0; color: #4b5563; line-height: 1.6; font-size: 14px;">
      Cette facture peut être réglée par virement, chèque ou espèces selon les modalités convenues.
    </p>
  `

  return sendEmail({
    to: params.to,
    subject: `Facture ${params.invoiceNumber}`,
    html: getEmailTemplate(content, `Facture ${params.invoiceNumber}`),
    emailType: 'INVOICE_NOTIFICATION',
    metadata: {
      invoiceNumber: params.invoiceNumber,
      orderNumber: params.orderNumber,
      amount: params.amount,
      clientName: params.clientName
    }
  })
}

// Client invitation email
export async function sendClientInvitationEmail(params: {
  to: string
  clientName: string
  invitationLink: string
  companyName?: string
}) {
  const content = `
    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">Invitation à rejoindre DOUMA Dental Manager</h2>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Bonjour ${params.clientName}${params.companyName ? ` (${params.companyName})` : ''},
    </p>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Vous avez été invité(e) à rejoindre notre plateforme DOUMA Dental Manager pour accéder à votre espace client et gérer vos commandes en ligne.
    </p>
    
    <div style="margin: 30px 0; text-align: center;">
      <a href="${params.invitationLink}" style="display: inline-block; padding: 12px 24px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Activer mon compte
      </a>
    </div>
    
    <p style="margin: 20px 0 0; color: #4b5563; line-height: 1.6; font-size: 14px;">
      Ce lien est valable pendant 7 jours. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
    </p>
  `

  // Do not include invitationLink in metadata (contains token; never log in plain text)
  return sendEmail({
    to: params.to,
    subject: 'Invitation à rejoindre DOUMA Dental Manager',
    html: getEmailTemplate(content, 'Invitation à rejoindre DOUMA Dental Manager'),
    emailType: 'CLIENT_INVITATION',
    metadata: {
      clientName: params.clientName,
      companyName: params.companyName
    }
  })
}

// Password reset email
export async function sendPasswordResetEmail(params: {
  to: string
  userName: string
  resetLink: string
}) {
  const content = `
    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px;">Réinitialisation de votre mot de passe</h2>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Bonjour ${params.userName},
    </p>
    
    <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
      Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
    </p>
    
    <div style="margin: 30px 0; text-align: center;">
      <a href="${params.resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Réinitialiser mon mot de passe
      </a>
    </div>
    
    <p style="margin: 20px 0 0; color: #4b5563; line-height: 1.6; font-size: 14px;">
      Ou copiez ce lien dans votre navigateur :<br>
      <a href="${params.resetLink}" style="color: #3b82f6; word-break: break-all;">${params.resetLink}</a>
    </p>
    
    <div style="margin: 30px 0; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
        <strong>⚠️ Important :</strong> Ce lien est valide pendant <strong>1 heure</strong> uniquement. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
      </p>
    </div>
    
    <p style="margin: 20px 0 0; color: #6b7280; line-height: 1.6; font-size: 12px;">
      Si le bouton ne fonctionne pas, copiez et collez le lien ci-dessus dans votre navigateur.
    </p>
  `

  return sendEmail({
    to: params.to,
    subject: 'Réinitialisation de votre mot de passe - DOUMA Dental Manager',
    html: getEmailTemplate(content, 'Réinitialisation de mot de passe'),
    emailType: 'PASSWORD_RESET',
    metadata: {
      userName: params.userName,
      resetLink: params.resetLink
    }
  })
}
