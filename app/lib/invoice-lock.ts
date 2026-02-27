/**
 * Facture ou commande livrée = verrouillage définitif.
 * Aucune modification financière (lignes, quantités, prix, remises, montants) après livraison ou paiement.
 *
 * Vérifie si une facture est verrouillée (non modifiable) — verrouillage comptable strict.
 * Une facture est LOCKED si :
 * - paidAmount > 0
 * - OU status IN ('PARTIAL', 'PAID')
 * - OU lockedAt != null
 */
export function isInvoiceLocked(invoice: {
  createdAt?: Date | null
  lockedAt?: Date | null
  status?: string
  payments?: { amount: number }[]
  totalPaid?: number
} | null | undefined): boolean {
  if (!invoice) return false
  if (invoice.lockedAt != null) return true
  if (invoice.status === 'PARTIAL' || invoice.status === 'PAID') return true
  const paidAmount = invoice.totalPaid ?? invoice.payments?.reduce((s, p) => s + p.amount, 0) ?? 0
  if (paidAmount > 0) return true
  return false
}

/**
 * Vérifie si un numéro de facture est déjà attribué
 */
export function isInvoiceNumberAlreadyAssigned(invoiceNumber: string | null | undefined): boolean {
  return invoiceNumber !== null && invoiceNumber !== undefined && invoiceNumber.trim() !== ''
}

/**
 * Vérifie si un numéro de BL est déjà attribué
 */
export function isDeliveryNoteNumberAlreadyAssigned(deliveryNoteNumber: string | null | undefined): boolean {
  return deliveryNoteNumber !== null && deliveryNoteNumber !== undefined && deliveryNoteNumber.trim() !== ''
}

/**
 * Message d'erreur standard pour facture verrouillée
 * G1: Message UX recommandé - "Cette commande n'est plus modifiable"
 */
export const INVOICE_LOCKED_ERROR = 'Cette commande n\'est plus modifiable.'

/**
 * Message d'erreur standard pour numéro déjà attribué
 */
export const NUMBER_ALREADY_ASSIGNED_ERROR = 'Ce numéro est déjà attribué et ne peut pas être régénéré. Les numéros de facture et BL sont figés dès leur attribution.'

/**
 * Vérifie si une facture peut être modifiée (montants).
 * Invoice.status PARTIAL ou PAID (ou lockedAt / paidAmount > 0) → modification des montants interdite.
 */
export function canModifyInvoiceAmount(invoice: { createdAt: Date | null } | null | undefined): boolean {
  return !isInvoiceLocked(invoice)
}

/**
 * G1: Vérifie si une commande peut être modifiée (lignes, quantités, prix, remises).
 * Order.status === DELIVERED ou Invoice.status PARTIAL/PAID (ou facture émise) → modification interdite.
 * Règles:
 * - Statut DELIVERED/CANCELLED → INTERDIT (lignes, quantités, prix, remises)
 * - Facture payée (invoice.status === 'PAID') → INTERDIT
 * - Facture émise / verrouillée (isInvoiceLocked) → INTERDIT
 *
 * @param order Order avec invoice
 * @returns true si la commande peut être modifiée
 */
export function canModifyOrder(order: {
  status: string
  invoice?: { createdAt: Date | null; status: string } | null
}): boolean {
  // Statuts finaux : pas de modification
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    return false
  }

  // Facture payée : pas de modification
  if (order.invoice?.status === 'PAID') {
    return false
  }

  // Facture émise (créée) : pas de modification
  if (isInvoiceLocked(order.invoice ?? null)) {
    return false
  }

  return true
}

/**
 * G1: Message d'erreur pour commande non modifiable
 */
export const ORDER_NOT_MODIFIABLE_ERROR = 'Facture émise : modification interdite.'

/**
 * G1: Message d'erreur pour régénération de numéro
 */
export const NUMBER_REGENERATION_FORBIDDEN_ERROR = 'Régénération interdite : le numéro est déjà attribué et figé.'
