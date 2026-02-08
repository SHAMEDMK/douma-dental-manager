'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getCompanySettingsAction() {
  try {
    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' }
    })
    
    if (!settings) {
      // Create default settings if they don't exist
      const defaultSettings = await prisma.companySettings.create({
        data: {
          id: 'default',
          name: '',
          address: '',
          city: '',
          country: '',
          ice: '',
          vatRate: 0.2,
          paymentTerms: null,
          vatMention: 'TVA incluse selon le taux en vigueur',
          latePaymentMention: 'Tout retard de paiement peut entraîner des pénalités',
          bankName: null,
          rib: null
        }
      })
      return { settings: defaultSettings, error: null }
    }
    
    return { settings, error: null }
  } catch (error: any) {
    return { settings: null, error: error.message || 'Erreur lors du chargement des paramètres' }
  }
}

export async function updateCompanySettingsAction(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const country = formData.get('country') as string
    const ice = formData.get('ice') as string
    const ifValue = formData.get('if') as string | null
    const rc = formData.get('rc') as string | null
    const tp = formData.get('tp') as string | null
    const phone = formData.get('phone') as string | null
    const email = formData.get('email') as string | null
    const vatRateStr = formData.get('vatRate') as string
    const paymentTermsRaw = (formData.get('paymentTerms') as string)?.trim()
    const paymentTerms = paymentTermsRaw || null
    const vatMention = formData.get('vatMention') as string | null
    const latePaymentMention = formData.get('latePaymentMention') as string | null
    const bankNameRaw = (formData.get('bankName') as string)?.trim()
    const bankName = bankNameRaw || null
    const ribRaw = (formData.get('rib') as string)?.trim()
    const rib = ribRaw || null
    
    // Validation
    if (!name || !address || !city || !country || !ice) {
      return { success: false, error: 'Tous les champs obligatoires doivent être remplis' }
    }
    
    const vatRate = parseFloat(vatRateStr || '0.2')
    if (isNaN(vatRate) || vatRate < 0 || vatRate > 1) {
      return { success: false, error: 'Le taux TVA doit être un nombre entre 0 et 1 (ex: 0.2 pour 20%)' }
    }
    
    // Get session for audit
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Non autorisé' }
    }
    
    // Get old values for audit log
    const oldSettings = await prisma.companySettings.findUnique({
      where: { id: 'default' }
    })
    
    await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: {
        name,
        address,
        city,
        country,
        ice,
        if: ifValue || null,
        rc: rc || null,
        tp: tp || null,
        phone: phone || null,
        email: email || null,
        vatRate,
        paymentTerms: paymentTerms ?? undefined,
        vatMention: vatMention?.trim() || null,
        latePaymentMention: latePaymentMention?.trim() || null,
        bankName: bankName ?? undefined,
        rib: rib ?? undefined
      },
      create: {
        id: 'default',
        name,
        address,
        city,
        country,
        ice,
        if: ifValue || null,
        rc: rc || null,
        tp: tp || null,
        phone: phone || null,
        email: email || null,
        vatRate,
        paymentTerms: paymentTerms ?? undefined,
        vatMention: vatMention?.trim() || null,
        latePaymentMention: latePaymentMention?.trim() || null,
        bankName: bankName ?? undefined,
        rib: rib ?? undefined
      }
    })
    
    // Log audit: Company settings updated
    try {
      const oldValues: Record<string, unknown> | undefined = oldSettings
        ? {
            name: oldSettings.name,
            vatRate: oldSettings.vatRate,
            paymentTerms: oldSettings.paymentTerms,
          }
        : undefined
      const { logEntityUpdate } = await import('@/lib/audit')
      await logEntityUpdate(
        'SETTINGS_UPDATED',
        'SETTINGS',
        'default',
        session as any,
        oldValues,
        {
          name,
          vatRate,
          paymentTerms,
          address,
          city,
          country,
          ice,
        }
      )
    } catch (auditError) {
      console.error('Failed to log settings update:', auditError)
    }
    
    revalidatePath('/admin/settings/company')
    revalidatePath('/admin/invoices')
    revalidatePath('/portal/invoices')
    
    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur lors de la sauvegarde' }
  }
}
