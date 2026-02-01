/**
 * Vérifie si une facture est verrouillée (non modifiable)
 * Une facture est verrouillée si elle existe (invoice.createdAt est défini)
 */
export function isInvoiceLocked(invoice: { createdAt: Date | null } | null | undefined): boolean {
  return invoice != null && invoice.createdAt != null
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
 * Vérifie si une facture peut être modifiée (montants, lignes)
 * Seules les modifications de statut et balance (via paiements) sont autorisées
 */
export function canModifyInvoiceAmount(invoice: { createdAt: Date | null } | null | undefined): boolean {
  // Une facture ne peut pas être modifiée une fois créée
  return !isInvoiceLocked(invoice)
}

/**
 * G1: Vérifie si une commande peut être modifiée (lignes, quantités, produits)
 * Règles:
 * - Facture émise (invoice.createdAt) → INTERDIT
 * - Facture payée (invoice.status === 'PAID') → INTERDIT
 * - Statut DELIVERED/CANCELLED → INTERDIT
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
